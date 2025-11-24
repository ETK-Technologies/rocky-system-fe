import { logger } from "@/utils/devLogger";

function getBaseUrl() {
  // Server-side: use full URL for API routes
  if (typeof window === "undefined") {
    // In production, use the NEXT_PUBLIC_APP_URL or VERCEL_URL
    // In development, use localhost
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    // Default to localhost for development
    return "http://localhost:3000";
  }
  // Client-side: use relative URLs to proxy through Next.js API routes
  return "";
}

/**
 * Transform new API blog post to legacy format for backward compatibility
 */
function transformBlogPost(post) {
  if (!post) return null;

  // Extract categories - the API returns categories with nested category objects
  const categories = post.categories?.map((cat) => cat.category || cat) || [];
  const categoryNames = categories.map((cat) => cat?.name || "").filter(Boolean);
  const primaryCategory = categories[0] || null; // First category in the array

  // Extract tags - the API returns tags with nested tag objects
  const tags = post.tags?.map((tag) => tag.tag || tag) || [];
  const tagNames = tags.map((tag) => tag?.name || "").filter(Boolean);

  // Extract featured image
  const featuredImage = post.featuredImage?.cdnUrl || post.featuredImage?.storagePath || null;

  // Extract author
  const author = post.author || {};

  // Transform related articles if present
  const relatedArticles = post.relatedArticles?.map(transformBlogPost).filter(Boolean) || [];

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    status: post.status,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    isFeatured: post.isFeatured,
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    // Legacy format compatibility
    _embedded: {
      author: [
        {
          id: author.id,
          name: `${author.firstName || ""} ${author.lastName || ""}`.trim() || "Unknown Author",
          slug: author.email || "",
        },
      ],
      "wp:term": [
        categories.map((cat) => ({
          id: cat?.id,
          name: cat?.name,
          slug: cat?.slug,
        })),
        [], // Empty array for compatibility
        tags.map((tag) => ({
          id: tag?.id,
          name: tag?.name,
          slug: tag?.slug,
        })),
      ],
      "wp:featuredmedia": featuredImage
        ? [
            {
              source_url: featuredImage,
              media_details: {
                sizes: {
                  medium: { source_url: featuredImage },
                  large: { source_url: featuredImage },
                },
              },
            },
          ]
        : [],
    },
    // New format fields
    author: author,
    featuredImage: post.featuredImage,
    categories: categories,
    tags: tags,
    relatedArticles: relatedArticles,
    // Helper fields
    category: primaryCategory?.name || "Uncategorized",
    categorySlug: primaryCategory?.slug || "uncategorized",
    authorName: `${author.firstName || ""} ${author.lastName || ""}`.trim() || "Unknown Author",
    featuredImageUrl: featuredImage,
  };
}

/**
 * Transform new API category to legacy format
 */
function transformCategory(category) {
  if (!category) return null;

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    parentId: category.parentId,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    postCount: category._count?.posts || 0,
  };
}

export const blogService = {
  /**
   * Get blog posts with pagination and filters
   */
  async getBlogs(page = 1, categoryId = null, options = {}) {
    try {
      // Build query parameters object
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", (options.limit || 20).toString());
      
      // Only add optional parameters if they have values
      if (categoryId && categoryId !== "0") {
        params.append("categoryId", categoryId);
      }

      if (options.isFeatured !== undefined) {
        params.append("isFeatured", options.isFeatured.toString());
      }

      if (options.search) {
        params.append("search", options.search);
      }

      const url = `${getBaseUrl()}/api/blogs/posts?${params.toString()}`;
      
      logger.log("Fetching blogs from:", url);

      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        logger.error("API response error:", errorText);
        throw new Error(`API request failed with status ${res.status}`);
      }

      const data = await res.json();

      // Transform posts to legacy format
      const transformedPosts = (data.items || []).map(transformBlogPost);

      return {
        blogs: transformedPosts,
        totalPages: data.pagination?.pages || 1,
        currentPage: data.pagination?.page || page,
        total: data.pagination?.total || 0,
      };
    } catch (error) {
      logger.error("Error fetching blogs:", error);
      throw error;
    }
  },

  /**
   * Get all page blogs (for AllBlogsPage)
   */
  async getAllPageBlogs(currentPage = 1, categoryId = null) {
    try {
      // Fetch categories and blogs in parallel
      const [categoriesData, blogsData] = await Promise.all([
        this.getBlogCategories(),
        this.getBlogs(currentPage, categoryId),
      ]);

      return {
        blogs: blogsData.blogs || [],
        categories: categoriesData || [],
        totalPages: blogsData.totalPages || 1,
        totalPagesCount: blogsData.totalPages || 1,
        currentPage: currentPage,
      };
    } catch (error) {
      logger.error("Error fetching all page blogs:", error);
      throw error;
    }
  },

  /**
   * Get blogs by category slug
   */
  async getBlogsByCategory(categorySlug, page = 1) {
    try {
      // Get all categories to find the one matching the slug
      const categories = await this.getBlogCategories();
      const category = categories.find((cat) => cat.slug === categorySlug);

      if (!category) {
        throw new Error("Category not found");
      }

      // Fetch blogs for that category
      return await this.getBlogs(page, category.id);
    } catch (error) {
      logger.error("Error fetching blogs by category:", error);
      throw error;
    }
  },

  /**
   * Get blog post by slug or ID
   */
  async getBlogBySlug(slugOrId) {
    try {
      // First, try to fetch directly by ID (if it looks like an ID)
      // IDs from the API are long strings like "cmi6e3mc8006jvrt8jx3bt3iu"
      const looksLikeId = /^[a-z0-9]{20,}$/i.test(slugOrId);
      
      if (looksLikeId) {
        logger.log("Treating as ID, fetching directly:", slugOrId);
        try {
          return await this.getBlogById(slugOrId);
        } catch (error) {
          logger.log("Failed to fetch by ID, trying slug search:", error.message);
          // Fall through to slug search
        }
      }

      // For slug search, we need to fetch posts and find the one with matching slug
      // Since the search endpoint does full-text search, we'll fetch multiple pages if needed
      let foundPost = null;
      let currentPage = 1;
      const maxPages = 5; // Limit search to first 5 pages to avoid infinite loops

      while (!foundPost && currentPage <= maxPages) {
        const params = new URLSearchParams();
        params.append("page", currentPage.toString());
        params.append("limit", "50"); // Get more results per page

        const searchUrl = `${getBaseUrl()}/api/blogs/posts?${params.toString()}`;
        
        logger.log(`Searching for blog by slug (page ${currentPage}):`, searchUrl);

        const searchRes = await fetch(searchUrl, {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        if (!searchRes.ok) {
          const errorText = await searchRes.text();
          logger.error("API response error:", errorText);
          throw new Error(`API request failed with status ${searchRes.status}`);
        }

        const searchData = await searchRes.json();
        const posts = searchData.items || [];

        // Find the post with exact matching slug
        foundPost = posts.find((p) => p.slug === slugOrId);

        if (foundPost) {
          logger.log("Found post with matching slug:", foundPost.id);
          break;
        }

        // If we've reached the last page, stop searching
        if (currentPage >= (searchData.pagination?.pages || 1)) {
          break;
        }

        currentPage++;
      }

      if (!foundPost) {
        logger.error("Blog post not found with slug:", slugOrId);
        throw new Error("Blog post not found");
      }

      // If we found it, fetch the full post by ID
      const fullPostUrl = `${getBaseUrl()}/api/blogs/posts/${foundPost.id}`;
      logger.log("Fetching full post by ID:", fullPostUrl);

      const fullPostRes = await fetch(fullPostUrl, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      if (!fullPostRes.ok) {
        const errorText = await fullPostRes.text();
        logger.error("API response error:", errorText);
        if (fullPostRes.status === 404) {
          throw new Error("Blog post not found");
        }
        throw new Error(`API request failed with status ${fullPostRes.status}`);
      }

      const fullPost = await fullPostRes.json();
      logger.log("Successfully fetched blog post:", fullPost.id);

      return transformBlogPost(fullPost);
    } catch (error) {
      logger.error("Error fetching blog by slug:", error);
      throw error;
    }
  },

  /**
   * Get blog post by ID
   */
  async getBlogById(id) {
    try {
      const url = `${getBaseUrl()}/api/blogs/posts/${id}`;
      logger.log("Fetching blog by ID:", url);

      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Blog post not found");
        }
        const errorText = await res.text();
        logger.error("API response error:", errorText);
        throw new Error(`API request failed with status ${res.status}`);
      }

      const data = await res.json();
      return transformBlogPost(data);
    } catch (error) {
      logger.error("Error fetching blog by ID:", error);
      throw error;
    }
  },

  /**
   * Get blog categories
   */
  async getBlogCategories() {
    try {
      const params = new URLSearchParams();
      params.append("isActive", "true");
      params.append("limit", "100");

      const url = `${getBaseUrl()}/api/blogs/categories?${params.toString()}`;
      
      logger.log("Fetching categories from:", url);

      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        logger.error("API response error:", errorText);
        throw new Error(`API request failed with status ${res.status}`);
      }

      const data = await res.json();
      return (data.items || []).map(transformCategory);
    } catch (error) {
      logger.error("Error fetching blog categories:", error);
      throw error;
    }
  },

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug) {
    try {
      const categories = await this.getBlogCategories();
      const category = categories.find((cat) => cat.slug === slug);
      
      if (!category) {
        throw new Error("Category not found");
      }

      return category;
    } catch (error) {
      logger.error("Error fetching category by slug:", error);
      throw error;
    }
  },
};
