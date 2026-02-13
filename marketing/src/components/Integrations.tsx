import { AnimatePresence, motion, useInView } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getProviderLogoUrl } from "@flowmaestro/shared";
import { useTheme } from "../hooks/useTheme";
import { HomePageEvents, SolutionsPageEvents } from "../lib/analytics";

// Alias for cleaner code
const getBrandLogo = getProviderLogoUrl;

interface Integration {
    name: string;
    logoUrl: string;
}

// Row 1: CRM, Sales, Marketing, E-commerce - Business/Sales focused
const row1Integrations: Integration[] = [
    { name: "Salesforce", logoUrl: getBrandLogo("salesforce.com") },
    { name: "HubSpot", logoUrl: getBrandLogo("hubspot.com") },
    { name: "Shopify", logoUrl: getBrandLogo("shopify.com") },
    { name: "Stripe", logoUrl: getBrandLogo("stripe.com") },
    { name: "Mailchimp", logoUrl: getBrandLogo("mailchimp.com") },
    { name: "Apollo.io", logoUrl: getBrandLogo("apollo.io") },
    { name: "Pipedrive", logoUrl: getBrandLogo("pipedrive.com") },
    { name: "Klaviyo", logoUrl: getBrandLogo("klaviyo.com") },
    { name: "Zendesk", logoUrl: getBrandLogo("zendesk.com") },
    { name: "Intercom", logoUrl: getBrandLogo("intercom.com") },
    { name: "PayPal", logoUrl: getBrandLogo("paypal.com") },
    { name: "Square", logoUrl: getBrandLogo("squareup.com") },
    { name: "QuickBooks", logoUrl: getBrandLogo("quickbooks.intuit.com") },
    { name: "Xero", logoUrl: getBrandLogo("xero.com") },
    { name: "DocuSign", logoUrl: getBrandLogo("docusign.com") },
    { name: "ActiveCampaign", logoUrl: getBrandLogo("activecampaign.com") },
    { name: "Freshdesk", logoUrl: getBrandLogo("freshdesk.com") },
    { name: "Gorgias", logoUrl: getBrandLogo("gorgias.com") }
];

// Row 2: Productivity, Project Management, Communication, Collaboration
const row2Integrations: Integration[] = [
    { name: "Slack", logoUrl: getBrandLogo("slack.com") },
    { name: "Microsoft Teams", logoUrl: getBrandLogo("teams.microsoft.com") },
    { name: "Notion", logoUrl: getBrandLogo("notion.so") },
    { name: "Airtable", logoUrl: getBrandLogo("airtable.com") },
    { name: "Asana", logoUrl: getBrandLogo("asana.com") },
    { name: "Jira", logoUrl: getBrandLogo("atlassian.com/jira") },
    { name: "Trello", logoUrl: getBrandLogo("trello.com") },
    { name: "Monday.com", logoUrl: getBrandLogo("monday.com") },
    { name: "Linear", logoUrl: getBrandLogo("linear.app") },
    { name: "ClickUp", logoUrl: getBrandLogo("clickup.com") },
    { name: "Discord", logoUrl: getBrandLogo("discord.com") },
    { name: "Zoom", logoUrl: getBrandLogo("zoom.us") },
    { name: "Google Calendar", logoUrl: getBrandLogo("calendar.google.com") },
    { name: "Gmail", logoUrl: getBrandLogo("gmail.com") },
    { name: "WhatsApp", logoUrl: getBrandLogo("whatsapp.com") },
    { name: "Telegram", logoUrl: getBrandLogo("telegram.org") },
    { name: "Calendly", logoUrl: getBrandLogo("calendly.com") },
    { name: "Miro", logoUrl: getBrandLogo("miro.com") }
];

// Row 3: AI/ML, Developer Tools, Databases, Cloud, Analytics
const row3Integrations: Integration[] = [
    { name: "OpenAI", logoUrl: getBrandLogo("openai.com") },
    { name: "Anthropic", logoUrl: getBrandLogo("anthropic.com") },
    { name: "Google AI", logoUrl: getBrandLogo("google.com") },
    { name: "GitHub", logoUrl: getBrandLogo("github.com") },
    { name: "GitLab", logoUrl: getBrandLogo("gitlab.com") },
    { name: "AWS", logoUrl: getBrandLogo("aws.amazon.com") },
    { name: "Google Cloud", logoUrl: getBrandLogo("cloud.google.com") },
    { name: "Azure", logoUrl: getBrandLogo("azure.microsoft.com") },
    { name: "MongoDB", logoUrl: getBrandLogo("mongodb.com") },
    { name: "PostgreSQL", logoUrl: getBrandLogo("postgrespro.com") },
    { name: "Snowflake", logoUrl: getBrandLogo("snowflake.com") },
    { name: "Vercel", logoUrl: getBrandLogo("vercel.com") },
    { name: "Datadog", logoUrl: getBrandLogo("datadoghq.com") },
    { name: "Mixpanel", logoUrl: getBrandLogo("mixpanel.com") },
    { name: "Segment", logoUrl: getBrandLogo("segment.com") },
    { name: "Figma", logoUrl: getBrandLogo("figma.com") },
    { name: "Hugging Face", logoUrl: getBrandLogo("huggingface.co") },
    { name: "Pinecone", logoUrl: getBrandLogo("pinecone.io") }
];

interface LogoRowProps {
    integrations: Integration[];
    direction: "left" | "right";
    speed?: number;
}

const LogoRow: React.FC<LogoRowProps> = ({ integrations, direction, speed = 30 }) => {
    // Duplicate the integrations to create a seamless loop
    const duplicatedIntegrations = [...integrations, ...integrations];

    return (
        <div className="relative flex overflow-hidden py-4">
            {/* Gradient masks for fade effect */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-secondary to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-secondary to-transparent z-10 pointer-events-none" />

            <div
                className={`flex items-center gap-12 ${
                    direction === "left" ? "animate-scroll-left" : "animate-scroll-right"
                }`}
                style={{
                    animationDuration: `${speed}s`
                }}
            >
                {duplicatedIntegrations.map((integration, index) => (
                    <div
                        key={`${integration.name}-${index}`}
                        className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-xl bg-card backdrop-blur-sm border border-border hover:bg-accent hover:border-muted-foreground/30 transition-all duration-300 group"
                    >
                        <img
                            src={integration.logoUrl}
                            alt={integration.name}
                            className="w-10 h-10 object-contain filter brightness-90 group-hover:brightness-110 transition-all"
                            loading="lazy"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

interface WorkflowExample {
    id: string;
    screenshotBase: string;
    title: string;
    description: string;
}

const workflowExamples: WorkflowExample[] = [
    {
        id: "lead-enrichment",
        screenshotBase: "workflow-lead-enrichment",
        title: "Lead Enrichment Pipeline",
        description: "Enrich leads with Apollo & LinkedIn, qualify and route to CRM"
    },
    {
        id: "whatsapp-support",
        screenshotBase: "workflow-whatsapp-support",
        title: "WhatsApp Customer Support Bot",
        description:
            "Omnichannel support: WhatsApp/Telegram messages, enrich from HubSpot/Salesforce"
    },
    {
        id: "social-media-hub",
        screenshotBase: "workflow-social-media-hub",
        title: "Social Media Performance Hub",
        description: "Cross-platform analytics: aggregate metrics from TikTok, YouTube, Instagram"
    },
    {
        id: "calendly-meeting-prep",
        screenshotBase: "workflow-calendly-meeting-prep",
        title: "Calendly Meeting Prep",
        description:
            "Lookup attendees in HubSpot/Apollo, research company, generate personalized briefs"
    },
    {
        id: "data-infrastructure",
        screenshotBase: "workflow-data-infrastructure",
        title: "Data Infrastructure Monitor",
        description:
            "Monitor MongoDB/PostgreSQL pipelines, AI anomaly detection, auto-create alerts"
    },
    {
        id: "github-pr-reviewer",
        screenshotBase: "workflow-github-pr-reviewer",
        title: "GitHub PR Reviewer",
        description: "Automated code review: analyze PRs, check for issues, post review comments"
    }
];

export const Integrations: React.FC = () => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    const hasTrackedView = useRef(false);
    const { theme } = useTheme();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const totalIntegrations = 110;

    useEffect(() => {
        if (isInView && !hasTrackedView.current) {
            HomePageEvents.integrationsSectionViewed();
            hasTrackedView.current = true;
        }
    }, [isInView]);

    const trackSlideView = useCallback((slideIndex: number) => {
        const example = workflowExamples[slideIndex];
        SolutionsPageEvents.workflowExampleViewed({
            solutionName: "homepage",
            exampleName: example.id
        });
    }, []);

    const nextSlide = useCallback(() => {
        setCurrentSlide((prev) => {
            const next = (prev + 1) % workflowExamples.length;
            trackSlideView(next);
            return next;
        });
    }, [trackSlideView]);

    const prevSlide = useCallback(() => {
        setCurrentSlide((prev) => {
            const next = (prev - 1 + workflowExamples.length) % workflowExamples.length;
            trackSlideView(next);
            return next;
        });
    }, [trackSlideView]);

    const goToSlide = useCallback(
        (index: number) => {
            if (index !== currentSlide) {
                trackSlideView(index);
            }
            setCurrentSlide(index);
        },
        [currentSlide, trackSlideView]
    );

    // Auto-advance carousel
    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            nextSlide();
        }, 5000);

        return () => clearInterval(interval);
    }, [isPaused, nextSlide]);

    const currentExample = workflowExamples[currentSlide];
    const screenshotPath = `/screenshots/${currentExample.screenshotBase}-${theme}.png`;

    return (
        <section
            ref={ref}
            className="relative py-24 px-4 sm:px-6 lg:px-8 bg-secondary overflow-hidden"
        >
            <div className="absolute inset-0 grid-pattern opacity-50" />
            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-4"
                >
                    <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase mb-6">
                        Integrations
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-foreground">
                        Connect
                        <span className="gradient-text"> Everything</span>
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        With {totalIntegrations}+ enterprise integrations, your AI agents can read,
                        write, and execute tasks within your existing systems.
                    </p>
                </motion.div>

                {/* Sliding Logo Rows */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="mt-16 space-y-4"
                >
                    <LogoRow integrations={row1Integrations} direction="left" speed={40} />
                    <LogoRow integrations={row2Integrations} direction="right" speed={35} />
                    <LogoRow integrations={row3Integrations} direction="left" speed={38} />
                </motion.div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-center mt-12"
                >
                    <Link
                        to="/integrations"
                        className="px-6 py-3 bg-card hover:bg-accent border border-border rounded-lg font-semibold transition-all duration-200 inline-block text-foreground"
                    >
                        View All Integrations
                    </Link>
                </motion.div>

                {/* Workflow Examples Carousel */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="mt-16"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    {/* Carousel Header */}
                    <div className="text-center mb-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentSlide}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <h3 className="text-lg font-semibold text-foreground mb-1">
                                    {currentExample.title}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {currentExample.description}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Carousel Container */}
                    <div className="relative max-w-5xl mx-auto">
                        {/* Navigation Arrows */}
                        <button
                            onClick={prevSlide}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-12 z-20 p-2 rounded-full bg-card border border-border hover:bg-accent transition-colors shadow-lg"
                            aria-label="Previous workflow"
                        >
                            <ChevronLeft className="w-5 h-5 text-foreground" />
                        </button>
                        <button
                            onClick={nextSlide}
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 lg:translate-x-12 z-20 p-2 rounded-full bg-card border border-border hover:bg-accent transition-colors shadow-lg"
                            aria-label="Next workflow"
                        >
                            <ChevronRight className="w-5 h-5 text-foreground" />
                        </button>

                        {/* Screenshot */}
                        <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={`${currentSlide}-${theme}`}
                                    src={screenshotPath}
                                    alt={currentExample.title}
                                    className="w-full"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                />
                            </AnimatePresence>
                        </div>

                        {/* Dot Navigation */}
                        <div className="flex justify-center gap-2 mt-6">
                            {workflowExamples.map((example, index) => (
                                <button
                                    key={example.id}
                                    onClick={() => goToSlide(index)}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                        index === currentSlide
                                            ? "bg-foreground w-6"
                                            : "bg-muted-foreground/40 hover:bg-muted-foreground/60"
                                    }`}
                                    aria-label={`Go to ${example.title}`}
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
