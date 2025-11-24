"use client";

import { useEffect, useState } from 'react';

export default function TableOfContents({ content, activeSection, onSectionChange }) {
    const [headings, setHeadings] = useState([]);

    useEffect(() => {
        if (content) {
            // Check if content is markdown or HTML
            const isMarkdown = content.trim().startsWith('#') || content.includes('\n##');
            
            let extractedHeadings = [];

            if (isMarkdown) {
                // Parse markdown headings
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    const match = line.match(/^(#{1,6})\s+(.+)$/);
                    if (match) {
                        const level = match[1].length;
                        const text = match[2].trim();
                        const id = `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                        
                        extractedHeadings.push({
                            id,
                            text,
                            level,
                        });
                    }
                });
            } else {
                // Parse HTML content to extract headings
                const parser = new DOMParser();
                const doc = parser.parseFromString(content, 'text/html');
                const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

                extractedHeadings = Array.from(headingElements).map((heading, index) => {
                    const text = heading.textContent.trim();
                    const level = parseInt(heading.tagName.charAt(1));
                    const id = heading.id || `heading-${index}`;

                    return {
                        id,
                        text,
                        level,
                    };
                });
            }

            setHeadings(extractedHeadings);

            // Add IDs to headings in the rendered content
            if (extractedHeadings.length > 0) {
                const timer = setTimeout(() => {
                    extractedHeadings.forEach((heading) => {
                        const element = document.getElementById(heading.id);
                        if (!element) {
                            // Try to find by text content
                            const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                            allHeadings.forEach((h) => {
                                if (h.textContent.trim() === heading.text && !h.id) {
                                    h.id = heading.id;
                                }
                            });
                        }
                    });
                }, 100);
                return () => clearTimeout(timer);
            }
        }
    }, [content]);

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            onSectionChange(sectionId);
        }
    };

    if (headings.length === 0) {
        return (
            <div className="bg-gray-50 rounded-lg p-4 sticky top-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Table of Contents</h3>
                <p className="text-gray-600 text-sm">No sections available</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 rounded-lg p-4 sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Table of Contents</h3>
            <nav className="space-y-2">
                {headings.map((heading, index) => (
                    <button
                        key={`${heading.id}-${index}`}
                        onClick={() => scrollToSection(heading.id)}
                        className={`block text-left w-full text-sm transition-colors py-1 ${
                            activeSection === heading.id
                                ? 'text-blue-600 font-medium'
                                : 'text-gray-600 hover:text-gray-900'
                        } ${
                            heading.level === 1 
                                ? 'font-semibold' 
                                : heading.level === 2 
                                ? 'font-medium ml-2' 
                                : heading.level === 3 
                                ? 'ml-4 text-xs' 
                                : heading.level === 4 
                                ? 'ml-6 text-xs' 
                                : heading.level === 5 
                                ? 'ml-8 text-xs' 
                                : 'ml-10 text-xs'
                        }`}
                    >
                        {heading.text}
                    </button>
                ))}
            </nav>
        </div>
    );
}
