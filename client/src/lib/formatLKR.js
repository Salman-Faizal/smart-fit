/**
 * Format a number as LKR currency string.
 * e.g. formatLKR(4500) → "LKR 4,500"
 *      formatLKR(1250.50) → "LKR 1,251"
 */
export function formatLKR(amount) {
  const num = Math.round(Number(amount) || 0);
  return `LKR ${num.toLocaleString("en-LK")}`;
}
