import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
    docs: [
        {
            type: "category",
            label: "Get Started",
            items: ["intro", "quickstart", "key-concepts"],
            collapsed: false
        },
        {
            type: "category",
            label: "Core Concepts",
            items: [
                {
                    type: "category",
                    label: "Workflows",
                    items: [
                        "core-concepts/workflows/index",
                        "core-concepts/workflows/canvas",
                        "core-concepts/workflows/nodes",
                        "core-concepts/workflows/execution",
                        "core-concepts/workflows/variables"
                    ]
                },
                {
                    type: "category",
                    label: "Agents",
                    items: [
                        "core-concepts/agents/index",
                        "core-concepts/agents/building-agents",
                        "core-concepts/agents/threads",
                        "core-concepts/agents/memory"
                    ]
                },
                {
                    type: "category",
                    label: "Triggers",
                    items: [
                        "core-concepts/triggers/index",
                        "core-concepts/triggers/webhooks",
                        "core-concepts/triggers/schedules",
                        "core-concepts/triggers/events"
                    ]
                },
                {
                    type: "category",
                    label: "Integrations",
                    items: [
                        "core-concepts/integrations/index",
                        "core-concepts/integrations/oauth",
                        "core-concepts/integrations/available"
                    ]
                },
                {
                    type: "category",
                    label: "Knowledge Bases",
                    items: [
                        "core-concepts/knowledge-bases/index",
                        "core-concepts/knowledge-bases/documents",
                        "core-concepts/knowledge-bases/querying"
                    ]
                }
            ]
        },
        {
            type: "category",
            label: "Guides",
            items: [
                "guides/first-workflow",
                "guides/first-agent",
                "guides/connecting-integrations",
                "guides/using-ai-nodes"
            ]
        },
        {
            type: "category",
            label: "SDKs",
            items: ["sdks/javascript", "sdks/python", "sdks/widget"]
        },
        {
            type: "category",
            label: "API Reference",
            items: [
                "api/introduction",
                "api/authentication",
                {
                    type: "category",
                    label: "Workflows",
                    items: ["api/workflows/list", "api/workflows/get", "api/workflows/execute"]
                },
                {
                    type: "category",
                    label: "Executions",
                    items: [
                        "api/executions/list",
                        "api/executions/get",
                        "api/executions/cancel",
                        "api/executions/stream"
                    ]
                },
                {
                    type: "category",
                    label: "Agents",
                    items: ["api/agents/list", "api/agents/get", "api/agents/create-thread"]
                },
                {
                    type: "category",
                    label: "Threads",
                    items: [
                        "api/threads/get",
                        "api/threads/list-messages",
                        "api/threads/send-message",
                        "api/threads/delete"
                    ]
                },
                {
                    type: "category",
                    label: "Triggers",
                    items: ["api/triggers/list", "api/triggers/execute"]
                },
                {
                    type: "category",
                    label: "Knowledge Bases",
                    items: [
                        "api/knowledge-bases/list",
                        "api/knowledge-bases/get",
                        "api/knowledge-bases/query"
                    ]
                },
                {
                    type: "category",
                    label: "Webhooks",
                    items: [
                        "api/webhooks/overview",
                        "api/webhooks/list",
                        "api/webhooks/create",
                        "api/webhooks/delete",
                        "api/webhooks/test",
                        "api/webhooks/deliveries"
                    ]
                }
            ]
        }
    ]
};

export default sidebars;
