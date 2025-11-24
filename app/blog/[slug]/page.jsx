"use client";

import { useState, useEffect, use } from "react";
import { logger } from "@/utils/devLogger";

import Section from "@/components/utils/Section";
import MoreQuestions from "@/components/MoreQuestions";
import CategoryBtn from "@/components/Blogs/CategoryBtn";
import CenterContainer from "@/components/Article/CenterContainer";
import TitleWrapper from "@/components/Article/TitleWrapper";
import Author from "@/components/Article/Author";
import ArticleImg from "@/components/Article/ArticleImg";
import HtmlContent from "@/components/Article/HtmlContent";
import Content from "@/components/Article/Content";
import RelatedArticles from "@/components/Article/RelatedArticles";
import Loader from "@/components/Loader";
import NotFound from "./not-found";

export default function BlogSlugPage({ params }) {
  const slug = use(params);
  const [Blog, setBlog] = useState(null);
  const [BlogLoading, setBlogLoading] = useState(true);
  const [showNotFound, setShowNotFound] = useState(false);
  const [RelatedBlogs, setRelatedBlogs] = useState([]);
  const [RelatedBlogsLoading, setRelatedBlogsLoading] = useState(true);
  const [FeaturedImage, setFeaturedImage] = useState(
    "https://www.shutterstock.com/image-vector/default-ui-image-placeholder-wireframes-600nw-1037719192.jpg"
  );
  const [Category, setCategory] = useState("");
  const [EstReadTime, setEstReadTime] = useState("4 min Read");
  const [AuthorContent, setAuthorContent] = useState("");

  const fetchBlog = async () => {
    try {
      setBlogLoading(true);

      // Check if slug is available
      if (!slug || !slug.slug) {
        logger.error("No slug available:", slug);
        setShowNotFound(true);
        return;
      }

      // Use the blogService to fetch by slug (which handles ID or slug)
      const { blogService } = await import("@/components/NewBlogs/services/blogService");
      const blog = await blogService.getBlogBySlug(slug.slug);
      
      logger.log("Fetched blog:", blog);

      if (!blog) {
        logger.log("No blog data received, showing 404 page");
        setShowNotFound(true);
        return;
      }

      // Check if blog has required properties
      if (!blog.title || !blog.content) {
        logger.error("Blog missing required properties:", blog);
        logger.log("Blog data incomplete, showing 404 page");
        setShowNotFound(true);
        return;
      }

      setBlog(blog);

      // Extract author
      if (blog.author) {
        setAuthorContent(blog.author);
      } else if (blog.authors && blog.authors.length > 0) {
        setAuthorContent(blog.authors[0]);
      } else if (blog._embedded && blog._embedded.author && blog._embedded.author.length > 0) {
        setAuthorContent(blog._embedded.author[0]);
      }

      // Extract featured image
      if (blog.featuredImageUrl) {
        setFeaturedImage(blog.featuredImageUrl);
      } else if (blog.featuredImage) {
        setFeaturedImage(blog.featuredImage.cdnUrl || blog.featuredImage.storagePath || FeaturedImage);
      } else if (
        blog._embedded &&
        blog._embedded["wp:featuredmedia"] &&
        blog._embedded["wp:featuredmedia"][0] &&
        blog._embedded["wp:featuredmedia"][0].source_url
      ) {
        setFeaturedImage(blog._embedded["wp:featuredmedia"][0].source_url);
      }

      // Get the category name - prioritize new format
      if (blog.category) {
        setCategory(blog.category);
      } else if (blog.categories && Array.isArray(blog.categories) && blog.categories.length > 0) {
        const firstCategory = blog.categories[0];
        // Handle nested structure: categories[0].category.name
        if (firstCategory.category && firstCategory.category.name) {
          setCategory(firstCategory.category.name);
        } else if (firstCategory.name) {
          setCategory(firstCategory.name);
        }
      } else if (blog.class_list && blog.class_list[7]) {
        const categoryName = blog.class_list[7]
          .replace("category-", "")
          .replace(/-/g, " ");
        logger.log("Category name extracted:", categoryName);
        setCategory(categoryName);
      } else if (blog._embedded && blog._embedded["wp:term"] && blog._embedded["wp:term"][0] && blog._embedded["wp:term"][0].length > 0) {
        setCategory(blog._embedded["wp:term"][0][0].name || "");
      }

      if (blog.yoast_head_json?.twitter_misc?.["Est. reading time"]) {
        setEstReadTime(
          blog.yoast_head_json.twitter_misc["Est. reading time"] + " read"
        );
      }

      // Use relatedArticles from API response if available
      if (blog.relatedArticles && Array.isArray(blog.relatedArticles) && blog.relatedArticles.length > 0) {
        setRelatedBlogs(blog.relatedArticles);
        setRelatedBlogsLoading(false);
      }
    } catch (error) {
      logger.error("Error fetching blog:", error);
      logger.error("Error details:", error.message);
      logger.error("Error stack:", error.stack);
      
      // If it's a "not found" error, show 404 page
      if (error.message.includes("not found") || error.message.includes("Not found")) {
        setShowNotFound(true);
      }
    } finally {
      setBlogLoading(false);
    }
  };

  const fetchRecentArticles = async () => {
    try {
      setRelatedBlogsLoading(true);
      logger.log("Fetching recent articles as fallback");

      const { blogService } = await import("@/components/NewBlogs/services/blogService");
      const blogsData = await blogService.getBlogs(1, null, { limit: 4 });
      
      logger.log("Recent articles data:", blogsData);

      if (blogsData.blogs && Array.isArray(blogsData.blogs)) {
        // Filter out the current blog from recent articles
        const filteredData = blogsData.blogs.filter((blog) => blog.id !== Blog?.id);
        logger.log("Filtered recent articles:", filteredData);

        // Take only the first 3 recent articles
        const finalData = filteredData.slice(0, 3);
        logger.log("Final recent articles (limited to 3):", finalData);
        setRelatedBlogs(finalData);
      } else {
        logger.error("Recent articles data is not an array:", blogsData);
        setRelatedBlogs([]);
      }
    } catch (error) {
      logger.error("Error fetching recent articles: ", error);
      setRelatedBlogs([]);
    } finally {
      setRelatedBlogsLoading(false);
    }
  };

  const fetchRelated = async ({ category }) => {
    try {
      setRelatedBlogsLoading(true);
      logger.log("Fetching related blogs for category ID:", category);

      // Use the blogService to fetch blogs by category
      const { blogService } = await import("@/components/NewBlogs/services/blogService");
      const blogsData = await blogService.getBlogs(1, category, { limit: 6 });
      
      logger.log("Related blogs data:", blogsData);

      if (blogsData.blogs && Array.isArray(blogsData.blogs)) {
        // Filter out the current blog from related articles
        const filteredData = blogsData.blogs.filter((blog) => blog.id !== Blog?.id);
        logger.log("Filtered related blogs:", filteredData);

        // Take only the first 3 related articles
        const finalData = filteredData.slice(0, 3);
        logger.log("Final related blogs (limited to 3):", finalData);
        setRelatedBlogs(finalData);
      } else {
        logger.error("Related blogs data is not an array:", blogsData);
        setRelatedBlogs([]);
      }
    } catch (error) {
      logger.error("Error fetching related blogs: ", error);
      setRelatedBlogs([]); // Set empty array on error
    } finally {
      setRelatedBlogsLoading(false);
    }
  };

  useEffect(() => {
    fetchBlog();
  }, []);

  // Fetch related blogs when blog is loaded (only if relatedArticles not in response)
  useEffect(() => {
    if (Blog && (!Blog.relatedArticles || Blog.relatedArticles.length === 0)) {
      // Try to get category ID from the blog
      let categoryId = null;
      
      if (Blog.categories && Array.isArray(Blog.categories) && Blog.categories.length > 0) {
        const firstCategory = Blog.categories[0];
        // Handle nested structure
        if (firstCategory.category && firstCategory.category.id) {
          categoryId = firstCategory.category.id;
        } else if (firstCategory.id) {
          categoryId = firstCategory.id;
        } else if (firstCategory.categoryId) {
          categoryId = firstCategory.categoryId;
        }
        logger.log("Blog loaded, fetching related articles for category ID:", categoryId);
      }
      
      if (categoryId) {
        fetchRelated({ category: categoryId });
      } else {
        logger.log("Blog loaded but no category ID found, fetching recent articles as fallback");
        fetchRecentArticles();
      }
    }
  }, [Blog]);

  const onClickCategoryBtn = (category) => {};

  // Show system loader while blog is loading
  if (BlogLoading) {
    return <Loader />;
  }

  // Show 404 page if blog not found
  if (showNotFound) {
    return <NotFound />;
  }

  return (
    <main>
      <Section>
        <CenterContainer loading={BlogLoading}>
          <CategoryBtn
            category={Category}
            loading={BlogLoading}
            onClick={onClickCategoryBtn}
          ></CategoryBtn>
          <TitleWrapper title={Blog?.title || Blog?.title?.rendered || "Untitled"}></TitleWrapper>
          {/* <Author
            name={AuthorContent?.display_name}
            readTime={EstReadTime}
            date={Blog?.date}
            avatarUrl={AuthorContent?.avatar_url}
          ></Author> */}
        </CenterContainer>

        <ArticleImg
          src={FeaturedImage}
          loading={BlogLoading}
          alt={Blog?.title || Blog?.title?.rendered || "Blog post"}
        ></ArticleImg>

        <Content
          html={Blog?.content || Blog?.content?.rendered || ""}
          loading={BlogLoading}
          AuthorContent={AuthorContent}
        ></Content>

        <RelatedArticles
          RelatedBlogs={Array.isArray(RelatedBlogs) ? RelatedBlogs : []}
          loading={RelatedBlogsLoading}
        ></RelatedArticles>

        <MoreQuestions
          title="Your path to better health begins here."
          buttonText="Get Started For Free"
          buttonWidth="240"
        ></MoreQuestions>
      </Section>
    </main>
  );
}
