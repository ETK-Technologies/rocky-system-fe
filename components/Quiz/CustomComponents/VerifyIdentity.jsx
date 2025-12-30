"use client";

import { useState, useRef } from "react";
import { uploadPhotos } from "@/utils/uploadService";
import { logger } from "@/utils/devLogger";

export default function VerifyIdentity({ step, answer, onAnswerChange, onBack }) {
  const [photoIdFile, setPhotoIdFile] = useState(answer?.idPhoto || null);
  const [idPhotoCdnUrl, setIdPhotoCdnUrl] = useState(answer?.idPhotoCdnUrl || null);
  const [firstName, setFirstName] = useState(answer?.firstName || "");
  const [lastName, setLastName] = useState(answer?.lastName || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleTapToUpload = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  const handlePhotoIdFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoIdFile(file);
      setUploading(true);
      
      // Upload to backend
      logger.log("📤 Uploading ID photo...");
      const result = await uploadPhotos(file);
      setUploading(false);
      
      if (result.success && result.files && result.files.length > 0) {
        const cdnUrl = result.files[0].cdnUrl;
        setIdPhotoCdnUrl(cdnUrl);
        logger.log("✅ ID photo uploaded:", cdnUrl);
        
        // Save CDN URL with answer
        const newData = {
          answerType: "img",
          answer: {
            idPhoto: file, 
            idPhotoCdnUrl: cdnUrl,
            firstName, 
            lastName
          }
        };
        onAnswerChange(newData);
      } else {
        logger.error("❌ ID photo upload failed:", result.error);
        alert(`Upload failed: ${result.error || 'Unknown error'}`);
      }
    }
  };

  const handleFirstNameChange = (value) => {
    setFirstName(value);
    const newData = {
      answerType: "file",
      answer: {
        idPhoto: photoIdFile, 
        idPhotoCdnUrl,
        firstName: value, 
        lastName
      }
    };
    onAnswerChange(newData);
  };

  const handleLastNameChange = (value) => {
    setLastName(value);
    const newData = {
      answerType: "file",
      answer: {
        idPhoto: photoIdFile, 
        idPhotoCdnUrl,
        firstName, 
        lastName: value
      }
    };
    onAnswerChange(newData);
  };

  return (
    <div className="px-4 pt-6 pb-4">
      {uploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C19A6B]"></div>
              <span className="text-lg">Uploading ID photo...</span>
            </div>
          </div>
        </div>
      )}
      
      <h1 className="text-3xl text-center text-[#AE7E56] font-bold mb-6">
        Verify your Identity
      </h1>
      <h3 className="text-lg text-center font-medium mb-1">
        Take a picture holding your ID.
      </h3>
      <h3 className="text-lg text-center font-medium mb-8">
        Your face and ID must be clearly visible
      </h3>

      <div className="flex flex-col items-center justify-center mb-6">
        <input
          type="file"
          ref={fileInputRef}
          id="photo-id-file"
          accept="image/jpeg,image/jpg,image/png,image/heif,image/heic"
          className="hidden"
          onChange={handlePhotoIdFileSelect}
          disabled={uploading}
        />

        <div
          onClick={handleTapToUpload}
          className={`w-full md:w-[80%] max-w-lg h-40 flex items-center justify-center border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 mb-6 mx-auto ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {!photoIdFile ? (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 border-2 border-[#C19A6B] rounded-lg flex items-center justify-center mb-2">
                <svg
                  className="w-10 h-10 text-[#C19A6B]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  ></path>
                </svg>
              </div>
              <span className="text-[#C19A6B] text-lg">
                Tap to upload the ID photo
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <img
                id="photo-id-preview"
                src={photoIdFile ? URL.createObjectURL(photoIdFile) : null}
                alt="ID Preview"
                className="max-w-full max-h-36 object-contain"
              />
              {idPhotoCdnUrl && (
                <span className="text-green-600 text-sm mt-2">✅ Photo uploaded successfully</span>
              )}
            </div>
          )}
        </div>

        {photoIdFile && (
          <div className="mb-6 mt-4 w-full max-w-md mx-auto">
            <div className="mb-4">
              <label
                htmlFor="legal_first_name"
                className="block text-sm font-medium text-gray-700 mb-1 text-left"
              >
                First Name (as per ID)
              </label>
              <input
                type="text"
                id="legal_first_name"
                name="legal_first_name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A7885A]"
                value={firstName}
                onChange={(e) => handleFirstNameChange(e.target.value)}
                required
                disabled={uploading}
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="legal_last_name"
                className="block text-sm font-medium text-gray-700 mb-1 text-left"
              >
                Last Name (as per ID)
              </label>
              <input
                type="text"
                id="legal_last_name"
                name="legal_last_name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A7885A]"
                value={lastName}
                onChange={(e) => handleLastNameChange(e.target.value)}
                required
                disabled={uploading}
              />
            </div>

            <p className="text-center text-xs text-gray-500 mb-4">
              Photo selected: {photoIdFile.name}
            </p>
          </div>
        )}

        {!photoIdFile && (
          <div className="w-full max-w-md mx-auto">
            <p className="text-center text-md font-medium mb-2">
              Please capture a selfie of yourself holding your ID
            </p>
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
