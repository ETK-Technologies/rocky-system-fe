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
import RockyLongTermPopup from "./RockyLongTermPopup";
import BodyNeedsPopup from "./BodyNeedsPopup";
import WeightLossQualificationPopup from "./WeightLossQualificationPopup";
import DisqualificationPopup from "./DisqualificationPopup";
import HighBloodPressureWarning from "./HighBloodPressureWarning";
import VeryHighBloodPressureWarning from "./VeryHighBloodPressureWarning";
import UnknownBloodPressureWarning from "./UnknownBloodPressureWarning";
import PhotoIDUploadWarning from "./PhotoIDUploadWarning";
import NoAppointmentAcknowledgement from "./NoAppointmentAcknowledgement";
import EDFemaleGenderNotice from "./EDFemaleGenderNotice";
import EDPrematureEjaculationNotice from "./EDPrematureEjaculationNotice";
import EDLowLibidoWarning from "./EDLowLibidoWarning";
import EDStartWarning from "./EDStartWarning";
import EDHighBloodPressureWarning from "./EDHighBloodPressureWarning";
import EDVeryHighBloodPressureWarning from "./EDVeryHighBloodPressureWarning";
import EDUnknownBloodPressureWarning from "./EDUnknownBloodPressureWarning";
import EDBPMedicationWarning from "./EDBPMedicationWarning";
import EDCardiovascularSymptomWarning from "./EDCardiovascularSymptomWarning";
import EDMedicationInteractionWarning from "./EDMedicationInteractionWarning";
import EDNoAppointmentAcknowledgement from "./EDNoAppointmentAcknowledgement";

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

  // Rocky Long Term Popup variants
  "RockyLongTermPopup": {
    component: RockyLongTermPopup,
    name: "Rocky Long Term Popup",
    description: "Weight loss long-term approach information",
  },
  "Rocky Long Term": {
    component: RockyLongTermPopup,
    name: "Rocky Long Term Popup",
    description: "Weight loss long-term approach information",
  },

  // Body Needs Popup variants
  "BodyNeedsPopup": {
    component: BodyNeedsPopup,
    name: "Body Needs Popup",
    description: "GLP-1 therapy timeline and metabolic acclimation info",
  },
  "Body Needs": {
    component: BodyNeedsPopup,
    name: "Body Needs Popup",
    description: "GLP-1 therapy timeline and metabolic acclimation info",
  },

  // Weight Loss Qualification Popup variants
  "WeightLossQualificationPopup": {
    component: WeightLossQualificationPopup,
    name: "Weight Loss Qualification Popup",
    description: "Shows user qualification and potential weight loss",
  },
  "Weight Loss Qualification": {
    component: WeightLossQualificationPopup,
    name: "Weight Loss Qualification Popup",
    description: "Shows user qualification and potential weight loss",
  },
  "WeightLoss": {
    component: WeightLossQualificationPopup,
    name: "Weight Loss Qualification Popup",
    description: "Shows user qualification and potential weight loss",
  },

  // Disqualification Popup variants
  "DisqualificationPopup": {
    component: DisqualificationPopup,
    name: "Disqualification Popup",
    description: "Generic disqualification message for ineligible users",
  },
  "Disqualification": {
    component: DisqualificationPopup,
    name: "Disqualification Popup",
    description: "Generic disqualification message for ineligible users",
  },
  "medicalCondition": {
    component: DisqualificationPopup,
    name: "Medical Condition Disqualification",
    description: "Disqualification for medical conditions",
  },
  "medication": {
    component: DisqualificationPopup,
    name: "Medication Disqualification",
    description: "Disqualification for medications",
  },
  "eatingDisorder": {
    component: DisqualificationPopup,
    name: "Eating Disorder Disqualification",
    description: "Disqualification for eating disorders",
  },
  "pregnancy": {
    component: DisqualificationPopup,
    name: "Pregnancy Disqualification",
    description: "Disqualification for pregnancy",
  },

  // High Blood Pressure Warning variants
  "HighBloodPressureWarning": {
    component: HighBloodPressureWarning,
    name: "High Blood Pressure Warning",
    description: "Warning for high blood pressure (141/91 to 179/99)",
  },
  "High Blood Pressure Warning": {
    component: HighBloodPressureWarning,
    name: "High Blood Pressure Warning",
    description: "Warning for high blood pressure (141/91 to 179/99)",
  },

  // Very High Blood Pressure Warning variants
  "VeryHighBloodPressureWarning": {
    component: VeryHighBloodPressureWarning,
    name: "Very High Blood Pressure Warning",
    description: "Disqualification for very high blood pressure (>180/100)",
  },
  "Very High Blood Pressure Warning": {
    component: VeryHighBloodPressureWarning,
    name: "Very High Blood Pressure Warning",
    description: "Disqualification for very high blood pressure (>180/100)",
  },

  // Unknown Blood Pressure Warning variants
  "UnknownBloodPressureWarning": {
    component: UnknownBloodPressureWarning,
    name: "Unknown Blood Pressure Warning",
    description: "Disqualification for unknown blood pressure",
  },
  "Unknown Blood Pressure Warning": {
    component: UnknownBloodPressureWarning,
    name: "Unknown Blood Pressure Warning",
    description: "Disqualification for unknown blood pressure",
  },

  // Photo ID Upload Warning variants
  "PhotoIDUploadWarning": {
    component: PhotoIDUploadWarning,
    name: "Photo ID Upload Warning",
    description: "Mandatory photo ID upload acknowledgement",
  },
  "Photo ID Upload Warning": {
    component: PhotoIDUploadWarning,
    name: "Photo ID Upload Warning",
    description: "Mandatory photo ID upload acknowledgement",
  },

  // No Appointment Acknowledgement variants
  "NoAppointmentAcknowledgement": {
    component: NoAppointmentAcknowledgement,
    name: "No Appointment Acknowledgement",
    description: "Legal waiver for foregoing medical appointment",
  },
  "No Appointment Acknowledgement": {
    component: NoAppointmentAcknowledgement,
    name: "No Appointment Acknowledgement",
    description: "Legal waiver for foregoing medical appointment",
  },

  // ED Consultation Quiz Popups - Female Gender
  "EDFemaleGenderNotice": {
    component: EDFemaleGenderNotice,
    name: "ED Female Gender Notice",
    description: "Notice that ED treatments are only for men",
  },
  "ED Female Gender Notice": {
    component: EDFemaleGenderNotice,
    name: "ED Female Gender Notice",
    description: "Notice that ED treatments are only for men",
  },

  // ED Consultation Quiz Popups - Premature Ejaculation
  "EDPrematureEjaculationNotice": {
    component: EDPrematureEjaculationNotice,
    name: "ED Premature Ejaculation Notice",
    description: "Notice about premature ejaculation vs ED",
  },
  "ED Premature Ejaculation Notice": {
    component: EDPrematureEjaculationNotice,
    name: "ED Premature Ejaculation Notice",
    description: "Notice about premature ejaculation vs ED",
  },

  // ED Consultation Quiz Popups - Low Libido
  "EDLowLibidoWarning": {
    component: EDLowLibidoWarning,
    name: "ED Low Libido Warning",
    description: "Warning about low sex drive and ED treatment limitations",
  },
  "ED Low Libido Warning": {
    component: EDLowLibidoWarning,
    name: "ED Low Libido Warning",
    description: "Warning about low sex drive and ED treatment limitations",
  },

  // ED Consultation Quiz Popups - ED Start Warning
  "EDStartWarning": {
    component: EDStartWarning,
    name: "ED Start Warning",
    description: "Warning about underlying causes of ED",
  },
  "ED Start Warning": {
    component: EDStartWarning,
    name: "ED Start Warning",
    description: "Warning about underlying causes of ED",
  },

  // ED Consultation Quiz Popups - High Blood Pressure
  "EDHighBloodPressureWarning": {
    component: EDHighBloodPressureWarning,
    name: "ED High Blood Pressure Warning",
    description: "Warning for high BP (141/91 to 179/99)",
  },
  "ED High Blood Pressure Warning": {
    component: EDHighBloodPressureWarning,
    name: "ED High Blood Pressure Warning",
    description: "Warning for high BP (141/91 to 179/99)",
  },

  // ED Consultation Quiz Popups - Very High Blood Pressure
  "EDVeryHighBloodPressureWarning": {
    component: EDVeryHighBloodPressureWarning,
    name: "ED Very High Blood Pressure Warning",
    description: "Disqualification for very high BP (>180/100)",
  },
  "ED Very High Blood Pressure Warning": {
    component: EDVeryHighBloodPressureWarning,
    name: "ED Very High Blood Pressure Warning",
    description: "Disqualification for very high BP (>180/100)",
  },

  // ED Consultation Quiz Popups - Unknown Blood Pressure
  "EDUnknownBloodPressureWarning": {
    component: EDUnknownBloodPressureWarning,
    name: "ED Unknown Blood Pressure Warning",
    description: "Disqualification for unknown blood pressure",
  },
  "ED Unknown Blood Pressure Warning": {
    component: EDUnknownBloodPressureWarning,
    name: "ED Unknown Blood Pressure Warning",
    description: "Disqualification for unknown blood pressure",
  },

  // ED Consultation Quiz Popups - BP Medication Interaction
  "EDBPMedicationWarning": {
    component: EDBPMedicationWarning,
    name: "ED BP Medication Warning",
    description: "Warning about BP medication and ED drug interaction",
  },
  "ED BP Medication Warning": {
    component: EDBPMedicationWarning,
    name: "ED BP Medication Warning",
    description: "Warning about BP medication and ED drug interaction",
  },

  // ED Consultation Quiz Popups - Cardiovascular Symptoms
  "EDCardiovascularSymptomWarning": {
    component: EDCardiovascularSymptomWarning,
    name: "ED Cardiovascular Symptom Warning",
    description: "Disqualification for dangerous cardiovascular symptoms",
  },
  "ED Cardiovascular Symptom Warning": {
    component: EDCardiovascularSymptomWarning,
    name: "ED Cardiovascular Symptom Warning",
    description: "Disqualification for dangerous cardiovascular symptoms",
  },

  // ED Consultation Quiz Popups - Medication Interaction
  "EDMedicationInteractionWarning": {
    component: EDMedicationInteractionWarning,
    name: "ED Medication Interaction Warning",
    description: "Disqualification for dangerous medication interactions",
  },
  "ED Medication Interaction Warning": {
    component: EDMedicationInteractionWarning,
    name: "ED Medication Interaction Warning",
    description: "Disqualification for dangerous medication interactions",
  },

  // ED Consultation Quiz Popups - No Appointment
  "EDNoAppointmentAcknowledgement": {
    component: EDNoAppointmentAcknowledgement,
    name: "ED No Appointment Acknowledgement",
    description: "Legal waiver for foregoing ED consultation appointment",
  },
  "ED No Appointment Acknowledgement": {
    component: EDNoAppointmentAcknowledgement,
    name: "ED No Appointment Acknowledgement",
    description: "Legal waiver for foregoing ED consultation appointment",
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
