-- Migration: Create blog_posts table
-- Description: Stores blog posts for the FlowMaestro blog (blog.flowmaestro.ai)

CREATE TABLE IF NOT EXISTS flowmaestro.blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- URL-friendly identifier
    slug VARCHAR(255) NOT NULL UNIQUE,

    -- Content
    title VARCHAR(500) NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,

    -- Featured image
    featured_image_url TEXT,
    featured_image_alt VARCHAR(500),

    -- Author information
    author_name VARCHAR(255) NOT NULL,
    author_avatar_url TEXT,
    author_bio TEXT,

    -- Categorization
    category VARCHAR(100) NOT NULL,
    tags TEXT[] DEFAULT '{}',

    -- SEO metadata
    meta_title VARCHAR(70),
    meta_description VARCHAR(160),
    canonical_url TEXT,
    og_image_url TEXT,

    -- Status and publishing
    status VARCHAR(20) DEFAULT 'draft',
    published_at TIMESTAMP WITH TIME ZONE,

    -- Stats
    view_count INTEGER DEFAULT 0,
    read_time_minutes INTEGER DEFAULT 5,

    -- Audit fields
    created_by UUID REFERENCES flowmaestro.users(id),
    updated_by UUID REFERENCES flowmaestro.users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Status constraint
ALTER TABLE flowmaestro.blog_posts ADD CONSTRAINT valid_blog_status
    CHECK (status IN ('draft', 'published', 'archived'));

-- Category constraint
ALTER TABLE flowmaestro.blog_posts ADD CONSTRAINT valid_blog_category
    CHECK (category IN ('product', 'engineering', 'tutorial', 'case-study', 'news', 'company'));

-- Indexes for efficient querying
CREATE INDEX idx_blog_posts_slug ON flowmaestro.blog_posts(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_blog_posts_status ON flowmaestro.blog_posts(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_blog_posts_category ON flowmaestro.blog_posts(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_blog_posts_published_at ON flowmaestro.blog_posts(published_at DESC)
    WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX idx_blog_posts_tags ON flowmaestro.blog_posts USING GIN(tags);

-- Full text search index
CREATE INDEX idx_blog_posts_search ON flowmaestro.blog_posts
    USING GIN(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '')));

-- Comments
COMMENT ON TABLE flowmaestro.blog_posts IS 'Blog posts for blog.flowmaestro.ai';
COMMENT ON COLUMN flowmaestro.blog_posts.slug IS 'URL-friendly identifier for the post';
COMMENT ON COLUMN flowmaestro.blog_posts.category IS 'Post category: product, engineering, tutorial, case-study, news, company';
COMMENT ON COLUMN flowmaestro.blog_posts.status IS 'Publication status: draft, published, archived';
COMMENT ON COLUMN flowmaestro.blog_posts.view_count IS 'Number of times this post has been viewed';
COMMENT ON COLUMN flowmaestro.blog_posts.read_time_minutes IS 'Estimated reading time in minutes';
