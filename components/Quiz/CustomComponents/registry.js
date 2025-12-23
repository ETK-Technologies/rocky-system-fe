/**
 * Custom Component Registry
 * Add new quiz custom components here to make them available for dynamic loading
 * All components must be client components (use "use client" directive)
 */

import BMICalculator from "./BMICalculator";
import PopupComponent from "./PopupComponent";
import MedicationPopup from "./MedicationPopup";
import PotentialWeightLoss from "./PotentialWeightLoss";
import CustomeNote from "./CustomeNote";
import TimeToGet from "./TimeToGet";
import FinasterideWarnning from "./FinasterideWarnning";
import PleaseKeepInMind from "./PleaseKeepInMind";
import Sorry from "./Sorry";
import NoCallAcknowledgement from "./NoCallAcknowledgement";
import UploadPhotoIDNote from "./UploadPhotoIDNote";
import AboutYourMedication from "./AboutYourMedication";
import VerifyIdentity from "./VerifyIdentity";
import photoUpload from "./photoUpload";

// Component registry with metadata
export const COMPONENT_REGISTRY = {
  // BMI Calculator variants
  BMICalculator: {
    component: BMICalculator,
    name: "BMI Calculator",
    description: "Calculate Body Mass Index",
  },
  BMICalculatorStep: {
    component: BMICalculator,
    name: "BMI Calculator",
    description: "Calculate Body Mass Index",
  },

  // Popup variants
  PopupComponent: {
    component: PopupComponent,
    name: "Popup Component",
    description: "Display popup information",
  },
  Popup: {
    component: PopupComponent,
    name: "Popup Component",
    description: "Display popup information",
  },

  // Medication Popup variants
  MedicationPopup: {
    component: MedicationPopup,
    name: "Medication Popup",
    description: "Medication information popup",
  },
  MedicationPopUp: {
    component: MedicationPopup,
    name: "Medication Popup",
    description: "Medication information popup",
  },

  // Weight Loss variants
  PotentialWeightLoss: {
    component: PotentialWeightLoss,
    name: "Potential Weight Loss",
    description: "Calculate potential weight loss",
  },

  potentialWeightLoss: {
    component: PotentialWeightLoss,
    name: "Potential Weight Loss",
    description: "Calculate potential weight loss",
  },

  // Custom Note variants
  CustomeNote: {
    component: CustomeNote,
    name: "Custom Note",
    description: "Display informational note",
  },

  "Just a Quick Note (female)": {
    component: CustomeNote,
    name: "Custom Note",
    description: "Display informational note for female users",
  },

  // Time to Get variants
  TimeToGet: {
    component: TimeToGet,
    name: "Time to Get",
    description: "Informational step component",
  },

  "Time to get your hair back": {
    component: TimeToGet,
    name: "Time to Get Your Hair Back",
    description: "Hair restoration information step",
  },

  // Finasteride Warning variants
  FinasterideWarnning: {
    component: FinasterideWarnning,
    name: "Finasteride Warning",
    description: "Finasteride safety warning popup",
  },

  Warning: {
    component: FinasterideWarnning,
    name: "Warning",
    description: "Warning popup",
  },

  "PleaseKeepInMind": {
    component: PleaseKeepInMind,
    name: "PleaseKeepInMind",
    description: "Important information popup",
  },

  // Sorry variants
  "Sorry": {
    component: Sorry,
    name: "Sorry",
    description: "Alert popup for ineligibility",
  },
  "Sorry...": {
    component: Sorry,
    name: "Sorry",
    description: "Alert popup for ineligibility",
  },

  // No Call Acknowledgement variants
  "No Call Acknowledgement": {
    component: NoCallAcknowledgement,
    name: "No Call Acknowledgement",
    description: "Acknowledgement when user declines appointment",
  },
  "NoCallAcknowledgement": {
    component: NoCallAcknowledgement,
    name: "No Call Acknowledgement",
    description: "Acknowledgement when user declines appointment",
  },

  // Upload Photo ID variants
  "Upload Photo ID": {
    component: UploadPhotoIDNote,
    name: "Upload Photo ID",
    description: "Instructions for ID upload",
  },
  "UploadPhotoIDNote": {
    component: UploadPhotoIDNote,
    name: "Upload Photo ID Note",
    description: "Instructions for ID upload",
  },

  // About Your Medication variants
  "About your medication": {
    component: AboutYourMedication,
    name: "About Your Medication",
    description: "Medication information display",
  },
  "AboutYourMedication": {
    component: AboutYourMedication,
    name: "About Your Medication",
    description: "Medication information display",
  },

  // Verify Identity variants
  "VerifyYourIdentity": {
    component: VerifyIdentity,
    name: "VerifyYourIdentity",
    description: "Identity verification step",
  },
  "VerifyIdentity": {
    component: VerifyIdentity,
    name: "Verify Identity",
    description: "Identity verification step",
  },

  // Photo Upload variants
  "Photo Upload": {
    component: photoUpload,
    name: "Photo Upload",
    description: "Upload photos step",
  },
  "photoUpload": {
    component: photoUpload,
    name: "Photo Upload",
    description: "Upload photos step",
  },
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
