/** @type {import('next').NextConfig} */
const nextConfig = {
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

export default nextConfig;
