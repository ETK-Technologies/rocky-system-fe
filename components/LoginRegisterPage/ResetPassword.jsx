"use client";

import { useState, Suspense } from "react";
import { logger } from "@/utils/devLogger";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import { MdOutlineRemoveRedEye, MdOutlineVisibilityOff } from "react-icons/md";
import Loader from "@/components/Loader";

const ResetPasswordContent = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [submitting, setSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirm_password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid reset link. Please request a new password reset.");
      return;
    }

    if (formData.password !== formData.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token,
          newPassword: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetSuccess(true);
        toast.success("Your password has been reset successfully");
      } else {
        toast.error(
          data.message || "Failed to reset password. Please try again."
        );
      }
    } catch (err) {
      logger.error("Error:", err);
      toast.error("An error occurred while processing your request");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center mx-auto py-8 px-8 w-[100%] max-w-[500px] text-center">
        <h2 className="text-[#251f20] text-[32px] headers-font font-[450] leading-[44.80px] mb-4">
          Invalid Reset Link
        </h2>
        <p className="mb-6 text-gray-700">
          The password reset link is invalid or missing the token.
        </p>
        <Link href="/forgot-password" className="text-[#AE7E56] underline">
          Request a new password reset link
        </Link>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="flex flex-col items-center justify-center mx-auto py-8 px-8 w-[100%] max-w-[500px] text-center">
        <h2 className="text-[#251f20] text-[32px] headers-font font-[450] leading-[44.80px] mb-4">
          Password Reset Complete
        </h2>
        <p className="mb-6 text-gray-700">
          Your password has been reset successfully. You can now login with your
          new password.
        </p>
        <Link
          href="/login-register?viewshow=login"
          className="bg-black text-white py-[12.5px] px-8 rounded-full hover:opacity-90 transition-opacity"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="px-3 mx-auto pt-5 text-center">
        <h2 className="text-[#251f20] text-[32px] headers-font font-[450] leading-[44.80px]">
          Reset Your Password
        </h2>
        <h3 className="text-sm text-center font-normal pt-2 tracking-normal">
          Enter your new password below
        </h3>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col flex-wrap items-center justify-center mx-auto py-3 px-8 pt-5 w-[100%] max-w-[400px] space-y-4">
          <div className="w-full flex flex-col items-start justify-center gap-2 password-field">
            <label htmlFor="password">New Password</label>
            <div className="w-full relative items-center">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Enter your new password"
                name="password"
                className="block w-[100%] rounded-[8px] h-[40px] text-md m-auto border-gray-500 border px-4"
                tabIndex="1"
                autoComplete="new-password"
                onChange={handleChange}
                required
                minLength={8}
              />
              {showPassword ? (
                <MdOutlineVisibilityOff
                  size={16}
                  className="absolute right-3 top-3 cursor-pointer"
                  onClick={togglePasswordVisibility}
                />
              ) : (
                <MdOutlineRemoveRedEye
                  size={16}
                  className="absolute right-3 top-3 cursor-pointer"
                  onClick={togglePasswordVisibility}
                />
              )}
            </div>
          </div>

          <div className="w-full flex flex-col items-start justify-center gap-2 password-field">
            <label htmlFor="confirm_password">Confirm New Password</label>
            <div className="w-full relative items-center">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirm_password"
                placeholder="Confirm your new password"
                name="confirm_password"
                className="block w-[100%] rounded-[8px] h-[40px] text-md m-auto border-gray-500 border px-4"
                tabIndex="2"
                autoComplete="new-password"
                onChange={handleChange}
                required
                minLength={8}
              />
              {showConfirmPassword ? (
                <MdOutlineVisibilityOff
                  size={16}
                  className="absolute right-3 top-3 cursor-pointer"
                  onClick={toggleConfirmPasswordVisibility}
                />
              ) : (
                <MdOutlineRemoveRedEye
                  size={16}
                  className="absolute right-3 top-3 cursor-pointer"
                  onClick={toggleConfirmPasswordVisibility}
                />
              )}
            </div>
          </div>

          <div className="w-full flex justify-center items-center mt-5">
            <button
              type="submit"
              className="bg-black text-white py-[12.5px] w-full rounded-full"
              disabled={submitting}
            >
              {submitting ? "Resetting Password..." : "Reset Password"}
            </button>
          </div>

          <div className="w-full text-center">
            <Link
              href="/login-register?viewshow=login"
              className="text-[#AE7E56] text-sm font-normal underline"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </form>
    </>
  );
};

export default function ResetPassword() {
  return (
    <div suppressHydrationWarning>
      <Suspense fallback={<Loader />}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
