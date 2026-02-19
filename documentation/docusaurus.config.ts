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
                    showLastUpdateTime: true,
                    breadcrumbs: true
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
                    type: "doc",
                    docId: "intro",
                    position: "left",
                    label: "Documentation"
                },
                {
                    type: "doc",
                    docId: "api/introduction",
                    position: "left",
                    label: "API Reference"
                },
                {
                    href: "https://flowmaestro.ai/community",
                    label: "Community",
                    position: "right"
                },
                {
                    href: "https://status.flowmaestro.ai",
                    label: "Status",
                    position: "right"
                },
                {
                    href: "https://flowmaestro.ai/support",
                    label: "Get Support",
                    position: "right"
                },
                {
                    href: "https://app.flowmaestro.ai",
                    label: "Get Started",
                    position: "right",
                    className: "navbar__link--get-started"
                },
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
            logo: {
                alt: "FlowMaestro",
                src: "img/logo.svg",
                href: "https://flowmaestro.ai",
                width: 32,
                height: 32
            },
            links: [
                {
                    title: "Product",
                    items: [
                        {
                            label: "Features",
                            href: "https://flowmaestro.ai/features"
                        },
                        {
                            label: "Integrations",
                            href: "https://flowmaestro.ai/integrations"
                        },
                        {
                            label: "Pricing",
                            href: "https://flowmaestro.ai/pricing"
                        },
                        {
                            label: "Documentation",
                            to: "/"
                        }
                    ]
                },
                {
                    title: "Company",
                    items: [
                        {
                            label: "About",
                            href: "https://flowmaestro.ai/about"
                        },
                        {
                            label: "Blog",
                            href: "https://flowmaestro.ai/blog"
                        },
                        {
                            label: "Careers",
                            href: "https://flowmaestro.ai/careers"
                        },
                        {
                            label: "Contact",
                            href: "https://flowmaestro.ai/contact"
                        }
                    ]
                }
            ],
            copyright: `© ${new Date().getFullYear()} FlowMaestro. All rights reserved.`
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.vsDark,
            additionalLanguages: ["bash", "json", "yaml", "typescript", "javascript", "python"]
        },
        colorMode: {
            defaultMode: "dark",
            disableSwitch: true,
            respectPrefersColorScheme: false
        },
        tableOfContents: {
            minHeadingLevel: 2,
            maxHeadingLevel: 4
        }
    } satisfies Preset.ThemeConfig
};

export default config;
