import { withSentryConfig } from "@sentry/nextjs";
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Document-Policy",
            value: "js-profiling",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "myrocky.b-cdn.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "myrocky.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "mycdn.myrocky.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "myrocky-ca-wp-media.s3.ca-central-1.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "rh-staging.etk-tech.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "myrocky-dev.etk-tech.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "mycdn.myrocky.ca",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "static.legitscript.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "myrocky.ca",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "myrocky.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.vectorstock.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "stg-1.rocky.health",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.shutterstock.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "rocky-health",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
