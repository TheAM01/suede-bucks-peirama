import "server-only";
import {
  ACTION_FROM,
  ACTION_LABEL,
  MANUAL_COURIER,
  canRun,
  courierCode,
  defaultCourierFor,
  normalizeCourier,
  statusLabel,
  type OrderAction,
} from "@/config/order-workflow";
import { checkAddress, routeNewOrder } from "./address-check";
import { applyTransition, getOrderOps, intakeOrder } from "./order-ops";
import { readOrderBrief } from "./shopify-order-detail";
import { fulfillOrder, setOrderTags, updateOrderShipping } from "./shopify-writes";
import { readAppSettings } from "./app-settings";
import { renderConsignmentId } from "@/config/consignment-schema";
import { attachToLoadSheet, detachFromLoadSheet, findSheetByReference, resolveLoadSheet } from "./dispatch";

/**
 * The Orders workflow: every control-panel action (Modify, Move, Discard,
 * Create Package, consignment booking, label printing, Dispatch, Cancel)
 * runs through `runOrderAction()`, which checks the transition against the
 * shared ACTION_FROM table, applies the Shopify side effect where there is
 * one, then compare-and-sets the new status with a history entry
 * (src/lib/order-ops.ts). Intake of brand-new orders is `intakeFromWebhook()`.
 */

export const MALFORMED_CONFIRMATION =
  "This order was flagged as malformed. Are you sure you want to move it into active orders?";

/** Tag added in Shopify on Create Package so the packing team can filter there too. */
const PACKAGED_TAG = "packaged";

export interface ActionResult {
  ok?: boolean;
  error?: string;
  /** the action needs an explicit yes — resend with `confirmed: true` */
  needsConfirmation?: string;
  /** the status the order ended up in */
  status?: string;
  /** dispatch / add_to_load_sheet: the sheet the parcel went on */
  loadSheet?: string;
  loadSheetId?: string;
}

const str = (v: unknown): string => (v == null ? "" : String(v)).trim();

let lastConsignmentMs = 0;
/** Strictly increasing ms, so a bulk assignment in one process never repeats a timestamp-based ID. */
function nextConsignmentMs(): number {
  lastConsignmentMs = Math.max(Date.now(), lastConsignmentMs + 1);
  return lastConsignmentMs;
}

function isAction(v: unknown): v is OrderAction {
  return typeof v === "string" && v in ACTION_FROM;
}

export async function runOrderAction(
  orderId: string,
  action: unknown,
  payload: Record<string, unknown>,
): Promise<ActionResult> {
  if (!isAction(action)) return { error: "Unknown order action." };

  const { doc, error } = await getOrderOps(orderId);
  if (error || !doc) return { error: error ?? "Couldn't load the order's status." };
  const from = doc.opsStatus;

  if (!canRun(action, from, doc.courier)) {
    return {
      error: `Can't ${ACTION_LABEL[action].toLowerCase()} an order that's in ${statusLabel(from)}.`,
    };
  }

  const at = new Date().toISOString();
  const move = async (
    to: string,
    set: Parameters<typeof applyTransition>[3] = {},
    note?: string,
    unset: Parameters<typeof applyTransition>[4] = [],
  ): Promise<ActionResult> => {
    const res = await applyTransition(
      orderId,
      from,
      { at, action, from, to, ...(note ? { note } : {}) },
      { ...set, opsStatus: to },
      unset,
    );
    return res.error ? { error: res.error } : { ok: true, status: to };
  };

  switch (action) {
    case "modify": {
      const a = (payload.address ?? {}) as Record<string, unknown>;
      const address = {
        firstName: str(a.firstName),
        lastName: str(a.lastName),
        phone: str(a.phone),
        address1: str(a.address1),
        address2: str(a.address2),
        city: str(a.city),
        zip: str(a.zip),
        provinceCode: str(a.provinceCode),
        countryCode: str(a.countryCode),
      };
      if (!address.address1 || !address.city) {
        return { error: "Street address and city are required." };
      }
      const note = payload.note === undefined ? undefined : String(payload.note);
      const email = payload.email === undefined ? undefined : str(payload.email);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email address doesn't look right." };
      const saved = await updateOrderShipping(orderId, address, note, email);
      if (saved.error) return { error: `Shopify didn't save the change: ${saved.error}` };

      const issues = checkAddress({
        ...address,
        name: `${address.firstName} ${address.lastName}`,
        country: address.countryCode,
      });
      return move(
        from,
        { modified: true, flags: issues },
        issues.length ? `Address edited — still flagged: ${issues.join(" ")}` : "Address edited — passes checks",
      );
    }

    case "move_active": {
      if (from === "exception" && !doc.modified && payload.confirmed !== true) {
        return { needsConfirmation: MALFORMED_CONFIRMATION };
      }
      const note =
        from === "pending_cc"
          ? "Bank deposit cleared"
          : doc.modified
            ? "Moved after modification"
            : "Moved without modification (confirmed)";
      return move("active", {}, note);
    }

    case "move_exception":
      return move("exception", { modified: false }, str(payload.reason) || undefined);

    case "discard":
      return move("canceled", {}, str(payload.reason) || "Discarded");

    case "create_package": {
      const brief = await readOrderBrief(orderId);
      if (!brief.order) return { error: brief.error };
      const tagged = await setOrderTags(orderId, [PACKAGED_TAG], "add");
      if (tagged.error) return { error: `Couldn't tag the order in Shopify: ${tagged.error}` };
      return move("packaged", {
        number: brief.order.number,
        total: brief.order.total,
        codAmount: brief.order.outstanding,
      });
    }

    case "unpackage": {
      const untagged = await setOrderTags(orderId, [PACKAGED_TAG], "remove");
      if (untagged.error) return { error: `Couldn't untag the order in Shopify: ${untagged.error}` };
      return move("active");
    }

    // The consignment ID is generated from the schema chosen in Settings
    // (src/config/consignment-schema.ts) — never typed in. `courier` is a
    // COURIERS value, a custom courier name, or "auto" to pick by the shipping city.
    case "assign_consignment": {
      const brief = await readOrderBrief(orderId);
      if (!brief.order) return { error: brief.error };
      const city = brief.order.address?.city ?? "";
      const requested = str(payload.courier) || "auto";
      const picked = normalizeCourier(requested === "auto" ? defaultCourierFor(city) : requested);
      if (!picked.courier) return { error: picked.error };
      const courier = picked.courier;

      const { consignmentTemplate } = await readAppSettings();
      const consignmentId = renderConsignmentId(consignmentTemplate, {
        city,
        courier: courierCode(courier),
        orderNumber: brief.order.number,
        ms: nextConsignmentMs(),
      });
      return move(
        "finalized",
        { courier, consignmentId, city },
        `Consignment ${consignmentId} generated (${courier})`,
        ["bookingError"],
      );
    }

    case "print_label": {
      // A label QR scanned while still Finalized also lands here (see SCAN_ADVANCE).
      const scanned = str(payload.via) === "QR scan";
      return from === "in_pickup_packing"
        ? move(from, {}, "Shipping label reprinted")
        : move(
            "in_pickup_packing",
            { labelPrintedAt: at },
            scanned ? "Label QR scanned — ready for pickup" : "Shipping label printed",
          );
    }

    // Every dispatched parcel goes on a load sheet: `target` is "auto" (the
    // courier's open Draft sheet, opened if none — the default, used by scans),
    // "new", or a Draft sheet's id. See resolveLoadSheet() in dispatch.ts.
    case "dispatch":
    case "add_to_load_sheet": {
      if (action === "add_to_load_sheet" && doc.loadSheet) {
        return { error: `Already on load sheet ${doc.loadSheet}.` };
      }
      if (!doc.consignmentId || !doc.courier) {
        return { error: "No consignment on this order — assign one before it goes on a load sheet." };
      }
      // The sheet is always the user's choice (an open sheet's id, or "new").
      const resolved = await resolveLoadSheet(doc.courier, payload.target, str(payload.location) || undefined);
      if (!resolved.sheet) return { error: resolved.error };
      const { id: sheetId, reference } = resolved.sheet;

      const via = str(payload.via) || "button";
      const res =
        action === "dispatch"
          ? await move("dispatched", { dispatchedAt: at, loadSheet: reference }, `Dispatched (${via}) onto load sheet ${reference}`)
          : await move(from, { loadSheet: reference }, `Added to load sheet ${reference}`);
      if (res.error) return res;

      const attached = await attachToLoadSheet(sheetId, {
        consignmentId: doc.consignmentId,
        total: doc.total ?? 0,
        codAmount: doc.codAmount ?? 0,
      });
      if (attached.error) {
        return { error: `${action === "dispatch" ? "Dispatched" : "Recorded"}, but ${reference} wasn't updated: ${attached.error}` };
      }
      return { ...res, loadSheet: reference, loadSheetId: sheetId };
    }

    case "remove_from_sheet":
    case "move_to_sheet": {
      if (!doc.loadSheet) return { error: "This parcel isn't on a load sheet." };
      const current = await findSheetByReference(doc.loadSheet);
      if (current.error) return { error: current.error };
      if (current.sheet && current.sheet.status !== "draft") {
        return { error: `${doc.loadSheet} has been handed over — its parcels can't be moved off it.` };
      }
      const parcel = { consignmentId: doc.consignmentId ?? "", total: doc.total ?? 0, codAmount: doc.codAmount ?? 0 };

      if (action === "remove_from_sheet") {
        const res = await move("in_pickup_packing", {}, `Taken off load sheet ${doc.loadSheet} — back to In Pickup & Packing`, [
          "loadSheet",
          "dispatchedAt",
        ]);
        if (res.error) return res;
        if (current.sheet) await detachFromLoadSheet(current.sheet.id, parcel);
        return res;
      }

      const resolved = await resolveLoadSheet(doc.courier ?? "", payload.target, str(payload.location) || undefined);
      if (!resolved.sheet) return { error: resolved.error };
      if (resolved.sheet.reference === doc.loadSheet) return { error: `Already on ${doc.loadSheet}.` };
      const res = await move(from, { loadSheet: resolved.sheet.reference }, `Moved from load sheet ${doc.loadSheet} to ${resolved.sheet.reference}`);
      if (res.error) return res;
      if (current.sheet) await detachFromLoadSheet(current.sheet.id, parcel);
      const attached = await attachToLoadSheet(resolved.sheet.id, parcel);
      if (attached.error) return { error: `Moved, but ${resolved.sheet.reference} wasn't updated: ${attached.error}` };
      return { ...res, loadSheet: resolved.sheet.reference, loadSheetId: resolved.sheet.id };
    }

    case "mark_fulfilled": {
      const done = await fulfillOrder(orderId, {
        company: doc.courier ?? MANUAL_COURIER,
        number: doc.consignmentId ?? "",
      });
      if (done.error) return { error: `Shopify didn't fulfil the order: ${done.error}` };
      const via = str(payload.via);
      return move(
        "fulfilled",
        { fulfilledAt: at },
        via === "QR scan" ? "Delivered — label scanned, fulfilled in Shopify" : "Delivered — fulfilled in Shopify",
      );
    }

    case "mark_delivered":
      return move("delivered", { deliveredAt: at }, str(payload.note) || "Delivered — confirmed by the courier");

    case "mark_returned": {
      const reason = str(payload.reason);
      return move("returned", { returnedAt: at }, reason ? `Returned to origin — ${reason}` : "Returned to origin (RTO)");
    }

    case "cancel": {
      const reason = str(payload.reason);
      if (from === "in_pickup_packing") {
        return move("finalized", {}, reason || "Pickup cancelled — back to Finalized", ["labelPrintedAt"]);
      }
      if (!reason) return { error: "A reason is required to cancel a finalized order." };
      return move(
        "canceled",
        { cancelReason: reason },
        `Cancelled: ${reason}${doc.consignmentId ? ` (consignment ${doc.consignmentId} released)` : ""}`,
        ["consignmentId"],
      );
    }
  }
}

/** The subset of Shopify's REST-format `orders/create` webhook payload intake reads. */
interface OrderWebhookPayload {
  id?: number | string;
  name?: string;
  phone?: string;
  source_name?: string;
  payment_gateway_names?: string[];
  customer?: { phone?: string };
  shipping_address?: {
    name?: string;
    first_name?: string;
    last_name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    zip?: string;
    country?: string;
    country_code?: string;
    phone?: string;
  } | null;
}

/** orders/create: check the address, pick the starting tab, record it. Idempotent. */
export async function intakeFromWebhook(p: OrderWebhookPayload): Promise<{ error?: string }> {
  if (!p.id) return { error: "Payload has no order id." };
  // Point-of-sale orders are handed over at the till — nothing to ship.
  if (p.source_name === "pos") return {};
  const a = p.shipping_address;
  const issues = checkAddress(
    a
      ? {
          name: a.name || [a.first_name, a.last_name].filter(Boolean).join(" "),
          address1: a.address1,
          address2: a.address2,
          city: a.city,
          zip: a.zip,
          country: a.country_code || a.country,
          phone: a.phone || p.phone || p.customer?.phone,
        }
      : null,
  );
  const status = routeNewOrder(issues, p.payment_gateway_names ?? []);
  const note =
    status === "exception"
      ? `Flagged on intake: ${issues.join(" ")}`
      : status === "pending_cc"
        ? "Awaiting bank deposit clearance"
        : "Passed intake checks";
  return intakeOrder(String(p.id), {
    opsStatus: status,
    number: p.name ?? "",
    flags: issues,
    note,
  });
}
