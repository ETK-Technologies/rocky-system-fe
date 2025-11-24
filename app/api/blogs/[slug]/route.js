import axios from "axios";
import { logger } from "@/utils/devLogger";

export async function GET(req, { params }) {
  try {
    const { slug } = await params;
    logger.log("API: Fetching blog with slug:", slug);
    logger.log("API: BASE_URL:", process.env.BASE_URL);
    logger.log("API: ADMIN_TOKEN exists:", !!process.env.ADMIN_TOKEN);
    logger.log("API: NODE_ENV:", process.env.NODE_ENV);

    if (!slug) {
      logger.log("API: No slug provided");
      return new Response(
        JSON.stringify({ error: "Slug parameter is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!process.env.BASE_URL) {
      logger.log("API: BASE_URL not configured");
      return new Response(
        JSON.stringify({
          error: "BASE_URL not configured",
          message:
            "Please check your environment variables. BASE_URL should point to your WordPress site (e.g., https://yoursite.com)",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!process.env.ADMIN_TOKEN) {
      logger.log("API: ADMIN_TOKEN not configured");
      return new Response(
        JSON.stringify({
          error: "ADMIN_TOKEN not configured",
          message:
            "Please check your environment variables. ADMIN_TOKEN should contain your WordPress authentication token",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Test if WordPress site is accessible
    try {
      const testUrl = `${process.env.BASE_URL}/wp-json/wp/v2/posts?per_page=1`;
      logger.log("API: Testing WordPress connectivity:", testUrl);

      const testResponse = await axios.get(testUrl, {
        headers: {
          Authorization: process.env.ADMIN_TOKEN,
        },
        timeout: 10000, // 10 second timeout
      });

      logger.log(
        "API: WordPress connectivity test successful, status:",
        testResponse.status
      );
    } catch (testError) {
      logger.error(
        "API: WordPress connectivity test failed:",
        testError.message
      );
      return new Response(
        JSON.stringify({
          error: "WordPress site not accessible",
          message:
            "Cannot connect to WordPress site. Please check your BASE_URL and ensure the site is accessible.",
          details: testError.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Fetch the specific blog post by slug
    const apiUrl = `${process.env.BASE_URL}/wp-json/wp/v2/posts?slug=${slug}&_embed=true`;
    logger.log("API: Calling WordPress API for specific blog:", apiUrl);

    const blog = await axios.get(apiUrl, {
      headers: {
        Authorization: process.env.ADMIN_TOKEN,
      },
      timeout: 10000, // 10 second timeout
    });

    logger.log("API: WordPress API response status:", blog.status);
    logger.log("API: WordPress API response data length:", blog.data?.length);

    if (!blog.data || blog.data.length === 0) {
      logger.log("API: No blog found with slug:", slug);
      return new Response(
        JSON.stringify({
          error: "Blog post not found",
          message: `No blog post found with slug: ${slug}`,
          slug: slug,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    logger.log("API: Blog found, returning data");
    // Return the first (and should be only) blog post
    return new Response(JSON.stringify(blog.data[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("API: Error fetching blog by slug:", error);
    logger.error("API: Error details:", error.response?.data);
    logger.error("API: Error status:", error.response?.status);

    return new Response(
      JSON.stringify({
        error: "Failed to fetch blog post",
        details: error.message,
        status: error.response?.status,
        responseData: error.response?.data,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
