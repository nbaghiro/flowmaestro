/**
 * Seed Script for Persona Task Templates
 *
 * Populates the persona_task_templates table with pre-built task patterns
 * for each persona.
 *
 * Run with: npx tsx backend/scripts/seed-persona-templates.ts
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { Pool } from "pg";

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Template variable types (matches PersonaInputField)
interface TemplateVariable {
    name: string;
    label: string;
    type: "text" | "textarea" | "select" | "multiselect" | "tags" | "number" | "checkbox";
    required: boolean;
    placeholder?: string;
    default_value?: string | number | boolean | string[];
    options?: { value: string; label: string }[];
    help_text?: string;
}

// Template data structure
interface TemplateData {
    persona_slug: string;
    name: string;
    description: string;
    icon: string;
    task_template: string;
    variables: TemplateVariable[];
    suggested_duration_hours: number;
    suggested_max_cost: number;
    sort_order: number;
}

// =============================================================================
// TEMPLATE DEFINITIONS
// =============================================================================

const templates: TemplateData[] = [
    // =========================================================================
    // MARKET RESEARCHER TEMPLATES
    // =========================================================================
    {
        persona_slug: "market-researcher",
        name: "Competitor Analysis",
        description: "Compare specific competitors across key dimensions",
        icon: "📊",
        task_template: `Analyze and compare the following competitors: {{competitors}}.

Focus on these areas:
{{#each focus_areas}}- {{this}}
{{/each}}

Analysis depth: {{depth}}

{{#if additional_notes}}Additional requirements:
{{additional_notes}}{{/if}}

Produce a comprehensive report with:
- Executive summary with key findings
- Detailed analysis per competitor
- Feature/capability comparison matrix
- Pricing comparison (if applicable)
- Strengths and weaknesses analysis
- Strategic recommendations`,
        variables: [
            {
                name: "competitors",
                label: "Competitors to analyze",
                type: "text",
                required: true,
                placeholder: "e.g., Cursor, GitHub Copilot, Codeium",
                help_text: "List the competitors you want to compare"
            },
            {
                name: "focus_areas",
                label: "Focus areas",
                type: "multiselect",
                required: true,
                options: [
                    { value: "Pricing and plans", label: "Pricing and plans" },
                    { value: "Features and capabilities", label: "Features and capabilities" },
                    {
                        value: "Target market and positioning",
                        label: "Target market and positioning"
                    },
                    {
                        value: "Customer reviews and sentiment",
                        label: "Customer reviews and sentiment"
                    },
                    { value: "Technology and integrations", label: "Technology and integrations" },
                    { value: "Team and funding", label: "Team and funding" }
                ],
                default_value: ["Pricing and plans", "Features and capabilities"]
            },
            {
                name: "depth",
                label: "Analysis depth",
                type: "select",
                required: true,
                options: [
                    { value: "Quick overview (surface level)", label: "Quick overview" },
                    { value: "Standard analysis (balanced depth)", label: "Standard analysis" },
                    { value: "Deep dive (comprehensive)", label: "Deep dive" }
                ],
                default_value: "Standard analysis (balanced depth)"
            },
            {
                name: "additional_notes",
                label: "Additional requirements",
                type: "textarea",
                required: false,
                placeholder: "Any specific aspects to emphasize or questions to answer..."
            }
        ],
        suggested_duration_hours: 2,
        suggested_max_cost: 60,
        sort_order: 1
    },
    {
        persona_slug: "market-researcher",
        name: "Market Sizing Report",
        description: "Calculate TAM/SAM/SOM for a market or product category",
        icon: "📈",
        task_template: `Conduct a market sizing analysis for: {{market_description}}.

Geographic scope: {{geography}}
Time horizon: {{time_horizon}}

Please provide:
- Total Addressable Market (TAM) calculation with methodology
- Serviceable Addressable Market (SAM) based on realistic reach
- Serviceable Obtainable Market (SOM) with assumptions
- Market growth projections
- Key market drivers and trends
- Data sources and confidence levels

{{#if specific_segments}}Focus on these segments: {{specific_segments}}{{/if}}`,
        variables: [
            {
                name: "market_description",
                label: "Market or product category",
                type: "text",
                required: true,
                placeholder: "e.g., AI-powered code completion tools for enterprise"
            },
            {
                name: "geography",
                label: "Geographic scope",
                type: "select",
                required: true,
                options: [
                    { value: "Global", label: "Global" },
                    { value: "North America", label: "North America" },
                    { value: "Europe", label: "Europe" },
                    { value: "Asia Pacific", label: "Asia Pacific" },
                    { value: "United States only", label: "United States only" }
                ],
                default_value: "Global"
            },
            {
                name: "time_horizon",
                label: "Projection time horizon",
                type: "select",
                required: true,
                options: [
                    { value: "Current year", label: "Current year" },
                    { value: "3-year projection", label: "3-year projection" },
                    { value: "5-year projection", label: "5-year projection" }
                ],
                default_value: "5-year projection"
            },
            {
                name: "specific_segments",
                label: "Specific segments to focus on",
                type: "text",
                required: false,
                placeholder: "e.g., Enterprise, SMB, Developer tools"
            }
        ],
        suggested_duration_hours: 3,
        suggested_max_cost: 80,
        sort_order: 2
    },
    {
        persona_slug: "market-researcher",
        name: "Industry Trend Report",
        description: "Identify and analyze emerging trends in an industry",
        icon: "🔮",
        task_template: `Research emerging trends in the {{industry}} industry.

Trend categories to explore:
{{#each trend_categories}}- {{this}}
{{/each}}

Time frame focus: {{time_frame}}

Deliverables:
- Executive summary of top trends
- Detailed analysis of each major trend
- Impact assessment (who's affected, how)
- Timeline projections
- Recommended actions/responses
- Sources and further reading`,
        variables: [
            {
                name: "industry",
                label: "Industry or sector",
                type: "text",
                required: true,
                placeholder: "e.g., Developer Tools, B2B SaaS, FinTech"
            },
            {
                name: "trend_categories",
                label: "Trend categories",
                type: "multiselect",
                required: true,
                options: [
                    { value: "Technology trends", label: "Technology trends" },
                    { value: "Business model innovations", label: "Business model innovations" },
                    { value: "Regulatory changes", label: "Regulatory changes" },
                    { value: "Consumer behavior shifts", label: "Consumer behavior shifts" },
                    { value: "Competitive dynamics", label: "Competitive dynamics" },
                    { value: "Investment patterns", label: "Investment patterns" }
                ],
                default_value: ["Technology trends", "Business model innovations"]
            },
            {
                name: "time_frame",
                label: "Time frame focus",
                type: "select",
                required: true,
                options: [
                    { value: "Near-term (6-12 months)", label: "Near-term (6-12 months)" },
                    { value: "Medium-term (1-3 years)", label: "Medium-term (1-3 years)" },
                    { value: "Long-term (3-5 years)", label: "Long-term (3-5 years)" }
                ],
                default_value: "Medium-term (1-3 years)"
            }
        ],
        suggested_duration_hours: 2.5,
        suggested_max_cost: 70,
        sort_order: 3
    },

    // =========================================================================
    // CODE REVIEWER TEMPLATES
    // =========================================================================
    {
        persona_slug: "code-reviewer",
        name: "Pull Request Review",
        description: "Comprehensive review of a pull request or code changes",
        icon: "🔍",
        task_template: `Review the following code changes:

Repository/Context: {{repository}}
{{#if pr_link}}PR Link: {{pr_link}}{{/if}}

Code to review:
\`\`\`
{{code_changes}}
\`\`\`

Review focus:
{{#each review_focus}}- {{this}}
{{/each}}

Please provide:
- Overall assessment (approve/request changes/needs discussion)
- Line-by-line comments for issues found
- Suggestions for improvements
- Security considerations
- Performance implications
- Test coverage assessment`,
        variables: [
            {
                name: "repository",
                label: "Repository or project context",
                type: "text",
                required: true,
                placeholder: "e.g., frontend/components, API service"
            },
            {
                name: "pr_link",
                label: "PR link (optional)",
                type: "text",
                required: false,
                placeholder: "https://github.com/..."
            },
            {
                name: "code_changes",
                label: "Code to review",
                type: "textarea",
                required: true,
                placeholder: "Paste the code changes here..."
            },
            {
                name: "review_focus",
                label: "Review focus areas",
                type: "multiselect",
                required: true,
                options: [
                    {
                        value: "Code quality and readability",
                        label: "Code quality and readability"
                    },
                    { value: "Security vulnerabilities", label: "Security vulnerabilities" },
                    { value: "Performance implications", label: "Performance implications" },
                    { value: "Error handling", label: "Error handling" },
                    { value: "Test coverage", label: "Test coverage" },
                    { value: "Documentation", label: "Documentation" }
                ],
                default_value: [
                    "Code quality and readability",
                    "Security vulnerabilities",
                    "Error handling"
                ]
            }
        ],
        suggested_duration_hours: 1,
        suggested_max_cost: 30,
        sort_order: 1
    },
    {
        persona_slug: "code-reviewer",
        name: "Security Audit",
        description: "Security-focused code review for vulnerabilities",
        icon: "🔒",
        task_template: `Perform a security audit on the following code:

Context: {{context}}
Language/Framework: {{language}}

Code to audit:
\`\`\`
{{code}}
\`\`\`

Security concerns to check:
{{#each security_checks}}- {{this}}
{{/each}}

Provide:
- List of vulnerabilities found (severity: critical/high/medium/low)
- Detailed explanation of each issue
- Remediation recommendations
- Secure code examples
- OWASP classification where applicable`,
        variables: [
            {
                name: "context",
                label: "Application context",
                type: "text",
                required: true,
                placeholder: "e.g., User authentication API, Payment processing"
            },
            {
                name: "language",
                label: "Language/Framework",
                type: "text",
                required: true,
                placeholder: "e.g., TypeScript/Node.js, Python/Django"
            },
            {
                name: "code",
                label: "Code to audit",
                type: "textarea",
                required: true,
                placeholder: "Paste the code here..."
            },
            {
                name: "security_checks",
                label: "Security checks to perform",
                type: "multiselect",
                required: true,
                options: [
                    {
                        value: "Injection vulnerabilities (SQL, XSS, etc.)",
                        label: "Injection vulnerabilities"
                    },
                    { value: "Authentication/Authorization issues", label: "Auth issues" },
                    { value: "Sensitive data exposure", label: "Data exposure" },
                    { value: "Input validation", label: "Input validation" },
                    { value: "Cryptographic weaknesses", label: "Crypto weaknesses" },
                    { value: "Access control", label: "Access control" }
                ],
                default_value: [
                    "Injection vulnerabilities (SQL, XSS, etc.)",
                    "Authentication/Authorization issues",
                    "Input validation"
                ]
            }
        ],
        suggested_duration_hours: 1.5,
        suggested_max_cost: 45,
        sort_order: 2
    },

    // =========================================================================
    // TECHNICAL WRITER TEMPLATES
    // =========================================================================
    {
        persona_slug: "technical-writer",
        name: "API Documentation",
        description: "Generate comprehensive API documentation",
        icon: "📚",
        task_template: `Create API documentation for: {{api_name}}

Base URL: {{base_url}}
{{#if auth_type}}Authentication: {{auth_type}}{{/if}}

Endpoints to document:
{{endpoints}}

Documentation style: {{style}}

Include:
- Overview and getting started guide
- Authentication instructions
- Endpoint reference with request/response examples
- Error codes and handling
- Rate limiting information (if applicable)
- Code examples in {{code_languages}}`,
        variables: [
            {
                name: "api_name",
                label: "API name",
                type: "text",
                required: true,
                placeholder: "e.g., User Management API"
            },
            {
                name: "base_url",
                label: "Base URL",
                type: "text",
                required: true,
                placeholder: "e.g., https://api.example.com/v1"
            },
            {
                name: "auth_type",
                label: "Authentication type",
                type: "select",
                required: false,
                options: [
                    { value: "API Key", label: "API Key" },
                    { value: "OAuth 2.0", label: "OAuth 2.0" },
                    { value: "JWT", label: "JWT" },
                    { value: "Basic Auth", label: "Basic Auth" },
                    { value: "None", label: "None" }
                ]
            },
            {
                name: "endpoints",
                label: "Endpoints to document",
                type: "textarea",
                required: true,
                placeholder: "List endpoints, e.g.:\nGET /users\nPOST /users\nGET /users/:id"
            },
            {
                name: "style",
                label: "Documentation style",
                type: "select",
                required: true,
                options: [
                    { value: "OpenAPI/Swagger", label: "OpenAPI/Swagger" },
                    { value: "Markdown reference", label: "Markdown reference" },
                    { value: "Developer guide", label: "Developer guide" }
                ],
                default_value: "Markdown reference"
            },
            {
                name: "code_languages",
                label: "Code example languages",
                type: "multiselect",
                required: true,
                options: [
                    { value: "cURL", label: "cURL" },
                    { value: "JavaScript", label: "JavaScript" },
                    { value: "Python", label: "Python" },
                    { value: "Ruby", label: "Ruby" },
                    { value: "Go", label: "Go" }
                ],
                default_value: ["cURL", "JavaScript", "Python"]
            }
        ],
        suggested_duration_hours: 2,
        suggested_max_cost: 50,
        sort_order: 1
    },
    {
        persona_slug: "technical-writer",
        name: "README Generator",
        description: "Create a comprehensive README for a project",
        icon: "📝",
        task_template: `Create a README.md for: {{project_name}}

Project description: {{description}}

Technology stack: {{tech_stack}}

Sections to include:
{{#each sections}}- {{this}}
{{/each}}

Tone: {{tone}}

{{#if additional_info}}Additional information:
{{additional_info}}{{/if}}`,
        variables: [
            {
                name: "project_name",
                label: "Project name",
                type: "text",
                required: true,
                placeholder: "e.g., FlowMaestro"
            },
            {
                name: "description",
                label: "Project description",
                type: "textarea",
                required: true,
                placeholder: "Brief description of what the project does..."
            },
            {
                name: "tech_stack",
                label: "Technology stack",
                type: "text",
                required: true,
                placeholder: "e.g., React, Node.js, PostgreSQL"
            },
            {
                name: "sections",
                label: "Sections to include",
                type: "multiselect",
                required: true,
                options: [
                    { value: "Features", label: "Features" },
                    { value: "Installation", label: "Installation" },
                    { value: "Usage", label: "Usage" },
                    { value: "Configuration", label: "Configuration" },
                    { value: "API Reference", label: "API Reference" },
                    { value: "Contributing", label: "Contributing" },
                    { value: "License", label: "License" }
                ],
                default_value: ["Features", "Installation", "Usage", "Contributing", "License"]
            },
            {
                name: "tone",
                label: "Tone",
                type: "select",
                required: true,
                options: [
                    { value: "Professional", label: "Professional" },
                    { value: "Friendly/Casual", label: "Friendly/Casual" },
                    { value: "Technical/Concise", label: "Technical/Concise" }
                ],
                default_value: "Professional"
            },
            {
                name: "additional_info",
                label: "Additional information",
                type: "textarea",
                required: false,
                placeholder: "Any other details to include..."
            }
        ],
        suggested_duration_hours: 1,
        suggested_max_cost: 25,
        sort_order: 2
    },

    // =========================================================================
    // DATA ANALYST TEMPLATES
    // =========================================================================
    {
        persona_slug: "data-analyst",
        name: "Data Analysis Report",
        description: "Analyze a dataset and produce insights report",
        icon: "📊",
        task_template: `Analyze the following data:

Data description: {{data_description}}
{{#if data_source}}Data source: {{data_source}}{{/if}}

Analysis goals:
{{#each analysis_goals}}- {{this}}
{{/each}}

Output format: {{output_format}}

Please provide:
- Data summary and quality assessment
- Key findings and patterns
- Statistical analysis where relevant
- Visualizations recommendations
- Actionable insights
- Methodology notes`,
        variables: [
            {
                name: "data_description",
                label: "Data description",
                type: "textarea",
                required: true,
                placeholder: "Describe the dataset: what it contains, format, size, etc."
            },
            {
                name: "data_source",
                label: "Data source",
                type: "text",
                required: false,
                placeholder: "e.g., CSV file, database, API"
            },
            {
                name: "analysis_goals",
                label: "Analysis goals",
                type: "multiselect",
                required: true,
                options: [
                    {
                        value: "Identify trends and patterns",
                        label: "Identify trends and patterns"
                    },
                    { value: "Segment analysis", label: "Segment analysis" },
                    { value: "Anomaly detection", label: "Anomaly detection" },
                    { value: "Correlation analysis", label: "Correlation analysis" },
                    { value: "Predictive insights", label: "Predictive insights" },
                    { value: "Benchmarking", label: "Benchmarking" }
                ],
                default_value: ["Identify trends and patterns"]
            },
            {
                name: "output_format",
                label: "Output format",
                type: "select",
                required: true,
                options: [
                    { value: "Executive summary", label: "Executive summary" },
                    { value: "Detailed report", label: "Detailed report" },
                    { value: "Dashboard recommendations", label: "Dashboard recommendations" }
                ],
                default_value: "Detailed report"
            }
        ],
        suggested_duration_hours: 2,
        suggested_max_cost: 55,
        sort_order: 1
    },

    // =========================================================================
    // BLOG WRITER TEMPLATES
    // =========================================================================
    {
        persona_slug: "blog-author",
        name: "Blog Post",
        description: "Write an engaging blog post on a topic",
        icon: "✍️",
        task_template: `Write a blog post about: {{topic}}

Target audience: {{audience}}
Tone: {{tone}}
Approximate length: {{length}}

Key points to cover:
{{key_points}}

{{#if cta}}Call to action: {{cta}}{{/if}}
{{#if seo_keywords}}SEO keywords to include: {{seo_keywords}}{{/if}}

Include:
- Engaging headline options (3-5)
- Meta description
- Full blog post with subheadings
- Conclusion with takeaways`,
        variables: [
            {
                name: "topic",
                label: "Blog topic",
                type: "text",
                required: true,
                placeholder: "e.g., How to improve developer productivity with AI"
            },
            {
                name: "audience",
                label: "Target audience",
                type: "text",
                required: true,
                placeholder: "e.g., Software developers, Technical leaders"
            },
            {
                name: "tone",
                label: "Tone",
                type: "select",
                required: true,
                options: [
                    { value: "Professional/Authoritative", label: "Professional/Authoritative" },
                    { value: "Conversational/Friendly", label: "Conversational/Friendly" },
                    { value: "Educational/Informative", label: "Educational/Informative" },
                    { value: "Thought leadership", label: "Thought leadership" }
                ],
                default_value: "Conversational/Friendly"
            },
            {
                name: "length",
                label: "Approximate length",
                type: "select",
                required: true,
                options: [
                    { value: "Short (500-800 words)", label: "Short (500-800 words)" },
                    { value: "Medium (1000-1500 words)", label: "Medium (1000-1500 words)" },
                    { value: "Long (2000+ words)", label: "Long (2000+ words)" }
                ],
                default_value: "Medium (1000-1500 words)"
            },
            {
                name: "key_points",
                label: "Key points to cover",
                type: "textarea",
                required: true,
                placeholder: "List the main points you want the post to address..."
            },
            {
                name: "cta",
                label: "Call to action",
                type: "text",
                required: false,
                placeholder: "e.g., Sign up for newsletter, Try our product"
            },
            {
                name: "seo_keywords",
                label: "SEO keywords",
                type: "text",
                required: false,
                placeholder: "e.g., AI coding assistant, developer tools"
            }
        ],
        suggested_duration_hours: 1.5,
        suggested_max_cost: 40,
        sort_order: 1
    }
];

// =============================================================================
// SEEDING LOGIC
// =============================================================================

async function seedTemplates(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("DATABASE_URL environment variable is not set");
        process.exit(1);
    }

    const pool = new Pool({
        connectionString,
        max: 3
    });

    try {
        console.log("Starting persona task template seeding...\n");

        // First, get all persona IDs by slug
        const personaQuery = "SELECT id, slug FROM flowmaestro.persona_definitions";
        const personaResult = await pool.query(personaQuery);
        const personaMap = new Map<string, string>();

        for (const row of personaResult.rows) {
            personaMap.set(row.slug, row.id);
        }

        console.log(`Found ${personaMap.size} personas\n`);

        let seeded = 0;
        let skipped = 0;

        for (const template of templates) {
            const personaId = personaMap.get(template.persona_slug);

            if (!personaId) {
                console.log(
                    `  ⚠ Skipping "${template.name}" - persona "${template.persona_slug}" not found`
                );
                skipped++;
                continue;
            }

            // Upsert template
            const upsertQuery = `
                INSERT INTO flowmaestro.persona_task_templates (
                    persona_definition_id, name, description, icon,
                    task_template, variables,
                    suggested_duration_hours, suggested_max_cost,
                    sort_order, status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
                ON CONFLICT (persona_definition_id, name) DO UPDATE SET
                    description = EXCLUDED.description,
                    icon = EXCLUDED.icon,
                    task_template = EXCLUDED.task_template,
                    variables = EXCLUDED.variables,
                    suggested_duration_hours = EXCLUDED.suggested_duration_hours,
                    suggested_max_cost = EXCLUDED.suggested_max_cost,
                    sort_order = EXCLUDED.sort_order,
                    updated_at = NOW()
                RETURNING id
            `;

            const values = [
                personaId,
                template.name,
                template.description,
                template.icon,
                template.task_template,
                JSON.stringify(template.variables),
                template.suggested_duration_hours,
                template.suggested_max_cost,
                template.sort_order
            ];

            await pool.query(upsertQuery, values);
            console.log(`  ✓ ${template.persona_slug}: ${template.name}`);
            seeded++;
        }

        console.log(`\n✅ Seeding complete: ${seeded} templates seeded, ${skipped} skipped`);
    } catch (error) {
        console.error("Error seeding templates:", error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the seed
seedTemplates();
