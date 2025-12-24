# Quiz Custom Components

This directory contains custom React components that can be dynamically loaded into quiz flows.

## 📁 Directory Structure

```
CustomComponents/
├── registry.js          # Component registry (ADD NEW COMPONENTS HERE)
├── BMICalculator.jsx
├── PopupComponent.jsx
├── MedicationPopup.jsx
├── PotentialWeightLoss.jsx
└── README.md           # This file
```

## ➕ Adding a New Component

### Step 1: Create Your Component

Create a new component file in this directory. **Important:** It must be a client component.

```jsx
// MyNewComponent.jsx
"use client";

import { useState } from "react";

export default function MyNewComponent({ step, answer, onAnswerChange }) {
  // Your component logic here
  
  return (
    <div>
      {/* Your component UI */}
    </div>
  );
}
```

### Step 2: Register the Component

Add your component to `registry.js`:

```javascript
// 1. Import your component
import MyNewComponent from './MyNewComponent';

// 2. Add to COMPONENT_REGISTRY
export const COMPONENT_REGISTRY = {
  // ... existing components ...
  
  'MyNewComponent': {
    component: MyNewComponent,
    name: 'My New Component',
    description: 'Description of what this component does'
  },
  // Add name variations if needed
  'my-new-component': {
    component: MyNewComponent,
    name: 'My New Component',
    description: 'Description of what this component does'
  }
};
```

### Step 3: Use in Quiz Configuration

In your quiz JSON configuration, reference the component by name:

```json
{
  "id": 1234567890,
  "type": "",
  "title": "My Component Step",
  "stepType": "component",
  "description": "/components/Quiz/CustomComponents/MyNewComponent.jsx",
  "selectedComponentId": "optional-id"
}
```

The component name in the path will be extracted and looked up in the registry.

## 📝 Component Props

All custom components receive three props:

- `step` (Object): The complete step configuration from quiz JSON
- `answer` (any): Current answer value for this step
- `onAnswerChange` (Function): Callback to save answer - call with `onAnswerChange(value)`

## ⚠️ Important Rules

1. **Must be Client Components**: Add `"use client"` directive at the top
2. **Must have default export**: Use `export default function ComponentName() { ... }`
3. **Register in registry.js**: Don't forget to add your component to the registry
4. **No Server Components**: Don't import `next/headers`, `next/cookies`, or other server-only modules

## ✅ Benefits of Registry Pattern

- **Centralized Management**: All components in one place
- **Type Safety**: Can add TypeScript types for better IDE support
- **Metadata**: Store additional info about each component
- **Easy Maintenance**: Just update registry.js to add new components
- **No Build Errors**: Avoids Next.js server/client component conflicts

## 🔍 Available Components

Current components registered:

- **BMICalculator** - Calculate Body Mass Index
- **PopupComponent** - Display popup information
- **MedicationPopup** - Medication information popup
- **PotentialWeightLoss** - Calculate potential weight loss

## 🐛 Troubleshooting

### Component not loading?

1. Check that component is registered in `registry.js`
2. Verify component has `"use client"` directive
3. Check component name spelling in quiz JSON matches registry
4. Look at browser console for specific error messages

### Build errors about server components?

Make sure your component doesn't import any server-only modules like:
- `next/headers`
- `next/cookies`
- Database connections
- File system operations

These should be done via API routes instead.
