# Checkout Process API Calls Documentation

This document lists all API calls that occur during the checkout process to help identify redundancies.

## Main Checkout Flow (`components/Checkout/CheckoutPageContent.jsx`)

### Initial Load / Setup
1. **GET `/api/profile`** (Line 237, 1061)
   - Purpose: Fetch user profile data for age validation (Zonnic products)
   - When: On province change and before checkout submission
   - Redundancy: Called multiple times for same data

2. **GET `/api/cart`** (Line 466)
   - Purpose: Fetch cart items
   - When: Component mount and cart refresh
   - Frequency: Multiple times during checkout

3. **GET `/api/payment-methods`** (Line 609)
   - Purpose: Fetch saved payment cards
   - When: Component mount
   - Frequency: Once

4. **GET `/api/profile?t={timestamp}`** (Line 675)
   - Purpose: Fetch user profile with cache busting
   - When: Component mount (address loading)
   - Frequency: Once
   - Redundancy: Similar to `/api/profile` above

### Shipping Calculation
5. **POST `/api/shipping/calculate-by-cart`** (Line 307)
   - Purpose: Calculate shipping rates based on address
   - When: Province/address changes
   - Frequency: Multiple times during address updates

### Before Checkout Submission
6. **POST `/api/update-customer-profile`** (Line 1176)
   - Purpose: Update customer profile permanently in WooCommerce
   - When: Before checkout submission
   - Frequency: Once per checkout
   - Note: Replaces `/api/cart/update-customer` (removed)

### Checkout Submission
7. **POST `/api/checkout-new`** (Line 1371, 1454)
   - Purpose: Create order and process payment
   - When: On checkout form submission
   - Frequency: Once per checkout attempt
   - Note: Handles both saved cards and new Stripe payments

---

## Convert Test Checkout Flow (`components/convert_test/Checkout/CheckoutPageContent.jsx`)

### Initial Load
1. **GET `/api/cart`** - Fetch cart items
2. **GET `/api/payment-methods`** - Fetch saved cards
3. **GET `/api/profile`** - Fetch user profile

### Shipping Calculation
4. **POST `/api/shipping/calculate-by-cart`** - Calculate shipping rates
   - Note: Previously called `/api/cart/update-customer` (removed)

### Before Checkout Submission
5. **POST `/api/update-customer-profile`** (Line 1016)
   - Purpose: Update customer profile
   - Note: Replaces `/api/cart/update-customer` (removed)

### Checkout Submission
6. **POST `/api/create-pending-order`** (Line 1205, 1406)
   - Purpose: Create order without payment (for saved cards and new Stripe)
   - Frequency: Once per checkout

7. **POST `/api/process-payment`** (After order creation)
   - Purpose: Process payment for saved cards
   - Frequency: Once per checkout

8. **POST `/api/process-stripe-payment`** (After order creation)
   - Purpose: Process Stripe payment for new cards
   - Frequency: Once per checkout

---

## Pre-Consultation Checkout (`components/convert_test/PreConsultation/components/CheckoutForm.jsx`)

1. **POST `/api/shipping/calculate-by-cart`** - Calculate shipping
   - Note: Previously called `/api/cart/update-customer` (removed)

---

## ED Flow Checkout (`app/(convert-tests)/(flows)/(ed-flows)/checkoutFlow/page.jsx`)

1. **POST `/api/cart/add`** - Add products to cart
2. **POST `/api/update-customer-profile`** - Update customer profile
   - Note: Previously called `/api/cart/update-customer` (removed)

---

## Removed API Calls

### ❌ `/api/cart/update-customer` (REMOVED)
- **Previous Purpose**: Update customer address data in cart
- **Removed From**:
  - `components/Checkout/CheckoutPageContent.jsx` (Line 1145)
  - `components/convert_test/Checkout/CheckoutPageContent.jsx` (Line 380, 985)
  - `components/convert_test/PreConsultation/components/CheckoutForm.jsx` (Line 183)
  - `app/(convert-tests)/(flows)/(ed-flows)/checkoutFlow/page.jsx` (Line 341)
- **Reason**: Redundant - customer data is now updated via `/api/update-customer-profile` and shipping is calculated separately via `/api/shipping/calculate-by-cart`

---

## Potential Redundancies Identified

1. **Multiple `/api/profile` calls**
   - Called on province change (Line 237)
   - Called before checkout (Line 1061)
   - Called on component mount (Line 675 with timestamp)
   - **Recommendation**: Cache profile data or combine calls

2. **Multiple `/api/cart` calls**
   - Called on component mount
   - Called on cart refresh
   - **Recommendation**: Use cart refresh events to minimize calls

3. **Shipping calculation**
   - `/api/shipping/calculate-by-cart` called multiple times on address changes
   - **Recommendation**: Debounce address change events

---

## API Call Summary

| API Endpoint | Method | Purpose | Frequency | Status |
|-------------|--------|---------|-----------|--------|
| `/api/profile` | GET | Fetch user profile | Multiple | ✅ Active |
| `/api/cart` | GET | Fetch cart items | Multiple | ✅ Active |
| `/api/payment-methods` | GET | Fetch saved cards | Once | ✅ Active |
| `/api/shipping/calculate-by-cart` | POST | Calculate shipping | Multiple | ✅ Active |
| `/api/update-customer-profile` | POST | Update customer profile | Once | ✅ Active |
| `/api/checkout-new` | POST | Create order & payment | Once | ✅ Active |
| `/api/create-pending-order` | POST | Create order (test flow) | Once | ✅ Active |
| `/api/process-payment` | POST | Process payment (test flow) | Once | ✅ Active |
| `/api/process-stripe-payment` | POST | Process Stripe (test flow) | Once | ✅ Active |
| `/api/cart/update-customer` | POST | Update cart customer | N/A | ❌ **REMOVED** |

---

## Notes

- The new checkout flow (`/api/checkout-new`) handles both order creation and payment in a single call
- The convert test flow uses a 3-step process: create order → process payment
- Customer profile updates are now handled separately from cart updates
- Shipping calculation is independent of cart updates

