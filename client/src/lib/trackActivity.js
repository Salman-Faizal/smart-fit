import { API } from "./api";
import { storage } from "./storage";

/**
 * Returns a stable session ID for the current browser session.
 * Generated once per tab and stored in sessionStorage so it resets on
 * every new tab/window (matching a true "session" boundary).
 */
function getSessionId() {
  const KEY = "sf_session_id";
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

/**
 * Silently fire a tracking event to /api/activity/track.
 *
 * This function is intentionally fire-and-forget:
 *   - Never throws or rejects
 *   - No loading state, no UI feedback
 *   - Uses keepalive so the request survives page navigations
 *
 * @param {string} eventType  - One of: view | wishlist_add | wishlist_remove |
 *                              cart_add | purchase | recommendation_click |
 *                              category_click | search
 * @param {string|null} productId - MongoDB ObjectId string of the product (if applicable)
 * @param {object} [metadata] - Optional extra payload (duration, source, position, etc.)
 */
export function trackActivity(eventType, productId = null, metadata = {}) {
  try {
    const token = storage.getToken();

    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch(`${API}/activity/track`, {
      method: "POST",
      headers,
      // keepalive lets the browser complete the request even if the page is
      // being unloaded (e.g. user navigates away right after a click)
      keepalive: true,
      body: JSON.stringify({
        eventType,
        productId,
        sessionId: getSessionId(),
        metadata,
      }),
    }).catch(() => {
      // Swallow network errors — tracking must never surface to the user
    });
  } catch {
    // Swallow any synchronous errors (e.g. sessionStorage not available in SSR)
  }
}
