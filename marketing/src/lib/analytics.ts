import posthogClient from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

let initialized = false;

// Detect environment from URL or env var
function getEnvironment(): "development" | "staging" | "production" {
    if (import.meta.env.DEV) {
        return "development";
    }
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "development";
    }
    if (hostname.includes("staging") || hostname.includes("dev.")) {
        return "staging";
    }
    return "production";
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize PostHog analytics. Call once at app startup.
 * Skips initialization in development to avoid polluting production data.
 */
export function initAnalytics(): void {
    const environment = getEnvironment();

    // Skip analytics in development
    if (environment === "development") {
        return;
    }

    if (initialized || !POSTHOG_KEY) {
        return;
    }

    posthogClient.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        autocapture: true,
        capture_pageview: true,
        capture_pageleave: true,
        persistence: "localStorage"
    });

    // Register super properties - these are sent with EVERY event
    posthogClient.register({
        environment,
        app_version: import.meta.env.VITE_APP_VERSION || "unknown",
        app_name: "marketing"
    });

    initialized = true;
}

/**
 * Identify a user (if they log in from marketing site)
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
    if (!initialized) return;
    posthogClient.identify(userId, traits);
}

/**
 * Reset user identity
 */
export function resetUser(): void {
    if (!initialized) return;
    posthogClient.reset();
}

/**
 * Generic event tracking - prefer using typed functions below
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
    if (!initialized) return;
    posthogClient.capture(eventName, properties);
}

// ============================================================================
// HOME PAGE EVENTS
// ============================================================================

export const HomePageEvents = {
    viewed: () => trackEvent("home_page_viewed"),
    heroCtaClicked: (props: { ctaText: string; buttonPosition: string }) =>
        trackEvent("hero_cta_clicked", {
            cta_text: props.ctaText,
            button_position: props.buttonPosition
        }),
    featuresSectionViewed: () => trackEvent("features_section_viewed"),
    featureClicked: (props: { featureName: string }) =>
        trackEvent("feature_clicked", { feature_name: props.featureName }),
    integrationsSectionViewed: () => trackEvent("integrations_section_viewed"),
    productShowcaseViewed: () => trackEvent("product_showcase_viewed"),
    ctaSectionViewed: () => trackEvent("cta_section_viewed"),
    testimonialViewed: (props: { testimonialId: string }) =>
        trackEvent("testimonial_viewed", { testimonial_id: props.testimonialId })
};

// ============================================================================
// PRICING PAGE EVENTS
// ============================================================================

export const PricingEvents = {
    pageViewed: () => trackEvent("pricing_page_viewed"),
    creditSliderMoved: (props: { selectedCreditAmount: number; estimatedPrice: number }) =>
        trackEvent("credit_slider_moved", {
            selected_credit_amount: props.selectedCreditAmount,
            estimated_price: props.estimatedPrice
        }),
    planFeatureHovered: (props: { planName: string; feature: string }) =>
        trackEvent("plan_feature_hovered", { plan_name: props.planName, feature: props.feature }),
    pricingCtaClicked: (props: { planName: string; creditAmount: number }) =>
        trackEvent("pricing_cta_clicked", {
            plan_name: props.planName,
            credit_amount: props.creditAmount
        }),
    billingContactClicked: () => trackEvent("billing_contact_clicked"),
    faqExpanded: (props: { faqQuestion: string }) =>
        trackEvent("faq_expanded", { faq_question: props.faqQuestion }),
    planCompared: (props: { plansCompared: string[] }) =>
        trackEvent("plan_compared", { plans_compared: props.plansCompared }),
    annualToggled: (props: { isAnnual: boolean }) =>
        trackEvent("annual_toggled", { is_annual: props.isAnnual })
};

// ============================================================================
// INTEGRATIONS PAGE EVENTS
// ============================================================================

export const IntegrationsPageEvents = {
    pageViewed: () => trackEvent("integrations_page_viewed"),
    categoryFiltered: (props: { category: string }) =>
        trackEvent("integration_category_filtered", { category: props.category }),
    integrationClicked: (props: { integrationName: string; category: string }) =>
        trackEvent("integration_clicked", {
            integration_name: props.integrationName,
            category: props.category
        }),
    integrationDetailsViewed: (props: { integrationName: string }) =>
        trackEvent("integration_details_viewed", { integration_name: props.integrationName }),
    searched: (props: { query: string; resultsCount: number }) =>
        trackEvent("integrations_searched", {
            query: props.query,
            results_count: props.resultsCount
        }),
    requestIntegrationClicked: (props: { integrationName?: string }) =>
        trackEvent("request_integration_clicked", { integration_name: props.integrationName })
};

// ============================================================================
// SOLUTIONS PAGE EVENTS
// ============================================================================

export const SolutionsPageEvents = {
    pageViewed: (props: { solutionName: string }) =>
        trackEvent("solution_page_viewed", { solution_name: props.solutionName }),
    workflowExampleViewed: (props: { solutionName: string; exampleName: string }) =>
        trackEvent("solution_workflow_example_viewed", {
            solution_name: props.solutionName,
            example_name: props.exampleName
        }),
    ctaClicked: (props: { solutionName: string; ctaType: string }) =>
        trackEvent("solution_cta_clicked", {
            solution_name: props.solutionName,
            cta_type: props.ctaType
        }),
    useCaseExpanded: (props: { solutionName: string; useCaseName: string }) =>
        trackEvent("solution_use_case_expanded", {
            solution_name: props.solutionName,
            use_case_name: props.useCaseName
        })
};

// ============================================================================
// CASE STUDIES PAGE EVENTS
// ============================================================================

export const CaseStudiesEvents = {
    pageViewed: () => trackEvent("case_studies_page_viewed"),
    cardClicked: (props: { caseStudySlug: string; company: string }) =>
        trackEvent("case_study_card_clicked", {
            case_study_slug: props.caseStudySlug,
            company: props.company
        }),
    detailOpened: (props: { caseStudySlug: string }) =>
        trackEvent("case_study_detail_opened", { case_study_slug: props.caseStudySlug }),
    ctaClicked: (props: { caseStudySlug: string; ctaType: string }) =>
        trackEvent("case_study_cta_clicked", {
            case_study_slug: props.caseStudySlug,
            cta_type: props.ctaType
        }),
    industryFiltered: (props: { industry: string }) =>
        trackEvent("case_study_industry_filtered", { industry: props.industry }),
    shareClicked: (props: { caseStudySlug: string; platform: string }) =>
        trackEvent("case_study_share_clicked", {
            case_study_slug: props.caseStudySlug,
            platform: props.platform
        })
};

// ============================================================================
// BLOG PAGE EVENTS
// ============================================================================

export const BlogEvents = {
    pageViewed: () => trackEvent("blog_page_viewed"),
    postClicked: (props: { blogSlug: string; category: string }) =>
        trackEvent("blog_post_clicked", { blog_slug: props.blogSlug, category: props.category }),
    postOpened: (props: { blogSlug: string; category: string; author: string }) =>
        trackEvent("blog_post_opened", {
            blog_slug: props.blogSlug,
            category: props.category,
            author: props.author
        }),
    categoryFiltered: (props: { category: string }) =>
        trackEvent("blog_category_filtered", { category: props.category }),
    shareClicked: (props: { blogSlug: string; platform: string }) =>
        trackEvent("blog_share_clicked", { blog_slug: props.blogSlug, platform: props.platform }),
    relatedPostClicked: (props: { fromSlug: string; toSlug: string }) =>
        trackEvent("blog_related_post_clicked", {
            from_slug: props.fromSlug,
            to_slug: props.toSlug
        }),
    newsletterSubscribed: (props: { blogSlug?: string }) =>
        trackEvent("blog_newsletter_subscribed", { blog_slug: props.blogSlug }),
    scrollDepth: (props: { blogSlug: string; depth: number }) =>
        trackEvent("blog_scroll_depth", { blog_slug: props.blogSlug, depth: props.depth })
};

// ============================================================================
// TEMPLATES PAGE EVENTS
// ============================================================================

export const TemplatesPageEvents = {
    pageViewed: () => trackEvent("marketing_templates_page_viewed"),
    categoryFiltered: (props: { category: string }) =>
        trackEvent("template_category_filtered", { category: props.category }),
    templateClicked: (props: { templateId: string; templateName: string; category: string }) =>
        trackEvent("marketing_template_clicked", {
            template_id: props.templateId,
            template_name: props.templateName,
            category: props.category
        }),
    previewOpened: (props: { templateId: string }) =>
        trackEvent("template_preview_opened", { template_id: props.templateId }),
    useTemplateCtaClicked: (props: { templateId: string }) =>
        trackEvent("template_use_cta_clicked", { template_id: props.templateId }),
    searched: (props: { query: string; resultsCount: number }) =>
        trackEvent("templates_searched", { query: props.query, results_count: props.resultsCount })
};

// ============================================================================
// CONTACT PAGE EVENTS
// ============================================================================

export const ContactEvents = {
    pageViewed: () => trackEvent("contact_page_viewed"),
    formViewed: () => trackEvent("contact_form_viewed"),
    formStarted: () => trackEvent("contact_form_started"),
    formFieldFilled: (props: { fieldName: string }) =>
        trackEvent("contact_form_field_filled", { field_name: props.fieldName }),
    formSubmitted: (props: { inquiryType: string; company?: string }) =>
        trackEvent("contact_form_submitted", {
            inquiry_type: props.inquiryType,
            company: props.company
        }),
    formError: (props: { errorField: string; errorMessage: string }) =>
        trackEvent("contact_form_error", {
            error_field: props.errorField,
            error_message: props.errorMessage
        }),
    emailLinkClicked: () => trackEvent("contact_email_link_clicked"),
    salesCallScheduled: (props: { dateTime: string; timezone: string }) =>
        trackEvent("sales_call_scheduled", { date_time: props.dateTime, timezone: props.timezone }),
    calendarOpened: () => trackEvent("calendar_booking_opened")
};

// ============================================================================
// AUTHENTICATION LINKS (from marketing to app)
// ============================================================================

export const AuthLinkEvents = {
    signupLinkClicked: (props: {
        referringPage: string;
        buttonText: string;
        buttonPosition: string;
    }) =>
        trackEvent("marketing_signup_link_clicked", {
            referring_page: props.referringPage,
            button_text: props.buttonText,
            button_position: props.buttonPosition
        }),
    loginLinkClicked: (props: { referringPage: string }) =>
        trackEvent("marketing_login_link_clicked", { referring_page: props.referringPage }),
    getStartedClicked: (props: { referringPage: string; ctaVariant: string }) =>
        trackEvent("get_started_clicked", {
            referring_page: props.referringPage,
            cta_variant: props.ctaVariant
        }),
    startFreeTrialClicked: (props: { referringPage: string }) =>
        trackEvent("start_free_trial_clicked", { referring_page: props.referringPage })
};

// ============================================================================
// OTHER PAGES EVENTS
// ============================================================================

export const OtherPagesEvents = {
    // About
    aboutPageViewed: () => trackEvent("about_page_viewed"),
    teamMemberClicked: (props: { memberName: string }) =>
        trackEvent("team_member_clicked", { member_name: props.memberName }),

    // Security
    securityPageViewed: () => trackEvent("security_page_viewed"),
    complianceBadgeClicked: (props: { badgeName: string }) =>
        trackEvent("compliance_badge_clicked", { badge_name: props.badgeName }),
    securityDocDownloaded: (props: { docName: string }) =>
        trackEvent("security_doc_downloaded", { doc_name: props.docName }),

    // Legal
    privacyPageViewed: () => trackEvent("privacy_page_viewed"),
    termsPageViewed: () => trackEvent("terms_page_viewed"),

    // Changelog
    changelogPageViewed: () => trackEvent("changelog_page_viewed"),
    changelogEntryExpanded: (props: { entryDate: string; version: string }) =>
        trackEvent("changelog_entry_expanded", {
            entry_date: props.entryDate,
            version: props.version
        }),

    // Help/Support
    helpPageViewed: () => trackEvent("help_page_viewed"),
    helpArticleClicked: (props: { articleId: string; category: string }) =>
        trackEvent("help_article_clicked", {
            article_id: props.articleId,
            category: props.category
        }),
    helpSearched: (props: { query: string; resultsCount: number }) =>
        trackEvent("help_searched", { query: props.query, results_count: props.resultsCount }),

    // Community
    communityPageViewed: () => trackEvent("community_page_viewed"),
    communityLinkClicked: (props: { platform: string }) =>
        trackEvent("community_link_clicked", { platform: props.platform }),

    // Careers
    careersPageViewed: () => trackEvent("careers_page_viewed"),
    jobListingViewed: (props: { jobId: string; jobTitle: string; department: string }) =>
        trackEvent("job_listing_viewed", {
            job_id: props.jobId,
            job_title: props.jobTitle,
            department: props.department
        }),
    jobApplyClicked: (props: { jobId: string; jobTitle: string }) =>
        trackEvent("job_apply_clicked", { job_id: props.jobId, job_title: props.jobTitle }),

    // Documentation
    docsLinkClicked: (props: { referringPage: string; docSection?: string }) =>
        trackEvent("docs_link_clicked", {
            referring_page: props.referringPage,
            doc_section: props.docSection
        })
};

// ============================================================================
// NAVIGATION EVENTS
// ============================================================================

export const NavigationEvents = {
    // Header
    navMenuToggled: (props: { isOpen: boolean }) =>
        trackEvent("navigation_menu_toggled", { is_open: props.isOpen }),
    navLinkClicked: (props: { menuItem: string; isDropdown: boolean }) =>
        trackEvent("navigation_link_clicked", {
            menu_item: props.menuItem,
            is_dropdown: props.isDropdown
        }),
    dropdownOpened: (props: { menuItem: string }) =>
        trackEvent("dropdown_opened", { menu_item: props.menuItem }),

    // Footer
    footerLinkClicked: (props: { linkCategory: string; linkTarget: string }) =>
        trackEvent("footer_link_clicked", {
            link_category: props.linkCategory,
            link_target: props.linkTarget
        }),
    footerSocialClicked: (props: { socialPlatform: string }) =>
        trackEvent("footer_social_clicked", { social_platform: props.socialPlatform }),

    // Theme
    themeToggled: (props: { newTheme: "light" | "dark" }) =>
        trackEvent("theme_toggled", { new_theme: props.newTheme }),

    // Language (if applicable)
    languageChanged: (props: { fromLanguage: string; toLanguage: string }) =>
        trackEvent("language_changed", {
            from_language: props.fromLanguage,
            to_language: props.toLanguage
        })
};

// ============================================================================
// SCROLL & ENGAGEMENT EVENTS
// ============================================================================

export const EngagementEvents = {
    scrollDepthReached: (props: { pageName: string; depth: 25 | 50 | 75 | 100 }) =>
        trackEvent("scroll_depth_reached", { page_name: props.pageName, depth: props.depth }),
    timeOnPage: (props: { pageName: string; durationSeconds: number }) =>
        trackEvent("time_on_page", {
            page_name: props.pageName,
            duration_seconds: props.durationSeconds
        }),
    videoPlayed: (props: { videoId: string; videoTitle: string }) =>
        trackEvent("video_played", { video_id: props.videoId, video_title: props.videoTitle }),
    videoPaused: (props: { videoId: string; currentTime: number }) =>
        trackEvent("video_paused", { video_id: props.videoId, current_time: props.currentTime }),
    videoCompleted: (props: { videoId: string }) =>
        trackEvent("video_completed", { video_id: props.videoId }),
    demoRequested: (props: { referringPage: string }) =>
        trackEvent("demo_requested", { referring_page: props.referringPage }),
    newsletterSubscribed: (props: { referringPage: string; formLocation: string }) =>
        trackEvent("newsletter_subscribed", {
            referring_page: props.referringPage,
            form_location: props.formLocation
        })
};

// ============================================================================
// ERROR EVENTS
// ============================================================================

export const ErrorEvents = {
    pageNotFound: (props: { attemptedPath: string; referrer?: string }) =>
        trackEvent("page_not_found", {
            attempted_path: props.attemptedPath,
            referrer: props.referrer
        }),
    formError: (props: { formName: string; errorMessage: string }) =>
        trackEvent("form_error", { form_name: props.formName, error_message: props.errorMessage }),
    linkBroken: (props: { brokenUrl: string; sourcePage: string }) =>
        trackEvent("link_broken", { broken_url: props.brokenUrl, source_page: props.sourcePage })
};

// ============================================================================
// UTM & ATTRIBUTION EVENTS
// ============================================================================

export const AttributionEvents = {
    utmCaptured: (props: {
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        utmTerm?: string;
        utmContent?: string;
    }) =>
        trackEvent("utm_captured", {
            utm_source: props.utmSource,
            utm_medium: props.utmMedium,
            utm_campaign: props.utmCampaign,
            utm_term: props.utmTerm,
            utm_content: props.utmContent
        }),
    referrerCaptured: (props: { referrer: string; landingPage: string }) =>
        trackEvent("referrer_captured", {
            referrer: props.referrer,
            landing_page: props.landingPage
        })
};
