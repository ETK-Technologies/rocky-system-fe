"use client";

import { useState } from "react";

export default function PhotoUpload({ step, answer, onAnswerChange }) {
  const [frontPhoto, setFrontPhoto] = useState(answer?.frontPhoto || null);
  const [topPhoto, setTopPhoto] = useState(answer?.topPhoto || null);
  const [frontPhotoFile, setFrontPhotoFile] = useState(answer?.frontPhotoFile || null);
  const [topPhotoFile, setTopPhotoFile] = useState(answer?.topPhotoFile || null);

  const handleFrontPhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFrontPhoto(previewUrl);
      setFrontPhotoFile(file);
      
      // Save photo data with answer
      const updatedAnswer = {
        frontPhoto: previewUrl,
        frontPhotoFile: file,
        topPhoto: topPhoto,
        topPhotoFile: topPhotoFile,
        status: (file && topPhotoFile) ? "uploaded" : "partial"
      };
      onAnswerChange(updatedAnswer);
    }
  };

  const handleTopPhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setTopPhoto(previewUrl);
      setTopPhotoFile(file);
      
      // Save photo data with answer
      const updatedAnswer = {
        frontPhoto: frontPhoto,
        frontPhotoFile: frontPhotoFile,
        topPhoto: previewUrl,
        topPhotoFile: file,
        status: (frontPhotoFile && file) ? "uploaded" : "partial"
      };
      onAnswerChange(updatedAnswer);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Front Hairline Photo Upload */}
      <div className="w-full md:w-4/5 mx-auto">
        <input
          id="photo_upload_1"
          className="hidden"
          type="file"
          name="photo_upload_1"
          accept="image/*"
          onChange={handleFrontPhotoSelect}
        />
        <label
          htmlFor="photo_upload_1"
          className="flex items-center cursor-pointer p-5 border-2 border-gray-300 rounded-lg shadow-md hover:bg-gray-50"
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
                  Tap to upload Front Hairline photo
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
        />
        <label
          htmlFor="photo_upload_2"
          className="flex items-center cursor-pointer p-5 border-2 border-gray-300 rounded-lg shadow-md hover:bg-gray-50"
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
                  Tap to upload Top of Head photo
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
