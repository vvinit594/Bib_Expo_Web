const SIZE_ORDER = ["XXXL", "XXL", "XL", "XS", "S", "M", "L"];

/**
 * Extract size category from T-Shirt Size values like "L-42", "S-38", "XXL-48", "Select"
 * Returns normalized size: XS | S | M | L | XL | XXL | XXXL | null
 */
export function extractTshirtSizeCategory(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const s = String(raw).trim().toUpperCase();
  if (!s || s === "SELECT") return null;
  // Match longest first (XXXL, XXL, XL, XS, then S, M, L)
  for (const size of SIZE_ORDER) {
    if (s.startsWith(size) || s === size) return size;
  }
  // Fallback: take part before hyphen if present
  const beforeHyphen = s.split(/[-–]/)[0]?.trim();
  if (beforeHyphen && SIZE_ORDER.includes(beforeHyphen)) return beforeHyphen;
  // Single letter
  if (["S", "M", "L"].includes(s[0] ?? "")) return s[0];
  return null;
}

export const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

export type TshirtInventory = Record<string, number>;

export function getDefaultTshirtInventory(): TshirtInventory {
  return { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 };
}
