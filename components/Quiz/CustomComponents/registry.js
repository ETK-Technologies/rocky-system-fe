/**
 * Custom Component Registry
 * Add new quiz custom components here to make them available for dynamic loading
 * All components must be client components (use "use client" directive)
 */

import BMICalculator from './BMICalculator';
import PopupComponent from './PopupComponent';
import MedicationPopup from './MedicationPopup';
import PotentialWeightLoss from './PotentialWeightLoss';

// Component registry with metadata
export const COMPONENT_REGISTRY = {
  // BMI Calculator variants
  'BMICalculator': {
    component: BMICalculator,
    name: 'BMI Calculator',
    description: 'Calculate Body Mass Index'
  },
  'BMICalculatorStep': {
    component: BMICalculator,
    name: 'BMI Calculator',
    description: 'Calculate Body Mass Index'
  },
  
  // Popup variants
  'PopupComponent': {
    component: PopupComponent,
    name: 'Popup Component',
    description: 'Display popup information'
  },
  'Popup': {
    component: PopupComponent,
    name: 'Popup Component',
    description: 'Display popup information'
  },
  
  // Medication Popup variants
  'MedicationPopup': {
    component: MedicationPopup,
    name: 'Medication Popup',
    description: 'Medication information popup'
  },
  'MedicationPopUp': {
    component: MedicationPopup,
    name: 'Medication Popup',
    description: 'Medication information popup'
  },
  
  // Weight Loss variants
  'PotentialWeightLoss': {
    component: PotentialWeightLoss,
    name: 'Potential Weight Loss',
    description: 'Calculate potential weight loss'
  },
  'potentialWeightLoss': {
    component: PotentialWeightLoss,
    name: 'Potential Weight Loss',
    description: 'Calculate potential weight loss'
  }
};

/**
 * Get component by name
 * @param {string} componentName - Name of the component
 * @returns {Object|null} Component entry or null if not found
 */
export function getComponent(componentName) {
  return COMPONENT_REGISTRY[componentName] || null;
}

/**
 * Get all available component names
 * @returns {string[]} Array of component names
 */
export function getAvailableComponents() {
  return Object.keys(COMPONENT_REGISTRY);
}

/**
 * Check if component exists
 * @param {string} componentName - Name of the component
 * @returns {boolean} True if component exists
 */
export function hasComponent(componentName) {
  return componentName in COMPONENT_REGISTRY;
}
