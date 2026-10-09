// ponytail: manual-verify only; plug PayMongo/Xendit here when keys exist
export const METHODS = [
  { id: "gcash", label: "GCash" },
  { id: "card", label: "Card" },
  { id: "bank", label: "Bank Transfer" },
];

export function paymentInstructions(method, s) {
  if (method === "gcash") return `Send to GCash ${s.gcash_no} (${s.gcash_name}). Upload screenshot + ref.`;
  if (method === "bank") return `Transfer to ${s.bank_acct} (${s.bank_name}) via InstaPay/bank. Upload proof + ref.`;
  return `Card payments via PayMongo (stub). If not configured, pay on-site / choose GCash.`;
}

// Future gateway hook — returns {mode:'manual'} today so UI falls back to screenshot verify.
// When PAYMONGO_SECRET exists, implement fetch to PayMongo Links API here and return {mode:'gateway', url}.
export async function createIntent({ method, amount, ref }) {
  if (method === "card" && process.env.PAYMONGO_SECRET) {
    // TODO: POST https://api.paymongo.com/v1/links with amount*100
    return { mode: "gateway", url: null, ref };
  }
  return { mode: "manual", ref, amount };
}
