# API Calls Before Checkout Submission

This document lists all API calls made in `CheckoutPageContent.jsx` **BEFORE** the checkout submission (`/api/checkout-new`).

## Summary

**Total API Calls Before Checkout: 2-5 calls** (depending on user actions)
**Reduced from 5-8 calls** (removed 3 redundant calls)

## Detailed Breakdown

### 1. Initial Page Load (useEffect at line 840)

These calls happen automatically when the checkout page loads:

#### 1.1. GET `/api/cart` (Line 466)

- **Function**: `fetchCartItems()`
- **When**: Initial page load
- **Frequency**: **2 times** (once at line 852, again at line 866 if URL params exist)
- **Purpose**: Fetch cart items and populate form data
- **Redundancy**: ⚠️ Called twice if `onboardingAddToCart` parameter exists

#### 1.2. GET `/api/profile?t={timestamp}` (Line 675)

- **Function**: `fetchUserProfile()`
- **When**: After cart loads
- **Frequency**: **1 time** (once per page load)
- **Purpose**: Fetch user profile data (billing/shipping addresses, date of birth)
- **Note**: Uses timestamp to prevent caching

#### 1.3. ~~GET `/api/payment-methods`~~ (REMOVED)

- ~~**Function**: `fetchSavedCards()`~~
- ~~**When**: After profile loads~~
- ~~**Status**: ❌ **REMOVED** - No longer needed~~

### 2. User Interactions (Before Checkout)

These calls happen when the user interacts with the form:

#### 2.1. POST `/api/shipping/calculate-by-cart` (Line 307)

- **Function**: `handleProvinceChange()`
- **When**: User changes province/state
- **Frequency**: **Debounced** (400ms delay after last change)
- **Purpose**: Calculate shipping rates for new address
- **Optimization**: ✅ Debounced to prevent excessive calls on rapid changes

#### 2.2. ~~GET `/api/profile`~~ (Line 237 - OPTIMIZED)

- **Function**: `handleProvinceChange()` (inside age validation)
- **When**: Province changes AND cart has Zonnic products AND no DOB in form
- **Status**: ✅ **OPTIMIZED** - Now uses cached profile data instead of API call
- **Purpose**: Get date of birth for age validation
- **Optimization**: ✅ Uses cached profile data from initial load

### 3. Before Checkout Submission (handleSubmit at line 920)

These calls happen right before submitting the checkout:

#### 3.1. ~~POST `/api/cart/validate`~~ (REMOVED)

- ~~**Function**: `validateCart()`~~
- ~~**When**: Right before checkout submission~~
- ~~**Status**: ❌ **REMOVED** - Backend will handle validation~~

#### 3.2. ~~GET `/api/profile`~~ (REMOVED - Line 1061)

- ~~**Function**: `handleSubmit()` (inside age validation)~~
- ~~**When**: Before checkout AND cart has Zonnic products AND no DOB in form~~
- ~~**Status**: ❌ **REMOVED** - Only uses DOB from form data now~~

## Complete Call Sequence

### Typical Flow (No Province Changes):

1. ✅ GET `/api/cart` (initial load)
2. ✅ GET `/api/cart` (if URL params exist - redundant)
3. ✅ GET `/api/profile?t={timestamp}` (fetch profile)
4. ✅ POST `/api/checkout-new` (CHECKOUT SUBMISSION)

**Total: 2-3 calls before checkout** (reduced from 5-7)

### With Province Changes:

1. ✅ GET `/api/cart` (initial load)
2. ✅ GET `/api/cart` (if URL params exist)
3. ✅ GET `/api/profile?t={timestamp}` (fetch profile)
4. ✅ POST `/api/shipping/calculate-by-cart` (province change #1)
5. ✅ GET `/api/profile` (if Zonnic, province change #1)
6. ✅ POST `/api/shipping/calculate-by-cart` (province change #2)
7. ✅ GET `/api/profile` (if Zonnic, province change #2)
8. ✅ POST `/api/checkout-new` (CHECKOUT SUBMISSION)

**Total: 4-7 calls before checkout** (reduced from 7-10+)

## Redundancies Identified

### 🔴 High Priority

1. **Duplicate `/api/cart` calls** (Lines 466, 466)

   - Called twice if `onboardingAddToCart` exists
   - **Fix**: Cache first result or combine logic

2. **Multiple `/api/profile` calls** (Lines 237, 675, 1061)
   - Called 3 times in different scenarios
   - **Fix**: Cache profile data in state/context

### 🟡 Medium Priority

3. **Shipping calculation on every province change** (Line 307)

   - No debouncing
   - **Fix**: Debounce province change events

4. **Profile fetch with timestamp** (Line 675)
   - Always fetches fresh, even if data hasn't changed
   - **Fix**: Use conditional fetching or cache with TTL

## Recommendations

1. ✅ **Cache profile data**: ✅ IMPLEMENTED - Profile data cached in state, reused for age validation
2. ✅ **Debounce shipping calculation**: ✅ IMPLEMENTED - 400ms debounce added to shipping calculation
3. ✅ **Combine cart fetches**: ✅ IMPLEMENTED - Improved logic to reduce duplicate cart fetches
4. **Use React Query or SWR**: For automatic caching and deduplication of API calls (Future enhancement)

## API Call Count Summary

| Scenario               | Min Calls | Max Calls |
| ---------------------- | --------- | --------- |
| **No interactions**    | 2         | 3         |
| **1 province change**  | 4         | 5         |
| **2 province changes** | 5         | 7         |
| **Multiple changes**   | 5+        | 10+       |

**Average: 3-5 API calls before checkout submission** (reduced from 6-8)
