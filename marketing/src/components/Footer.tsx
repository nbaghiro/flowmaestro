import { Github, Twitter, Linkedin, Mail } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

export const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative bg-background border-t border-stroke">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="text-2xl font-bold gradient-text mb-4">FlowMaestro</div>
                        <p className="text-gray-400 mb-4 max-w-md">
                            Enterprise workflow automation, simplified. Build powerful workflows
                            without code.
                        </p>
                        <div className="flex gap-4">
                            <a
                                href="https://github.com/nbaghiro/flowmaestro"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-lg bg-background-elevated hover:bg-border border border-stroke flex items-center justify-center transition-colors"
                            >
                                <Github className="w-5 h-5" />
                            </a>
                            {/* TODO: Update to company X/Twitter account when available */}
                            <a
                                href="https://x.com/nbaghiro"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-lg bg-background-elevated hover:bg-border border border-stroke flex items-center justify-center transition-colors"
                            >
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a
                                href="https://www.linkedin.com/company/flowmaestro/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-lg bg-background-elevated hover:bg-border border border-stroke flex items-center justify-center transition-colors"
                            >
                                <Linkedin className="w-5 h-5" />
                            </a>
                            <a
                                href="mailto:support@flowmaestro.ai"
                                className="w-10 h-10 rounded-lg bg-background-elevated hover:bg-border border border-stroke flex items-center justify-center transition-colors"
                            >
                                <Mail className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Product */}
                    <div>
                        <h3 className="font-semibold mb-4">Product</h3>
                        <ul className="space-y-2 text-gray-400">
                            <li>
                                <a href="#" className="hover:text-white transition-colors">
                                    Features
                                </a>
                            </li>
                            <li>
                                <Link
                                    to="/integrations"
                                    className="hover:text-white transition-colors"
                                >
                                    Integrations
                                </Link>
                            </li>
                            <li>
                                <Link to="/pricing" className="hover:text-white transition-colors">
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
                                    className="hover:text-white transition-colors"
                                >
                                    Documentation
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="font-semibold mb-4">Company</h3>
                        <ul className="space-y-2 text-gray-400">
                            <li>
                                <a href="#" className="hover:text-white transition-colors">
                                    About
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white transition-colors">
                                    Blog
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white transition-colors">
                                    Careers
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white transition-colors">
                                    Contact
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom */}
                <div className="pt-8 border-t border-stroke flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
                    <p>© {currentYear} FlowMaestro. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-white transition-colors">
                            Privacy Policy
                        </a>
                        <a href="#" className="hover:text-white transition-colors">
                            Terms of Service
                        </a>
                        <a href="#" className="hover:text-white transition-colors">
                            Cookie Policy
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};
