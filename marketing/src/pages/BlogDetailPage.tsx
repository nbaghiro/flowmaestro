import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    Calendar,
    Clock,
    ArrowLeft,
    Share2,
    Twitter,
    Linkedin,
    Link as LinkIcon,
    Loader2,
    ChevronRight
} from "lucide-react";
import React, { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useNavigate } from "react-router-dom";
import type { BlogPostSummary } from "@flowmaestro/shared";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { BlogEvents } from "../lib/analytics";
import { getBlogPost } from "../lib/api";

// Format date for display
function formatDate(dateString: string | null): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

// Get category label
function getCategoryLabel(category: string): string {
    if (category === "case-study") return "Case Study";
    return category.charAt(0).toUpperCase() + category.slice(1);
}

// Related post card component
const RelatedPostCard: React.FC<{ post: BlogPostSummary }> = ({ post }) => {
    return (
        <Link
            to={`/blog/${post.slug}`}
            className="group block bg-card border border-stroke rounded-xl overflow-hidden hover:border-primary-500/50 transition-colors"
        >
            <div className="aspect-video overflow-hidden">
                {post.featuredImageUrl ? (
                    <img
                        src={post.featuredImageUrl}
                        alt={post.featuredImageAlt || post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-900/20 to-primary-700/20 flex items-center justify-center">
                        <span className="text-3xl opacity-20">
                            {getCategoryLabel(post.category).charAt(0)}
                        </span>
                    </div>
                )}
            </div>
            <div className="p-4 space-y-2">
                <span className="text-xs font-medium text-primary-400 uppercase tracking-wider">
                    {getCategoryLabel(post.category)}
                </span>
                <h3 className="font-semibold text-foreground group-hover:text-primary-400 transition-colors line-clamp-2">
                    {post.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {post.publishedAt && (
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(post.publishedAt)}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTimeMinutes} min
                    </span>
                </div>
            </div>
        </Link>
    );
};

// Share button component
const ShareButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}> = ({ icon, label, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-stroke hover:border-primary-500/50 text-muted-foreground hover:text-foreground transition-colors text-sm"
            aria-label={label}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
};

export const BlogDetailPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [copied, setCopied] = React.useState(false);
    const hasTrackedPostView = useRef(false);

    // Fetch blog post
    const {
        data: postData,
        isLoading,
        isError,
        error
    } = useQuery({
        queryKey: ["blogPost", slug],
        queryFn: async () => {
            if (!slug) throw new Error("No slug provided");
            const response = await getBlogPost(slug);
            if (!response.success) throw new Error(response.error);
            return response.data;
        },
        enabled: !!slug
    });

    const post = postData;

    // Track post view
    useEffect(() => {
        if (post && slug && !hasTrackedPostView.current) {
            BlogEvents.postOpened({
                blogSlug: slug,
                category: post.category,
                author: post.author.name
            });
            hasTrackedPostView.current = true;
        }
    }, [post, slug]);

    // Share handlers
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";

    const shareOnTwitter = () => {
        if (!post || !slug) return;
        BlogEvents.shareClicked({ blogSlug: slug, platform: "twitter" });
        const text = encodeURIComponent(post.title);
        window.open(
            `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`,
            "_blank"
        );
    };

    const shareOnLinkedIn = () => {
        if (!post || !slug) return;
        BlogEvents.shareClicked({ blogSlug: slug, platform: "linkedin" });
        window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
            "_blank"
        );
    };

    const copyLink = async () => {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background text-foreground relative">
                <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
                <div className="relative z-10">
                    <Navigation />
                    <div className="flex justify-center items-center min-h-[60vh]">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
                    </div>
                    <Footer />
                </div>
            </div>
        );
    }

    if (isError || !post) {
        return (
            <div className="min-h-screen bg-background text-foreground relative">
                <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
                <div className="relative z-10">
                    <Navigation />
                    <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
                        <h1 className="text-2xl font-bold">Post Not Found</h1>
                        <p className="text-muted-foreground">
                            {error instanceof Error
                                ? error.message
                                : "The blog post you're looking for doesn't exist."}
                        </p>
                        <button onClick={() => navigate("/blog")} className="btn-primary mt-4">
                            Back to Blog
                        </button>
                    </div>
                    <Footer />
                </div>
            </div>
        );
    }

    const categoryLabel = getCategoryLabel(post.category);

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            {/* SEO Meta Tags */}
            <Helmet>
                <title>{post.metaTitle || post.title} | FlowMaestro Blog</title>
                <meta name="description" content={post.metaDescription || post.excerpt || ""} />
                {post.canonicalUrl && <link rel="canonical" href={post.canonicalUrl} />}

                {/* Open Graph */}
                <meta property="og:type" content="article" />
                <meta property="og:title" content={post.metaTitle || post.title} />
                <meta
                    property="og:description"
                    content={post.metaDescription || post.excerpt || ""}
                />
                {(post.ogImageUrl || post.featuredImageUrl) && (
                    <meta
                        property="og:image"
                        content={post.ogImageUrl || post.featuredImageUrl || ""}
                    />
                )}
                <meta property="og:url" content={shareUrl} />
                <meta property="article:published_time" content={post.publishedAt || ""} />

                {/* Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={post.metaTitle || post.title} />
                <meta
                    name="twitter:description"
                    content={post.metaDescription || post.excerpt || ""}
                />
                {(post.ogImageUrl || post.featuredImageUrl) && (
                    <meta
                        name="twitter:image"
                        content={post.ogImageUrl || post.featuredImageUrl || ""}
                    />
                )}

                {/* JSON-LD Structured Data */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "BlogPosting",
                        headline: post.title,
                        description: post.excerpt,
                        image: post.featuredImageUrl,
                        datePublished: post.publishedAt,
                        dateModified: post.updatedAt,
                        author: {
                            "@type": "Person",
                            name: post.author.name,
                            image: post.author.avatarUrl
                        },
                        publisher: {
                            "@type": "Organization",
                            name: "FlowMaestro",
                            logo: {
                                "@type": "ImageObject",
                                url: "https://flowmaestro.ai/logo.png"
                            }
                        },
                        mainEntityOfPage: {
                            "@type": "WebPage",
                            "@id": shareUrl
                        }
                    })}
                </script>
            </Helmet>

            {/* Full-page background pattern */}
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <div className="relative z-10">
                <Navigation />

                {/* Article Header */}
                <article className="relative pt-24 pb-16">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Breadcrumb */}
                        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
                            <Link to="/blog" className="hover:text-foreground transition-colors">
                                Blog
                            </Link>
                            <ChevronRight className="w-4 h-4" />
                            <span className="text-primary-400">{categoryLabel}</span>
                        </nav>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            {/* Category */}
                            <span className="inline-block text-sm font-medium text-primary-400 uppercase tracking-wider mb-4">
                                {categoryLabel}
                            </span>

                            {/* Title */}
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                                {post.title}
                            </h1>

                            {/* Meta Info */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
                                {/* Author */}
                                <div className="flex items-center gap-2">
                                    {post.author.avatarUrl && (
                                        <img
                                            src={post.author.avatarUrl}
                                            alt={post.author.name}
                                            className="w-8 h-8 rounded-full"
                                        />
                                    )}
                                    <span>{post.author.name}</span>
                                </div>

                                <span className="text-muted-foreground/50">•</span>

                                {/* Date */}
                                {post.publishedAt && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {formatDate(post.publishedAt)}
                                    </span>
                                )}

                                <span className="text-muted-foreground/50">•</span>

                                {/* Read Time */}
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {post.readTimeMinutes} min read
                                </span>
                            </div>

                            {/* Featured Image */}
                            {post.featuredImageUrl && (
                                <div className="aspect-video rounded-xl overflow-hidden mb-10 bg-card border border-stroke">
                                    <img
                                        src={post.featuredImageUrl}
                                        alt={post.featuredImageAlt || post.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* Article Content */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"
                    >
                        <div
                            className="prose prose-invert prose-lg max-w-none
                                prose-headings:text-foreground
                                prose-p:text-muted-foreground
                                prose-a:text-primary-400 prose-a:no-underline hover:prose-a:underline
                                prose-strong:text-foreground
                                prose-code:text-primary-400 prose-code:bg-card prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                                prose-pre:bg-card prose-pre:border prose-pre:border-stroke
                                prose-blockquote:border-primary-500 prose-blockquote:text-muted-foreground
                                prose-img:rounded-xl"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                        />

                        {/* Tags */}
                        {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-stroke">
                                {post.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="px-3 py-1 rounded-full bg-card border border-stroke text-sm text-muted-foreground"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Share Buttons */}
                        <div className="flex items-center gap-4 mt-8 pt-6 border-t border-stroke">
                            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Share2 className="w-4 h-4" />
                                Share
                            </span>
                            <ShareButton
                                icon={<Twitter className="w-4 h-4" />}
                                label="Twitter"
                                onClick={shareOnTwitter}
                            />
                            <ShareButton
                                icon={<Linkedin className="w-4 h-4" />}
                                label="LinkedIn"
                                onClick={shareOnLinkedIn}
                            />
                            <ShareButton
                                icon={<LinkIcon className="w-4 h-4" />}
                                label={copied ? "Copied!" : "Copy Link"}
                                onClick={copyLink}
                            />
                        </div>

                        {/* Author Bio */}
                        {post.author.bio && (
                            <div className="mt-10 p-6 rounded-xl bg-card border border-stroke">
                                <div className="flex items-start gap-4">
                                    {post.author.avatarUrl && (
                                        <img
                                            src={post.author.avatarUrl}
                                            alt={post.author.name}
                                            className="w-16 h-16 rounded-full"
                                        />
                                    )}
                                    <div>
                                        <h3 className="font-semibold text-foreground mb-1">
                                            {post.author.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {post.author.bio}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </article>

                {/* Related Posts */}
                {post.relatedPosts && post.relatedPosts.length > 0 && (
                    <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-stroke">
                        <div className="max-w-6xl mx-auto">
                            <h2 className="text-2xl font-bold mb-8 text-center">Related Posts</h2>
                            <div className="grid md:grid-cols-3 gap-6">
                                {post.relatedPosts.map((relatedPost) => (
                                    <RelatedPostCard key={relatedPost.id} post={relatedPost} />
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Back to Blog */}
                <section className="py-8 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto">
                        <Link
                            to="/blog"
                            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Blog
                        </Link>
                    </div>
                </section>

                <Footer />
            </div>
        </div>
    );
};
