import { Github, Linkedin, Mail, Twitter } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { NavigationEvents, OtherPagesEvents } from "../lib/analytics";

export const Footer: React.FC = () => {
    const handleSocialClick = (socialPlatform: string) => {
        NavigationEvents.footerSocialClicked({ socialPlatform });
    };

    const handleLinkClick = (linkCategory: string, linkTarget: string) => {
        NavigationEvents.footerLinkClicked({ linkCategory, linkTarget });
    };

    const handleDocsClick = () => {
        OtherPagesEvents.docsLinkClicked({
            referringPage: window.location.pathname,
            docSection: undefined
        });
    };

    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative bg-background border-t border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="text-2xl font-bold gradient-text mb-4">FlowMaestro</div>
                        <p className="text-muted-foreground mb-4 max-w-md">
                            Enterprise workflow automation, simplified. Build powerful workflows
                            without code.
                        </p>
                        <div className="flex gap-4">
                            <a
                                href="https://github.com/nbaghiro/flowmaestro"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleSocialClick("github")}
                                className="w-10 h-10 rounded-lg bg-secondary hover:bg-accent border border-border flex items-center justify-center transition-colors text-foreground"
                            >
                                <Github className="w-5 h-5" />
                            </a>
                            {/* TODO: Update to company X/Twitter account when available */}
                            <a
                                href="https://x.com/nbaghiro"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleSocialClick("twitter")}
                                className="w-10 h-10 rounded-lg bg-secondary hover:bg-accent border border-border flex items-center justify-center transition-colors text-foreground"
                            >
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a
                                href="https://www.linkedin.com/company/flowmaestro/"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleSocialClick("linkedin")}
                                className="w-10 h-10 rounded-lg bg-secondary hover:bg-accent border border-border flex items-center justify-center transition-colors text-foreground"
                            >
                                <Linkedin className="w-5 h-5" />
                            </a>
                            <a
                                href="mailto:support@flowmaestro.ai"
                                onClick={() => handleSocialClick("email")}
                                className="w-10 h-10 rounded-lg bg-secondary hover:bg-accent border border-border flex items-center justify-center transition-colors text-foreground"
                            >
                                <Mail className="w-5 h-5" />
                            </a>
                            <a
                                href="https://discord.gg/zHCkfBeP"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleSocialClick("discord")}
                                className="w-10 h-10 rounded-lg bg-secondary hover:bg-accent border border-border flex items-center justify-center transition-colors text-foreground"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Product */}
                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Product</h3>
                        <ul className="space-y-2 text-muted-foreground">
                            <li>
                                <a
                                    href="#"
                                    onClick={() => handleLinkClick("product", "features")}
                                    className="hover:text-foreground transition-colors"
                                >
                                    Features
                                </a>
                            </li>
                            <li>
                                <Link
                                    to="/integrations"
                                    onClick={() => handleLinkClick("product", "integrations")}
                                    className="hover:text-foreground transition-colors"
                                >
                                    Integrations
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/pricing"
                                    onClick={() => handleLinkClick("product", "pricing")}
                                    className="hover:text-foreground transition-colors"
                                >
                                    Pricing
                                </Link>
                            </li>
                            <li>
                                <a
                                    href={
                                        import.meta.env.VITE_DOCS_URL ||
                                        "https://docs.flowmaestro.ai"
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => {
                                        handleLinkClick("product", "documentation");
                                        handleDocsClick();
                                    }}
                                    className="hover:text-foreground transition-colors"
                                >
                                    Documentation
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Company</h3>
                        <ul className="space-y-2 text-muted-foreground">
                            <li>
                                <Link
                                    to="/about"
                                    onClick={() => handleLinkClick("company", "about")}
                                    className="hover:text-foreground transition-colors"
                                >
                                    About
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/blog"
                                    onClick={() => handleLinkClick("company", "blog")}
                                    className="hover:text-foreground transition-colors"
                                >
                                    Blog
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/careers"
                                    onClick={() => handleLinkClick("company", "careers")}
                                    className="hover:text-foreground transition-colors"
                                >
                                    Careers
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/contact"
                                    onClick={() => handleLinkClick("company", "contact")}
                                    className="hover:text-foreground transition-colors"
                                >
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom */}
                <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <p>© {currentYear} FlowMaestro. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link
                            to="/privacy"
                            onClick={() => handleLinkClick("legal", "privacy")}
                            className="hover:text-foreground transition-colors"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            to="/terms"
                            onClick={() => handleLinkClick("legal", "terms")}
                            className="hover:text-foreground transition-colors"
                        >
                            Terms of Service
                        </Link>
                        <Link
                            to="/cookies"
                            onClick={() => handleLinkClick("legal", "cookies")}
                            className="hover:text-foreground transition-colors"
                        >
                            Cookie Policy
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};
