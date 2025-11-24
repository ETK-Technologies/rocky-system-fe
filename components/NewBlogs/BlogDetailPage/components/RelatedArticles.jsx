"use client";

import Link from 'next/link';
import Image from 'next/image';

export default function RelatedArticles({ blog }) {
    // Get related articles from blog data
    const relatedArticles = blog?.relatedArticles || [];
    const hasRelatedArticles = relatedArticles && relatedArticles.length > 0;

    // Extract featured image URL from a blog post
    const getFeaturedImage = (article) => {
        // Try transformed format first
        if (article.featuredImageUrl) {
            return article.featuredImageUrl;
        }
        // Try nested featuredImage object
        if (article.featuredImage) {
            if (article.featuredImage.cdnUrl) {
                return article.featuredImage.cdnUrl;
            }
            if (article.featuredImage.storagePath) {
                return article.featuredImage.storagePath;
            }
        }
        return null;
    };

    // Get category name - handle both raw API format and transformed format
    const getCategoryName = (article) => {
        // First try the helper field (transformed format)
        if (article.category && typeof article.category === 'string') {
            return article.category;
        }

        // Then try categories array
        if (article.categories && Array.isArray(article.categories) && article.categories.length > 0) {
            const firstCategory = article.categories[0];

            // Handle raw API format: { postId, categoryId, category: { name, slug, ... } }
            if (firstCategory.category && typeof firstCategory.category === 'object') {
                if (firstCategory.category.name) {
                    return firstCategory.category.name;
                }
            }

            // Handle transformed format: direct category object { id, name, slug, ... }
            if (firstCategory.name) {
                return firstCategory.name;
            }
        }

        return 'Uncategorized';
    };

    // Get article title - handle both formats
    const getArticleTitle = (article) => {
        if (!article) return 'Untitled';
        return article.title || article.title?.rendered || 'Untitled';
    };

    // Get article slug - handle both formats
    const getArticleSlug = (article) => {
        if (!article) return '#';
        return article.slug || article.id || '#';
    };

    return (
        <div className="space-y-6">
            {/* Promotional Section */}
            <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-center">
                    {/* Product Image Placeholder */}
                    <div className="bg-gray-200 rounded-lg w-24 h-24 mx-auto mb-4 flex items-center justify-center text-gray-500 text-xs">
                        Product
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Get Obvious Results Within 3 Weeks
                    </h3>

                    <p className="text-gray-600 text-sm mb-4">
                        Lorem ipsum dolor sit amet consectetur.
                    </p>

                    <button className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors">
                        Get Started →
                    </button>
                </div>
            </div>

            {/* Related Articles Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Related Articles
                </h3>

                <div className="space-y-4">
                    {hasRelatedArticles ? (
                        relatedArticles.map((article, index) => {
                            if (!article || !article.id) {
                                return null;
                            }

                            const featuredImage = getFeaturedImage(article);
                            const categoryName = getCategoryName(article);
                            const articleTitle = getArticleTitle(article);
                            const articleSlug = getArticleSlug(article);
                            const articleUrl = `/blog/${articleSlug}`;

                            return (
                                <Link
                                    key={article.id || index}
                                    href={articleUrl}
                                    className="block group hover:opacity-80 transition-opacity"
                                >
                                    <div className="flex gap-3">
                                        {/* Thumbnail */}
                                        <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-200">
                                            {featuredImage ? (
                                                <Image
                                                    src={featuredImage}
                                                    alt={articleTitle}
                                                    width={80}
                                                    height={80}
                                                    className="w-full h-full object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                                    No Image
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-gray-700">
                                                {articleTitle}
                                            </h4>
                                            <p className="text-xs text-gray-500">
                                                {categoryName}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        }).filter(Boolean)
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-500 text-sm">
                                No related articles available
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
