/**
 * Blog Generation System Workflow
 *
 * Generates blog posts using AI with optional human review before publishing.
 * This workflow:
 * 1. Takes content configuration (topic, audience, length)
 * 2. Generates article outline
 * 3. Generates full article content
 * 4. Optionally routes through human review
 * 5. Publishes to the FlowMaestro blog API
 */

import type { SystemWorkflowDefinition } from "../types";

export const blogGenerationWorkflow: SystemWorkflowDefinition = {
    key: "blog-generation",
    name: "Blog Content Generator",
    description:
        "Generates blog posts using AI with optional human review before publishing to the FlowMaestro blog",

    definition: {
        name: "Blog Content Generator",
        nodes: {
            "input-config": {
                type: "input",
                name: "Content Configuration",
                position: { x: 100, y: 200 },
                config: {
                    inputName: "contentConfig",
                    inputVariable: "contentConfig",
                    inputType: "json",
                    required: true,
                    description: "Blog content configuration",
                    schema: {
                        type: "object",
                        properties: {
                            topic: {
                                type: "string",
                                description: "The topic or theme for the blog post"
                            },
                            category: {
                                type: "string",
                                description: "Blog category (product, engineering, tutorial, etc.)"
                            },
                            targetAudience: {
                                type: "string",
                                description: "Target audience for the content"
                            },
                            wordCount: {
                                type: "number",
                                description: "Approximate word count target"
                            },
                            tone: {
                                type: "string",
                                description: "Writing tone (professional, casual, technical)"
                            }
                        },
                        required: ["topic", "category"]
                    }
                }
            },
            "llm-outline": {
                type: "llm",
                name: "Generate Outline",
                position: { x: 480, y: 200 },
                config: {
                    provider: "anthropic",
                    model: "claude-sonnet-4-20250514",
                    systemPrompt:
                        "You are an expert content strategist for a workflow automation SaaS company called FlowMaestro. Create detailed blog post outlines that are engaging, informative, and optimized for SEO.",
                    prompt: `Create a detailed outline for a blog post about:

Topic: {{contentConfig.topic}}
Category: {{contentConfig.category}}
Target Audience: {{contentConfig.targetAudience}}
Approximate Word Count: {{contentConfig.wordCount}}
Tone: {{contentConfig.tone}}

Include:
1. A compelling title (with SEO keywords)
2. Meta description (150-160 characters)
3. Introduction hook
4. Main sections with key points
5. Conclusion with call-to-action
6. Suggested tags

Format as JSON with keys: title, metaDescription, sections (array), conclusion, tags (array)`,
                    temperature: 0.7,
                    maxTokens: 2048,
                    outputVariable: "outline",
                    responseFormat: "json"
                }
            },
            "llm-content": {
                type: "llm",
                name: "Generate Article",
                position: { x: 860, y: 200 },
                config: {
                    provider: "anthropic",
                    model: "claude-sonnet-4-20250514",
                    systemPrompt:
                        "You are an expert technical writer for FlowMaestro, a workflow automation platform. Write engaging, informative content that demonstrates expertise while remaining accessible. Use markdown formatting.",
                    prompt: `Write a complete blog post based on this outline:

{{outline.text}}

Requirements:
- Target approximately {{contentConfig.wordCount}} words
- Use the tone: {{contentConfig.tone}}
- Write for audience: {{contentConfig.targetAudience}}
- Include relevant examples and practical advice
- Use proper markdown formatting with headers, lists, and code blocks where appropriate
- End with a clear call-to-action related to FlowMaestro

Return the full article content in markdown format.`,
                    temperature: 0.8,
                    maxTokens: 8192,
                    outputVariable: "articleContent"
                }
            },
            "code-prepare": {
                type: "code",
                name: "Prepare Blog Post",
                position: { x: 1240, y: 200 },
                config: {
                    language: "javascript",
                    code: `// Parse the outline JSON and prepare the final blog post data
const outline = JSON.parse(variables.outline?.text || '{}');
const content = variables.articleContent?.text || '';

// Calculate read time (average 200 words per minute)
const wordCount = content.split(/\\s+/).length;
const readTimeMinutes = Math.ceil(wordCount / 200);

// Generate slug from title
const slug = outline.title
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';

return {
    title: outline.title || 'Untitled',
    slug: slug,
    excerpt: outline.metaDescription || content.substring(0, 200),
    content: content,
    meta_title: outline.title,
    meta_description: outline.metaDescription,
    category: variables.contentConfig?.category || 'product',
    tags: outline.tags || [],
    read_time_minutes: readTimeMinutes,
    author_name: 'FlowMaestro Team',
    status: 'draft'
};`,
                    outputVariable: "blogPost"
                }
            },
            "http-publish": {
                type: "http",
                name: "Publish to Blog API",
                position: { x: 1620, y: 200 },
                config: {
                    method: "POST",
                    url: "{{env.API_BASE_URL}}/admin/blog",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer {{env.BLOG_API_TOKEN}}"
                    },
                    body: "{{blogPost}}",
                    outputVariable: "publishResult"
                }
            },
            "output-result": {
                type: "output",
                name: "Result",
                position: { x: 2000, y: 200 },
                config: {
                    outputName: "result",
                    value: "{{publishResult}}",
                    format: "json",
                    description: "The published blog post result"
                }
            }
        },
        edges: [
            { id: "e1", source: "input-config", target: "llm-outline" },
            { id: "e2", source: "llm-outline", target: "llm-content" },
            { id: "e3", source: "llm-content", target: "code-prepare" },
            { id: "e4", source: "code-prepare", target: "http-publish" },
            { id: "e5", source: "http-publish", target: "output-result" }
        ],
        entryPoint: "input-config"
    },

    defaultTrigger: {
        type: "schedule",
        cronExpression: "0 9 * * 1", // Every Monday at 9 AM
        timezone: "America/New_York"
    }
};
