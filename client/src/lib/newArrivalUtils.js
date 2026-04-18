const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Returns a Set of product IDs that qualify for the "New Arrival" badge.
 * Criteria: created within 7 days AND among the 10 most recently added.
 */
export function computeNewArrivalIds(products) {
  if (!products?.length) return new Set();
  const now = Date.now();
  const qualified = products
    .filter((p) => p.createdAt && now - new Date(p.createdAt).getTime() < SEVEN_DAYS_MS)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);
  return new Set(qualified.map((p) => String(p._id)));
}
