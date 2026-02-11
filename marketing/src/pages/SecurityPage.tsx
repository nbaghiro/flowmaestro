import { motion } from "framer-motion";
import {
    Shield,
    Lock,
    Server,
    Key,
    Eye,
    FileCheck,
    AlertTriangle,
    Users,
    Clock,
    CheckCircle
} from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";

interface SecurityFeature {
    icon: React.ElementType;
    title: string;
    description: string;
    details: string[];
}

const infrastructureSecurity: SecurityFeature[] = [
    {
        icon: Server,
        title: "Cloud Infrastructure",
        description:
            "Hosted on enterprise-grade cloud infrastructure with industry-leading security.",
        details: [
            "Google Cloud Platform (GCP) with SOC 2 Type II compliance",
            "Kubernetes-based deployment with isolated namespaces",
            "Geographic data residency options",
            "Regular infrastructure security assessments"
        ]
    },
    {
        icon: Shield,
        title: "Network Security",
        description: "Multiple layers of network protection to defend against threats.",
        details: [
            "Web Application Firewall (WAF) protection",
            "DDoS mitigation and rate limiting",
            "Private network segmentation",
            "TLS 1.3 for all data in transit"
        ]
    }
];

const dataProtection: SecurityFeature[] = [
    {
        icon: Lock,
        title: "Encryption at Rest",
        description: "All stored data is encrypted using industry-standard algorithms.",
        details: [
            "AES-256 encryption for all data at rest",
            "Encrypted database backups",
            "Secure key management with rotation",
            "Hardware security module (HSM) integration"
        ]
    },
    {
        icon: Key,
        title: "Encryption in Transit",
        description: "Data is protected during transmission between systems.",
        details: [
            "TLS 1.3 for all API communications",
            "Certificate pinning for mobile apps",
            "HSTS enforcement",
            "Perfect forward secrecy"
        ]
    }
];

const accessControl: SecurityFeature[] = [
    {
        icon: Users,
        title: "Identity & Access",
        description: "Robust authentication and authorization mechanisms.",
        details: [
            "Single Sign-On (SSO) with SAML 2.0 and OIDC",
            "Multi-factor authentication (MFA)",
            "Role-based access control (RBAC)",
            "Session management and timeout policies"
        ]
    },
    {
        icon: Eye,
        title: "Audit Logging",
        description: "Comprehensive logging for compliance and security monitoring.",
        details: [
            "Complete audit trail of user actions",
            "API access logging",
            "Admin activity monitoring",
            "Log retention and export capabilities"
        ]
    }
];

interface ComplianceBadge {
    name: string;
    status: "certified" | "in-progress" | "compliant";
    description: string;
}

const complianceBadges: ComplianceBadge[] = [
    {
        name: "SOC 2 Type II",
        status: "in-progress",
        description: "Security, availability, and confidentiality"
    },
    {
        name: "GDPR",
        status: "compliant",
        description: "European data protection regulation"
    },
    {
        name: "CCPA",
        status: "compliant",
        description: "California consumer privacy act"
    },
    {
        name: "HIPAA",
        status: "in-progress",
        description: "Healthcare data protection"
    }
];

const SecurityFeatureCard: React.FC<{ feature: SecurityFeature; index: number }> = ({
    feature,
    index
}) => {
    const Icon = feature.icon;
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="p-6 rounded-xl bg-card border border-stroke"
        >
            <div className="w-12 h-12 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>
            <ul className="space-y-2">
                {feature.details.map((detail) => (
                    <li
                        key={detail}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{detail}</span>
                    </li>
                ))}
            </ul>
        </motion.div>
    );
};

export const SecurityPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-foreground relative">
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <div className="relative z-10">
                <Navigation />

                {/* Hero Section */}
                <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                    <div className="relative z-10 max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-6">
                                <Shield className="w-8 h-8 text-primary-400" />
                            </div>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                                Enterprise-Grade <span className="gradient-text">Security</span>
                            </h1>
                            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                                FlowMaestro is built with security at its core. We protect your data
                                with the same rigor expected by the world's most security-conscious
                                organizations.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Security Overview */}
                <section className="py-16 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-12"
                        >
                            <h2 className="text-3xl font-bold mb-4">Our Security Commitment</h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                Security isn't just a feature—it's fundamental to how we build and
                                operate FlowMaestro. We continuously invest in protecting your
                                workflows and data.
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-3 gap-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4 }}
                                className="p-6 rounded-xl bg-card border border-stroke text-center"
                            >
                                <div className="text-4xl font-bold gradient-text mb-2">99.9%</div>
                                <p className="text-muted-foreground">Uptime SLA</p>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                                className="p-6 rounded-xl bg-card border border-stroke text-center"
                            >
                                <div className="text-4xl font-bold gradient-text mb-2">AES-256</div>
                                <p className="text-muted-foreground">Encryption Standard</p>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                                className="p-6 rounded-xl bg-card border border-stroke text-center"
                            >
                                <div className="text-4xl font-bold gradient-text mb-2">24/7</div>
                                <p className="text-muted-foreground">Security Monitoring</p>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Infrastructure Security */}
                <section className="py-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-12"
                        >
                            <h2 className="text-3xl font-bold mb-4">Infrastructure Security</h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                Built on a secure foundation with multiple layers of protection.
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {infrastructureSecurity.map((feature, index) => (
                                <SecurityFeatureCard
                                    key={feature.title}
                                    feature={feature}
                                    index={index}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Data Protection */}
                <section className="py-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-12"
                        >
                            <h2 className="text-3xl font-bold mb-4">Data Protection</h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                Your data is encrypted everywhere—at rest and in transit.
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {dataProtection.map((feature, index) => (
                                <SecurityFeatureCard
                                    key={feature.title}
                                    feature={feature}
                                    index={index}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Access Control */}
                <section className="py-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-12"
                        >
                            <h2 className="text-3xl font-bold mb-4">Access Control</h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                Fine-grained control over who can access what.
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {accessControl.map((feature, index) => (
                                <SecurityFeatureCard
                                    key={feature.title}
                                    feature={feature}
                                    index={index}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Compliance */}
                <section className="py-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-12"
                        >
                            <h2 className="text-3xl font-bold mb-4">Compliance & Certifications</h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                Meeting the highest standards for data protection and privacy.
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-4 gap-4">
                            {complianceBadges.map((badge, index) => (
                                <motion.div
                                    key={badge.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: index * 0.1 }}
                                    className="p-6 rounded-xl bg-card border border-stroke text-center"
                                >
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <FileCheck className="w-5 h-5 text-primary-400" />
                                        <span className="font-semibold text-foreground">
                                            {badge.name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        {badge.description}
                                    </p>
                                    {badge.status === "certified" ? (
                                        <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-700 dark:text-green-400">
                                            Certified
                                        </span>
                                    ) : badge.status === "compliant" ? (
                                        <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-700 dark:text-green-400">
                                            Compliant
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                                            In Progress
                                        </span>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Operational Security */}
                <section className="py-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-12"
                        >
                            <h2 className="text-3xl font-bold mb-4">Operational Security</h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                Proactive security practices to stay ahead of threats.
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-3 gap-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4 }}
                                className="p-6 rounded-xl bg-card border border-stroke"
                            >
                                <AlertTriangle className="w-8 h-8 text-primary-400 mb-4" />
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    Vulnerability Management
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Regular penetration testing and vulnerability scans. We maintain
                                    a responsible disclosure program for security researchers.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                                className="p-6 rounded-xl bg-card border border-stroke"
                            >
                                <Clock className="w-8 h-8 text-primary-400 mb-4" />
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    Incident Response
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    24/7 security monitoring with documented incident response
                                    procedures. We notify affected customers within 72 hours of
                                    confirmed incidents.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                                className="p-6 rounded-xl bg-card border border-stroke"
                            >
                                <Server className="w-8 h-8 text-primary-400 mb-4" />
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    Business Continuity
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Multi-region deployments with automated failover. Regular
                                    backups with tested disaster recovery procedures.
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Security Contact CTA */}
                <section className="py-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <h2 className="text-3xl font-bold mb-4">Have Security Questions?</h2>
                            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                                Our security team is here to help. Whether you need additional
                                documentation for your security review or want to report a
                                vulnerability, we're ready to assist.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <a
                                    href="mailto:security@flowmaestro.ai"
                                    className="btn-primary inline-flex items-center justify-center gap-2"
                                >
                                    <Shield className="w-4 h-4" />
                                    Contact Security Team
                                </a>
                                <Link
                                    to="/contact"
                                    className="btn-secondary inline-flex items-center justify-center gap-2"
                                >
                                    Request Security Review
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </section>

                <Footer />
            </div>
        </div>
    );
};
