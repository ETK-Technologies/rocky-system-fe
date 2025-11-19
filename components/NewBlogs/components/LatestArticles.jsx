"use client";

import BlogCard from '../shared/BlogCard';

export default function LatestArticles({
    blogs = [],
    totalPages = 1,
    currentPage = 1,
    hasMorePages = false,
    onLoadMore,
    isLoading = false
}) {
    if (!blogs || blogs.length === 0) {
        return null;
    }

    const validBlogs = blogs.filter(blog => blog && typeof blog === 'object');

    if (validBlogs.length === 0) {
        return null;
    }

    // Skip the first 4 blogs as they're in featured section
    const latestBlogs = validBlogs.slice(4);

    if (latestBlogs.length === 0) {
        return null;
    }

    return (
        <section className="md:my-14 mt-14 md:mb-8">
            <h2 className="text-3xl md:text-5xl font-[550] headers-font text-black mb-8 md:mb-14">
                Latest
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                {latestBlogs.map((blog, index) => (
                    <BlogCard
                        key={blog.id || index}
                        blog={blog}
                        variant="default"
                        isClickable={true}
                    />
                ))}
            </div>

            {hasMorePages && (
                <div className="text-center cursor-pointer">
                    <button
                        onClick={onLoadMore}
                        disabled={isLoading}
                        className={`px-8 py-3 w-full md:w-fit transition-colors cursor-pointer rounded-full ${isLoading
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-white text-black border border-[#0000003D] '
                            }`}
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Loading...
                            </div>
                        ) : (
                            'See more blogs'
                        )}
                    </button>
                </div>
            )}
        </section>
    );
}
