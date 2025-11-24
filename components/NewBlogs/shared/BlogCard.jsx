"use client";

import { useState } from "react";
import { logger } from "@/utils/devLogger";
import Link from "next/link";
import Image from "next/image";

export default function BlogCard({
  blog,
  variant = "default",
  className = "",
  showTags = true,
  showExcerpt = true,
  isClickable = true,
}) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Safety check for blog data
  if (!blog || typeof blog !== "object") {
    logger.warn("BlogCard: Invalid blog data:", blog);
    return null;
  }

  const decodeHTML = (html) => {
    if (typeof document === "undefined") return html; // For SSR compatibility
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  // Extract and sanitize data from WordPress API response
  const extractText = (field) => {
    if (typeof field === "string") return decodeHTML(field);
    if (field && typeof field === "object" && field.rendered)
      return decodeHTML(field.rendered);
    if (field && typeof field === "object" && field.name)
      return decodeHTML(field.name);
    return "";
  };

  const extractTags = (tags) => {
    if (!tags || !Array.isArray(tags)) return [];
    return tags.map((tag) => extractText(tag)).filter(Boolean);
  };

  // Extract title and excerpt
  const title = extractText(blog.title) || "Untitled";
  const excerpt = extractText(blog.excerpt) || "No excerpt available";

  // Extract author - prioritize new format, fallback to legacy
  let author = "Unknown Author";
  if (blog.authorName) {
    author = blog.authorName;
  } else if (blog.author) {
    const firstName = blog.author.firstName || "";
    const lastName = blog.author.lastName || "";
    author = `${firstName} ${lastName}`.trim() || "Unknown Author";
  } else if (blog.authors && blog.authors.length > 0) {
    author =
      blog.authors[0].display_name || blog.authors[0].name || "Unknown Author";
  } else if (
    blog._embedded &&
    blog._embedded.author &&
    blog._embedded.author.length > 0
  ) {
    author = blog._embedded.author[0].name || "Unknown Author";
  }

  // Extract category - prioritize new format, fallback to legacy
  let category = "Uncategorized";
  if (blog.category) {
    category = blog.category;
  } else if (blog.categories && Array.isArray(blog.categories) && blog.categories.length > 0) {
    // New format: categories array already contains category objects directly
    const firstCategory = blog.categories[0];
    if (firstCategory.name) {
      category = firstCategory.name;
    }
  } else if (
    blog._embedded &&
    blog._embedded["wp:term"] &&
    blog._embedded["wp:term"][0] &&
    blog._embedded["wp:term"][0].length > 0
  ) {
    category = blog._embedded["wp:term"][0][0].name || "Uncategorized";
  }

  // Extract tags - prioritize new format, fallback to legacy
  let tags = [];
  if (blog.tags && Array.isArray(blog.tags)) {
    tags = blog.tags
      .map((tag) => {
        // Tags array already contains tag objects directly after transformation
        if (tag.name) return tag.name;
        return null;
      })
      .filter(Boolean);
  } else if (
    blog._embedded &&
    blog._embedded["wp:term"] &&
    blog._embedded["wp:term"][2]
  ) {
    tags = extractTags(blog._embedded["wp:term"][2]);
  }

  // Extract featured image - prioritize new format, fallback to legacy
  let featuredImage = null;
  if (blog.featuredImageUrl) {
    featuredImage = blog.featuredImageUrl;
  } else if (blog.featuredImage) {
    featuredImage = blog.featuredImage.cdnUrl || blog.featuredImage.storagePath || null;
  } else if (
    blog._embedded &&
    blog._embedded["wp:featuredmedia"] &&
    blog._embedded["wp:featuredmedia"].length > 0
  ) {
    const media = blog._embedded["wp:featuredmedia"][0];
    featuredImage =
      media.source_url ||
      media.media_details?.sizes?.medium?.source_url ||
      media.media_details?.sizes?.large?.source_url;
  }

  // Remove HTML tags from excerpt for clean display
  const cleanExcerpt = excerpt.replace(/<[^>]*>/g, "").trim();

  const renderImage = (aspectRatio = "16:9") => {
    if (featuredImage && !imageError) {
      return (
        <div
          className={`relative  ${
            aspectRatio === "16:9"
              ? "aspect-square w-full md:w-[688px] max-h-[198px] md:max-h-[386px]"
              : aspectRatio === "13:7"
              ? "aspect-video md:w-[384px] md:max-h-[216px]"
              : "w-[64px] md:w-[88px] h-[64px] md:h-[88px]"
          }`}
        >
          {/* Loading skeleton */}
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-200 rounded-2xl animate-pulse"></div>
          )}

          <Image
            src={featuredImage}
            alt={title}
            fill
            className={`object-cover rounded-2xl transition-opacity duration-300 ${
              imageLoading ? "opacity-0" : "opacity-100"
            }`}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            priority={variant === "featured"}
          />
        </div>
      );
    }

    // Fallback to placeholder if no image or image error
    return (
      <div
        className={`bg-gray-200 rounded-2xl flex items-center justify-center text-gray-400 ${
          aspectRatio === "16:9"
            ? "aspect-square w-full md:w-[688px] max-h-[198px] md:max-h-[386px]"
            : aspectRatio === "13:7"
            ? "aspect-video md:w-[384px] md:max-h-[216px]"
            : "w-[64px] md:w-[88px] h-[64px] md:h-[88px]"
        }`}
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  };

  const renderTags = () => {
    if (!showTags || tags.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {/* {category.slice(0, 3).map((tag, index) => ( */}
        <span
          // key={index}
          className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
        >
          {category}
        </span>
        {/* ))} */}
      </div>
    );
  };

  const renderContent = () => {
    if (variant === "featured") {
      return (
        <>
          {renderImage("16:9")}
          <h2 className="text-[22px] md:text-[40px] headers-font font-[550] text-black mt-4 mb-2 md:mt-5 md:mb-4 leading-[115%]">
            {title}
          </h2>
          <p className="text-black font-medium tracking-0 text-[12px] leading-[140%] mb-2 md:mb-[16px]">
            {author} <span className="text-[#929292] font-[500]"> in </span>{" "}
            {category}
          </p>
          {showExcerpt && (
            <p className="text-[#6B6967] leading-[140%] text-sm md:text-[16px] md:mb-4 line-clamp-3">
              {cleanExcerpt}
            </p>
          )}
          {renderTags()}
        </>
      );
    }

    if (variant === "sidebar") {
      return (
        <div className="flex gap-4">
          <div className="flex-shrink-0 hidden md:block">
            {renderImage("1:1")}
          </div>
          <div className="flex-1">
            <h3 className="font-[550] text-black text-[18px] md:text-[22px] leading-[125%] mb-2 headers-font tracking-tight">
              {title}
            </h3>
            <p className="text-black font-semibold leading-[140%] text-[12px] mb-2">
              {author} <span className="text-[#929292] font-[500]"> in </span>{" "}
              {category}
            </p>
            {showExcerpt && (
              <p className="text-[#6B6967] text-[14px] md:text-[16px] mb-3 line-clamp-2">
                {cleanExcerpt}
              </p>
            )}
            {renderTags()}
          </div>
          <div className="flex-shrink-0 md:hidden block">
            {renderImage("1:1")}
          </div>
        </div>
      );
    }

    // Default grid layout
    return (
      <>
        {renderImage("13:7")}
        <div className="pt-4">
          <h3 className="headers-font text-[22px] leading-[115%] font-[550] tracking-tight mb-[8px]">
            {title}
          </h3>
          <p className="text-black font-semibold leading-[140%] text-[12px] mb-2">
            {author} <span className="text-[#929292] font-[500]"> in </span>{" "}
            {category}
          </p>

          {showExcerpt && (
            <p className="text-gray-700 text-[14px] leading-[140%] mb-3 line-clamp-2">
              {cleanExcerpt}
            </p>
          )}

          {renderTags()}
        </div>
      </>
    );
  };

  const cardContent = (
    <article className={`bg-white rounded-lg overflow-hidden ${className}`}>
      {renderContent()}
    </article>
  );

  if (isClickable && blog.slug) {
    return (
      <Link href={`/blog/${blog.slug}`} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
