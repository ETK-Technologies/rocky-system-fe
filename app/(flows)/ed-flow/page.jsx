import { Suspense } from "react";
import FlowCallBack from "@/components/Flows/FlowCallBack";
import FlowContent from "@/components/Flows/FlowContent";
import { fetchEDFlowProducts } from "@/lib/api/fetchEDFlowProducts";

/**
 * Server Component - Fetches products server-side
 * Next.js will cache and revalidate this data automatically
 * Products are fetched on the server and passed to client component
 */
async function EdFlowProductsLoader() {
  // Fetch products server-side - Next.js automatically caches fetch requests
  // Data is revalidated based on cache headers from the backend
  const products = await fetchEDFlowProducts();

  return <FlowContent flowType="ED" initialProducts={products} />;
}

// Main page component with Suspense boundary
const EdFlowPage = () => {
  return (
    <Suspense fallback={<FlowCallBack className="ed-flow" LoadingText="Loading ED Flow..." />}>
      <EdFlowProductsLoader />
    </Suspense>
  );
};

export default EdFlowPage;
