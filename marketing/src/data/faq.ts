export interface FAQItem {
    question: string;
    answer: string;
}

export interface FAQCategory {
    id: string;
    name: string;
    items: FAQItem[];
}

export const faqCategories: FAQCategory[] = [
    {
        id: "getting-started",
        name: "Getting Started",
        items: [
            {
                question: "What is FlowMaestro?",
                answer: "FlowMaestro is an enterprise workflow automation platform that allows you to build, deploy, and manage automated workflows without writing code. It combines visual workflow design with AI-powered agents to handle complex business processes."
            },
            {
                question: "How do I create my first workflow?",
                answer: "After signing up, navigate to the Workflows section and click 'Create Workflow'. You'll be guided through a visual editor where you can drag and drop nodes to define your workflow logic. Start with a trigger (like a webhook or schedule), add your processing steps, and connect them together."
            },
            {
                question: "Do I need coding experience to use FlowMaestro?",
                answer: "No coding experience is required for most workflows. Our visual editor and pre-built integrations let you automate processes with drag-and-drop. For advanced use cases, you can optionally add custom code nodes using JavaScript or Python."
            },
            {
                question: "What's the difference between workflows and AI agents?",
                answer: "Workflows are deterministic sequences of steps that execute in a defined order. AI agents are intelligent automations that can make decisions, handle ambiguous inputs, and adapt their behavior based on context. You can use both together for powerful automation."
            },
            {
                question: "Is there a free trial available?",
                answer: "Yes, we offer a 14-day free trial of our Pro plan with full access to all features. No credit card required to start. You can also use our Free tier indefinitely with some limitations on workflow runs."
            }
        ]
    },
    {
        id: "workflows",
        name: "Workflows & Automation",
        items: [
            {
                question: "What types of triggers are available?",
                answer: "FlowMaestro supports multiple trigger types including: Webhooks (receive data from external services), Schedules (run at specific times or intervals), Email triggers, Form submissions, and API calls. Enterprise plans also support database triggers and file system watchers."
            },
            {
                question: "Can workflows run in parallel?",
                answer: "Yes, workflows can execute steps in parallel using our parallel branch nodes. You can also run multiple instances of a workflow concurrently, each handling different data. Our platform handles the orchestration automatically."
            },
            {
                question: "What happens if a workflow step fails?",
                answer: "FlowMaestro provides robust error handling. You can configure retry policies (automatic retries with backoff), fallback paths (alternative routes when errors occur), and error notifications. Our durable execution engine ensures workflows can resume from where they left off."
            },
            {
                question: "How do I pass data between workflow steps?",
                answer: "Data flows automatically between connected steps. Each step outputs data that subsequent steps can reference using our expression syntax. You can also use transform nodes to reshape data and variable nodes to store intermediate results."
            },
            {
                question: "Can I test workflows before deploying them?",
                answer: "Yes, we provide multiple testing options. You can run workflows in test mode with sample data, debug step-by-step through the visual editor, and use our sandbox environment to validate integrations without affecting production systems."
            },
            {
                question: "What's the maximum workflow execution time?",
                answer: "Workflows can run for extended periods—we support executions lasting hours, days, or even longer for processes that include human review steps or wait conditions. Our durable execution engine (powered by Temporal) maintains workflow state reliably."
            }
        ]
    },
    {
        id: "integrations",
        name: "Integrations",
        items: [
            {
                question: "Which applications can FlowMaestro integrate with?",
                answer: "We support 100+ pre-built integrations including Salesforce, HubSpot, Slack, Microsoft 365, Google Workspace, Jira, GitHub, Shopify, Stripe, and many more. You can also connect to any service with a REST API using our HTTP node."
            },
            {
                question: "How do I authenticate with third-party services?",
                answer: "Most integrations use OAuth for secure authentication—simply click 'Connect' and authorize FlowMaestro in the service's login page. For services using API keys, you can securely store credentials in our encrypted credential vault."
            },
            {
                question: "Can I create custom integrations?",
                answer: "Yes, you can create custom integrations using our HTTP node for REST APIs or our Code node for more complex logic. Enterprise customers can also request custom integration development or use our SDK to build reusable integration packages."
            },
            {
                question: "Are my API credentials secure?",
                answer: "All credentials are encrypted at rest using AES-256 and never exposed in workflow definitions or logs. Access is controlled through your workspace's permission settings, and we support credential rotation and expiration policies."
            },
            {
                question: "Can I use webhooks to receive data from other apps?",
                answer: "Yes, each workflow can have a unique webhook URL that accepts incoming data. We support both GET and POST requests with various content types (JSON, form data, raw). You can also validate incoming webhooks using signatures."
            }
        ]
    },
    {
        id: "ai-agents",
        name: "AI Agents",
        items: [
            {
                question: "What are AI agents in FlowMaestro?",
                answer: "AI agents are intelligent automation units that can understand context, make decisions, and perform tasks autonomously. Unlike traditional workflows with fixed logic, agents can handle varied inputs and adapt their approach based on the situation."
            },
            {
                question: "Which AI models are supported?",
                answer: "FlowMaestro supports multiple AI providers including OpenAI (GPT-4, GPT-3.5), Anthropic (Claude), Google (Gemini), and open-source models. You can configure which model to use per agent or let the system select based on task requirements."
            },
            {
                question: "How do I train an agent for my use case?",
                answer: "Agents are configured through natural language instructions and examples rather than traditional training. You provide context about your business, describe the agent's role, and give examples of desired behavior. The agent learns from these instructions immediately."
            },
            {
                question: "Can agents access external tools and data?",
                answer: "Yes, agents can be equipped with tools like web search, database queries, API calls, and document reading. You define which tools an agent can use, and it will automatically invoke them when needed to complete tasks."
            },
            {
                question: "Are there usage limits for AI features?",
                answer: "AI usage is included in your plan with monthly limits based on your tier. Free plans include limited AI operations, while Pro and Enterprise plans offer generous allocations. You can also bring your own API keys for unlimited usage."
            }
        ]
    },
    {
        id: "billing",
        name: "Billing & Plans",
        items: [
            {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards (Visa, Mastercard, American Express) and can arrange invoice billing for Enterprise customers. Payments are processed securely through Stripe."
            },
            {
                question: "Can I upgrade or downgrade my plan?",
                answer: "Yes, you can change your plan at any time from your account settings. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your current billing period."
            },
            {
                question: "What happens if I exceed my plan limits?",
                answer: "We'll notify you as you approach your limits. If you exceed them, workflows may be paused until the next billing period or you upgrade. Enterprise customers can configure automatic overage billing instead of hard limits."
            },
            {
                question: "Do you offer discounts for annual billing?",
                answer: "Yes, we offer a 20% discount when you pay annually instead of monthly. Annual plans are billed upfront for the full year."
            },
            {
                question: "Is there a refund policy?",
                answer: "We offer a 30-day money-back guarantee for new subscriptions. If you're not satisfied within the first 30 days, contact support for a full refund. After 30 days, refunds are provided on a prorated basis."
            },
            {
                question: "Do you offer startup or nonprofit discounts?",
                answer: "Yes, we offer special pricing for qualified startups and registered nonprofits. Contact our sales team with documentation to apply for discounted rates."
            }
        ]
    },
    {
        id: "account-security",
        name: "Account & Security",
        items: [
            {
                question: "How do I enable two-factor authentication (2FA)?",
                answer: "Go to Settings > Security in your account dashboard and click 'Enable 2FA'. You can use an authenticator app (recommended), SMS, or hardware security keys. We strongly recommend enabling 2FA for all accounts."
            },
            {
                question: "Can I use single sign-on (SSO)?",
                answer: "SSO is available on Pro and Enterprise plans. We support SAML 2.0 and OIDC protocols, compatible with providers like Okta, Azure AD, Google Workspace, and OneLogin. Contact support to configure SSO for your organization."
            },
            {
                question: "How do I manage team members and permissions?",
                answer: "Workspace owners and admins can invite team members from Settings > Team. You can assign roles (Viewer, Editor, Admin) and create custom roles with specific permissions. Changes take effect immediately."
            },
            {
                question: "What data does FlowMaestro store?",
                answer: "We store your workflow definitions, execution history, and credentials (encrypted). Workflow execution data is retained based on your plan (7 days for Free, 30 days for Pro, custom for Enterprise). You can export your data at any time."
            },
            {
                question: "How can I delete my account?",
                answer: "To delete your account, go to Settings > Account > Delete Account. This will permanently remove all your data including workflows, execution history, and credentials. This action cannot be undone."
            },
            {
                question: "Is FlowMaestro compliant with GDPR?",
                answer: "Yes, FlowMaestro is GDPR compliant. We provide data processing agreements (DPA) for customers, support data subject requests, and follow privacy by design principles. See our Privacy Policy for details."
            }
        ]
    }
];
