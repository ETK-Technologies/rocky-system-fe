"use client";

import { useState } from 'react';
import Link from 'next/link';
import BlogHeader from '../components/BlogHeader';
import TableOfContents from './components/TableOfContents';
import BlogContent from './components/BlogContent';
import RelatedArticles from './components/RelatedArticles';
import NewsletterSignup from '../components/NewsletterSignup';

export default function BlogDetailPage({ blog }) {
    const [activeSection, setActiveSection] = useState('');

    if (!blog) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        Blog post not found
                    </h1>
                    <p className="text-gray-600">
                        The blog post you're looking for doesn't exist.
                    </p>
                </div>
            </div>
        );
    }

    // Extract data from blog - prioritize new format
    const extractText = (field) => {
        if (typeof field === 'string') return field;
        if (field && typeof field === 'object' && field.rendered) return field.rendered;
        if (field && typeof field === 'object' && field.name) return field.name;
        return '';
    };

    const title = blog.title || 'Untitled';
    const content = blog.content || '';
    const excerpt = blog.excerpt || '';

    // Extract author - prioritize new format
    let author = 'Unknown Author';
    let authorData = null;
    if (blog.author) {
        const firstName = blog.author.firstName || '';
        const lastName = blog.author.lastName || '';
        author = `${firstName} ${lastName}`.trim() || 'Unknown Author';
        authorData = blog.author;
    } else if (blog.authorName) {
        author = blog.authorName;
    } else if (blog.authors && blog.authors.length > 0) {
        author = blog.authors[0].display_name || blog.authors[0].name || 'Unknown Author';
        authorData = blog.authors[0];
    } else if (blog._embedded && blog._embedded.author && blog._embedded.author.length > 0) {
        author = blog._embedded.author[0].name || 'Unknown Author';
        authorData = blog._embedded.author[0];
    }

    // Extract category - prioritize new format
    let category = 'Uncategorized';
    let categorySlug = 'uncategorized';
    if (blog.category) {
        category = blog.category;
        categorySlug = blog.categorySlug || category.toLowerCase().replace(/\s+/g, '-');
    } else if (blog.categories && Array.isArray(blog.categories) && blog.categories.length > 0) {
        // Categories array already contains category objects directly after transformation
        const firstCategory = blog.categories[0];
        if (firstCategory.name) {
            category = firstCategory.name;
            categorySlug = firstCategory.slug || category.toLowerCase().replace(/\s+/g, '-');
        }
    } else if (blog._embedded && blog._embedded['wp:term'] && blog._embedded['wp:term'][0] && blog._embedded['wp:term'][0].length > 0) {
        category = blog._embedded['wp:term'][0][0].name || 'Uncategorized';
        categorySlug = blog._embedded['wp:term'][0][0].slug || category.toLowerCase().replace(/\s+/g, '-');
    }

    // Extract featured image - prioritize new format
    let featuredImage = null;
    if (blog.featuredImageUrl) {
        featuredImage = blog.featuredImageUrl;
    } else if (blog.featuredImage) {
        featuredImage = blog.featuredImage.cdnUrl || blog.featuredImage.storagePath || null;
    } else if (blog._embedded && blog._embedded['wp:featuredmedia'] && blog._embedded['wp:featuredmedia'].length > 0) {
        const media = blog._embedded['wp:featuredmedia'][0];
        featuredImage = media.source_url || media.media_details?.sizes?.medium?.source_url || media.media_details?.sizes?.large?.source_url;
    }

    return (
        <main className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <BlogHeader />

                {/* Breadcrumbs */}
                <div className="mb-6">
                    <nav className="text-sm text-gray-500">
                        <Link href="/" className="hover:text-gray-700">HOME</Link>
                        <span className="mx-2">/</span>
                        <Link href="/blog" className="hover:text-gray-700">BLOGS</Link>
                        {category !== 'Uncategorized' && (
                            <>
                                <span className="mx-2">/</span>
                                <Link href={`/blog/category/${categorySlug}`} className="hover:text-gray-700">
                                    {category.toUpperCase()}
                                </Link>
                            </>
                        )}
                    </nav>
                </div>

                {/* Main Content */}
                <div className="lg:grid lg:grid-cols-4 lg:gap-8">
                    {/* Left Sidebar - Table of Contents */}
                    <div className="lg:col-span-1 mb-8 lg:mb-0">
                        <TableOfContents
                            content={content}
                            activeSection={activeSection}
                            onSectionChange={setActiveSection}
                        />
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-2 mb-8">
                        <BlogContent
                            title={title}
                            author={author}
                            authorData={authorData}
                            category={category}
                            content={content}
                            featuredImage={featuredImage}
                            excerpt={excerpt}
                            publishedAt={blog.publishedAt}
                        />
                    </div>

                    {/* Right Sidebar - Related Articles & Promotional */}
                    <div className="lg:col-span-1">
                        <RelatedArticles blog={blog} />
                    </div>
                </div>

                {/* Newsletter Signup */}
                <NewsletterSignup />
            </div>
        </main>
    );
}
