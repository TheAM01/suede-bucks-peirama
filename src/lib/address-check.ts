/**
 * Shipping-address sanity check run on every new order (see the orders/create
 * webhook) and again after staff modify an address. Heuristic, not a geocoder:
 * it catches the common junk a courier can't deliver to — blank or
 * very short addresses, placeholder text, keyboard mashing, runs of one
 * character, symbol soup, and unusable phone numbers. Client-safe (pure),
 * so the Modify form can preview the same issues before saving.
 */

export interface AddressInput {
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  zip?: string;
  country?: string;
  phone?: string;
}

const MIN_ADDRESS_LENGTH = 12;
const PLACEHOLDER_WHOLE = /^(test|testing|asdf|qwerty|abc|xyz|n\/?a|none|null|nil|unknown|same|address|home|-+|\.+)$/i;
const PLACEHOLDER_WORD = /\b(test|asdf|qwerty|dummy|fake|lorem|ipsum)\b/i;

const clean = (v: unknown): string => (v == null ? "" : String(v)).trim();

function isPakistan(country: string): boolean {
  return country === "" || /^(pk|pakistan)$/i.test(country);
}

/** Returns a list of human-readable problems; empty means the address looks deliverable. */
export function checkAddress(a: AddressInput | null | undefined): string[] {
  if (!a) return ["No shipping address on the order."];

  const issues: string[] = [];
  const line = [clean(a.address1), clean(a.address2)].filter(Boolean).join(", ");
  const city = clean(a.city);
  const phone = clean(a.phone);

  if (!clean(a.name)) issues.push("No recipient name.");

  if (!line) {
    issues.push("Street address is missing.");
  } else {
    if (line.length < MIN_ADDRESS_LENGTH) {
      issues.push(`Address is too short to deliver to (under ${MIN_ADDRESS_LENGTH} characters).`);
    }
    if (!/[a-z]/i.test(line)) {
      issues.push("Address has no street or area words — only numbers or symbols.");
    }
    if (PLACEHOLDER_WHOLE.test(line) || PLACEHOLDER_WORD.test(line)) {
      issues.push("Address looks like placeholder or test text.");
    }
    if (/(.)\1{3,}/.test(line.replace(/\s/g, ""))) {
      issues.push("Address contains a run of repeated characters.");
    }
    const mashed = line
      .split(/[^a-z]+/i)
      .some((w) => w.length >= 6 && !/[aeiouy]/i.test(w));
    if (mashed) issues.push("Address contains what looks like keyboard mashing.");
    const symbols = line.replace(/[a-z0-9\s,.\-/#]/gi, "").length;
    if (symbols / line.length > 0.3) issues.push("Address is mostly symbols.");
    // "Karachi", "Karachi Pakistan", "Lahore, PK" — nothing a rider can find.
    let rest = line.toLowerCase().replace(/\b(pakistan|pk)\b/g, "");
    if (city) rest = rest.split(city.toLowerCase()).join("");
    if (rest.replace(/[^a-z0-9]/g, "").length < 4) {
      issues.push("Address is only the city or country — no street or area.");
    }
  }

  if (!city) {
    issues.push("City is missing.");
  } else if (city.length < 3 || /\d/.test(city)) {
    issues.push("City name looks invalid.");
  }

  if (!phone) {
    issues.push("No phone number for the courier to call.");
  } else {
    const digits = phone.replace(/\D/g, "");
    const ok = isPakistan(clean(a.country))
      ? /^(?:0092|92|0)?3\d{9}$/.test(digits) || /^(?:0092|92|0)?[1-9]\d{8,9}$/.test(digits)
      : digits.length >= 7 && digits.length <= 15;
    if (!ok) issues.push("Phone number doesn't look valid.");
  }

  return issues;
}

/** Gateway names Shopify uses for manual bank deposit / transfer methods. */
export function isBankDeposit(gateway: string): boolean {
  return /bank|deposit|transfer|ibft/i.test(gateway);
}

/**
 * Where a brand-new order starts: address problems always win (Exception);
 * otherwise an order paid only by bank deposit waits for the deposit to clear
 * (Pending CC); everything else — PayFast, COD, etc — goes straight to Active.
 */
export function routeNewOrder(
  issues: string[],
  gateways: string[],
): "exception" | "pending_cc" | "active" {
  if (issues.length > 0) return "exception";
  const g = gateways.map((x) => x.trim()).filter(Boolean);
  if (g.length > 0 && g.every(isBankDeposit)) return "pending_cc";
  return "active";
}
