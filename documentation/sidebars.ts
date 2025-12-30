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
            label: "API Reference",
            items: [
                "api/introduction",
                "api/authentication",
                {
                    type: "category",
                    label: "Workflows",
                    items: [
                        "api/workflows/list",
                        "api/workflows/get",
                        "api/workflows/create",
                        "api/workflows/update",
                        "api/workflows/delete",
                        "api/workflows/execute"
                    ]
                },
                {
                    type: "category",
                    label: "Agents",
                    items: [
                        "api/agents/list",
                        "api/agents/get",
                        "api/agents/create",
                        "api/agents/chat"
                    ]
                }
            ]
        }
    ]
};

export default sidebars;
