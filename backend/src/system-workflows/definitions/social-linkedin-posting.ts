/**
 * Social LinkedIn Posting System Workflow
 *
 * Generates and posts professional content to LinkedIn for FlowMaestro marketing.
 * This workflow:
 * 1. Takes content theme and campaign context
 * 2. Generates professional LinkedIn post content
 * 3. Posts to LinkedIn via API
 * 4. Logs the result
 */

import type { SystemWorkflowDefinition } from "../types";

export const socialLinkedInPostingWorkflow: SystemWorkflowDefinition = {
    key: "social-linkedin-posting",
    name: "LinkedIn Auto-Poster",
    description: "Generates and posts professional content to LinkedIn for FlowMaestro marketing",

    definition: {
        name: "LinkedIn Auto-Poster",
        nodes: {
            "input-config": {
                type: "input",
                name: "Post Configuration",
                position: { x: 100, y: 200 },
                config: {
                    inputName: "postConfig",
                    inputVariable: "postConfig",
                    inputType: "json",
                    required: true,
                    description: "LinkedIn post configuration",
                    schema: {
                        type: "object",
                        properties: {
                            theme: {
                                type: "string",
                                description:
                                    "Content theme (thought leadership, product update, industry insight)"
                            },
                            campaign: {
                                type: "string",
                                description: "Campaign or initiative name"
                            },
                            tone: {
                                type: "string",
                                description:
                                    "Writing tone (professional, conversational, inspirational)"
                            },
                            includeStats: {
                                type: "boolean",
                                description: "Whether to include statistics or data points"
                            },
                            cta: {
                                type: "string",
                                description: "Call-to-action type (comment, share, visit)"
                            }
                        },
                        required: ["theme"]
                    }
                }
            },
            "llm-generate": {
                type: "llm",
                name: "Generate LinkedIn Post",
                position: { x: 480, y: 200 },
                config: {
                    provider: "anthropic",
                    model: "claude-sonnet-4-20250514",
                    systemPrompt:
                        "You are a professional content creator for FlowMaestro, a B2B workflow automation platform. Create engaging LinkedIn posts that demonstrate thought leadership, provide value to professionals, and subtly showcase the product's capabilities.",
                    prompt: `Create an engaging LinkedIn post for FlowMaestro:

Theme: {{postConfig.theme}}
Campaign: {{postConfig.campaign}}
Tone: {{postConfig.tone}}
Include Statistics: {{postConfig.includeStats}}
CTA Type: {{postConfig.cta}}

Requirements:
- 200-400 words optimal (LinkedIn favors longer content)
- Start with a compelling hook (first 2-3 lines are crucial)
- Use line breaks for readability
- Include a clear value proposition
- End with an engaging question or call-to-action
- Professional but personable tone
- Focus on workflow automation, productivity, or digital transformation benefits

Format:
- Use emojis sparingly (1-2 max)
- Include 3-5 relevant hashtags at the end
- Break into short paragraphs (2-3 sentences each)

Return ONLY the post text, nothing else.`,
                    temperature: 0.7,
                    maxTokens: 1024,
                    outputVariable: "postContent"
                }
            },
            "code-format": {
                type: "code",
                name: "Format Post",
                position: { x: 860, y: 200 },
                config: {
                    language: "javascript",
                    code: `// Format and validate the LinkedIn post
const post = variables.postContent?.text || '';

// LinkedIn has a 3000 character limit
let formattedPost = post.trim();
if (formattedPost.length > 3000) {
    // Truncate at paragraph boundary
    formattedPost = formattedPost.substring(0, 2997);
    const lastParagraph = formattedPost.lastIndexOf('\\n\\n');
    if (lastParagraph > 2000) {
        formattedPost = formattedPost.substring(0, lastParagraph);
    }
    formattedPost += '...';
}

// Count paragraphs and words for analytics
const paragraphs = formattedPost.split(/\\n\\n+/).length;
const wordCount = formattedPost.split(/\\s+/).length;
const hasHashtags = formattedPost.includes('#');

return {
    post: formattedPost,
    characterCount: formattedPost.length,
    wordCount: wordCount,
    paragraphs: paragraphs,
    hasHashtags: hasHashtags,
    isValid: formattedPost.length > 0 && formattedPost.length <= 3000
};`,
                    outputVariable: "formattedPost"
                }
            },
            "http-post": {
                type: "http",
                name: "Post to LinkedIn API",
                position: { x: 1240, y: 200 },
                config: {
                    method: "POST",
                    url: "https://api.linkedin.com/v2/ugcPosts",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer {{env.LINKEDIN_ACCESS_TOKEN}}",
                        "X-Restli-Protocol-Version": "2.0.0"
                    },
                    body: {
                        author: "urn:li:organization:{{env.LINKEDIN_ORG_ID}}",
                        lifecycleState: "PUBLISHED",
                        specificContent: {
                            "com.linkedin.ugc.ShareContent": {
                                shareCommentary: {
                                    text: "{{formattedPost.post}}"
                                },
                                shareMediaCategory: "NONE"
                            }
                        },
                        visibility: {
                            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                        }
                    },
                    outputVariable: "postResult"
                }
            },
            "output-result": {
                type: "output",
                name: "Result",
                position: { x: 1620, y: 200 },
                config: {
                    outputName: "result",
                    value: {
                        success: true,
                        postId: "{{postResult.id}}",
                        characterCount: "{{formattedPost.characterCount}}",
                        wordCount: "{{formattedPost.wordCount}}"
                    },
                    format: "json",
                    description: "The posted LinkedIn content result"
                }
            }
        },
        edges: [
            { id: "e1", source: "input-config", target: "llm-generate" },
            { id: "e2", source: "llm-generate", target: "code-format" },
            { id: "e3", source: "code-format", target: "http-post" },
            { id: "e4", source: "http-post", target: "output-result" }
        ],
        entryPoint: "input-config"
    },

    defaultTrigger: {
        type: "schedule",
        cronExpression: "0 9 * * 2,4", // Tuesday and Thursday at 9 AM
        timezone: "America/New_York"
    }
};
