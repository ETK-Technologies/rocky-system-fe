import "./globals.css";
import { logger } from "@/utils/devLogger";
import { Poppins } from "next/font/google";
import localFont from "next/font/local";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer/Footer";
import LoadingOverlay from "@/components/utils/LoadingBar";
import CacheClearer from "@/components/utils/CacheClearer";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { shouldUseMinimalLayout } from "@/utils/layoutConfig";
import Script from "next/script";
import ClientLayoutProvider from "@/components/Layout/ClientLayoutProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import GlobalQuebecPopup from "@/components/GlobalQuebecPopup";
import RockoAIWidget from "@/components/Layout/RockoAIWidget";
import GoogleOAuthProvider from "@/components/Layout/GoogleOAuthProvider";

// Layout will use client-side path detection to avoid forcing dynamic rendering

// Configure Google font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

// Configure local fonts
const fellixMedium = localFont({
  src: "../fonts/Fellix-Medium.woff",
  variable: "--font-fellix",
  display: "swap",
});

const fellixSemiBold = localFont({
  src: "../fonts/Fellix-SemiBold.woff",
  variable: "--font-fellix-bold",
  display: "swap",
});

export const metadata = {
  title: "Rocky - Your Health Partner",
  description: "Get professional healthcare advice and treatment online",
  openGraph: {
    title: "Rocky - Your Health Partner",
    description: "Get professional healthcare advice and treatment online",
    siteName: "Rocky Health",
    images: [
      {
        url: "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/my-rocky-black.webp",
        width: 1200,
        height: 630,
        alt: "Rocky - Your Health Partner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rocky - Your Health Partner",
    description: "Get professional healthcare advice and treatment online",
    images: [
      "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/Rocky.webp",
    ],
  },
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* AWIN Consent (set true if no CMP; adjust if integrating CMP) */}
        <Script id="awin-consent" strategy="beforeInteractive">
          {`
            window.AWIN = window.AWIN || {};
            AWIN.Tracking = AWIN.Tracking || {};
            if (typeof AWIN.Tracking.AdvertiserConsent === 'undefined') {
              AWIN.Tracking.AdvertiserConsent = true;
            }
          `}
        </Script>
        {/* AWIN MasterTag - sitewide */}
        <Script
          id="awin-mastertag"
          strategy="beforeInteractive"
          src={`https://www.dwin1.com/${
            process.env.AWIN_MERCHANT_ID || "101159"
          }.js`}
        />
        {/* Google Tag Manager - Changed to beforeInteractive for earlier loading */}
        {
          <Script id="google-tag-manager" strategy="beforeInteractive">
            {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-K9PC394B');
          `}
          </Script>
        }
        {/* End Google Tag Manager */}
        {/* Start Facebooc Domain Verification */}
        <meta
          name="facebook-domain-verification"
          content="uvvbdeqdbj046v74x0oqaxhl9tyq26"
        />
        {/* End Facebooc Domain Verification */}
        {/* Start Convert Experiences */}
        <Script
          id="convert-experiences"
          strategy="beforeInteractive"
          src="//cdn-4.convertexperiments.com/v1/js/10045956-10046753.js?environment=production"
        />
        {/* End Convert Experiences */}
        {/* Start TikTok Pixel */}
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
              ttq.load('${
                process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ||
                "CAFVBSRC77U9MLGRGE10"
              }');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
        {/* End TikTok Pixel */}
      </head>
      <body
        className={`${poppins.variable} ${fellixMedium.variable} ${fellixSemiBold.variable}`}
        suppressHydrationWarning={true}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-K9PC394B"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */} <CacheClearer />
        <LoadingOverlay />
        {/* <CronHitHandler /> */}
        <GoogleOAuthProvider>
          <Navbar className="navbar-main" />
          <ClientLayoutProvider>{children}</ClientLayoutProvider>
          <Footer className="footer-main" />
        </GoogleOAuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          pauseOnHover={true}
          pauseOnFocusLoss={false}
          style={{ zIndex: 999999 }}
        />
        {/* Global Quebec Popup - Shows after registration redirect */}
        <GlobalQuebecPopup />
        <RockoAIWidget />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
