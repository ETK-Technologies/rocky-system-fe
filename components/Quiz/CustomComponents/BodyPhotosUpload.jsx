"use client";

import { useState, useRef } from "react";
import { uploadPhotos } from "@/utils/uploadService";
import { logger } from "@/utils/devLogger";

export default function BodyPhotosUpload({
  step,
  answer,
  onAnswerChange,
  onBack,
}) {
  const [frontPhoto, setFrontPhoto] = useState(answer?.frontPhoto || null);
  const [sidePhoto, setSidePhoto] = useState(answer?.sidePhoto || null);
  const [frontPhotoPreview, setFrontPhotoPreview] = useState(null);
  const [sidePhotoPreview, setSidePhotoPreview] = useState(null);
  const [frontPhotoCdnUrl, setFrontPhotoCdnUrl] = useState(answer?.frontPhotoCdnUrl || null);
  const [sidePhotoCdnUrl, setSidePhotoCdnUrl] = useState(answer?.sidePhotoCdnUrl || null);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingSide, setUploadingSide] = useState(false);
  const frontPhotoInputRef = useRef(null);
  const sidePhotoInputRef = useRef(null);

  const handleFrontPhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setFrontPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFrontPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload to backend
      setUploadingFront(true);
      logger.log("📤 Uploading front photo...");
      const result = await uploadPhotos(file);
      setUploadingFront(false);

      if (result.success && result.files && result.files.length > 0) {
        const cdnUrl = result.files[0].cdnUrl;
        setFrontPhotoCdnUrl(cdnUrl);
        logger.log("✅ Front photo uploaded:", cdnUrl);

        // Save CDN URL with answer
        const newData = {
          answerType: "upload",
          answer: {
            frontPhoto: file,
            frontPhotoCdnUrl: cdnUrl,
            sidePhoto,
            sidePhotoCdnUrl,
          },
        };
        onAnswerChange(newData);
      } else {
        logger.error("❌ Front photo upload failed:", result.error);
        alert(`Upload failed: ${result.error || "Unknown error"}`);
      }
    }
  };

  const handleSidePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setSidePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSidePhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload to backend
      setUploadingSide(true);
      logger.log("📤 Uploading side photo...");
      const result = await uploadPhotos(file);
      setUploadingSide(false);

      if (result.success && result.files && result.files.length > 0) {
        const cdnUrl = result.files[0].cdnUrl;
        setSidePhotoCdnUrl(cdnUrl);
        logger.log("✅ Side photo uploaded:", cdnUrl);

        // Save CDN URL with answer
        const newData = {
          answerType: "upload",
          answer: {
            frontPhoto,
            frontPhotoCdnUrl,
            sidePhoto: file,
            sidePhotoCdnUrl: cdnUrl,
          },
        };
        onAnswerChange(newData);
      } else {
        logger.error("❌ Side photo upload failed:", result.error);
        alert(`Upload failed: ${result.error || "Unknown error"}`);
      }
    }
  };

  const handleUploadAndContinue = () => {
    if (frontPhoto && sidePhoto && frontPhotoCdnUrl && sidePhotoCdnUrl) {
      onAnswerChange({
        answerType: "upload",
        answer: {
          frontPhoto,
          frontPhotoCdnUrl,
          sidePhoto,
          sidePhotoCdnUrl,
        },
      });
      onBack();
    }
  };

  const isUploading = uploadingFront || uploadingSide;

  return (
    <div className="px-4 pt-6 pb-4">
      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C19A6B]"></div>
              <span className="text-lg">
                {uploadingFront ? "Uploading front photo..." : "Uploading side photo..."}
              </span>
            </div>
          </div>
        </div>
      )}
      
      <h1 className="text-3xl text-center text-[#AE7E56] font-bold mb-6">
        Provide Body Photos
      </h1>
      <h3 className="text-lg text-center font-medium mb-1">
        Provide images from the waist up: Front and Side Views
      </h3>
      <h3 className="text-lg text-center font-medium mb-8">
        Your body should be clearly visible
      </h3>

      <div className="flex flex-col items-center justify-center mb-6">

        {/* Front Photo Upload */}
        <div className="w-full mb-8">
          <input
            id="front_photo_upload"
            className="hidden"
            type="file"
            name="front_photo_upload"
            accept="image/jpeg,image/jpg,image/png,image/heif,image/heic"
            ref={frontPhotoInputRef}
            onChange={handleFrontPhotoSelect}
            disabled={isUploading}
          />
          <label
            htmlFor="front_photo_upload"
            className={`flex items-center cursor-pointer p-5 border-2 rounded-lg shadow-md hover:bg-gray-50 mx-auto max-w-lg ${
              frontPhoto ? "border-green-500" : "border-gray-300"
            } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex w-full items-center">
              {frontPhotoPreview ? (
                <img
                  className="w-16 h-16 object-cover rounded mr-4"
                  src={frontPhotoPreview}
                  alt="Front view preview"
                />
              ) : (
                <img
                  className="w-16 h-16 object-contain mr-4"
                  src="https://myrocky.com/wp-content/themes/salient-child/img/photo_upload_icon.png"
                  alt="Upload icon"
                />
              )}
              <div className="flex flex-col">
                <span className={frontPhoto ? "text-[#C19A6B]" : "text-[#C19A6B]"}>
                  {frontPhoto ? frontPhoto.name : "Tap to upload Front View photo"}
                </span>
                {frontPhotoCdnUrl && (
                  <span className="text-green-600 text-sm mt-1">
                    ✅ Photo uploaded successfully
                  </span>
                )}
              </div>
            </div>
          </label>
          <p className="text-center text-sm mt-2 mb-6 text-gray-600">
            Please provide a clear photo of your front view.
          </p>
        </div>

        {/* Side Photo Upload */}
        <div className="w-full mb-8">
          <input
            id="side_photo_upload"
            className="hidden"
            type="file"
            name="side_photo_upload"
            accept="image/jpeg,image/jpg,image/png,image/heif,image/heic"
            ref={sidePhotoInputRef}
            onChange={handleSidePhotoSelect}
            disabled={isUploading}
          />
          <label
            htmlFor="side_photo_upload"
            className={`flex items-center cursor-pointer p-5 border-2 rounded-lg shadow-md hover:bg-gray-50 mx-auto max-w-lg ${
              sidePhoto ? "border-green-500" : "border-gray-300"
            } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex w-full items-center">
              {sidePhotoPreview ? (
                <img
                  className="w-16 h-16 object-cover rounded mr-4"
                  src={sidePhotoPreview}
                  alt="Side view preview"
                />
              ) : (
                <img
                  className="w-16 h-16 object-contain mr-4"
                  src="https://myrocky.com/wp-content/themes/salient-child/img/photo_upload_icon.png"
                  alt="Upload icon"
                />
              )}
              <div className="flex flex-col">
                <span className={sidePhoto ? "text-[#C19A6B]" : "text-[#C19A6B]"}>
                  {sidePhoto ? sidePhoto.name : "Tap to upload Side View photo"}
                </span>
                {sidePhotoCdnUrl && (
                  <span className="text-green-600 text-sm mt-1">
                    ✅ Photo uploaded successfully
                  </span>
                )}
              </div>
            </div>
          </label>
          <p className="text-center text-sm mt-2 text-gray-600">
            Please provide a clear photo of your side view
          </p>
          <p className="text-center text-xs mt-1 text-gray-500">
            It helps to use a mirror
          </p>
        </div>

        {frontPhoto && sidePhoto && (
          <p className="text-center text-xs text-gray-500 mb-4">
            Photos selected: {frontPhoto.name}, {sidePhoto.name}
          </p>
        )}

        {(!frontPhoto || !sidePhoto) && (
          <div className="w-full max-w-md mx-auto">
            <p className="text-center text-sm text-gray-500 mb-8">
              Only JPG, JPEG, PNG, HEIF, and HEIC images are supported.
              <br />
              Max allowed file size per image is 20MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
