import { logger } from "@/utils/devLogger";
import {
  trackGA4EcommerceEvent,
  trackGA4Event,
  formatGA4Item,
} from "@/utils/ga4Events";
import {
  trackTikTokAddToCart,
  trackTikTokInitiateCheckout,
  trackTikTokPurchase,
  trackTikTokViewContent,
  trackTikTokSearch,
} from "@/utils/tiktokEvents";
import { trackNorthbeamPurchase } from "@/utils/northbeamEvents";
import { hashEmail, hashPhone } from "./hash";
import { mapOrderToEcommerce } from "./mappers";
import { getCurrency } from "@/lib/constants/currency";

const hasWindow = () => typeof window !== "undefined";

const setOnce = (key) => {
  try {
    if (!hasWindow()) return false;
    const storage = window.sessionStorage;
    if (!storage) return false;
    if (storage.getItem(key)) return false;
    storage.setItem(key, "1");
    return true;
  } catch {
    return true; // in case sessionStorage is unavailable, allow once per session
  }
};

export const analyticsService = {
  /**
   * Track headless page view for SPA navigations
   * @param {Object} params
   * @param {string} params.page_title
   * @param {string} params.page_path
   * @param {string} [params.page_location]
   */
  trackHeadlessPageView({ page_title, page_path, page_location }) {
    try {
      const payload = {
        page_title,
        page_location:
          page_location || (hasWindow() ? window.location.href : page_path),
        page_path,
      };
      trackGA4Event("headless_page_view", payload, true);
    } catch (error) {
      logger.error("[Analytics] Error tracking headless_page_view:", error);
    }
  },

  // Backward compatibility: alias old name to new behavior
  trackVirtualPageView(params) {
    return this.trackHeadlessPageView(params);
  },

  /**
   * Track remove_from_cart
   * @param {Object} product
   * @param {number} quantity
   * @param {Object} additionalData
   */
  trackRemoveFromCart(product, quantity = 1, additionalData = {}) {
    try {
      const item = formatGA4Item(product, quantity);
      const ecommerce = {
        currency: getCurrency(),
        value:
          (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1),
        items: [item],
      };
      trackGA4EcommerceEvent(
        "remove_from_cart",
        ecommerce,
        additionalData,
        true
      );
    } catch (error) {
      logger.error("[Analytics] Error tracking remove_from_cart:", error);
    }
  },

  /**
   * Track view_item
   * @param {Object} product
   * @param {Object} additionalData
   */
  trackViewItem(product, additionalData = {}) {
    try {
      const item = formatGA4Item(product);
      const ecommerce = {
        currency: getCurrency(),
        value: item.price,
        items: [item],
      };

      // Track GA4 event
      trackGA4EcommerceEvent("view_item", ecommerce, additionalData, true);

      // Track TikTok event
      trackTikTokViewContent(product, additionalData, true);
    } catch (error) {
      logger.error("[Analytics] Error tracking view_item:", error);
    }
  },

  /**
   * Track add_to_cart
   * @param {Object} product
   * @param {number} quantity
   * @param {Object} additionalData
   */
  trackAddToCart(product, quantity = 1, additionalData = {}) {
    try {
      const item = formatGA4Item(product, quantity);
      const ecommerce = {
        currency: getCurrency(),
        value: item.price * quantity,
        items: [item],
      };

      // Track GA4 event
      trackGA4EcommerceEvent("add_to_cart", ecommerce, additionalData, true);

      // Track TikTok event
      trackTikTokAddToCart(product, quantity, additionalData, true);
    } catch (error) {
      logger.error("[Analytics] Error tracking add_to_cart:", error);
    }
  },

  /**
   * Track view_cart
   * @param {Array<{product: any, quantity: number}>} cartItems
   * @param {Object} additionalData
   */
  trackViewCart(cartItems = [], additionalData = {}) {
    try {
      const items = cartItems.map((ci) =>
        formatGA4Item(ci.product, ci.quantity)
      );
      const value = items.reduce(
        (sum, it) =>
          sum + (parseFloat(it.price) || 0) * (parseInt(it.quantity, 10) || 1),
        0
      );
      const ecommerce = {
        currency: getCurrency(),
        value,
        items,
      };
      trackGA4EcommerceEvent("view_cart", ecommerce, additionalData, true);
    } catch (error) {
      logger.error("[Analytics] Error tracking view_cart:", error);
    }
  },

  /**
   * Track begin_checkout
   * @param {Array<{product: any, quantity: number}>} cartItems
   * @param {Object} additionalData
   */
  trackBeginCheckout(cartItems = [], additionalData = {}) {
    try {
      const items = cartItems.map((ci) =>
        formatGA4Item(ci.product, ci.quantity)
      );
      const value = items.reduce(
        (sum, it) =>
          sum + (parseFloat(it.price) || 0) * (parseInt(it.quantity, 10) || 1),
        0
      );
      const ecommerce = {
        currency: getCurrency(),
        value,
        items,
      };

      // Track GA4 event
      trackGA4EcommerceEvent("begin_checkout", ecommerce, additionalData, true);

      // Track TikTok event
      trackTikTokInitiateCheckout(cartItems, additionalData, true);
    } catch (error) {
      logger.error("[Analytics] Error tracking begin_checkout:", error);
    }
  },

  /**
   * Track purchase event with GA4 ecommerce payload and Attentive-compatible hashes
   * @param {Object} order
   */
  async trackPurchase(order) {
    try {
      if (!order || !order.id) return;

      // Separate idempotency guards per integration to avoid blocking S2S
      const guardKeyGA4 = `analytics:purchase:ga4:${order.id}`;
      const guardKeyNB = `analytics:purchase:nb:${order.id}`;

      const ecommerce = await mapOrderToEcommerce(order);

      // Establish a canonical purchase timestamp shared with GTM and S2S
      const approximateNow = Date.now();
      const candidates = [
        order?.date_paid_gmt,
        order?.date_created_gmt,
        order?.date_paid,
        order?.date_completed,
        order?.date_created,
      ];
      let chosen = candidates.find((d) => Number.isFinite(Date.parse(d)));
      let chosenMs = Number.isFinite(Date.parse(chosen))
        ? Date.parse(chosen)
        : approximateNow;
      // Clamp to near-now if skew is beyond 2h (prevents stale WP dates)
      if (Math.abs(approximateNow - chosenMs) > 2 * 60 * 60 * 1000) {
        chosenMs = approximateNow;
      }
      const canonicalTimeIso = new Date(chosenMs).toISOString();

      // Establish a canonical customer_id aligned with WP/WC and Northbeam
      // Prefer Woo user id, then email, then phone. For email/phone, prefer Northbeam schema
      const rawCustomerId = order?.customer_id;
      const nbEmail = (order?.customer_email || "")
        .toString()
        .trim()
        .toLowerCase();
      const wcEmail = (order?.billing?.email || "")
        .toString()
        .trim()
        .toLowerCase();
      const chosenEmail = nbEmail || wcEmail;
      const nbPhone = (order?.customer_phone_number || "").toString();
      const wcPhone = (order?.billing?.phone || "").toString();
      const chosenPhone = nbPhone || wcPhone;
      let canonicalCustomerId = "";
      if (rawCustomerId && Number(rawCustomerId) > 0) {
        canonicalCustomerId = `wc:${String(rawCustomerId)}`;
      } else if (chosenEmail) {
        canonicalCustomerId = `email:${chosenEmail}`;
      } else if (chosenPhone) {
        const digits = chosenPhone.replace(/\D+/g, "");
        if (digits) canonicalCustomerId = `phone:${digits}`;
      }

      // Build Attentive-required hashed fields
      const billingEmail = order?.billing?.email || "";
      const billingPhone = order?.billing?.phone || "";
      const [billing_email_hash, billing_phone_hash] = await Promise.all([
        hashEmail(billingEmail),
        // Always default to CA for normalization safety
        hashPhone(billingPhone, "CA"),
      ]);

      const additionalData = {
        order_data: {
          billing_email_hash,
          billing_phone_hash,
        },
        // Provide canonical fields for downstream integrations
        time_of_purchase_iso: canonicalTimeIso,
        customer_id: canonicalCustomerId,
        customer_id_canonical: canonicalCustomerId,
      };

      // Track GA4/TikTok once per session; do not block Northbeam if already sent earlier
      if (setOnce(guardKeyGA4)) {
        if (logger && logger.log) {
          logger.log("[Analytics] purchase parity", {
            order_id: order?.id,
            pixel_time_of_purchase: canonicalTimeIso,
            customer_id_canonical: canonicalCustomerId,
          });
        }
        trackGA4EcommerceEvent(
          "purchase",
          { ...ecommerce, time_of_purchase: canonicalTimeIso },
          additionalData,
          true
        );
        // Track TikTok event
        trackTikTokPurchase(order, additionalData, true);
      }

      // Track Northbeam event (await to reduce pixel-only cases)
      // Optionally guard NB separately; allow if not sent this session
      if (setOnce(guardKeyNB)) {
        await trackNorthbeamPurchase(order, additionalData, true);
      } else {
        // If already sent this session, still attempt once more if previous attempts failed silently
        try {
          await trackNorthbeamPurchase(order, additionalData, true);
        } catch (_) {}
      }
    } catch (error) {
      logger.error("[Analytics] Error tracking purchase:", error);
    }
  },

  /**
   * Track a custom event (fallback)
   */
  trackCustomEvent(eventName, eventData = {}) {
    try {
      trackGA4Event(eventName, eventData, true);
    } catch (error) {
      logger.error(
        `[Analytics] Error tracking custom event "${eventName}":`,
        error
      );
    }
  },
};
