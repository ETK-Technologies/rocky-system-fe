import SimpleTermsContent from "@/components/TermsOfUse/SimpleTermsContent";
import { logger } from "@/utils/devLogger";

async function fetchTermsOfUseData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    
    const response = await fetch(`${baseUrl}/api/pages/slug/terms-of-use`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      logger.error("Failed to fetch terms of use:", response.status);
      return null;
    }

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    logger.error("Error fetching terms of use:", error);
    return null;
  }
}

export default async function TermsOfUsePage() {
  const pageData = await fetchTermsOfUseData();
  return <SimpleTermsContent pageData={pageData} />;
}
