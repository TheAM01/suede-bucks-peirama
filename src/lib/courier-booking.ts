import "server-only";
import type { OrderBrief } from "./shopify-order-detail";

/**
 * Courier booking — turns a packaged order into a consignment id. One adapter
 * per API-capable courier (see COURIERS in src/config/order-workflow.ts);
 * couriers without an adapter (the in-city manual courier) always take a
 * hand-entered consignment id instead.
 *
 * Insta's booking API isn't wired up yet — its adapter reports that plainly
 * so the order lands in Booking Failed with a readable reason, and staff can
 * book in Insta's portal and enter the consignment id manually meanwhile.
 * To wire it up: implement `book()` below against Insta's API (credentials
 * belong in the Integrations store, src/lib/integrations.ts, not env vars).
 */

interface CourierAdapter {
  book(order: OrderBrief): Promise<{ consignmentId?: string; error?: string }>;
}

const ADAPTERS: Record<string, CourierAdapter> = {
  Insta: {
    async book() {
      return {
        error:
          "Insta's booking API isn't connected yet — book it in Insta's portal and enter the consignment ID manually.",
      };
    },
  },
};

export async function bookConsignment(
  courier: string,
  order: OrderBrief,
): Promise<{ consignmentId?: string; error?: string }> {
  const adapter = ADAPTERS[courier];
  if (!adapter) return { error: `${courier} has no booking API — enter the consignment ID manually.` };
  try {
    const res = await adapter.book(order);
    if (!res.error && !res.consignmentId) return { error: `${courier} returned no consignment ID.` };
    return res;
  } catch {
    return { error: `Couldn't reach ${courier}'s booking API.` };
  }
}
