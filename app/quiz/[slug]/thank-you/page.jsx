"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/utils/devLogger";
import { FaCheckCircle, FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa";

export default function QuizThankYouPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const [loading, setLoading] = useState(true);
  const [submissionData, setSubmissionData] = useState(null);

  useEffect(() => {
    // Load submission data from sessionStorage
    const storedSubmission = sessionStorage.getItem('quiz-submission');
    
    if (!storedSubmission) {
      logger.warn("No quiz submission data found - redirecting to quiz");
      router.push(`/quiz/${slug}`);
      return;
    }

    try {
      const parsedSubmission = JSON.parse(storedSubmission);
      logger.log("Loaded quiz submission:", parsedSubmission);
      setSubmissionData(parsedSubmission);
    } catch (error) {
      logger.error("Error parsing quiz submission:", error);
      router.push(`/quiz/${slug}`);
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!submissionData) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8 md:p-12">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mb-8">
            <FaCheckCircle className="block h-auto mx-auto text-7xl text-green-600 mb-6" />
            <h1 className="text-[#814B00] text-3xl md:text-4xl font-bold mb-4">
              Thank You!
            </h1>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
              Your consultation has been successfully submitted
            </h2>
            <p className="text-base md:text-lg text-gray-600 mb-6">
              We will review your information and be in touch shortly.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-8"></div>

          {/* What's Next Section */}
          <div className="text-left mb-8">
            <h3 className="text-[#814B00] text-xl font-semibold mb-4">
              What happens next?
            </h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-[#814B00] mr-3 text-xl">1.</span>
                <span>Our healthcare team will review your consultation within 24-48 hours</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#814B00] mr-3 text-xl">2.</span>
                <span>We'll contact you via email or phone if we need any additional information</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#814B00] mr-3 text-xl">3.</span>
                <span>Once approved, your prescription will be prepared and shipped to you</span>
              </li>
            </ul>
          </div>

          {/* Important Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 text-left">
            <p className="text-sm text-gray-700">
              <strong className="text-yellow-800">Important:</strong> Please check your email 
              (including spam/junk folders) for updates on your consultation.
            </p>
          </div>

          {/* Social Media */}
          <div className="text-center">
            <h3 className="text-[#814B00] text-xl font-medium mb-4">
              Follow us for health tips and updates
            </h3>
            <div className="flex justify-center gap-6 mb-8">
              <a
                href="https://www.facebook.com/people/Rocky-Health-Inc/100084461297628/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#814B00] hover:text-[#A7885A] transition-colors text-3xl"
              >
                <FaFacebook />
              </a>
              <a
                href="https://www.instagram.com/myrocky/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#814B00] hover:text-[#A7885A] transition-colors text-3xl"
              >
                <FaInstagram />
              </a>
              <a
                href="https://twitter.com/myrockyca"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#814B00] hover:text-[#A7885A] transition-colors text-3xl"
              >
                <FaTwitter />
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/my-account")}
              className="px-8 py-3 bg-[#814B00] text-white rounded-full font-medium hover:bg-[#A7885A] transition-colors"
            >
              Go to My Account
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-8 py-3 border border-[#814B00] text-[#814B00] rounded-full font-medium hover:bg-gray-50 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
