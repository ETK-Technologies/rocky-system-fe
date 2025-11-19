"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/utils/devLogger";
import { blogService } from "../services/blogService";

export const useBlogData = (initialBlogs = [], initialTotalPages = 1) => {
  const [blogs, setBlogs] = useState(initialBlogs);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadMoreBlogs = useCallback(async (page, categoryId = null) => {
    try {
      setIsLoading(true);
      setError(null);

      logger.log("Loading blogs - page:", page, "categoryId:", categoryId);

      const result = await blogService.getBlogs(page, categoryId, { limit: 20 });

      logger.log("Blogs loaded - total pages:", result.totalPages, "current page:", result.currentPage, "blogs count:", result.blogs?.length);

      if (page === 1) {
        // First page - replace all blogs
        setBlogs(result.blogs || []);
      } else {
        // Subsequent pages - append blogs (avoid duplicates)
        setBlogs((prev) => {
          const existingIds = new Set(prev.map((b) => b.id));
          const newBlogs = (result.blogs || []).filter((b) => !existingIds.has(b.id));
          return [...prev, ...newBlogs];
        });
      }

      setTotalPages(result.totalPages || 1);
      setCurrentPage(result.currentPage || page);
      
      return result;
    } catch (err) {
      setError(err.message);
      logger.error("Error loading more blogs:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadNextPage = useCallback(async (categoryId = null) => {
    const nextPage = currentPage + 1;
    logger.log("Loading next page:", nextPage);
    await loadMoreBlogs(nextPage, categoryId);
  }, [currentPage, loadMoreBlogs]);

  const refreshBlogs = useCallback(
    async (categoryId = null) => {
      setCurrentPage(1);
      await loadMoreBlogs(1, categoryId);
    },
    [loadMoreBlogs]
  );

  // Initialize with server-side data
  useEffect(() => {
    setBlogs(initialBlogs);
    setTotalPages(initialTotalPages);
    setCurrentPage(1);
  }, [initialBlogs, initialTotalPages]);

  // Check if there are more pages
  const hasMorePages = currentPage < totalPages;

  return {
    blogs,
    totalPages,
    currentPage,
    isLoading,
    error,
    hasMorePages,
    loadMoreBlogs,
    loadNextPage,
    refreshBlogs,
  };
};
