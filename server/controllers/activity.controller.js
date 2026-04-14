const UserActivity = require("../models/UserActivity");
const ProductInteraction = require("../models/ProductInteraction");

// Maps the public eventType string the client sends to the UserActivity enum value
// and whether it should also create a ProductInteraction record.
const EVENT_CONFIG = {
  view: {
    userActivityEvent: "view",
    productInteractionEvent: "view",
  },
  wishlist_add: {
    userActivityEvent: "wishlist_add",
    productInteractionEvent: "wishlist",
  },
  wishlist_remove: {
    userActivityEvent: "wishlist_remove",
    productInteractionEvent: null, // removals don't create a positive interaction
  },
  cart_add: {
    userActivityEvent: "cart_add",
    productInteractionEvent: "cart",
  },
  purchase: {
    userActivityEvent: "purchase",
    productInteractionEvent: "purchase",
  },
  recommendation_click: {
    userActivityEvent: "recommendation_click",
    productInteractionEvent: "recommendation_click",
  },
  category_click: {
    userActivityEvent: "category_click",
    productInteractionEvent: null,
  },
  search: {
    userActivityEvent: "search",
    productInteractionEvent: null,
  },
};

/**
 * POST /api/activity/track
 *
 * Fire-and-forget: responds 202 immediately, then persists records
 * asynchronously so tracking never blocks the user's request.
 *
 * Body:
 *   eventType   string   required — one of the keys in EVENT_CONFIG
 *   productId   string   optional — MongoDB ObjectId of the product
 *   sessionId   string   required — client-generated session identifier
 *   category    string   optional
 *   searchQuery string   optional
 *   metadata    object   optional — arbitrary payload (duration, source, etc.)
 */
exports.trackEvent = (req, res) => {
  // Respond immediately — caller doesn't wait for DB writes
  res.status(202).end();

  // Everything after this runs in the background
  setImmediate(async () => {
    try {
      const {
        eventType,
        productId = null,
        sessionId,
        category = null,
        searchQuery = null,
        metadata = {},
      } = req.body || {};

      const config = EVENT_CONFIG[eventType];

      // Silently ignore unknown event types or missing sessionId
      if (!config || !sessionId) return;

      const userId = req.user?.id ?? null;
      const timestamp = new Date();

      // Always write a UserActivity record (the full audit log)
      const activityDoc = {
        userId,
        sessionId,
        eventType: config.userActivityEvent,
        productId: productId || null,
        category: category || null,
        searchQuery: searchQuery || null,
        metadata,
        timestamp,
      };

      const saves = [UserActivity.create(activityDoc)];

      // Write a ProductInteraction record only when the event type has a
      // corresponding product-level signal AND a productId was provided.
      if (config.productInteractionEvent && productId) {
        saves.push(
          ProductInteraction.create({
            userId,
            productId,
            eventType: config.productInteractionEvent,
            sessionId,
            timestamp,
          }),
        );
      }

      await Promise.all(saves);
    } catch (_err) {
      // Tracking must never surface errors to the user. Swallow silently.
      // In production, pipe this to your logging/monitoring service.
    }
  });
};
