# Checkout Integration Guide - Store Frontend

This document provides a comprehensive guide for integrating the checkout flow into the store frontend application.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Checkout Flow](#checkout-flow)
4. [Address Management](#address-management)
5. [API Endpoints](#api-endpoints)
6. [Authentication](#authentication)
7. [Payment Integration](#payment-integration)
8. [Request/Response Examples](#requestresponse-examples)
9. [Error Handling](#error-handling)
10. [Frontend Implementation Guide](#frontend-implementation-guide)

---

## Overview

The checkout process converts a shopping cart into an order and creates a Stripe payment intent for pre-authorization. **Authentication is required** for all checkout operations.

### Key Features

- ✅ **Cart to Order Conversion**: Seamlessly convert cart items to orders
- ✅ **Stripe Pre-Authorization**: Payment authorized but not captured immediately
- ✅ **Automatic Subscriptions**: Subscription products automatically create subscription records
- ✅ **Coupon Support**: Apply discount codes during checkout
- ✅ **Address Management**: Shipping and billing address support
- ✅ **Inventory Validation**: Automatic stock availability checks

---

## Prerequisites

### Base URL

```
Development: http://localhost:3000/api/v1
Production: https://your-domain.com/api/v1
```

### Required Headers

All checkout endpoints require:

```http
Content-Type: application/json
Authorization: Bearer <jwt-token>  # Required - User must be authenticated
X-App-Key: <app-key>               # Required for all requests
```

### Environment Setup

Ensure the following environment variables are configured:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Checkout Flow

### High-Level Flow

```
1. User adds items to cart
   ↓
2. User proceeds to checkout
   ↓
3. Validate cart (optional but recommended)
   ↓
4. Fetch user's existing addresses (GET /users/addresses) - optional
   ↓
5. User provides shipping/billing address data (new or existing)
   ↓
6. Create order from cart (POST /orders) with address data
   ↓
7. Addresses created/updated automatically if provided
   ↓
8. Receive payment intent from Stripe
   ↓
9. Confirm payment with Stripe Elements
   ↓
10. Payment authorized (webhook updates order status)
   ↓
11. Order moves to MEDICAL_REVIEW or PROCESSING
```

### Detailed Steps

1. **Cart Management**: User adds products to cart via `POST /cart/items`
2. **Cart Validation**: Validate cart before checkout via `POST /cart/validate`
3. **Fetch Addresses** (Optional): Retrieve user's existing addresses via `GET /users/addresses` to pre-fill forms
4. **Address Collection**: User provides shipping and billing address data (can be new or existing)
5. **Checkout Request**: Send checkout request with cart ID and address data (addresses created/updated automatically)
6. **Payment Intent**: Receive Stripe payment intent client secret
7. **Payment Confirmation**: Use Stripe Elements to confirm payment
8. **Order Confirmation**: Display order confirmation page

---

## Address Management

Addresses can be sent directly with the checkout request and will be **automatically created or updated** by the system. You can optionally fetch existing addresses to pre-fill the checkout form.

### Address Flow

1. **Fetch User Addresses** (Optional): Retrieve existing addresses to pre-fill checkout form
2. **User Provides Address Data**: User enters shipping and billing address information
3. **Send with Checkout**: Include address data in the checkout request
4. **Automatic Creation/Update**: System automatically creates new addresses or updates existing ones

### Address Endpoints

#### Get All Addresses

**Endpoint:** `GET /api/v1/users/addresses`

**Description:** Retrieve all addresses (shipping and billing) for the authenticated user. Use this to pre-fill the checkout form with existing addresses.

**Request:**

```http
GET /api/v1/users/addresses
Authorization: Bearer <token>
```

**Response:**

```json
[
  {
    "id": "addr_123",
    "type": "SHIPPING",
    "firstName": "John",
    "lastName": "Doe",
    "company": "Acme Inc.",
    "addressLine1": "123 Main Street",
    "addressLine2": "Apt 4B",
    "city": "Toronto",
    "state": "ON",
    "postalCode": "M5V 3A8",
    "country": "CA",
    "phone": "+1 416-555-0100",
    "isDefault": true,
    "createdAt": "2025-01-24T10:00:00Z"
  },
  {
    "id": "addr_456",
    "type": "BILLING",
    "firstName": "John",
    "lastName": "Doe",
    "addressLine1": "456 Oak Avenue",
    "city": "Toronto",
    "state": "ON",
    "postalCode": "M5V 3A9",
    "country": "CA",
    "isDefault": true,
    "createdAt": "2025-01-24T10:00:00Z"
  }
]
```

### Address Types

- **SHIPPING**: Address for shipping/delivery
- **BILLING**: Address for billing/invoice

### Address Fields

When sending addresses with the checkout request, use the following fields:

| Field          | Type    | Required | Description                                    |
| -------------- | ------- | -------- | ---------------------------------------------- |
| `type`         | enum    | Yes      | SHIPPING or BILLING                            |
| `firstName`    | string  | Yes      | First name (max 100 chars)                     |
| `lastName`     | string  | Yes      | Last name (max 100 chars)                      |
| `company`      | string  | No       | Company name (max 200 chars)                   |
| `addressLine1` | string  | Yes      | Street address (max 255 chars)                 |
| `addressLine2` | string  | No       | Apartment, suite, etc. (max 255 chars)         |
| `city`         | string  | Yes      | City (max 100 chars)                           |
| `state`        | string  | Yes      | State/Province (max 100 chars)                 |
| `postalCode`   | string  | Yes      | Postal/ZIP code (max 20 chars)                 |
| `country`      | string  | Yes      | Country code (ISO 3166-1 alpha-2, max 2 chars) |
| `phone`        | string  | No       | Phone number                                   |
| `isDefault`    | boolean | No       | Set as default address for this type           |

### Best Practices

1. **Fetch addresses early**: Load user addresses when checkout page loads to pre-fill forms
2. **Use existing addresses**: Allow users to select from existing addresses
3. **Send address data**: Include complete address data in checkout request
4. **Automatic saving**: Addresses are automatically created/updated when sent with checkout
5. **Validate addresses**: Ensure all required fields are filled before checkout

---

## API Endpoints

### 1. Validate Cart (Recommended)

**Endpoint:** `POST /api/v1/cart/validate`

**Description:** Validates cart before checkout to ensure items are available, prices haven't changed, and stock is sufficient.

**Request:**

```http
POST /api/v1/cart/validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "cartId": "cart_123"
}
```

**Response:**

```json
{
  "valid": true,
  "cart": { ... },
  "errors": []
}
```

### 2. Create Order (Checkout)

**Endpoint:** `POST /api/v1/orders`

**Description:** Creates an order from the cart and generates a Stripe payment intent for pre-authorization. Addresses can be provided as IDs (for existing addresses) or as address objects (which will be created/updated automatically).

**Authentication:** Required (JWT token)

**Important:**

- You can provide addresses in two ways:
  1. **Address IDs**: Use existing address IDs (`shippingAddressId`, `billingAddressId`)
  2. **Address Objects**: Send complete address data (`shippingAddress`, `billingAddress`) - addresses will be created/updated automatically
- If address objects are provided, they will be saved to the user's profile for future use
- Billing address is optional - if not provided, shipping address will be used

**Request (with Address IDs):**

```http
POST /api/v1/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "cartId": "cart_123",
  "shippingAddressId": "addr_123",
  "billingAddressId": "addr_456",
  "paymentMethodId": "pm_123"
}
```

**Request (with Address Objects - Recommended):**

```http
POST /api/v1/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "cartId": "cart_123",
  "shippingAddress": {
    "type": "SHIPPING",
    "firstName": "John",
    "lastName": "Doe",
    "company": "Acme Inc.",
    "addressLine1": "123 Main Street",
    "addressLine2": "Apt 4B",
    "city": "Toronto",
    "state": "ON",
    "postalCode": "M5V 3A8",
    "country": "CA",
    "phone": "+1 416-555-0100",
    "isDefault": true
  },
  "billingAddress": {
    "type": "BILLING",
    "firstName": "John",
    "lastName": "Doe",
    "addressLine1": "456 Oak Avenue",
    "city": "Toronto",
    "state": "ON",
    "postalCode": "M5V 3A9",
    "country": "CA",
    "isDefault": true
  },
  "paymentMethodId": "pm_123"
}
```

**Response:**

```json
{
  "order": {
    "id": "order_123",
    "orderNumber": "ORD-250124-0001",
    "status": "DRAFT",
    "paymentStatus": "PENDING",
    "subtotal": "100.00",
    "taxAmount": "13.00",
    "shippingAmount": "10.00",
    "discountAmount": "5.00",
    "totalAmount": "118.00",
    "currency": "CAD",
    "items": [
      {
        "id": "item_123",
        "productId": "prod_123",
        "variantId": "var_123",
        "quantity": 2,
        "unitPrice": "50.00",
        "totalPrice": "100.00",
        "product": {
          "name": "Product Name",
          "sku": "SKU-123"
        }
      }
    ],
    "shippingAddress": { ... },
    "billingAddress": { ... },
    "createdAt": "2025-01-24T10:00:00Z"
  },
  "payment": {
    "clientSecret": "pi_123_secret_abc",
    "paymentIntentId": "pi_123",
    "amount": 11800,
    "currency": "cad",
    "status": "requires_payment_method"
  }
}
```

### 3. Get Order Details

**Endpoint:** `GET /api/v1/orders/:id`

**Description:** Retrieve order details after checkout.

**Request:**

```http
GET /api/v1/orders/order_123
Authorization: Bearer <token>
```

**Response:**

```json
{
  "id": "order_123",
  "orderNumber": "ORD-250124-0001",
  "status": "PENDING",
  "paymentStatus": "AUTHORIZED",
  "totalAmount": "118.00",
  "items": [ ... ],
  "shippingAddress": { ... },
  "billingAddress": { ... }
}
```

### 4. Get Order by Order Number

**Endpoint:** `GET /api/v1/orders/order-number/:orderNumber`

**Description:** Retrieve order using the human-readable order number.

**Request:**

```http
GET /api/v1/orders/order-number/ORD-250124-0001
Authorization: Bearer <token>
```

---

## Authentication

### Authentication Required

All checkout operations require user authentication. Include the JWT token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The user ID is automatically extracted from the token. Users must be logged in to proceed with checkout.

**Important:** If a user is not authenticated, redirect them to the login page before allowing checkout.

---

## Payment Integration

### Stripe Integration

The checkout endpoint returns a Stripe payment intent that must be confirmed on the frontend using Stripe Elements.

### Step 1: Receive Payment Intent

After creating the order, you'll receive:

```json
{
  "payment": {
    "clientSecret": "pi_123_secret_abc",
    "paymentIntentId": "pi_123",
    "amount": 11800,
    "currency": "cad",
    "status": "requires_payment_method"
  }
}
```

### Step 2: Initialize Stripe Elements

```javascript
import { loadStripe } from "@stripe/stripe-js";

const stripe = await loadStripe("pk_test_..."); // Your publishable key
const elements = stripe.elements({
  clientSecret: payment.clientSecret,
});
```

### Step 3: Create Payment Element

```javascript
const paymentElement = elements.create("payment");
paymentElement.mount("#payment-element");
```

### Step 4: Confirm Payment

```javascript
const { error, paymentIntent } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: "https://your-store.com/checkout/success",
  },
  redirect: "if_required",
});

if (error) {
  // Handle error
  console.error(error.message);
} else if (paymentIntent.status === "succeeded") {
  // Payment succeeded
  // Redirect to success page
}
```

### Payment Status Flow

```
requires_payment_method → User needs to add payment method
requires_confirmation → Payment needs confirmation
processing → Payment is being processed
succeeded → Payment succeeded (order status updated via webhook)
requires_action → Additional authentication required (3D Secure)
```

---

## Request/Response Examples

### Example 1: Authenticated User Checkout with Address Data

```javascript
// 1. Get current cart
const cartResponse = await fetch("/api/v1/cart", {
  headers: {
    Authorization: `Bearer ${token}`,
    "X-App-Key": appKey,
  },
});
const { cart } = await cartResponse.json();

// 2. Validate cart
await fetch("/api/v1/cart/validate", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "X-App-Key": appKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ cartId: cart.id }),
});

// 3. (Optional) Fetch user addresses to pre-fill form
const addressesResponse = await fetch("/api/v1/users/addresses", {
  headers: {
    Authorization: `Bearer ${token}`,
    "X-App-Key": appKey,
  },
});
const addresses = await addressesResponse.json();

// 4. User provides address data (from form or existing address selection)
// Option A: Use existing address ID
const selectedShippingAddressId = addresses.find(
  (addr) => addr.type === "SHIPPING" && addr.isDefault
)?.id;

// Option B: Send new address data (will be created automatically)
const shippingAddressData = {
  type: "SHIPPING",
  firstName: "John",
  lastName: "Doe",
  addressLine1: "123 Main Street",
  city: "Toronto",
  state: "ON",
  postalCode: "M5V 3A8",
  country: "CA",
  phone: "+1 416-555-0100",
  isDefault: true,
};

// 5. Create order with address data (addresses created/updated automatically)
const checkoutResponse = await fetch("/api/v1/orders", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "X-App-Key": appKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    cartId: cart.id,
    // Option A: Use address IDs
    shippingAddressId: selectedShippingAddressId,
    // Option B: Send address objects (recommended - addresses saved automatically)
    shippingAddress: shippingAddressData,
    billingAddress: {
      type: "BILLING",
      firstName: "John",
      lastName: "Doe",
      addressLine1: "456 Oak Avenue",
      city: "Toronto",
      state: "ON",
      postalCode: "M5V 3A9",
      country: "CA",
      isDefault: true,
    },
    paymentMethodId: selectedPaymentMethodId,
  }),
});

const { order, payment } = await checkoutResponse.json();

// 6. Confirm payment with Stripe
// ... (Stripe Elements integration)
```

### Example 2: Checkout with Coupon

```javascript
// 1. Apply coupon to cart
await fetch("/api/v1/cart/coupon", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "X-App-Key": appKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    cartId: cart.id,
    couponCode: "SAVE10",
  }),
});

// 2. Proceed with checkout (coupon already applied)
const checkoutResponse = await fetch("/api/v1/orders", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "X-App-Key": appKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    cartId: cart.id,
    shippingAddressId: selectedShippingAddressId,
  }),
});
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Cart validation failed",
  "error": "Bad Request"
}
```

**Common causes:**

- Cart is empty
- Items out of stock
- Prices have changed
- Invalid cart ID

#### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Solution:** Include valid JWT token in Authorization header. Redirect user to login if not authenticated.

#### 404 Cart Not Found

```json
{
  "statusCode": 404,
  "message": "Cart not found"
}
```

**Solution:** Verify cart ID and ensure cart belongs to user/session

### Error Handling Best Practices

```javascript
try {
  const response = await fetch('/api/v1/orders', {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify(checkoutData)
  });

  if (!response.ok) {
    const error = await response.json();

    switch (response.status) {
      case 400:
        // Handle validation errors
        console.error('Validation failed:', error.message);
        break;
      case 401:
        // Handle authentication errors
        console.error('Authentication required');
        // Redirect to login page
        window.location.href = '/login?redirect=/checkout';
        break;
      case 404:
        // Handle not found errors
        console.error('Cart not found');
        break;
      default:
        console.error('Unexpected error:', error);
    }

    throw new Error(error.message);
  }

  const data = await response.json();
  return data;
} catch (error) {
  // Handle network errors, etc.
  console.error('Checkout failed:', error);
  throw error;
}
```

---

## Order Status Flow

After checkout, orders progress through these statuses:

```
DRAFT → PENDING → MEDICAL_REVIEW → PROCESSING → SHIPPED → COMPLETED
```

### Status Descriptions

- **DRAFT**: Order created, payment not yet authorized
- **PENDING**: Payment intent created, awaiting payment confirmation
- **MEDICAL_REVIEW**: Payment authorized, awaiting admin review (for medical products)
- **PROCESSING**: Payment captured, order being prepared
- **SHIPPED**: Order has been shipped
- **COMPLETED**: Order fulfilled and completed

### Payment Status

- **PENDING**: Payment not yet processed
- **AUTHORIZED**: Payment authorized but not captured
- **CAPTURED**: Payment captured
- **FAILED**: Payment failed
- **REFUNDED**: Payment refunded

---

## Testing

### Test Cards (Stripe Test Mode)

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

### Test Scenarios

1. **Successful Checkout**

   - Login as authenticated user
   - Add items to cart
   - Proceed to checkout
   - Complete payment with test card
   - Verify order creation

2. **Cart Validation**

   - Add items to cart
   - Change product price in admin
   - Attempt checkout
   - Verify validation error

3. **Payment Failure**

   - Login as authenticated user
   - Attempt checkout
   - Use declined card
   - Verify error handling

4. **Unauthenticated Access**
   - Attempt checkout without login
   - Verify 401 error
   - Verify redirect to login page

---

## Best Practices

### Security

1. **Never expose Stripe secret keys** in frontend code
2. **Always validate** cart before checkout
3. **Use HTTPS** in production
4. **Validate addresses** before submission
5. **Handle payment errors** gracefully

### User Experience

1. **Show loading states** during checkout
2. **Provide clear error messages**
3. **Allow cart editing** before checkout
4. **Require authentication** before checkout (redirect to login if needed)
5. **Send confirmation emails** (handled by backend)

### Performance

1. **Cache cart data** locally
2. **Debounce validation** requests
3. **Lazy load** payment elements
4. **Optimize images** in order summary

---

## Support & Resources

### API Documentation

- Swagger UI: `http://localhost:3000/api/docs`
- Admin Docs: `http://localhost:3000/api/admin/docs`

### Related Documentation

- [Orders Module Complete](./ORDERS_MODULE_COMPLETE.md)
- [Orders Module Implementation Summary](./ORDERS_MODULE_IMPLEMENTATION_SUMMARY.md)
- [API Endpoints Updated](./api-endpoints-updated.md)

### Stripe Resources

- [Stripe Elements Documentation](https://stripe.com/docs/stripe-js)
- [Stripe Payment Intents](https://stripe.com/docs/payments/payment-intents)
- [Stripe Testing](https://stripe.com/docs/testing)

---

## Troubleshooting

### Common Issues

#### Payment Intent Not Created

**Problem:** `payment` object is null in response

**Solution:**

- Verify Stripe keys are configured
- Check server logs for errors
- Ensure order was created successfully

#### Cart Validation Fails

**Problem:** Cart validation returns errors

**Solution:**

- Check if items are still in stock
- Verify prices haven't changed
- Ensure cart items are valid

#### Address Not Found

**Problem:** Getting 404 when using address ID in checkout

**Solution:**

- Verify address belongs to the authenticated user
- Use address objects instead of IDs (addresses will be created automatically)
- Ensure address IDs are correct if using existing addresses

#### Unauthenticated Access

**Problem:** Getting 401 Unauthorized error

**Solution:**

- Ensure user is logged in before checkout
- Verify JWT token is valid and included in Authorization header
- Redirect user to login page if not authenticated

#### Payment Confirmation Fails

**Problem:** Stripe confirmation fails

**Solution:**

- Verify client secret is valid
- Check payment method is supported
- Ensure 3D Secure is handled if required

---

## Changelog

### Version 1.1

- Removed guest checkout support
- Authentication now required for all checkout operations
- Updated examples and error handling

### Version 1.0

- Initial checkout integration guide
- Stripe payment integration
- Order status flow documentation

---

**Last Updated:** January 2025
