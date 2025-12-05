# Canada to US Platform Migration - Content Review Report

## 🔴 CRITICAL ISSUES - HIGH PRIORITY

### 1. **Regulatory References (Health Canada → FDA)**

These references to Health Canada need to be changed to FDA for US compliance:

**Files with "Health Canada" references:**

- `config/wlProducts.json` - Line 18: "Health Canada approved drug"
- `components/convert_test/Quizzes/GoodNews.jsx` - Line 47: "Health Canada Approved medications"
- `components/convert_test/PreConsultation/data/PreConsultationProductsData.js` - Line 189
- `components/convert_test/PreConsultation/components/GenericRecommendationStep.jsx` - Line 358
- `components/convert_test/PreConsultation/EDFlow1/config/quizConfig.js` - Line 349
- `components/convert_test/Checkout/CartAndPayment.jsx` - Line 69
- `components/convert_test/Checkout/BillingAndShipping.jsx` - Line 197
- `components/convert_test/BO3/LossStartsHere.jsx` - Line 62
- `components/Zonnic/ZonnicFaqsSection.jsx` - Lines 61, 90
- `components/Zonnic/HighestRated.jsx` - Line 13
- `components/WlPreCfLanding/WeightLossLanding.jsx` - Line 53
- `components/SkinCare/SkinCareSection.jsx` - Line 30
- `components/Product/Supplements/SupplementsProductPageContent.jsx` - Lines 213, 263, 311
- `components/MentalHealth/MentalFaqsSection.jsx` - Lines 17, 32
- `components/EDPreConsultationQuiz/EdPreConsultation.jsx` - Line 788
- ✅ `components/BodyOptimization/WlFaqsSection.jsx` - Line 32: "licensed Canadian prescriber" → "licensed US healthcare provider" (FIXED)

**Note:** Files already have FDA references - keep those:

- ✅ `components/convert_test/Flows/HighestRate.jsx` - Line 14: "FDA Approved meds"
- ✅ `components/RockyInTheNews2.jsx` - Line 14: "FDA Approved meds"
- ✅ `components/Sex/SexCover.jsx` - Line 6: "FDA-Approved medication"
- ✅ `components/Ed/EdCover.jsx` - Line 6: "FDA-Approved medication"
- ✅ `lib/constants/faqData.js` - Lines 9, 64, 185: FDA references
- ✅ `app/faqs/page.jsx` - Lines 182, 197, 229: FDA references

### 2. **Provincial Content (Provinces → States)**

**Province Selection Dropdowns - Need US States:**

- `components/LoginRegisterPage/Register.jsx` - Lines 75-82: Canadian provinces listed
- `components/convert_test/PreConsultation/components/CheckoutForm.jsx` - Lines 745-754
- `components/convert_test/PreConsultation/WLFlow2/config/quizConfig.js` - Lines 281-288
- `components/convert_test/PreConsultation/WLFlow1/config/quizConfig.js` - Lines 155-162
- `components/convert_test/PreConsultation/EDSimpleFlowOne/config/quizConfig.js` - Lines 39-47
- `components/convert_test/PreConsultation/EDFlow1/config/quizConfig.js` - Lines 202-210
- `components/convert_test/Checkout/ShippingAddress.jsx` - Lines 133-144
- `components/convert_test/Checkout/BillingDetails.jsx` - Lines 185-196
- `components/WLPreConsultationQuiz/steps/ProvinceSelectionStep.jsx` - Lines 8-15

**Quebec-Specific Logic (May not be needed for US):**

- `utils/zonnicQuebecValidation.js` - Entire file for Quebec restrictions
- `utils/__tests__/zonnicQuebecValidation.test.js` - Test file
- `components/LoginRegisterPage/Register.jsx` - Lines 378-431: Quebec restriction logic
- `components/convert_test/Checkout/CheckoutPageContent.jsx` - Lines 28-30, 147-166: Quebec popup logic
- `components/Popups/QuebecRestrictionPopup.jsx` - Entire component
- `components/GlobalQuebecPopup.jsx` - Global Quebec popup

### 3. **Canadian Cities Content**

**Service Pages for Canadian Cities - Consider Removing or Replacing:**

- `app/service-across-canada/` - Directory and pages
- `app/service-across-canada/[city]/page.jsx` - Dynamic city pages
- `components/service-across-canada/` - All components
- `lib/constants/CityData.js` - Extensive content about Toronto, Calgary, Edmonton, Ottawa, Halifax, Vancouver
- `lib/constants/cities.js` - List of Canadian cities

**References to "Service Across Canada":**

- `components/convert_test/BO3/Footer2.jsx` - Lines 225-226, 396-397
- Multiple navigation menus

### 4. **Domain and Email References (.ca → .com?)**

**Email Addresses:**

- `components/Footer/Footer.jsx` - Lines 267, 277: contact@myrocky.ca, social@myrocky.ca
- `components/ContactUs/ContactUsDetails.jsx` - Lines 38, 50, 66
- `components/TermsOfUse/SimpleTermsContent.jsx` - Line 59
- Multiple other files with clinicadmin@myrocky.ca, pharmacy@myrocky.ca

**Domain References:**

- `vercel.json` - Lines 5-32: Redirects to myrocky.ca
- `next.config.mjs` - Lines 36-61: CDN and media domains
- `docs/google-signin-implementation.md` - Lines 77-78
- Multiple component files referencing myrocky.ca
- `components/ui/trustpilotFallback/` - Trustpilot reviews for myrocky.ca

### 5. **Address and Shipping References**

**Canadian Address Systems:**

- `components/Checkout/BillingDetails.jsx` - PostCanadaAddressAutocomplete component
- `components/convert_test/Checkout/PostCanada/` - Entire directory for Canada Post
- `components/convert_test/Checkout/CanadaPost/` - Canada Post integration
- `components/convert_test/PostCanadaAddressAutocompelete.jsx` - Address autocomplete
- `lib/cron/cronService.js` - Line 3: Canada Post WP cron endpoint

**Postal Code vs ZIP Code:**

- `components/Checkout/BillingDetails.jsx` - "Postal Code" labels
- `components/convert_test/Checkout/ShippingAddress.jsx` - "Postal Code"
- `components/convert_test/Checkout/BillingDetails.jsx` - "Postal Code"
- `utils/checkoutValidation.js` - Line 43: Canadian postal code validation

**Shipping References:**

- `components/TermsOfUse/PharmacyServices.jsx` - Line 52: "Canada Post, Fedex, UPS, or DHL"

### 6. **Currency (CAD → USD)**

**Files with CAD currency:**

- `utils/tiktokEvents.js` - Lines 63, 119, 155
- `utils/northbeamEvents.js` - Lines 162, 306
- `utils/ga4Events.js` - Lines 231, 259, 287, 320, 348
- `utils/flowCartHandler.js` - Line 241
- `utils/analytics/mappers.js` - Line 70
- `utils/analytics/analyticsService.js` - Lines 70, 95, 120, 151, 177
- `components/OrderReceived/OrderReceivedPageContent.jsx` - Line 42
- `components/TermsOfUse/RockyHealthRefundPolicy.jsx` - Line 112: "$165 CAD"
- `components/TermsOfUse/CancellationPolicy.jsx` - Lines 9, 17, 25: "$45.00 CAD", "$60.00 CAD"
- `attentive.json` - Line 281
- `app/api/northbeam/orders/route.js` - Line 253
- `app/api/northbeam/backfill/route.js` - Line 125
- `app/api/awin/track-order/route.js` - Lines 82, 258, 308

### 7. **Branding and Marketing**

**"Trusted by 350K+ Canadians":**

- `components/SkinCare/data/features.js` - Line 5
- `components/Product/PersonalizedAntiAging/data/features.js` - Line 5
- `components/NewBlogs/components/NewsletterSignup.jsx` - Line 5
- `components/NewBlogs/MainBlogsPage.jsx` - Line 72
- `components/NewBlogs/CategoryPage/CategoryPage.jsx` - Line 96
- `components/NewBlogs/AllBlogsPage/AllBlogsPage.jsx` - Line 138
- `components/convert_test/Modals/EdModal.jsx` - Line 90
- `components/convert_test/BO3/WLModal.jsx` - Line 91
- `components/convert_test/BO3/BoHeroSection.jsx` - Line 22: "TRUSTED BY 350K+ CANADIANS"

**"Canada's Highest Rated" Claims:**

- `components/convert_test/ReviewsSection.jsx` - Line 92: "Canada's Highest-Rated ONLINE Pharmacy"
- `components/convert_test/Checkout/CartAndPayment.jsx` - Line 51: "Canada's highest rated online pharmacy"
- `components/convert_test/Checkout/BillingAndShipping.jsx` - Line 179: "Canada's highest rated online pharmacy"

**"Made in Canada":**

- `components/WLPreConsultationQuiz/popups/CrossSellPopups/MaleCrossSellPopup.jsx` - Lines 41, 56, 71
- `components/WLPreConsultationQuiz/popups/CrossSellPopups/FemaleCrossSellPopup.jsx` - Lines 60, 75, 90
- `components/Supplements/RecommendCard.jsx` - Lines 24, 43, 51
- `components/Supplements/HeroSection.jsx` - Lines 112, 375
- `components/Product/Supplements/SupplementsProductDetails.jsx` - Lines 444, 778
- `components/Product/Supplements/SupplementsProductPageContent.jsx` - Lines 486, 735
- `components/Merch/MerchFaqs.jsx` - Lines 24, 34: "100% Cotton Canadian Milled Fabric", "only ship to our fellow Canadians"

**Toronto Sports Teams Logos:**

- `components/Navbar/HeaderProudPartner.jsx` - Lines 21, 31-36: Toronto Maple Leafs, Toronto Blue Jays
- `components/ProudPartner.jsx` - Lines 40-49: Toronto sports team logos
- `app/ed-consultation-quiz/layout.jsx` - Line 38-39: Toronto Maple Leafs CSS

**Canadian Media/Business:**

- `components/RockyInTheNews2.jsx` - Line 52: "the-canadian-business-journal-logo.png"
- `components/RockyInTheNews.jsx` - Line 22: Canadian Business Journal
- `components/Merch/RockyInTheNews.jsx` - Lines 46-48: Canadian Business Journal

### 8. **Canadian-Specific Content**

**Canadian Licensed Clinicians:**

- `components/convert_test/Checkout/CartAndPayment.jsx` - Line 77
- `components/convert_test/Checkout/BillingAndShipping.jsx` - Line 205
- `components/MentalHealth/TransparentPricing.jsx` - Line 13
- `components/Product/body-optimization/constants/faqs.js` - Lines 15, 102, 149
- `components/PreLanders/data/WlFaqs.js` - Line 30
- `components/PreLanders/data/SexualHealthFaqs.js` - Line 35
- Multiple other FAQ files

**Canadian Company References:**

- `lib/constants/CityData.js` - Lines 22, 55, 120, 242: "Canadian-based company", "Canadian pharmaceutical standards", "licensed Canadian physician", etc.

**Ontario-Specific:**

- `components/TermsOfUse/PharmacyServices.jsx` - Lines 45, 114, 151: Ontario College of Pharmacists, Ontario law, Service Ontario
- `components/TermsOfUse/GoverningLawDisputeResolution.jsx` - Lines 21, 26: "Toronto, Ontario"
- `components/PrivacyPolicy/InterpretationAndDefinitions.jsx` - Line 36: "Toronto, Ontario"
- `app/about-us/page.jsx` - Lines 57, 108: University of Toronto, Ontario pharmacy license

## 📊 STATISTICS

- **"Canada" references:** 234+ matches
- **"Canadian" references:** 64+ matches
- **"Province" references:** 393+ matches (mostly in forms/validation)
- **Ontario/Quebec/Alberta/etc references:** 275+ matches
- **".ca" domain references:** 229+ matches
- **Canadian city references:** 69+ matches (Toronto, Vancouver, Calgary, Edmonton, Ottawa, Halifax)
- **"Health Canada" references:** 70+ matches
- **"CAD" currency references:** 66+ matches
- **Quebec-specific logic:** Multiple files

## 🎯 RECOMMENDED ACTIONS

### Immediate Priority:

1. **Change all "Health Canada" → "FDA" or "US FDA"**
2. **Update province dropdowns to US states**
3. **Change CAD → USD in all currency references**
4. **Update email domains (@myrocky.ca → @myrocky.com?)**
5. **Update main domain references (myrocky.ca → myrocky.com?)**

### Secondary Priority:

6. **Remove or replace Toronto Maple Leafs/Blue Jays branding**
7. **Update "350K+ Canadians" → "X Americans" or remove**
8. **Change "Canada's highest rated" → "Highest rated" or US equivalent**
9. **Remove "Made in Canada" badges**
10. **Update "Canadian Licensed Clinicians" → "US Licensed Healthcare Providers"**

### Consider:

11. **Remove Quebec-specific restriction logic** (unless you have state-specific restrictions)
12. **Remove/replace Canadian city pages** (service-across-canada)
13. **Update address autocomplete** (Canada Post → US address service)
14. **Change "Postal Code" → "ZIP Code"**
15. **Review and update about-us page** (mentions University of Toronto, Ontario licenses)
16. **Update shipping carrier references** (Canada Post)
17. **Update Canadian Business Journal logo**

### Low Priority:

18. **Review Terms of Use** (mentions Ontario law, Toronto arbitration)
19. **Review Merch shipping** ("only ship to fellow Canadians")
20. **Update blog service references** (Canadian-focused content)

## 📁 FILES REQUIRING REVIEW

### Critical Files (Must Change):

- All config product files (wlProducts.json, etc.)
- All checkout and form components
- All FAQ components
- Currency tracking files (analytics, events)
- Email configurations
- Domain configurations

### Consider Removing:

- `app/service-across-canada/` directory
- `components/service-across-canada/` directory
- `lib/constants/CityData.js`
- `lib/constants/cities.js`
- `utils/zonnicQuebecValidation.js`
- `components/Popups/QuebecRestrictionPopup.jsx`
- Canada Post integration components

### Need US Equivalents:

- Address autocomplete system
- State selection dropdowns
- Regulatory approval references
- Healthcare provider licensing terminology

---

**Generated:** $(date)
**Total Files Scanned:** 1000+
**Canadian References Found:** 1500+
