import { useState, useEffect } from "react";
import { getComponent } from '@/components/Quiz/CustomComponents/registry';

export default function ComponentStep({ step, answer, onAnswerChange, onBack }) {
  const { title, selectedComponentId, componentPath, component, description } = step;
  const [DynamicComponent, setDynamicComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Extract component path from step data
    // Check multiple possible locations: componentPath, component.path, component, or description field
    const path = componentPath || component?.path || component || description;
    
    if (path && typeof path === 'string') {
      // Dynamic import based on path
      loadComponent(path);
    } else if (selectedComponentId) {
      // Fallback to component ID mapping
      loadComponentById(selectedComponentId);
    } else {
      setLoading(false);
    }
  }, [componentPath, component, selectedComponentId, description]);

  const loadComponent = async (path) => {
    try {
      setLoading(true);
      setError(null);
      
      // Clean path and extract just the component name
      let cleanPath = path.startsWith('/') ? path.slice(1) : path;
      cleanPath = cleanPath.replace(/\.(jsx|js|tsx|ts)$/, '');
      
      // Extract just the component filename
      const componentName = cleanPath.split('/').pop();
      
      console.log("Loading component:", componentName, "from path:", cleanPath);
      
      // Look up component in registry
      const componentEntry = getComponent(componentName);
      
      if (!componentEntry) {
        throw new Error(
          `Unknown component: ${componentName}. Please add it to components/Quiz/CustomComponents/registry.js`
        );
      }
      
      const Component = componentEntry.component;
      
      if (!Component) {
        throw new Error(`Component not found or has no default export: ${componentName}`);
      }
      
      setDynamicComponent(() => Component);
      setLoading(false);
      console.log("✅ Component loaded successfully:", componentName);
    } catch (err) {
      console.error("Failed to load component:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const loadComponentById = (componentId) => {
    // Map component IDs to paths (supports multiple ID formats)
    const componentPaths = {
      // Exact database IDs
      "cmj5tkix4001ulf01l8x67mag": "components/Quiz/CustomComponents/BMICalculator",
      "cmj7kexzg00dblf01hi3kw7ha": "components/Quiz/CustomComponents/PopupComponent",
      "cmj7kkogf00ddlf01pvfw8mva": "components/Quiz/CustomComponents/MedicationPopup",
      "cmj7lb6mw00dhlf0192oznq0p": "components/Quiz/CustomComponents/PotentialWeightLoss",
      "cmjd2k89a0058nv01kfmpwzzf": "components/Quiz/CustomComponents/TimeToGet",
      "cmjd2usqq005ynv01njlm7tul": "components/Quiz/CustomComponents/CustomeNote",
      
      // Alternative naming conventions
      "BMICalculator": "components/Quiz/CustomComponents/BMICalculator",
      "bmi-calculator": "components/Quiz/CustomComponents/BMICalculator",
      "bmi_calculator": "components/Quiz/CustomComponents/BMICalculator",
      
      "PopupComponent": "components/Quiz/CustomComponents/PopupComponent",
      "popup": "components/Quiz/CustomComponents/PopupComponent",
      "popup-component": "components/Quiz/CustomComponents/PopupComponent",
      
      "MedicationPopup": "components/Quiz/CustomComponents/MedicationPopup",
      "medication-popup": "components/Quiz/CustomComponents/MedicationPopup",
      "medication_popup": "components/Quiz/CustomComponents/MedicationPopup",
      
      "PotentialWeightLoss": "components/Quiz/CustomComponents/PotentialWeightLoss",
      "weight-loss-potential": "components/Quiz/CustomComponents/PotentialWeightLoss",
      "potential_weight_loss": "components/Quiz/CustomComponents/PotentialWeightLoss",
      
      "TimeToGet": "components/Quiz/CustomComponents/TimeToGet",
      "time-to-get": "components/Quiz/CustomComponents/TimeToGet",
      
      "CustomeNote": "components/Quiz/CustomComponents/CustomeNote",
      "custom-note": "components/Quiz/CustomComponents/CustomeNote",
      
      "FinasterideWarnning": "components/Quiz/CustomComponents/FinasterideWarnning",
      "finasteride-warning": "components/Quiz/CustomComponents/FinasterideWarnning",
      
      "PleaseKeepInMind": "components/Quiz/CustomComponents/PleaseKeepInMind",
      "please-keep-in-mind": "components/Quiz/CustomComponents/PleaseKeepInMind",
    };

    const path = componentPaths[componentId];
    if (path) {
      loadComponent(path);
    } else {
      console.warn(`No component path mapped for ID: ${componentId}`);
      setError(`Component not found: ${componentId}`);
      setLoading(false);
    }
  };

  return (
    <div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-gray-600">Loading component...</p>
        </div>
      )}

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-gray-900 font-medium mb-2">⚠️ Component Not Available</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <details className="text-left">
            <summary className="cursor-pointer text-xs text-gray-500">Debug Info</summary>
            <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">
              {JSON.stringify({ componentPath, component, selectedComponentId, description }, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {!loading && !error && DynamicComponent && (
        <DynamicComponent 
          step={step}
          answer={answer}
          onAnswerChange={onAnswerChange}
          onBack={onBack}
        />
      )}

      {!loading && !DynamicComponent && !error && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-2">Component: {title}</p>
          <p className="text-xs text-gray-500">ID: {selectedComponentId}</p>
        </div>
      )}

      {/* Allow proceeding through component steps */}
      {!DynamicComponent && (
        <button
          onClick={() => onAnswerChange({ answerType: 'text', answer: 'viewed' })}
          className="mt-6 w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      )}
    </div>
  );
}
