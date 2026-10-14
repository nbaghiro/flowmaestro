import React from "react";
import { Link } from "react-router-dom";
import { EngagementEvents, NavigationEvents } from "../lib/analytics";
import { BOOK_DEMO_URL } from "../lib/links";
import { PixelMark } from "./brand/PixelMark";

interface FooterLink {
    label: string;
    href: string;
}

interface FooterColumn {
    title: string;
    category: string;
    links: FooterLink[];
}

// Every footer link stays on this site; the demo booking is the one outside destination.
const COLUMNS: FooterColumn[] = [
    {
        title: "PRODUCT",
        category: "product",
        links: [
            { label: "Workflows", href: "/#product" },
            { label: "Agents", href: "/#product" },
            { label: "Personas", href: "/#product" },
            { label: "Integrations", href: "/integrations" },
            { label: "Templates", href: "/templates" },
            { label: "Pricing", href: "/pricing" }
        ]
    },
    {
        title: "SOLUTIONS",
        category: "solutions",
        links: [
            { label: "Sales", href: "/solutions/sales" },
            { label: "Marketing", href: "/solutions/marketing" },
            { label: "Support", href: "/solutions/support" },
            { label: "Engineering", href: "/solutions/engineering" },
            { label: "Operations", href: "/solutions/operations" }
        ]
    },
    {
        title: "RESOURCES",
        category: "resources",
        links: [
            { label: "Help center", href: "/help" },
            { label: "Changelog", href: "/changelog" },
            { label: "Security", href: "/security" }
        ]
    },
    {
        title: "LEGAL",
        category: "legal",
        links: [
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
            { label: "Cookies", href: "/cookies" }
        ]
    }
];

export const Footer: React.FC = () => {
    const handleLinkClick = (linkCategory: string, linkTarget: string): void => {
        NavigationEvents.footerLinkClicked({ linkCategory, linkTarget });
    };

    const handleDemoClick = (): void => {
        EngagementEvents.demoRequested({ referringPage: "footer" });
    };

    const linkClass = "text-sm text-[#8b8b94] hover:text-foreground transition-colors";
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-line pt-12 pb-9 mt-auto">
            <div className="w-full max-w-[1080px] mx-auto px-6">
                <div
                    className="grid gap-7"
                    style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
                >
                    <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
                        <span className="flex items-center gap-2 font-bold">
                            <PixelMark size={24} />
                            FlowMaestro
                        </span>
                        <p className="text-dim text-[13px] leading-normal max-w-[220px]">
                            Workflows, agents and personas on one platform.
                        </p>
                        <a
                            href={BOOK_DEMO_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleDemoClick}
                            className="mt-1 inline-flex w-fit items-center h-9 px-4 rounded-full text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
                        >
                            Book a demo
                        </a>
                    </div>
                    {COLUMNS.map((column) => (
                        <div key={column.category} className="flex flex-col gap-2">
                            <p className="font-mono text-[11px] text-dim mb-1">{column.title}</p>
                            {column.links.map((link) => {
                                const target = link.label.toLowerCase().replace(/\s+/g, "-");
                                if (link.href.includes("#")) {
                                    return (
                                        <a
                                            key={link.label}
                                            href={link.href}
                                            onClick={() => handleLinkClick(column.category, target)}
                                            className={linkClass}
                                        >
                                            {link.label}
                                        </a>
                                    );
                                }
                                return (
                                    <Link
                                        key={link.label}
                                        to={link.href}
                                        onClick={() => handleLinkClick(column.category, target)}
                                        className={linkClass}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </div>
                <p className="font-mono text-[11px] text-dim mt-10">
                    © {year} FlowMaestro. All rights reserved.
                </p>
            </div>
        </footer>
    );
};
