import { Suspense } from "react";
import { logger } from "@/utils/devLogger";
import { blogService } from "@/components/NewBlogs/services/blogService";
import { MainBlogsPage } from "@/components/NewBlogs";
import BlogPageSkeleton from "@/components/NewBlogs/components/BlogPageSkeleton";
import ErrorUI from "./ErrorUI";

// Force dynamic rendering since we use no-store fetch
export const dynamic = 'force-dynamic';

async function BlogsContent() {
  try {
    // Fetch all posts (featured and regular) and categories
    // We'll fetch all posts and let the component handle featured vs regular
    const [blogsData, categories] = await Promise.all([
      blogService.getBlogs(1, null, { limit: 20 }),
      blogService.getBlogCategories(),
    ]);

    // The blogs are already sorted by publishedAt desc, so featured ones should be first
    // We'll pass all blogs and let the component handle the display
    return (
      <MainBlogsPage
        initialBlogs={blogsData.blogs || []}
        initialCategories={categories || []}
        initialTotalPages={blogsData.totalPages || 1}
      />
    );
  } catch (error) {
    logger.error("Error loading blogs page:", error);
    return <ErrorUI error={error} />;
  }
}

export default function BlogPage() {
  return (
    <Suspense fallback={<BlogPageSkeleton />}>
      <BlogsContent />
    </Suspense>
  );
}
