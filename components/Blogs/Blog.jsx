"use client";
import CustomImage from "@/components/utils/CustomImage";
import Link from "next/link";
import { useState } from "react";

function getText(html) {
  var divContainer = document.createElement("div");
  divContainer.innerHTML = html;
  return divContainer.textContent || divContainer.innerText || "";
}

const Blog = ({ blog }) => {
  const [imageError, setImageError] = useState(false);
  const defaultImage = "https://www.shutterstock.com/image-vector/default-ui-image-placeholder-wireframes-600nw-1037719192.jpg";

  // Extract reading time from Twitter meta data if available
  const getReadingTime = () => {
    if (blog.yoast_head_json?.twitter_misc?.["Est. reading time"]) {
      return blog.yoast_head_json.twitter_misc["Est. reading time"] + " read";
    }
    return "4 mins read"; // Default fallback
  };

  // Get featured image URL - handle both old and new formats
  const getFeaturedImageUrl = () => {
    if (imageError) {
      return defaultImage;
    }

    // New format: featuredImageUrl
    if (blog.featuredImageUrl) {
      return blog.featuredImageUrl;
    }

    // New format: featuredImage object
    if (blog.featuredImage) {
      if (blog.featuredImage.cdnUrl) {
        return blog.featuredImage.cdnUrl;
      }
      if (blog.featuredImage.storagePath) {
        return blog.featuredImage.storagePath;
      }
    }

    // Old format: _embedded
    if (
      blog._embedded &&
      blog._embedded["wp:featuredmedia"] &&
      blog._embedded["wp:featuredmedia"][0] &&
      blog._embedded["wp:featuredmedia"][0].source_url
    ) {
      return blog._embedded["wp:featuredmedia"][0].source_url;
    }

    // Check for image in yoast_head_json as fallback
    if (
      blog.yoast_head_json?.og_image &&
      blog.yoast_head_json.og_image[0]?.url
    ) {
      return blog.yoast_head_json.og_image[0].url;
    }

    return defaultImage; // Default fallback
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Get the category name - handle both old and new formats
  const getCategory = () => {
    // New format: category string
    if (blog.category && typeof blog.category === 'string') {
      return blog.category;
    }

    // New format: categories array
    if (blog.categories && Array.isArray(blog.categories) && blog.categories.length > 0) {
      const firstCategory = blog.categories[0];
      // Handle nested structure: categories[0].category.name
      if (firstCategory.category && firstCategory.category.name) {
        return firstCategory.category.name;
      }
      // Direct category object
      if (firstCategory.name) {
        return firstCategory.name;
      }
    }

    // Old format: class_list
    if (blog.class_list && blog.class_list[7]) {
      return blog.class_list[7].replace("category-", "").replace(/-/g, " ");
    }

    return "";
  };

  // Get date - handle both old and new formats
  const getDate = () => {
    // New format: publishedAt
    if (blog.publishedAt) {
      try {
        return new Date(blog.publishedAt);
      } catch (e) {
        // Fall through to old format
      }
    }
    // Old format: date
    if (blog.date) {
      try {
        return new Date(blog.date);
      } catch (e) {
        return new Date();
      }
    }
    return new Date();
  };

  // Get title - handle both old and new formats
  const getTitle = () => {
    if (typeof blog.title === 'string') {
      return blog.title;
    }
    if (blog.title?.rendered) {
      return blog.title.rendered;
    }
    return 'Untitled';
  };

  // Get content - handle both old and new formats
  const getContent = () => {
    if (typeof blog.content === 'string') {
      return blog.content;
    }
    if (blog.content?.rendered) {
      return blog.content.rendered;
    }
    return '';
  };

  return (
    <div
      className="max-w-sm rounded-2xl overflow-hidden bg-white"
      key={blog.id}
    >
      <div className="relative w-full h-60">
        <CustomImage
          src={getFeaturedImageUrl()}
          alt={getTitle() || "Article thumbnail"}
          className="rounded-xl"
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          priority={false}
          onError={handleImageError}
        />
        <span className="absolute top-2 left-2 bg-white text-black text-xs px-3 py-1 rounded-full shadow z-10">
          {getCategory()}
        </span>
      </div>
      <div className="py-4">
        <p className="text-gray-500 text-sm mb-2">
          {getDate().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          • {getReadingTime()}
        </p>
        <Link href={`/blog/` + (blog.slug || blog.id || '')}>
          <h2 className="text-lg font-semibold leading-snug mb-2">
            {getText(getTitle())}
          </h2>
        </Link>
        <p className="text-gray-600 text-sm">
          {(() => {
            const contentText = getText(getContent());
            return contentText.slice(0, 75) + (contentText.length > 75 ? "..." : "");
          })()}
        </p>
      </div>
    </div>
  );
};

export default Blog;