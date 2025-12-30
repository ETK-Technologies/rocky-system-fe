"use client";

import { useState } from "react";
import { uploadPhotos } from "@/utils/uploadService";
import { logger } from "@/utils/devLogger";

export default function PhotoUpload({ step, answer, onAnswerChange }) {
  const [frontPhoto, setFrontPhoto] = useState(answer?.frontPhoto || null);
  const [topPhoto, setTopPhoto] = useState(answer?.topPhoto || null);
  const [frontPhotoCdnUrl, setFrontPhotoCdnUrl] = useState(answer?.frontPhotoCdnUrl || null);
  const [topPhotoCdnUrl, setTopPhotoCdnUrl] = useState(answer?.topPhotoCdnUrl || null);
  const [uploading, setUploading] = useState(false);

  const handleFrontPhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFrontPhoto(previewUrl);
      setUploading(true);
      
      // Upload to backend
      logger.log("📤 Uploading front hairline photo...");
      const result = await uploadPhotos(file);
      setUploading(false);
      
      if (result.success && result.files && result.files.length > 0) {
        const cdnUrl = result.files[0].cdnUrl;
        setFrontPhotoCdnUrl(cdnUrl);
        logger.log("✅ Front photo uploaded:", cdnUrl);
        
        // Save CDN URL with answer
        const updatedAnswer = {
          answerType: "img",
          answer: {
            frontPhoto: previewUrl,
            frontPhotoCdnUrl: cdnUrl,
            topPhoto: topPhoto,
            topPhotoCdnUrl: topPhotoCdnUrl,
            status: (cdnUrl && topPhotoCdnUrl) ? "uploaded" : "partial"
          }
        };
        onAnswerChange(updatedAnswer);
      } else {
        logger.error("❌ Front photo upload failed:", result.error);
        alert(`Upload failed: ${result.error || 'Unknown error'}`);
      }
    }
  };

  const handleTopPhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setTopPhoto(previewUrl);
      setUploading(true);
      
      // Upload to backend
      logger.log("📤 Uploading top of head photo...");
      const result = await uploadPhotos(file);
      setUploading(false);
      
      if (result.success && result.files && result.files.length > 0) {
        const cdnUrl = result.files[0].cdnUrl;
        setTopPhotoCdnUrl(cdnUrl);
        logger.log("✅ Top photo uploaded:", cdnUrl);
        
        // Save CDN URL with answer
        const updatedAnswer = {
          answerType: "img",
          answer: {
            frontPhoto: frontPhoto,
            frontPhotoCdnUrl: frontPhotoCdnUrl,
            topPhoto: previewUrl,
            topPhotoCdnUrl: cdnUrl,
            status: (frontPhotoCdnUrl && cdnUrl) ? "uploaded" : "partial"
          }
        };
        onAnswerChange(updatedAnswer);
      } else {
        logger.error("❌ Top photo upload failed:", result.error);
        alert(`Upload failed: ${result.error || 'Unknown error'}`);
      }
    }
  };

  return (
    <div className="w-full space-y-8">
      {uploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C19A6B]"></div>
              <span className="text-lg">Uploading photo...</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Front Hairline Photo Upload */}
      <div className="w-full md:w-4/5 mx-auto">
        <input
          id="photo_upload_1"
          className="hidden"
          type="file"
          name="photo_upload_1"
          accept="image/*"
          onChange={handleFrontPhotoSelect}
          disabled={uploading}
        />
        <label
          htmlFor="photo_upload_1"
          className={`flex items-center cursor-pointer p-5 border-2 border-gray-300 rounded-lg shadow-md hover:bg-gray-50 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex w-full flex-col">
            <div className="flex items-center mb-2">
              <img
                className="w-16 h-16 object-contain mr-4 flex-shrink-0"
                src={frontPhoto || "https://myrocky.b-cdn.net/WP%20Images/Questionnaire/head-front.png"}
                alt="Front hairline"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[#C19A6B] break-words">
                  {frontPhotoCdnUrl ? '✅ Front Hairline uploaded' : 'Tap to upload Front Hairline photo'}
                </span>
              </div>
            </div>
          </div>
        </label>
        <p className="text-center text-sm mt-2 mb-6">
          The provider needs a photo of your front hairline.
        </p>
      </div>

      {/* Top of Head Photo Upload */}
      <div className="w-full md:w-4/5 mx-auto">
        <input
          id="photo_upload_2"
          className="hidden"
          type="file"
          name="photo_upload_2"
          accept="image/*"
          onChange={handleTopPhotoSelect}
          disabled={uploading}
        />
        <label
          htmlFor="photo_upload_2"
          className={`flex items-center cursor-pointer p-5 border-2 border-gray-300 rounded-lg shadow-md hover:bg-gray-50 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex w-full flex-col">
            <div className="flex items-center mb-2">
              <img
                className="w-16 h-16 object-contain mr-4 flex-shrink-0"
                src={topPhoto || "https://myrocky.b-cdn.net/WP%20Images/Questionnaire/head-back.png"}
                alt="Top of head"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[#C19A6B] break-words">
                  {topPhotoCdnUrl ? '✅ Top of Head uploaded' : 'Tap to upload Top of Head photo'}
                </span>
              </div>
            </div>
          </div>
        </label>
        <p className="text-center text-sm mt-2">
          The provider needs a clear photo of the top of your head
        </p>
        <p className="text-center text-xs mt-1 text-gray-500">
          It helps to use a mirror
        </p>
      </div>
    </div>
  );
}
