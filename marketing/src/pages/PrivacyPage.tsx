import { motion } from "framer-motion";
import React, { useEffect, useRef } from "react";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { OtherPagesEvents } from "../lib/analytics";

export const PrivacyPage: React.FC = () => {
    const lastUpdated = "February 1, 2025";
    const hasTrackedPageView = useRef(false);

    useEffect(() => {
        if (!hasTrackedPageView.current) {
            OtherPagesEvents.privacyPageViewed();
            hasTrackedPageView.current = true;
        }
    }, []);

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
                            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Privacy Policy</h1>
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
                        className="max-w-4xl mx-auto prose prose-invert prose-gray"
                    >
                        <div className="space-y-8 text-muted-foreground">
                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    Introduction
                                </h2>
                                <p>
                                    FlowMaestro ("we," "our," or "us") is committed to protecting
                                    your privacy. This Privacy Policy explains how we collect, use,
                                    disclose, and safeguard your information when you use our
                                    workflow automation platform and related services.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    Information We Collect
                                </h2>
                                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">
                                    Personal Information
                                </h3>
                                <p>
                                    When you register for an account or use our services, we may
                                    collect:
                                </p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>Name, email address, and contact information</li>
                                    <li>Company name and job title</li>
                                    <li>Payment and billing information</li>
                                    <li>Account credentials</li>
                                </ul>

                                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">
                                    Usage Data
                                </h3>
                                <p>
                                    We automatically collect information about how you use our
                                    services:
                                </p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>Workflow configurations and execution history</li>
                                    <li>Feature usage and interaction patterns</li>
                                    <li>Device information and browser type</li>
                                    <li>IP address and approximate location</li>
                                    <li>Log data and analytics</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    How We Use Your Information
                                </h2>
                                <p>We use the information we collect to:</p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>Provide, maintain, and improve our services</li>
                                    <li>Process transactions and send related information</li>
                                    <li>Send technical notices, updates, and support messages</li>
                                    <li>Respond to your comments and questions</li>
                                    <li>Analyze usage patterns to improve user experience</li>
                                    <li>
                                        Detect, prevent, and address technical issues and security
                                        threats
                                    </li>
                                    <li>Comply with legal obligations</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    Data Sharing and Disclosure
                                </h2>
                                <p>
                                    We do not sell your personal information. We may share your
                                    information in the following circumstances:
                                </p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>
                                        <strong>Service Providers:</strong> With third-party vendors
                                        who help us operate our platform (e.g., cloud hosting,
                                        payment processing)
                                    </li>
                                    <li>
                                        <strong>Business Transfers:</strong> In connection with a
                                        merger, acquisition, or sale of assets
                                    </li>
                                    <li>
                                        <strong>Legal Requirements:</strong> When required by law or
                                        to protect our rights
                                    </li>
                                    <li>
                                        <strong>With Your Consent:</strong> When you have given us
                                        explicit permission
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    Data Security
                                </h2>
                                <p>
                                    We implement industry-standard security measures to protect your
                                    data:
                                </p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>Encryption at rest using AES-256</li>
                                    <li>Encryption in transit using TLS 1.3</li>
                                    <li>Regular security audits and vulnerability assessments</li>
                                    <li>Access controls and authentication mechanisms</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    Your Rights
                                </h2>
                                <p>
                                    Depending on your location, you may have certain rights
                                    regarding your personal information:
                                </p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>
                                        <strong>Access:</strong> Request a copy of the data we hold
                                        about you
                                    </li>
                                    <li>
                                        <strong>Correction:</strong> Request correction of
                                        inaccurate data
                                    </li>
                                    <li>
                                        <strong>Deletion:</strong> Request deletion of your data
                                    </li>
                                    <li>
                                        <strong>Portability:</strong> Request a copy of your data in
                                        a portable format
                                    </li>
                                    <li>
                                        <strong>Objection:</strong> Object to certain processing of
                                        your data
                                    </li>
                                </ul>
                                <p className="mt-4">
                                    To exercise these rights, contact us at{" "}
                                    <a
                                        href="mailto:privacy@flowmaestro.ai"
                                        className="text-primary-400 hover:text-primary-300"
                                    >
                                        privacy@flowmaestro.ai
                                    </a>
                                    .
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    Data Retention
                                </h2>
                                <p>
                                    We retain your personal information for as long as your account
                                    is active or as needed to provide you services. We may also
                                    retain and use your information to comply with legal
                                    obligations, resolve disputes, and enforce our agreements.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    International Transfers
                                </h2>
                                <p>
                                    Your information may be transferred to and processed in
                                    countries other than your own. We ensure appropriate safeguards
                                    are in place to protect your data in accordance with applicable
                                    laws.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    Children's Privacy
                                </h2>
                                <p>
                                    Our services are not intended for individuals under the age of
                                    16. We do not knowingly collect personal information from
                                    children. If we become aware that we have collected data from a
                                    child, we will take steps to delete it.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    Changes to This Policy
                                </h2>
                                <p>
                                    We may update this Privacy Policy from time to time. We will
                                    notify you of any changes by posting the new policy on this page
                                    and updating the "Last updated" date. We encourage you to review
                                    this Privacy Policy periodically.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    Contact Us
                                </h2>
                                <p>
                                    If you have questions about this Privacy Policy or our data
                                    practices, please contact us at:
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
