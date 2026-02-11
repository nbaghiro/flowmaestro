import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowRight, Search, Loader2 } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import type { BlogCategory, BlogPostSummary } from "@flowmaestro/shared";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { getBlogPosts, getBlogCategories } from "../lib/api";

const POSTS_PER_PAGE = 12;

// Format date for display
function formatDate(dateString: string | null): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

// Blog post card component
const BlogCard: React.FC<{ post: BlogPostSummary; index: number }> = ({ post, index }) => {
    const categoryLabel =
        post.category === "case-study"
            ? "Case Study"
            : post.category.charAt(0).toUpperCase() + post.category.slice(1);

    return (
        <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
            className="group"
        >
            <Link to={`/blog/${post.slug}`} className="block">
                <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-card border border-stroke">
                    {post.featuredImageUrl ? (
                        <img
                            src={post.featuredImageUrl}
                            alt={post.featuredImageAlt || post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary-900/20 to-primary-700/20 flex items-center justify-center">
                            <span className="text-4xl opacity-20">{categoryLabel.charAt(0)}</span>
                        </div>
                    )}
                </div>
                <div className="space-y-2">
                    <span className="text-xs font-medium text-primary-400 uppercase tracking-wider">
                        {categoryLabel}
                    </span>
                    <h2 className="text-lg font-semibold text-foreground group-hover:text-primary-400 transition-colors line-clamp-2">
                        {post.title}
                    </h2>
                    {post.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {post.publishedAt && (
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(post.publishedAt)}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.readTimeMinutes} min read
                        </span>
                    </div>
                </div>
            </Link>
        </motion.article>
    );
};

export const BlogPage: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = React.useState<BlogCategory | "all">("all");
    const [searchQuery, setSearchQuery] = React.useState("");
    const [debouncedSearch, setDebouncedSearch] = React.useState("");

    // Debounce search query
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch categories
    const { data: categoriesData } = useQuery({
        queryKey: ["blogCategories"],
        queryFn: async () => {
            const response = await getBlogCategories();
            if (!response.success) throw new Error(response.error);
            return response.data;
        }
    });

    // Fetch posts with infinite query for "load more"
    const {
        data: postsData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError
    } = useInfiniteQuery({
        queryKey: ["blogPosts", selectedCategory, debouncedSearch],
        queryFn: async ({ pageParam = 0 }) => {
            const response = await getBlogPosts({
                category: selectedCategory === "all" ? undefined : selectedCategory,
                search: debouncedSearch || undefined,
                limit: POSTS_PER_PAGE,
                offset: pageParam
            });
            if (!response.success) throw new Error(response.error);
            return response.data;
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.hasMore) {
                return lastPage.offset + lastPage.limit;
            }
            return undefined;
        },
        initialPageParam: 0
    });

    // Flatten posts from all pages
    const allPosts = postsData?.pages.flatMap((page) => page.posts) ?? [];

    // Build category list with "All" option
    const categories: { key: BlogCategory | "all"; label: string; count?: number }[] = [
        { key: "all", label: "All" },
        ...(categoriesData?.map((cat) => ({
            key: cat.category,
            label: cat.label,
            count: cat.count
        })) ?? [])
    ];

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            {/* Full-page background pattern */}
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <div className="relative z-10">
                <Navigation />

                {/* Hero Section */}
                <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
                    <div className="relative z-10 max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                                <span className="gradient-text">Blog</span>
                            </h1>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                Insights, tutorials, and updates from the FlowMaestro team.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Search and Filter Section */}
                <section className="py-8 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto space-y-6">
                        {/* Search Input */}
                        <div className="relative max-w-md mx-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search posts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg bg-card border border-stroke focus:border-primary-500 focus:outline-none transition-colors text-foreground"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="flex flex-wrap gap-2 justify-center">
                            {categories.map((category) => (
                                <button
                                    key={category.key}
                                    onClick={() => setSelectedCategory(category.key)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        selectedCategory === category.key
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-card border border-stroke text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {category.label}
                                    {category.count !== undefined && (
                                        <span className="ml-1.5 text-xs opacity-60">
                                            ({category.count})
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Blog Posts Grid */}
                <section className="py-16 px-4 sm:px-6 lg:px-8">
                    <div className="relative z-10 max-w-6xl mx-auto">
                        {isLoading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
                            </div>
                        ) : isError ? (
                            <div className="text-center py-20">
                                <p className="text-muted-foreground">
                                    Failed to load blog posts. Please try again later.
                                </p>
                            </div>
                        ) : allPosts.length === 0 ? (
                            <div className="text-center py-20">
                                <p className="text-muted-foreground">
                                    {debouncedSearch
                                        ? `No posts found for "${debouncedSearch}"`
                                        : "No blog posts yet. Check back soon!"}
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {allPosts.map((post, index) => (
                                        <BlogCard key={post.id} post={post} index={index} />
                                    ))}
                                </div>

                                {/* Load More Button */}
                                {hasNextPage && (
                                    <div className="mt-12 text-center">
                                        <button
                                            onClick={() => fetchNextPage()}
                                            disabled={isFetchingNextPage}
                                            className="btn-secondary inline-flex items-center gap-2"
                                        >
                                            {isFetchingNextPage ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Loading...
                                                </>
                                            ) : (
                                                <>
                                                    Load More Posts
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>

                {/* Newsletter CTA */}
                <section className="py-16 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-2xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
                            <p className="text-muted-foreground mb-6">
                                Subscribe to our newsletter for the latest updates and insights.
                            </p>
                            <form className="flex gap-3 max-w-md mx-auto">
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="flex-1 px-4 py-3 rounded-lg bg-card border border-stroke focus:border-primary-500 focus:outline-none transition-colors text-foreground"
                                />
                                <button
                                    type="submit"
                                    className="btn-primary flex items-center gap-2"
                                >
                                    Subscribe
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </form>
                        </motion.div>
                    </div>
                </section>

                <Footer />
            </div>
        </div>
    );
};
