import { motion } from "framer-motion";
import React, { useEffect, useRef } from "react";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { OtherPagesEvents } from "../lib/analytics";

export const TermsPage: React.FC = () => {
    const effectiveDate = "February 1, 2025";
    const hasTrackedPageView = useRef(false);

    useEffect(() => {
        if (!hasTrackedPageView.current) {
            OtherPagesEvents.termsPageViewed();
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
                            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                                Terms of Service
                            </h1>
                            <p className="text-muted-foreground">Effective date: {effectiveDate}</p>
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
                                    1. Acceptance of Terms
                                </h2>
                                <p>
                                    By accessing or using FlowMaestro's workflow automation platform
                                    ("Service"), you agree to be bound by these Terms of Service
                                    ("Terms"). If you do not agree to these Terms, do not use the
                                    Service.
                                </p>
                                <p className="mt-2">
                                    These Terms apply to all users of the Service, including
                                    visitors, registered users, and paying subscribers.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    2. Description of Service
                                </h2>
                                <p>
                                    FlowMaestro provides a cloud-based workflow automation platform
                                    that enables users to:
                                </p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>Design and execute automated workflows</li>
                                    <li>Integrate with third-party applications and services</li>
                                    <li>Deploy AI agents for intelligent automation</li>
                                    <li>Monitor and manage workflow executions</li>
                                </ul>
                                <p className="mt-2">
                                    We reserve the right to modify, suspend, or discontinue any
                                    aspect of the Service at any time.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    3. Account Registration
                                </h2>
                                <p>
                                    To use certain features of the Service, you must create an
                                    account. You agree to:
                                </p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>Provide accurate and complete registration information</li>
                                    <li>Maintain the security of your account credentials</li>
                                    <li>Promptly update your information if it changes</li>
                                    <li>
                                        Accept responsibility for all activities under your account
                                    </li>
                                </ul>
                                <p className="mt-2">
                                    You must be at least 18 years old or the age of majority in your
                                    jurisdiction to create an account.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    4. Subscription Plans and Payment
                                </h2>
                                <p>
                                    FlowMaestro offers various subscription plans with different
                                    features and pricing. By subscribing to a paid plan, you agree
                                    to:
                                </p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>Pay all fees associated with your selected plan</li>
                                    <li>
                                        Authorize us to charge your payment method on a recurring
                                        basis
                                    </li>
                                    <li>Provide valid and current payment information</li>
                                </ul>
                                <p className="mt-4">
                                    Subscriptions automatically renew unless cancelled before the
                                    renewal date. Refunds are provided in accordance with our refund
                                    policy.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    5. Acceptable Use
                                </h2>
                                <p>You agree not to use the Service to:</p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>Violate any applicable laws or regulations</li>
                                    <li>Infringe on the intellectual property rights of others</li>
                                    <li>Transmit malware, viruses, or harmful code</li>
                                    <li>Engage in unauthorized access to systems or data</li>
                                    <li>Send spam or unsolicited communications</li>
                                    <li>Impersonate others or misrepresent your affiliation</li>
                                    <li>Interfere with the operation of the Service</li>
                                    <li>Use the Service for any illegal or unauthorized purpose</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    6. Your Content and Data
                                </h2>
                                <p>
                                    You retain ownership of all content and data you upload to the
                                    Service ("Your Content"). By using the Service, you grant us a
                                    limited license to:
                                </p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>Store and process Your Content to provide the Service</li>
                                    <li>Create backups for disaster recovery purposes</li>
                                    <li>Aggregate anonymized usage data for analytics</li>
                                </ul>
                                <p className="mt-4">
                                    You are responsible for ensuring you have the right to use and
                                    share any content you upload to the Service.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    7. Intellectual Property
                                </h2>
                                <p>
                                    The Service, including all software, designs, logos, and
                                    content, is the property of FlowMaestro and is protected by
                                    copyright, trademark, and other intellectual property laws.
                                </p>
                                <p className="mt-2">
                                    You may not copy, modify, distribute, or create derivative works
                                    based on our intellectual property without prior written
                                    consent.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    8. Third-Party Integrations
                                </h2>
                                <p>
                                    The Service allows integration with third-party applications and
                                    services. Your use of these integrations is subject to their
                                    respective terms and privacy policies. We are not responsible
                                    for the functionality or security of third-party services.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    9. Service Level and Availability
                                </h2>
                                <p>
                                    We strive to maintain high availability of the Service but do
                                    not guarantee uninterrupted access. Scheduled maintenance and
                                    unforeseen outages may occur. Enterprise customers may be
                                    entitled to specific uptime guarantees as outlined in their
                                    service level agreement.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    10. Limitation of Liability
                                </h2>
                                <p>
                                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, FLOWMAESTRO SHALL NOT BE
                                    LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                                    PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS
                                    OPPORTUNITIES.
                                </p>
                                <p className="mt-2">
                                    Our total liability for any claims arising from the Service
                                    shall not exceed the amount you paid us in the twelve months
                                    preceding the claim.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    11. Indemnification
                                </h2>
                                <p>
                                    You agree to indemnify and hold harmless FlowMaestro, its
                                    affiliates, officers, directors, employees, and agents from any
                                    claims, damages, or expenses arising from:
                                </p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>Your use of the Service</li>
                                    <li>Your violation of these Terms</li>
                                    <li>Your violation of any third-party rights</li>
                                    <li>Your Content uploaded to the Service</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    12. Termination
                                </h2>
                                <p>
                                    You may terminate your account at any time through your account
                                    settings. We may suspend or terminate your access to the Service
                                    if you violate these Terms or for any other reason at our
                                    discretion.
                                </p>
                                <p className="mt-2">
                                    Upon termination, your right to use the Service will cease. We
                                    may retain your data for a reasonable period as required by law
                                    or for legitimate business purposes.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    13. Dispute Resolution
                                </h2>
                                <p>
                                    Any disputes arising from these Terms or the Service shall be
                                    resolved through binding arbitration, except for claims that may
                                    be brought in small claims court. You agree to waive any right
                                    to participate in class action lawsuits.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    14. Governing Law
                                </h2>
                                <p>
                                    These Terms shall be governed by and construed in accordance
                                    with the laws of the State of Delaware, United States, without
                                    regard to its conflict of law provisions.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    15. Changes to Terms
                                </h2>
                                <p>
                                    We reserve the right to modify these Terms at any time. We will
                                    notify you of material changes by posting the updated Terms on
                                    our website and updating the effective date. Your continued use
                                    of the Service after changes take effect constitutes acceptance
                                    of the new Terms.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-foreground mb-4">
                                    16. Contact Information
                                </h2>
                                <p>
                                    If you have questions about these Terms, please contact us at:
                                </p>
                                <p className="mt-2">
                                    <strong>Email:</strong>{" "}
                                    <a
                                        href="mailto:legal@flowmaestro.ai"
                                        className="text-primary-400 hover:text-primary-300"
                                    >
                                        legal@flowmaestro.ai
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
