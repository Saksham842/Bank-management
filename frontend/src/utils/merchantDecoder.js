/**
 * merchantDecoder.js
 * Decodes cryptic bank transaction codes into plain-English merchant names.
 * Works locally first with a curated lookup table, then optionally via Gemini API.
 */

// ─── Local lookup dictionary ──────────────────────────────────────────────────
const MERCHANT_LOOKUP = {
  // Food & Dining
  "zomato": "Zomato Food Delivery",
  "swiggy": "Swiggy Food Delivery",
  "blinkit": "Blinkit Grocery",
  "zepto": "Zepto Quick Commerce",
  "dunzo": "Dunzo Delivery",
  "mcd": "McDonald's",
  "kfc": "KFC Restaurant",
  "dominos": "Domino's Pizza",
  "starbucks": "Starbucks Coffee",
  // Transport
  "uber": "Uber Ride",
  "ola": "Ola Cab",
  "rapido": "Rapido Bike Taxi",
  "irctc": "IRCTC Train Ticket",
  "ixigo": "IXIGO Travel Booking",
  "makemytrip": "MakeMyTrip Travel",
  "goibibo": "Goibibo Booking",
  "redbus": "RedBus Bus Ticket",
  "hp petro": "HP Fuel Station",
  "ioc": "Indian Oil Fuel",
  "bpcl": "Bharat Petroleum",
  // Shopping
  "amzn": "Amazon India",
  "amazon": "Amazon India",
  "flipkart": "Flipkart",
  "myntra": "Myntra Fashion",
  "meesho": "Meesho",
  "ajio": "AJIO Fashion",
  "nykaa": "Nykaa Beauty",
  "tatacliq": "Tata CLiQ",
  // Entertainment
  "netflix": "Netflix Subscription",
  "spotify": "Spotify Music",
  "prime video": "Amazon Prime Video",
  "hotstar": "Disney+ Hotstar",
  "zee5": "ZEE5 Streaming",
  "sony liv": "SonyLIV",
  // Bills & Utilities
  "bescom": "BESCOM Electricity Bill",
  "msedcl": "MSEDCL Electricity",
  "bsnl": "BSNL Telecom",
  "jio": "Jio Telecom",
  "airtel": "Airtel Telecom",
  "vi ": "Vi (Vodafone Idea)",
  "tata sky": "Tata Play DTH",
  // Health
  "apollo": "Apollo Pharmacy",
  "medplus": "MedPlus Pharmacy",
  "1mg": "1mg Online Pharmacy",
  "netmeds": "Netmeds Pharmacy",
  // Finance & Investment
  "zerodha": "Zerodha Broker",
  "groww": "Groww Investment",
  "paytm money": "Paytm Money Investment",
  "mutual fund": "Mutual Fund SIP",
  "nps": "National Pension Scheme",
  // Banks
  "neft": "NEFT Bank Transfer",
  "imps": "IMPS Instant Payment",
  "rtgs": "RTGS Wire Transfer",
  "upi": "UPI Payment",
  "nach": "NACH Auto-Debit",
};

/**
 * Decode a raw merchant string into a human-readable name.
 * Falls back to a cleaned version of the original if no match found.
 */
export const decodeMerchant = (rawMerchant) => {
  if (!rawMerchant) return "Unknown Merchant";

  const lower = rawMerchant.toLowerCase();

  // Check lookup table
  for (const [key, value] of Object.entries(MERCHANT_LOOKUP)) {
    if (lower.includes(key)) return value;
  }

  // Clean up common bank code patterns
  let cleaned = rawMerchant
    .replace(/^(NEFT|IMPS|UPI|POS|ATW|ACH|NACH|EMI)\s*/i, "")
    .replace(/\b[A-Z0-9]{8,}\b/g, "") // Remove long alphanumeric codes
    .replace(/\d{6,}/g, "") // Remove long numbers
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || rawMerchant;
};

/**
 * Async version: tries local first, then calls Gemini if API is available
 * and the local match has low confidence.
 */
export const decodeMerchantAsync = async (rawMerchant) => {
  // First try local decode
  const local = decodeMerchant(rawMerchant);

  // If local found a real match (not just cleaned version), return it
  const lower = rawMerchant?.toLowerCase() || "";
  const hasLocalMatch = Object.keys(MERCHANT_LOOKUP).some(k => lower.includes(k));
  if (hasLocalMatch) return { name: local, source: "local" };

  // Try Gemini API if available
  try {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const res = await fetch(`${apiBase}/ai/decode-merchant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ merchant: rawMerchant }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.decoded) return { name: data.decoded, source: "ai" };
    }
  } catch (_) {
    // Backend unavailable — use local result
  }

  return { name: local, source: "local" };
};
