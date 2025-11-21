"use client";

import { useMemo } from "react";
import Loader from "@/components/Loader";
import MoreQuestions from "@/components/MoreQuestions";
import Section from "@/components/utils/Section";
import TermsNav from "./TermsNav";

// Decode HTML entities (works on both server and client)
const decodeHtml = (html) => {
  if (typeof window === "undefined") {
    // Server-side: use string replacement
    return html
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  } else {
    // Client-side: use DOM
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html;
    return textarea.value;
  }
};

const SimpleTermsContent = ({ pageData }) => {
  // Parse HTML content and extract sections
  const { professionalDisclosure, sections, lastUpdated, styledContent } = useMemo(() => {
    if (!pageData || !pageData.content) {
      return {
        professionalDisclosure: null,
        sections: [],
        lastUpdated: null,
        styledContent: "",
      };
    }

    // Decode the content
    let decodedContent = decodeHtml(pageData.content);
    
    // Clean up paragraph-wrapped HTML (the API sometimes wraps HTML in <p> tags)
    // Remove <p> tags that only contain HTML tags
    decodedContent = decodedContent.replace(/<p>\s*&lt;([^&]+)&gt;\s*<\/p>/g, '<$1>');
    decodedContent = decodedContent.replace(/<p>\s*&lt;\/([^&]+)&gt;\s*<\/p>/g, '</$1>');
    // Also handle already decoded HTML wrapped in paragraphs
    decodedContent = decodedContent.replace(/<p>\s*<([^>]+)>\s*<\/p>/g, '<$1>');
    decodedContent = decodedContent.replace(/<p>\s*<\/([^>]+)>\s*<\/p>/g, '</$1>');

    // Extract professional disclosure from excerpt
    let professionalDisclosureContent = null;
    if (pageData.excerpt) {
      const decodedExcerpt = decodeHtml(pageData.excerpt);
      professionalDisclosureContent = decodedExcerpt;
    }

    // Extract all sections with IDs
    const extractedSections = [];
    let remainingContent = decodedContent;
    
    // Find all divs with id attributes
    const idMatches = Array.from(remainingContent.matchAll(/<div[^>]*id="([^"]+)"[^>]*>/g));
    
    for (let i = 0; i < idMatches.length; i++) {
      const match = idMatches[i];
      const id = match[1];
      const startIndex = match.index + match[0].length;
      
      // Find the end of this section (next div with id or end of content)
      let endIndex = remainingContent.length;
      if (i < idMatches.length - 1) {
        endIndex = idMatches[i + 1].index;
      }
      
      // Extract content between this div and the next
      let content = remainingContent.substring(startIndex, endIndex);
      
      // Count opening and closing divs to find the proper closing tag
      let divCount = 1;
      let pos = startIndex;
      while (divCount > 0 && pos < remainingContent.length) {
        const nextOpen = remainingContent.indexOf('<div', pos);
        const nextClose = remainingContent.indexOf('</div>', pos);
        
        if (nextClose === -1) break;
        
        if (nextOpen !== -1 && nextOpen < nextClose) {
          divCount++;
          pos = nextOpen + 4;
        } else {
          divCount--;
          if (divCount === 0) {
            content = remainingContent.substring(startIndex, nextClose);
            break;
          }
          pos = nextClose + 6;
        }
      }
      
      content = content.trim();
      if (content) {
        // Extract title from h3 or first heading
        const titleMatch = content.match(/<h3[^>]*>(.*?)<\/h3>/i) || 
                              content.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : id.replace(/-/g, " ");
        
        extractedSections.push({ 
          id, 
          content,
          title: title.charAt(0).toUpperCase() + title.slice(1)
        });
      }
    }

    // Format date
    let formattedDate = null;
    if (pageData.publishedAt) {
      try {
        const date = new Date(pageData.publishedAt);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        }
      } catch (e) {
        // Keep null if date parsing fails
      }
    }

    // Build styled content from sections
    let styled = "";
    
    // Process each section
    for (const section of extractedSections) {
      let sectionHtml = section.content;
      
      // Style h3 headings (section titles)
      sectionHtml = sectionHtml.replace(
        /<h3[^>]*>(.*?)<\/h3>/gi,
        '<h3 class="text-[22px] md:text-[30px] leading-[115%] tracking-[-0.01em] md:tracking-[-0.02em] mb-4 md:mb-6 headers-font">$1</h3>'
      );

      // Style h2 headings
      sectionHtml = sectionHtml.replace(
        /<h2[^>]*>(.*?)<\/h2>/gi,
        '<h2 class="text-[18px] md:text-[20px] text-[#AE7E56] leading-[140%] font-[500] mb-4 md:mb-6">$1</h2>'
      );

      // Style paragraphs
      sectionHtml = sectionHtml.replace(
        /<p[^>]*>(.*?)<\/p>/gi,
        '<p class="text-[16px] md:text-[18px] leading-[160%] font-[400] text-[#000000D9] mb-6">$1</p>'
      );

      // Style lists
      sectionHtml = sectionHtml.replace(/<ol[^>]*>/gi, '<ol class="list-decimal pl-6 mb-6 space-y-2">');
      sectionHtml = sectionHtml.replace(/<ul[^>]*>/gi, '<ul class="list-disc pl-6 mb-6 space-y-2">');
      sectionHtml = sectionHtml.replace(
        /<li[^>]*>(.*?)<\/li>/gi,
        '<li class="text-[16px] md:text-[18px] leading-[160%] font-[400] mb-2">$1</li>'
      );

      // Style links
      sectionHtml = sectionHtml.replace(
        /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi,
        '<a href="$1" class="duration-300 hover:text-gray-800 underline">$2</a>'
      );

      // Clean up empty divs and br tags
      sectionHtml = sectionHtml.replace(/<div[^>]*>\s*<\/div>/g, "");
      sectionHtml = sectionHtml.replace(/<br\s*\/?>/gi, "");
      
      // Style remaining divs that contain content
      sectionHtml = sectionHtml.replace(
        /<div[^>]*>(.*?)<\/div>/g,
        (match, innerContent) => {
          const trimmed = innerContent.trim();
          if (!trimmed) return "";
          // Keep div structure but ensure proper styling
          return `<div class="text-[16px] md:text-[18px] leading-[160%] font-[400] mb-4">${trimmed}</div>`;
        }
      );

      // Wrap section in container
      styled += `<div id="${section.id}" class="mb-10 md:mb-14">${sectionHtml}</div>`;
    }

    return {
      professionalDisclosure: professionalDisclosureContent,
      sections: extractedSections,
      lastUpdated: formattedDate,
      styledContent: styled,
    };
  }, [pageData]);

  // If no data, show loading
  if (!pageData) {
    return <Loader />;
  }

  return (
    <Section>
      <div className="mb-10 md:mb-14">
        <h1 className="text-[40px] md:text-[60px] leading-[115%] font-[550] tracking-[-0.01em] md:tracking-[-0.02em] mb-3 md:mb-4 headers-font">
          Terms &amp; Conditions
        </h1>
        <p className="text-[18px] opacity-85 md:text-[18px] leading-[140%] font-[400]">
          Last updated: {lastUpdated || "January 14, 2022"}
        </p>
      </div>

      {/* Professional Disclosure Section */}
      {professionalDisclosure && (
        <div className="mb-10 md:mb-14">
          <div className="text-[22px] md:text-[30px] leading-[115%] tracking-[-0.01em] md:tracking-[-0.02em] mb-4 md:mb-6 headers-font">
            Professional Disclosure:
          </div>
          <div className="text-[18px] md:text-[18px] text-[#000000D9] leading-[160%]">
            <p className="mb-6">{professionalDisclosure}</p>
          </div>
        </div>
      )}

      {/* Main content with navigation */}
      <div className="flex flex-col-reverse md:flex-row gap-10 md:gap-[120px]">
        <div className="md:w-[784px]">
          {/* Render Styled Content */}
          <div
            className="text-[16px] md:text-[18px] leading-[160%] font-[400] text-[#000000D9] wordpress-content max-w-none"
            dangerouslySetInnerHTML={{ __html: styledContent }}
          />
        </div>

        {/* Navigation sidebar */}
        <TermsNav sections={sections} />
      </div>

      <div className="mt-16">
        {/* Mobile: Show "More Consultation" */}
        <div className="block md:hidden">
          <MoreQuestions buttonText="More Consultation" />
        </div>

        {/* Desktop: Show "Contact Us" */}
        <div className="hidden md:block">
          <MoreQuestions buttonText="Contact Us" />
        </div>
      </div>
    </Section>
  );
};

export default SimpleTermsContent;
