/**
 * Predefined example workflow prompts for FlowMaestro
 * These are shown in the AI Generate dialog to inspire users
 * All examples emphasize AI/LLM capabilities
 */

export const EXAMPLE_WORKFLOW_PROMPTS = [
    // Content Analysis & Classification
    "Analyze customer feedback and classify sentiment as positive, negative, or neutral with reasoning",
    "Read support tickets and use AI to categorize urgency, route to correct team, and suggest responses",
    "Process incoming emails and use AI to extract action items, deadlines, and priority levels",
    "Analyze product reviews and extract key themes, pain points, and feature requests with AI",
    "Monitor social media mentions and use AI to detect brand sentiment and potential PR issues",
    "Classify documents by topic and extract key information using AI document understanding",
    "Analyze sales call transcripts and extract objections, pain points, and next steps with AI",
    "Review code pull requests and use AI to suggest improvements and identify potential bugs",
    "Analyze user behavior data and use AI to predict churn risk and recommend retention actions",
    "Process legal contracts and use AI to extract key terms, obligations, and risks",

    // Content Generation & Creation
    "Generate personalized marketing emails for each customer segment using AI with their preferences",
    "Create blog posts from topic outlines with AI, including SEO optimization and engaging headlines",
    "Generate product descriptions from specifications using AI, optimized for different platforms",
    "Use AI to create social media content calendar with posts tailored to each platform",
    "Generate meeting agendas from context and past discussions using AI",
    "Create personalized onboarding sequences for new users with AI-generated content",
    "Generate FAQ answers from documentation using AI and publish to knowledge base",
    "Use AI to create A/B test variations for landing page copy and CTAs",
    "Generate weekly newsletter content by summarizing top articles with AI insights",
    "Create technical documentation from code comments using AI",

    // Image & Visual AI
    "Generate images from text descriptions using DALL-E and post to social media",
    "Analyze uploaded images with AI to generate alt text and accessibility descriptions",
    "Use AI vision to moderate user-uploaded content for policy violations",
    "Generate product mockups from descriptions using AI image generation",
    "Analyze competitor marketing images and use AI to suggest design improvements",
    "Create branded social media graphics from templates using AI image editing",
    "Use AI to analyze document scans, extract text, and categorize by type",
    "Generate thumbnail images for video content using AI scene analysis",
    "Analyze screenshots of UI and use AI to suggest UX improvements",
    "Create personalized visual content for each user segment with AI generation",

    // Data Processing & Enrichment with AI
    "Process CSV data and use AI to enrich each row with descriptions, categories, and insights",
    "Analyze financial transactions and use AI to categorize, detect anomalies, and flag risks",
    "Use AI to clean and normalize messy data from multiple sources",
    "Extract structured data from unstructured documents using AI",
    "Analyze spreadsheet data and use AI to generate insights and recommendations",
    "Use AI to match and deduplicate records across different databases",
    "Parse receipts with AI vision and extract items, prices, and categories",
    "Analyze time series data and use AI to predict trends and anomalies",
    "Use AI to generate summaries and key metrics from large datasets",
    "Extract entities and relationships from text documents with AI NLP",

    // Conversational AI & Support
    "Build AI chatbot that answers customer questions using knowledge base with context awareness",
    "Create AI support agent that triages issues, gathers context, and escalates when needed",
    "Use AI to generate personalized responses to customer inquiries based on history",
    "Build interactive AI assistant for internal team questions with company knowledge",
    "Create AI agent that follows up with customers and adapts based on responses",
    "Use AI to analyze support conversations and suggest knowledge base improvements",
    "Create AI moderator for community forums that detects toxic content",
    "Use AI to generate contextual help suggestions based on user actions",
    "Build AI tutor that explains complex topics in simple terms",

    // Research & Summarization
    "Fetch latest news and use AI to summarize key points relevant to business",
    "Monitor competitor websites and use AI to extract and analyze their strategies",
    "Aggregate research papers and use AI to generate literature review summaries",
    "Collect customer interviews and use AI to synthesize common themes and insights",
    "Monitor industry trends and use AI to generate weekly briefings for executives",
    "Analyze meeting recordings and use AI to generate action item summaries",
    "Fetch market data and use AI to generate investment insights and recommendations",
    "Monitor regulatory changes and use AI to assess impact on business",
    "Aggregate user feedback from multiple channels and use AI to generate product insights",
    "Collect bug reports and use AI to identify patterns and suggest root causes",

    // Translation & Localization
    "Translate marketing content into multiple languages using AI with cultural adaptation",
    "Localize product descriptions for different markets with AI considering regional preferences",
    "Translate customer support conversations in real-time using AI",
    "Use AI to adapt content tone and style for different audiences and regions",
    "Translate technical documentation while preserving technical accuracy with AI",
    "Generate multilingual social media posts with AI considering cultural nuances",
    "Use AI to translate and localize app UI strings for global markets",
    "Translate legal documents while maintaining precise terminology with AI assistance",
    "Use AI to generate region-specific marketing campaigns from base content",
    "Translate customer reviews and use AI to extract common themes across languages",

    // Code & Technical AI
    "Analyze error logs and use AI to suggest root causes and fixes",
    "Generate API documentation from code using AI",
    "Use AI to review code changes and suggest optimizations and best practices",
    "Generate test cases from requirements using AI",
    "Analyze system performance data and use AI to recommend optimizations",
    "Use AI to convert legacy code to modern frameworks with explanations",
    "Generate technical specifications from business requirements using AI",
    "Use AI to debug complex issues by analyzing stack traces and logs",
    "Generate database queries from natural language using AI",
    "Use AI to suggest security improvements in code",

    // Sales & Lead Intelligence
    "Analyze lead data and use AI to score prospects and predict conversion likelihood",
    "Generate personalized sales outreach based on prospect research using AI",
    "Use AI to analyze sales calls and suggest improvements to pitch and objection handling",
    "Monitor buyer signals and use AI to recommend optimal contact timing",
    "Analyze lost deals and use AI to identify patterns and improvement opportunities",
    "Generate competitive intelligence reports using AI from public data",
    "Use AI to personalize product demos based on prospect's industry and pain points",
    "Analyze contract negotiations and use AI to suggest optimal terms",
    "Generate sales forecasts using AI analysis of pipeline and historical data",
    "Use AI to identify cross-sell and upsell opportunities from usage patterns",

    // Marketing Intelligence
    "Analyze campaign performance and use AI to optimize ad spend and targeting",
    "Generate A/B test hypotheses using AI analysis of user behavior",
    "Use AI to predict customer lifetime value and optimize acquisition costs",
    "Analyze competitor marketing and use AI to suggest differentiation strategies",
    "Generate content recommendations based on trending topics using AI",
    "Use AI to optimize email send times and subject lines for each segment",
    "Analyze website traffic and use AI to recommend conversion rate improvements",
    "Generate personas from customer data using AI clustering and analysis",
    "Use AI to predict which leads will engage with specific content types",
    "Analyze attribution data and use AI to optimize marketing channel mix",

    // HR & Recruiting with AI
    "Screen resumes using AI to match skills with job requirements and rank candidates",
    "Generate interview questions tailored to candidate background using AI",
    "Analyze interview recordings and use AI to extract key insights and concerns",
    "Use AI to generate personalized onboarding plans based on role and background",
    "Analyze employee feedback and use AI to identify satisfaction trends and risks",
    "Generate job descriptions optimized for different platforms using AI",
    "Use AI to match employees with mentors based on skills and goals",
    "Analyze performance reviews and use AI to identify development opportunities",
    "Generate training content recommendations using AI based on skill gaps",
    "Use AI to predict employee retention risk and suggest interventions"
];

/**
 * Get a random selection of example prompts
 * @param count Number of prompts to return (default: 4)
 * @returns Array of random example prompts
 */
export function getRandomExamplePrompts(count: number = 4): string[] {
    const shuffled = [...EXAMPLE_WORKFLOW_PROMPTS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}
