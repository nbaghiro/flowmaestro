/**
 * Social X/Twitter Posting System Workflow
 *
 * Generates and posts content to X (Twitter) for FlowMaestro marketing.
 * This workflow:
 * 1. Takes content theme and campaign context
 * 2. Generates engaging tweet content
 * 3. Posts to X via API
 * 4. Logs the result
 */

import type { SystemWorkflowDefinition } from "../types";

export const socialXPostingWorkflow: SystemWorkflowDefinition = {
    key: "social-x-posting",
    name: "X/Twitter Auto-Poster",
    description: "Generates and posts engaging content to X (Twitter) for FlowMaestro marketing",

    definition: {
        name: "X/Twitter Auto-Poster",
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
                    description: "X post configuration",
                    schema: {
                        type: "object",
                        properties: {
                            theme: {
                                type: "string",
                                description:
                                    "Content theme (product tip, industry insight, engagement)"
                            },
                            campaign: {
                                type: "string",
                                description: "Campaign or initiative name"
                            },
                            includeHashtags: {
                                type: "boolean",
                                description: "Whether to include hashtags"
                            },
                            includeEmoji: {
                                type: "boolean",
                                description: "Whether to include emojis"
                            },
                            cta: {
                                type: "string",
                                description: "Call-to-action type (link, question, engagement)"
                            }
                        },
                        required: ["theme"]
                    }
                }
            },
            "llm-generate": {
                type: "llm",
                name: "Generate Tweet",
                position: { x: 480, y: 200 },
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a social media expert for FlowMaestro, a workflow automation platform. Create engaging, professional tweets that drive engagement and showcase product value. Keep tweets concise and impactful.",
                    prompt: `Create an engaging tweet for X (Twitter) for FlowMaestro:

Theme: {{postConfig.theme}}
Campaign: {{postConfig.campaign}}
Include Hashtags: {{postConfig.includeHashtags}}
Include Emojis: {{postConfig.includeEmoji}}
CTA Type: {{postConfig.cta}}

Requirements:
- Maximum 280 characters
- Be conversational and authentic
- Highlight workflow automation benefits
- Drive engagement or clicks
- If includeHashtags is true, include 2-3 relevant hashtags (e.g., #automation #nocode #productivity)
- If includeEmoji is true, include 1-2 relevant emojis

Return ONLY the tweet text, nothing else.`,
                    temperature: 0.8,
                    maxTokens: 512,
                    outputVariable: "tweetContent"
                }
            },
            "code-validate": {
                type: "code",
                name: "Validate Tweet",
                position: { x: 860, y: 200 },
                config: {
                    language: "javascript",
                    code: `// Validate and clean the tweet
const tweet = variables.tweetContent?.text || '';

// Ensure tweet is within character limit
let validatedTweet = tweet.trim();
if (validatedTweet.length > 280) {
    // Truncate intelligently at word boundary
    validatedTweet = validatedTweet.substring(0, 277).replace(/\\s+\\S*$/, '') + '...';
}

return {
    tweet: validatedTweet,
    characterCount: validatedTweet.length,
    isValid: validatedTweet.length > 0 && validatedTweet.length <= 280
};`,
                    outputVariable: "validatedTweet"
                }
            },
            "http-post": {
                type: "http",
                name: "Post to X API",
                position: { x: 1240, y: 200 },
                config: {
                    method: "POST",
                    url: "https://api.twitter.com/2/tweets",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer {{env.X_BEARER_TOKEN}}"
                    },
                    body: {
                        text: "{{validatedTweet.tweet}}"
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
                        tweet: "{{validatedTweet.tweet}}",
                        tweetId: "{{postResult.data.id}}",
                        characterCount: "{{validatedTweet.characterCount}}"
                    },
                    format: "json",
                    description: "The posted tweet result"
                }
            }
        },
        edges: [
            { id: "e1", source: "input-config", target: "llm-generate" },
            { id: "e2", source: "llm-generate", target: "code-validate" },
            { id: "e3", source: "code-validate", target: "http-post" },
            { id: "e4", source: "http-post", target: "output-result" }
        ],
        entryPoint: "input-config"
    },

    defaultTrigger: {
        type: "schedule",
        cronExpression: "0 10 * * *", // Every day at 10 AM
        timezone: "America/New_York"
    }
};
