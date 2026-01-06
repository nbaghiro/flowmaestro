import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
    title: "FlowMaestro",
    tagline: "Build AI automations without code",
    favicon: "img/favicon.svg",

    url: "https://docs.flowmaestro.ai",
    baseUrl: "/",

    organizationName: "flowmaestro",
    projectName: "flowmaestro-documentation",

    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "warn",

    i18n: {
        defaultLocale: "en",
        locales: ["en"]
    },

    presets: [
        [
            "classic",
            {
                docs: {
                    routeBasePath: "/",
                    sidebarPath: "./sidebars.ts",
                    editUrl: "https://github.com/flowmaestro/flowmaestro/tree/main/documentation/",
                    showLastUpdateTime: true
                },
                blog: false,
                theme: {
                    customCss: "./src/css/custom.css"
                }
            } satisfies Preset.Options
        ]
    ],

    themeConfig: {
        image: "img/social-card.png",
        docs: {
            sidebar: {
                hideable: true,
                autoCollapseCategories: true
            }
        },
        navbar: {
            title: "FlowMaestro",
            logo: {
                alt: "FlowMaestro Logo",
                src: "img/logo.svg"
            },
            items: [
                {
                    href: "https://github.com/nbaghiro/flow-maestro",
                    position: "right",
                    className: "header-github-link",
                    "aria-label": "GitHub repository"
                }
            ]
        },
        footer: {
            style: "dark",
            links: [
                {
                    title: "Docs",
                    items: [
                        {
                            label: "Getting Started",
                            to: "/"
                        },
                        {
                            label: "Workflows",
                            to: "/core-concepts/workflows"
                        },
                        {
                            label: "Agents",
                            to: "/core-concepts/agents"
                        }
                    ]
                },
                {
                    title: "Community",
                    items: [
                        {
                            label: "Discord",
                            href: "https://discord.gg/flowmaestro"
                        },
                        {
                            label: "Twitter",
                            href: "https://twitter.com/flowmaestroai"
                        }
                    ]
                },
                {
                    title: "More",
                    items: [
                        {
                            label: "GitHub",
                            href: "https://github.com/flowmaestro/flowmaestro"
                        },
                        {
                            label: "flowmaestro.ai",
                            href: "https://flowmaestro.ai"
                        }
                    ]
                }
            ],
            copyright: `Copyright © ${new Date().getFullYear()} FlowMaestro. All rights reserved.`
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.vsDark,
            additionalLanguages: ["bash", "json", "yaml", "typescript", "javascript"]
        },
        colorMode: {
            defaultMode: "dark",
            disableSwitch: false,
            respectPrefersColorScheme: true
        },
        tableOfContents: {
            minHeadingLevel: 2,
            maxHeadingLevel: 4
        }
    } satisfies Preset.ThemeConfig
};

export default config;
