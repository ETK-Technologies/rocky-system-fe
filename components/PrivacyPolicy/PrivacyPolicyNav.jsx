"use client";

export default function PrivacyPolicyNav({ variant, navigationItems = [] }) {
  // Default content if no navigation items from API
  const defaultContent = [
    "Interpretation and Definitions",
    "Types of Data Collected",
    "Use of Your Personal Data",
    "Healthcare Services",
    "Retention of Your Personal Data",
    "Transfer of Your Personal Data",
    "Security of Your Personal Data",
    "Analytics",
    "Advertising",
    "Email Marketing",
    "Payments",
    "Usage, Performance and Miscellaneous",
    "Contact Us",
  ];

  // Use API navigation items if available, otherwise use default
  const Content = navigationItems.length > 0 
    ? navigationItems.map(item => item.text)
    : defaultContent;

  if (variant === "mobile") {
    return (
      <ol className="md:hidden space-y-4 list-decimal list-inside mb-10">
        {Content.map((text, index) => (
          <li
            key={index}
            className="underline text-[16px] mb-4 leading-[140%] font-[500]"
          >
            <a href={`#${text.toLowerCase().replace(/\s+/g, "-")}`}>{text}</a>
          </li>
        ))}
      </ol>
    );
  }

  if (variant === "desktop") {
    return (
      <ul className="hidden md:block w-[280px] space-y-3">
        {Content.map((text, index) => {
          const sectionId = text.toLowerCase().replace(/\s+/g, "-");
          return (
            <li
              key={index}
              className={`text-[18px] font-[400] leading-[140%] text-[#000000A6] hover:underline hover:font-[600] opacity-100 mt-4 mb-4 ${
                index === 0
                  ? "font-[600] opacity-100 mt-4 mb-4 text-black underline"
                  : ""
              }`}
            >
              <a href={`#${sectionId}`}>{text}</a>
            </li>
          );
        })}
      </ul>
    );
  }

  return null; // Fallback if no variant is provided
}
