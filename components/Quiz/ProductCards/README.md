# Quiz Product Cards System

This directory contains specialized product card components for different quiz flows. The main `ProductCard.jsx` acts as a smart router that automatically selects the appropriate card design based on the quiz type.

## Directory Structure

```
components/Quiz/
├── ProductCard.jsx              # Smart router component
└── ProductCards/
    ├── index.js                 # Exports all card types
    ├── DefaultProductCard.jsx   # Generic fallback card
    ├── WLProductCard.jsx        # Weight Loss card
    ├── EDProductCard.jsx        # Erectile Dysfunction card
    ├── HairProductCard.jsx      # Hair Loss card
    └── MHProductCard.jsx        # Mental Health card
```

## Usage

### Automatic Flow Detection

The main `ProductCard` component automatically detects the quiz flow type and renders the appropriate card:

```jsx
import ProductCard from "@/components/Quiz/ProductCard";

// In your quiz results page
<ProductCard
  product={productData}
  onSelect={handleSelect}
  isSelected={selectedProduct?.id === productData.id}
  isRecommended={index === 0}
/>
```

The component will automatically detect the flow based on:
1. URL slug (from `useParams()`)
2. Explicit `flowType` prop
3. Product metadata

### Manual Flow Type

You can also explicitly specify the flow type:

```jsx
<ProductCard
  product={productData}
  flowType="wl"  // or "ed", "hair", "mh"
  onSelect={handleSelect}
  isSelected={isSelected}
/>
```

## Flow Type Detection

The router detects flow types based on quiz slug patterns:

| Flow Type | Slug Patterns | Card Component |
|-----------|---------------|----------------|
| **Weight Loss** | `wl`, `wlprecons`, `weight-loss` | `WLProductCard` |
| **ED** | `ed`, `edprecons`, `erectile` | `EDProductCard` |
| **Hair Loss** | `hair`, `hairprecons` | `HairProductCard` |
| **Mental Health** | `mh`, `mhprecons`, `mental` | `MHProductCard` |
| **Default** | Any other pattern | `DefaultProductCard` |

## Card Designs

### WLProductCard
- Clean, modern design with product images
- "Supply available" badges
- Special popup for oral semaglutide (Rybelsus)
- Registered trademark symbols

### EDProductCard
- Interactive preference selection (Generic/Brand)
- Frequency selection (Monthly/Bi-Weekly)
- Pill count selection
- Dynamic pricing display
- Trustpilot ratings

### HairProductCard
- Trustpilot rating display
- Guarantee badge overlay
- Centered product image
- Professional medical aesthetic
- "Recommended" banner for suggested products

### MHProductCard
- Feature tags display
- Clean, minimal design
- Focus on product benefits
- Medical professional aesthetic

### DefaultProductCard
- Generic fallback design
- Works with any product structure
- Feature list support
- Prescription strength popup

## Product Data Structure

All cards accept a `product` object with the following common fields:

```javascript
{
  id: "product_id",
  title: "Product Name",
  name: "Alternative Name",
  description: "Product description",
  product_tagline: "Short tagline",
  image: "image_url",
  price: 99.99,
  details: "Additional details",
  supplyAvailable: true,
  available: true,
  features: ["Feature 1", "Feature 2"],
  badge: "badge_image_url",
  
  // ED-specific fields
  activeIngredient: "Ingredient name",
  strengths: ["5mg", "10mg"],
  preferences: ["generic", "brand"],
  frequencies: { "monthly-supply": "Monthly", "bi-weekly": "Bi-Weekly" },
  pillOptions: { /* frequency-based pill options */ },
  
  // Hair-specific fields
  pills: "Product details",
  tooltip: "Additional info",
}
```

## Adding New Flow Types

To add a new flow type:

1. Create a new card component in `ProductCards/` directory:
```jsx
// ProductCards/NewFlowCard.jsx
import React from "react";

const NewFlowCard = ({ product, onSelect, isSelected }) => {
  // Your custom design here
  return <div>...</div>;
};

export default NewFlowCard;
```

2. Export it in `ProductCards/index.js`:
```javascript
export { default as NewFlowCard } from "./NewFlowCard";
```

3. Import and add the case in `ProductCard.jsx`:
```javascript
import { NewFlowCard } from "./ProductCards";

// In getFlowType() function:
if (slugLower.includes("newflow")) {
  return "newflow";
}

// In switch statement:
case "newflow":
  return (
    <NewFlowCard
      product={product}
      onSelect={onSelect}
      isSelected={isSelected}
    />
  );
```

## Props

### Common Props (all cards)

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `product` | Object | Yes | Product data object |
| `onSelect` | Function | No | Callback when product is selected |
| `isSelected` | Boolean | No | Whether this product is currently selected |
| `isRecommended` | Boolean | No | Whether to show "Recommended" badge |

### EDProductCard Additional Props

The ED card manages internal state for preference, frequency, and pill count selection. It calls `onSelect` with an options object:

```javascript
onSelect(product, {
  preference: "generic",
  frequency: "monthly-supply",
  pills: { count: 8, genericPrice: 99, brandPrice: 149 },
  pillCount: 8,
  price: 99,
  variationId: "variation_id"
});
```

## Styling

All cards use consistent styling patterns:
- Tailwind CSS classes
- Rocky brand colors (`#A7885A`, `#AE7E56`, `#814B00`)
- Responsive design (mobile-first)
- Smooth transitions and hover effects
- Accessibility considerations (ARIA labels, keyboard navigation)

## Testing

To test a specific card design:

1. Navigate to a quiz with the appropriate slug (e.g., `/quiz/wlprecons`)
2. Complete the quiz to reach the results page
3. Verify the correct card design is rendered
4. Test interactions (selection, popups, dropdowns)

## Migration Notes

This system replaces individual product card implementations in:
- `components/WLPreConsultationQuiz/WLProductCard.jsx`
- `components/EDPreConsultationQuiz/EdProductCards.jsx`
- `components/HairPreConsultationQuiz/ProductRecommendationCard.jsx`
- `components/MHPreConsultationQuiz/WLProductCard.jsx`

The unified system provides:
- ✅ Consistent product card API
- ✅ Automatic flow detection
- ✅ Easier maintenance
- ✅ Reusable across quiz system
- ✅ Type-safe component structure
