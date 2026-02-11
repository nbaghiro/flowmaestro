import { motion } from "framer-motion";
import React from "react";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";

interface CookieCategory {
    name: string;
    description: string;
    examples: string[];
    required: boolean;
}

const cookieCategories: CookieCategory[] = [
    {
        name: "Essential Cookies",
        description:
            "These cookies are necessary for the website to function and cannot be switched off. They are usually only set in response to actions you take, such as logging in or filling out forms.",
        examples: [
            "Session ID cookies for maintaining your login state",
            "Security tokens for preventing cross-site request forgery",
            "Load balancing cookies for optimal performance"
        ],
        required: true
    },
    {
        name: "Analytics Cookies",
        description:
            "These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.",
        examples: [
            "Page views and navigation paths",
            "Time spent on pages",
            "Error logging for debugging",
            "Feature usage statistics"
        ],
        required: false
    },
    {
        name: "Functional Cookies",
        description:
            "These cookies enable enhanced functionality and personalization, such as remembering your preferences and settings.",
        examples: [
            "Language and region preferences",
            "Theme settings (light/dark mode)",
            "Recently viewed items",
            "Form auto-fill information"
        ],
        required: false
    },
    {
        name: "Marketing Cookies",
        description:
            "These cookies may be set by our advertising partners to build a profile of your interests and show you relevant ads on other sites.",
        examples: [
            "Advertising campaign tracking",
            "Retargeting pixels",
            "Social media sharing buttons",
            "Conversion tracking"
        ],
        required: false
    }
];

export const CookiesPage: React.FC = () => {
    const lastUpdated = "February 1, 2025";

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <div className="relative z-10">
                <Navigation />

                {/* Hero Section */}
                <section className="relative pt-32 pb-12 px-4 sm:px-6 lg:px-8">
                    <div className="relative z-10 max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Cookie Policy</h1>
                            <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
                        </motion.div>
                    </div>
                </section>

                {/* Content */}
                <section className="py-12 px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="max-w-4xl mx-auto"
                    >
                        <div className="space-y-8 text-muted-foreground">
                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    What Are Cookies?
                                </h2>
                                <p>
                                    Cookies are small text files that are placed on your device when
                                    you visit a website. They are widely used to make websites work
                                    more efficiently and to provide information to website owners.
                                </p>
                                <p className="mt-2">
                                    Cookies help us remember your preferences, understand how you
                                    use our site, and improve your overall experience.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    Types of Cookies We Use
                                </h2>
                                <div className="space-y-6">
                                    {cookieCategories.map((category, index) => (
                                        <motion.div
                                            key={category.name}
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.4, delay: index * 0.1 }}
                                            className="p-6 rounded-xl bg-card border border-stroke"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-lg font-semibold text-foreground">
                                                    {category.name}
                                                </h3>
                                                {category.required ? (
                                                    <span className="px-2 py-1 text-xs rounded bg-primary-500/20 text-primary-400">
                                                        Required
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 text-xs rounded bg-gray-500/20 text-muted-foreground">
                                                        Optional
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                {category.description}
                                            </p>
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground mb-2">
                                                    Examples:
                                                </p>
                                                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                                                    {category.examples.map((example) => (
                                                        <li key={example}>{example}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    Third-Party Cookies
                                </h2>
                                <p>
                                    Some cookies are placed by third-party services that appear on
                                    our pages. We use the following third-party services that may
                                    set cookies:
                                </p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>
                                        <strong>Google Analytics:</strong> For understanding website
                                        usage
                                    </li>
                                    <li>
                                        <strong>Stripe:</strong> For secure payment processing
                                    </li>
                                    <li>
                                        <strong>Intercom:</strong> For customer support chat
                                    </li>
                                </ul>
                                <p className="mt-4">
                                    These third parties have their own privacy policies governing
                                    their use of cookies.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    Managing Your Cookie Preferences
                                </h2>
                                <p>You can control and manage cookies in several ways:</p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>
                                        <strong>Cookie Banner:</strong> When you first visit our
                                        site, you can choose which optional cookies to accept
                                    </li>
                                    <li>
                                        <strong>Browser Settings:</strong> Most browsers allow you
                                        to refuse or delete cookies through their settings
                                    </li>
                                    <li>
                                        <strong>Account Settings:</strong> Logged-in users can
                                        manage preferences in their account settings
                                    </li>
                                </ul>
                                <p className="mt-4">
                                    Note that disabling certain cookies may affect the functionality
                                    of our website.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    Browser Cookie Settings
                                </h2>
                                <p>
                                    You can manage cookies through your browser settings. Here are
                                    links to cookie management instructions for popular browsers:
                                </p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>
                                        <a
                                            href="https://support.google.com/chrome/answer/95647"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary-400 hover:text-primary-300"
                                        >
                                            Google Chrome
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary-400 hover:text-primary-300"
                                        >
                                            Mozilla Firefox
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary-400 hover:text-primary-300"
                                        >
                                            Safari
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="https://support.microsoft.com/en-us/windows/manage-cookies-in-microsoft-edge-view-allow-block-delete-and-use-168dab11-0753-043d-7c16-ede5947fc64d"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary-400 hover:text-primary-300"
                                        >
                                            Microsoft Edge
                                        </a>
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    Updates to This Policy
                                </h2>
                                <p>
                                    We may update this Cookie Policy from time to time to reflect
                                    changes in our practices or for operational, legal, or
                                    regulatory reasons. The "Last updated" date at the top of this
                                    page indicates when the policy was last revised.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    Contact Us
                                </h2>
                                <p>
                                    If you have questions about our use of cookies, please contact
                                    us at:
                                </p>
                                <p className="mt-2">
                                    <strong>Email:</strong>{" "}
                                    <a
                                        href="mailto:privacy@flowmaestro.ai"
                                        className="text-primary-400 hover:text-primary-300"
                                    >
                                        privacy@flowmaestro.ai
                                    </a>
                                </p>
                            </section>
                        </div>
                    </motion.div>
                </section>

                <Footer />
            </div>
        </div>
    );
};
