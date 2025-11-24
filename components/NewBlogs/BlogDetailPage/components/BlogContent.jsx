"use client";

import { useState } from "react";
import Image from "next/image";
import { logger } from "@/utils/devLogger";

export default function BlogContent({
  title,
  author,
  authorData,
  category,
  content,
  featuredImage,
  excerpt,
  publishedAt,
}) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Format published date - handle various date formats
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // Handle ISO date strings
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      if (typeof logger !== 'undefined' && logger?.error) {
        logger.error('Error formatting date:', error);
      }
      return '';
    }
  };

  // Convert markdown to HTML with proper IDs for headings and better structure
  const markdownToHtml = (markdown) => {
    if (!markdown) return '';
    
    let html = markdown;
    let headingIndex = 0;
    
    // Process headers and add IDs (must be done before other processing)
    html = html.replace(/^(#{1,6})\s+(.+)$/gim, (match, hashes, text) => {
      const level = hashes.length;
      const id = `heading-${headingIndex++}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const className = level === 1 
        ? 'text-3xl font-bold mt-8 mb-4 text-gray-900'
        : level === 2 
        ? 'text-2xl font-semibold mt-8 mb-4 text-gray-900'
        : level === 3
        ? 'text-xl font-semibold mt-6 mb-3 text-gray-900'
        : 'text-lg font-semibold mt-4 mb-2 text-gray-900';
      
      return `<h${level} id="${id}" class="${className}">${text.trim()}</h${level}>`;
    });
    
    // Process bold text
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-gray-900">$1</strong>');
    
    // Process lists - improved to handle nested and multiple lists
    const lines = html.split('\n');
    let inList = false;
    let listItems = [];
    const processedLines = [];
    
    lines.forEach((line) => {
      const trimmedLine = line.trim();
      
      // Check if line is a list item
      if (trimmedLine.match(/^[\-\*]\s+/)) {
        if (!inList) {
          inList = true;
          listItems = [];
        }
        const itemText = trimmedLine.replace(/^[\-\*]\s+/, '');
        // Process bold text in list items
        const processedItem = itemText.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>');
        listItems.push(`<li class="mb-2 text-gray-700 leading-relaxed">${processedItem}</li>`);
      } else {
        // Close list if we were in one
        if (inList) {
          processedLines.push(`<ul class="list-disc mb-6 space-y-2 pl-6">${listItems.join('')}</ul>`);
          listItems = [];
          inList = false;
        }
        
        // Process non-empty lines
        if (trimmedLine) {
          // Skip if it's already an HTML tag (from heading processing)
          if (trimmedLine.startsWith('<')) {
            processedLines.push(trimmedLine);
          } else {
            // Process bold text in paragraphs
            const processedText = trimmedLine.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-gray-900">$1</strong>');
            processedLines.push(`<p class="mb-4 text-gray-700 leading-relaxed">${processedText}</p>`);
          }
        }
      }
    });
    
    // Close any remaining list
    if (inList && listItems.length > 0) {
      processedLines.push(`<ul class="list-disc mb-6 space-y-2 pl-6">${listItems.join('')}</ul>`);
    }
    
    return processedLines.join('\n');
  };

  const renderImage = () => {
    if (featuredImage && !imageError) {
      return (
        <div className="relative mb-6">
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-200 rounded-lg animate-pulse aspect-video"></div>
          )}

          <Image
            src={featuredImage}
            alt={title}
            width={800}
            height={450}
            className={`w-full rounded-lg transition-opacity duration-300 ${
              imageLoading ? "opacity-0" : "opacity-100"
            }`}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            unoptimized
          />
        </div>
      );
    }

    return (
      <div className="bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 font-mono text-sm aspect-video mb-6">
        16:9
      </div>
    );
  };

  const renderContent = () => {
    if (!content) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600">No content available</p>
        </div>
      );
    }

    // Check if content is markdown or HTML
    const isMarkdown = content.trim().startsWith('#') || content.includes('\n##');
    const htmlContent = isMarkdown ? markdownToHtml(content) : content;

    return (
      <div
        className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:list-disc prose-li:text-gray-700"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  };

  // Get author avatar
  const getAuthorAvatar = () => {
    if (authorData?.avatar) return authorData.avatar;
    return null;
  };

  // Get author description
  const getAuthorDescription = () => {
    if (authorData?.description) return authorData.description;
    return null;
  };

  return (
    <article className="bg-white rounded-lg">
      {/* Featured Image */}
      {renderImage()}

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
        {title}
      </h1>

      {/* Meta Information */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
        <span>Written by {author}</span>
        {publishedAt && (
          <>
            <span>•</span>
            <span>{formatDate(publishedAt)}</span>
          </>
        )}
        <span>•</span>
        <span>in {category}</span>
      </div>

      {/* Excerpt */}
      {excerpt && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-gray-700">{excerpt}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="mb-8">{renderContent()}</div>

      {/* Author Bio */}
      {authorData && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Author Bio</h2>
          <div className="flex gap-4 items-start">
            {getAuthorAvatar() && (
              <div className="flex-shrink-0">
                <Image
                  src={getAuthorAvatar()}
                  alt={author}
                  width={100}
                  height={100}
                  className="rounded-full h-[100px] w-[100px] object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">{author}</h3>
              {getAuthorDescription() ? (
                <p className="text-gray-600 text-sm leading-relaxed">{getAuthorDescription()}</p>
              ) : (
                <p className="text-gray-600 text-sm leading-relaxed">
                  {authorData.email && `Email: ${authorData.email}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
