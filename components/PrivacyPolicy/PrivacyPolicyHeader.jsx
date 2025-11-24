const PrivacyPolicyHeader = ({ lastUpdated }) => {
  const displayDate = lastUpdated || "January 14, 2022";
  
  return (
    <div className="mb-10 md:mb-14">
      <h1 className="text-[40px] md:text-[60px] leading-[115%] font-[550] tracking-[-0.01em] md:tracking-[-0.02em] mb-3 md:mb-4 headers-font">
        Privacy policy
      </h1>
      <p className="text-[16px] mb-4  md:text-[18px] leading-[140%] font-[400]">
        Last updated: {displayDate}
      </p>
    </div>
  );
};

export default PrivacyPolicyHeader;
