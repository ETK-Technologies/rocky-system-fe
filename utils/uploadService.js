import { logger } from "@/utils/devLogger";
import { getSessionId } from "@/services/sessionService";

/**
 * Upload files to the backend API via Next.js API route
 * @param {File|File[]} files - Single file or array of files to upload
 * @returns {Promise<{success: boolean, files?: Array<{cdnUrl: string, filename: string}>, error?: string}>}
 */
export async function uploadPhotos(files) {
  try {
    // Convert to array if single file
    const fileArray = Array.isArray(files) ? files : [files];
    
    // Create FormData
    const formData = new FormData();
    fileArray.forEach((file) => {
      formData.append("files", file);
    });

    // Add sessionId for guest users
    const sessionId = getSessionId();
    if (sessionId) {
      formData.append("sessionId", sessionId);
      logger.log("🆔 Including sessionId for guest user:", sessionId);
    }

    logger.log("📤 Uploading photos via API route...");

    // Upload via Next.js API route (handles auth server-side)
    const response = await fetch("/api/uploads/photos", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error("❌ Upload failed:", data);
      return {
        success: false,
        error: data.error || "Upload failed",
      };
    }

    logger.log("✅ Upload successful:", data);
    return {
      success: true,
      files: data.files || [],
      totalFiles: data.totalFiles || 0,
    };
  } catch (error) {
    logger.error("❌ Upload error:", error);
    return {
      success: false,
      error: error.message || "Upload failed",
    };
  }
}

