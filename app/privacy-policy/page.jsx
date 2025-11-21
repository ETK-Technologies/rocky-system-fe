import PrivacyPolicyContent from "@/components/PrivacyPolicy/PrivacyPolicyContent";
import { logger } from "@/utils/devLogger";

async function fetchPrivacyPolicyData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const response = await fetch(`${baseUrl}/api/pages/slug/privacy-policy`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      logger.error("Failed to fetch privacy policy:", response.status);
      return null;
    }

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    logger.error("Error fetching privacy policy:", error);
    return null;
  }
}

export default async function privacyPolicy() {
  const pageData = await fetchPrivacyPolicyData();
  return <PrivacyPolicyContent pageData={pageData} />;
}
