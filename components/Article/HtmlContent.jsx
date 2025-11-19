"use client";

import { useMemo } from "react";

const HtmlContent = ({ html, className, loading = false }) => {
  // Function to normalize HTML entities and clean text
  const normalizeText = (text) => {
    return text
      .replace(/&#8217;/g, "'") // Convert HTML apostrophe to regular apostrophe
      .replace(/&#8216;/g, "'") // Convert HTML left single quote to regular apostrophe
      .replace(/&#8220;/g, '"') // Convert HTML left double quote to regular quote
      .replace(/&#8221;/g, '"') // Convert HTML right double quote to regular quote
      .replace(/&amp;/g, "&") // Convert HTML ampersand to regular ampersand
      .replace(/&lt;/g, "<") // Convert HTML less than to regular <
      .replace(/&gt;/g, ">") // Convert HTML greater than to regular >
      .replace(/&quot;/g, '"') // Convert HTML quote to regular quote
      .replace(/&#39;/g, "'") // Convert HTML apostrophe to regular apostrophe
      .trim();
  };

  const processedHtml = useMemo(() => {
    if (!html) return "";

    // Check if content is markdown and convert to HTML
    let cleanedHtml = html;
    const isMarkdown = html.trim().startsWith('#') || html.includes('\n##');
    
    if (isMarkdown) {
      // Convert markdown to HTML
      cleanedHtml = html
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        // Lists
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        // Paragraphs
        .split('\n\n')
        .map(para => {
          if (para.trim().startsWith('<')) return para;
          if (para.trim().startsWith('<li')) return `<ul>${para}</ul>`;
          return `<p>${para.trim()}</p>`;
        })
        .join('\n');
    }

    // Clean up Visual Composer shortcodes and other unwanted elements
    cleanedHtml = cleanedHtml
      // Remove Visual Composer shortcodes
      .replace(/\[vc_row[^\]]*\]/gi, "")
      .replace(/\[vc_column[^\]]*\]/gi, "")
      .replace(/\[vc_column_text[^\]]*\]/gi, "")
      .replace(/\[\/vc_column_text\]/gi, "")
      .replace(/\[\/vc_column\]/gi, "")
      .replace(/\[\/vc_row\]/gi, "")
      // Remove other common shortcodes that might interfere
      .replace(/\[vc_[^\]]*\]/gi, "")
      .replace(/\[\/vc_[^\]]*\]/gi, "")
      // Remove empty paragraphs that might be left behind
      .replace(/<p>\s*<\/p>/gi, "")
      .replace(/<p><br\s*\/?><\/p>/gi, "")
      // Clean up multiple consecutive line breaks
      .replace(/\n\s*\n\s*\n/gi, "\n\n");

    // Add custom styles for blog content - scoped to blog content only
    const customStyles = `
      <style>
        /* Links styling - using brand colors */
        .blog-content a {
          color: #814b00 !important;
          text-decoration: underline !important;
        }
        .blog-content a:hover {
          color: #a65c00 !important;
        }
        
        /* Styled button/CTA links - override inline styles for better visibility */
        .blog-content a[style*="background-color"] {
          color: #ffffff !important;
          text-decoration: none !important;
        }
        .blog-content a[style*="background-color"]:hover {
          color: #ffffff !important;
          opacity: 0.9 !important;
        }
        
        /* Specific styling for black background buttons */
        .blog-content a[style*="background-color: #000000"],
        .blog-content a[style*="background-color:#000000"] {
          color: #ffffff !important;
          text-decoration: none !important;
        }
        .blog-content a[style*="background-color: #000000"]:hover,
        .blog-content a[style*="background-color:#000000"]:hover {
          color: #ffffff !important;
          opacity: 0.9 !important;
        }
        
        /* Heading tags styling - applying h2 style to all headings (h1-h6) */
        .blog-content h1,
        .blog-content h2,
        .blog-content h3,
        .blog-content h4,
        .blog-content h5,
        .blog-content h6 {
          font-size: 2rem !important;
          font-weight: 600 !important;
          margin-top: 1.5rem !important;
          margin-bottom: 0.75rem !important;
          line-height: 1.3 !important;
        }
        
        /* Hide empty headings that contain only whitespace or &nbsp; */
        .blog-content h1:empty,
        .blog-content h2:empty,
        .blog-content h3:empty,
        .blog-content h4:empty,
        .blog-content h5:empty,
        .blog-content h6:empty,
        .blog-content h1:has(:only-child):has([style*="display: none"]),
        .blog-content h2:has(:only-child):has([style*="display: none"]),
        .blog-content h3:has(:only-child):has([style*="display: none"]),
        .blog-content h4:has(:only-child):has([style*="display: none"]),
        .blog-content h5:has(:only-child):has([style*="display: none"]),
        .blog-content h6:has(:only-child):has([style*="display: none"]) {
          display: none !important;
        }
        
        /* Hide all br tags */
        .blog-content br {
          display: none !important;
        }
        
        /* Hide empty paragraphs and other elements as fallback */
        .blog-content p:empty,
        .blog-content div:empty,
        .blog-content span:empty,
        .blog-content strong:empty,
        .blog-content em:empty,
        .blog-content b:empty,
        .blog-content i:empty,
        .blog-content u:empty {
          display: none !important;
        }
        .blog-content h1 strong,
        .blog-content h2 strong,
        .blog-content h3 strong,
        .blog-content h4 strong,
        .blog-content h5 strong,
        .blog-content h6 strong {
          font-size: inherit !important;
          font-weight: inherit !important;
          line-height: inherit !important;
          margin: 0 !important;
          display: inline !important;
        }
        
        /* Strong tags styling - smaller than headings, less weight, inline */
        .blog-content strong {
          font-size: 1rem !important;
          font-weight: 500 !important;
          line-height: 1.5rem !important;
          margin-top: 0.25rem !important;
          margin-bottom: 0.25rem !important;
          display: inline !important;
        }
        
        /* Lists styling - restore bullets reset by preflight */
        .blog-content ul,
        .blog-content ol {
          margin-bottom: 1rem !important;
          padding-left: 1.5rem !important;
          list-style-position: outside !important;
        }
        .blog-content ul {
          list-style-type: disc !important;
        }
        .blog-content ol {
          list-style-type: decimal !important;
        }
        .blog-content li {
          margin: 0.25rem 0 !important;
        }
        
        /* Image sizing and padding */
        .blog-content img.size-large ,.blog-content img.size-full,.blog-content img.aligncenter {
          max-width: 100% !important;
          height: auto !important;
          padding: 0 !important;
          border-radius: 12px !important;
           margin: 1rem  0 !important;

        }
        .blog-content img.size-medium {
          max-width: 80% !important;
          height: auto !important;
          padding: 0 !important;
          border-radius: 12px !important;
          margin: 1rem  0 !important;
        }
        .blog-content img.size-small {
          max-width: 60% !important;
          height: auto !important;
          padding: 0 !important;
        border-radius: 12px !important;
        margin: 1rem  0 !important;

        }
        
        /* Caption text styling */
        .blog-content .wp-caption-text {
          font-size: 0.875rem !important;
          color: #6b7280 !important;
          font-style: italic !important;
          margin-top: 0.5rem !important;
        }
        
        /* Video and iframe styling - non-intrusive and responsive */
        .blog-content iframe {
          display: block;
          max-width: 100%;
          width: 100%;
          height: auto;
          border: 0;
          border-radius: 8px;
          margin: 24px auto;
        }

        /* If there's no absolute-positioned wrapper, give a sane default */
        .blog-content iframe:not([style*="position: absolute"]) {
          aspect-ratio: 16 / 9;
        }

        /* YouTube-specific: allow wrapper to dictate size */
        .blog-content iframe[src*="youtube.com"],
        .blog-content iframe[src*="youtu.be"] {
          width: 100%;
          height: auto;
        }

        /* Vertical Shorts: portrait aspect and smaller max width */
        .blog-content iframe[src*="youtube.com/shorts"],
        .blog-content iframe[src*="youtu.be/shorts"] {
          aspect-ratio: 9 / 16;
          max-width: 420px;
        }

        @media (max-width: 768px) {
          .blog-content iframe { margin: 16px auto; }
        }

        .blog-content video {
          max-width: 100% !important;
          height: auto !important;
        }
        
        /* WordPress caption container */
        .blog-content .wp-caption {
          max-width: 100% !important;
        }
        .blog-content .wp-caption img {
          max-width: 100% !important;
          height: auto !important;
        }
      </style>
    `;

    // Remove empty headings that contain only whitespace or &nbsp;
    let processed = cleanedHtml.replace(
      /<(h[1-6])[^>]*>\s*(?:&nbsp;|\s)*\s*<\/\1>/gi,
      ""
    );

    // Remove any element (p, div, span, etc.) that contains only &nbsp; or whitespace
    processed = processed.replace(
      /<(p|div|span|strong|em|b|i|u)[^>]*>\s*(?:&nbsp;|\s)*\s*<\/\1>/gi,
      ""
    );
    const seenTexts = new Set(); // Track seen normalized text content to prevent duplicates
    const seenSlugs = new Set(); // Track seen slugs to prevent duplicate IDs

    // Add IDs to all headings (h1, h2, h3, h4, h5, h6) - use non-greedy matching
    const headingRegex = /<(h[1-6])[^>]*>([^<]*(?:<[^>]*>[^<]*)*?)<\/\1>/gi;
    processed = processed.replace(headingRegex, (match, tagName, content) => {
      // Extract text content from the heading and normalize it
      const rawTextContent = content.replace(/<[^>]*>/g, "").trim();
      const normalizedTextContent = normalizeText(rawTextContent);

      if (normalizedTextContent && !seenTexts.has(normalizedTextContent)) {
        // Create a slug from the normalized text for the href
        const slug = normalizedTextContent
          .toLowerCase()
          .replace(/[^\w\s-]/g, "") // Remove special characters except spaces and hyphens
          .replace(/\s+/g, "-") // Replace spaces with hyphens
          .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
          .trim();

        // Only add ID if we haven't seen this normalized text before
        if (!seenSlugs.has(slug)) {
          seenTexts.add(normalizedTextContent);
          seenSlugs.add(slug);

          // Add ID to the heading
          return `<${tagName} id="${slug}">${content}</${tagName}>`;
        }
      }

      return match;
    });

    // Add custom styles to the beginning of the processed HTML
    return customStyles + processed;
  }, [html]);

  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`blog-content ${className || ""}`}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
};

export default HtmlContent;
