import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Briefcase, Mail } from "lucide-react";
import React from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";

interface JobData {
    id: string;
    title: string;
    department: string;
    location: string;
    type: string;
}

const jobs: Record<string, JobData> = {
    "senior-software-engineer": {
        id: "senior-software-engineer",
        title: "Senior Software Engineer",
        department: "Engineering",
        location: "Remote",
        type: "Full-time"
    }
};

export const JobDetailPage: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const job = jobId ? jobs[jobId] : null;

    if (!job) {
        return <Navigate to="/careers" replace />;
    }

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <div className="relative z-10">
                <Navigation />

                {/* Back Link */}
                <section className="pt-24 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <Link
                            to="/careers"
                            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Careers
                        </Link>
                    </div>
                </section>

                {/* Job Header */}
                <section className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Briefcase className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    {job.department}
                                </span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{job.title}</h1>
                            <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
                                <span className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    {job.location}
                                </span>
                                <span className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    {job.type}
                                </span>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Job Content */}
                <section className="pb-16 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="prose prose-invert max-w-none"
                        >
                            {/* About FlowMaestro */}
                            <div className="mb-10">
                                <h2 className="text-2xl font-bold mb-4 text-foreground">
                                    About FlowMaestro
                                </h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    We're building the platform that makes AI automation accessible
                                    to everyone. FlowMaestro combines visual workflow orchestration
                                    with autonomous AI agents, letting developers and non-technical
                                    users build sophisticated AI-powered automations without deep
                                    infrastructure knowledge.
                                </p>
                                <p className="text-muted-foreground leading-relaxed mt-4">
                                    Our users build everything from customer support routing to
                                    multi-step approval workflows, RAG pipelines to lead enrichment
                                    systems—all through our visual builder or programmatic APIs.
                                </p>
                            </div>

                            {/* What you'll work on */}
                            <div className="mb-10">
                                <h2 className="text-2xl font-bold mb-4 text-foreground">
                                    What you'll work on
                                </h2>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3 text-muted-foreground">
                                        <span className="text-foreground font-semibold flex-shrink-0 min-w-[140px]">
                                            Workflow Engine
                                        </span>
                                        <span>
                                            Build and extend our 20+ node types that power
                                            workflows: LLM calls, database operations, HTTP
                                            requests, file processing, conditional logic, and loops
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3 text-muted-foreground">
                                        <span className="text-foreground font-semibold flex-shrink-0 min-w-[140px]">
                                            AI Agents
                                        </span>
                                        <span>
                                            Develop our agent system including memory management
                                            (buffer, summary, vector), tool execution, and
                                            multi-turn conversations
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3 text-muted-foreground">
                                        <span className="text-foreground font-semibold flex-shrink-0 min-w-[140px]">
                                            Integrations
                                        </span>
                                        <span>
                                            Expand our 100+ integration catalog, building OAuth
                                            flows and provider SDKs that work seamlessly with both
                                            workflows and agents
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3 text-muted-foreground">
                                        <span className="text-foreground font-semibold flex-shrink-0 min-w-[140px]">
                                            Real-time Systems
                                        </span>
                                        <span>
                                            WebSocket events for live execution monitoring, SSE
                                            streaming for token-by-token LLM responses across web,
                                            CLI, and SDK clients
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3 text-muted-foreground">
                                        <span className="text-foreground font-semibold flex-shrink-0 min-w-[140px]">
                                            Developer Experience
                                        </span>
                                        <span>
                                            Build and maintain our CLI (`fm` command) for workflow
                                            execution, agent conversations, and execution
                                            monitoring. Develop our TypeScript and Python SDKs with
                                            full type support, streaming APIs, and webhook
                                            management
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            {/* Our stack */}
                            <div className="mb-10">
                                <h2 className="text-2xl font-bold mb-4 text-foreground">
                                    Our stack
                                </h2>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-card border border-stroke">
                                        <h3 className="font-semibold text-foreground mb-2">
                                            Frontend
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            React 18, TypeScript, Vite, Zustand, TanStack Query,
                                            React Flow, Tailwind CSS
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-card border border-stroke">
                                        <h3 className="font-semibold text-foreground mb-2">
                                            Backend
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Fastify, Node.js 22, PostgreSQL + pgvector, Redis,
                                            Temporal
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-card border border-stroke">
                                        <h3 className="font-semibold text-foreground mb-2">AI</h3>
                                        <p className="text-sm text-muted-foreground">
                                            OpenAI, Anthropic, Google Gemini, Cohere — unified
                                            interface across all providers
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-card border border-stroke">
                                        <h3 className="font-semibold text-foreground mb-2">
                                            Infrastructure
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Kubernetes, GCP, Pulumi, OpenTelemetry
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* What we're looking for */}
                            <div className="mb-10">
                                <h2 className="text-2xl font-bold mb-4 text-foreground">
                                    What we're looking for
                                </h2>
                                <ul className="space-y-2 text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                        <span>10+ years building production software</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                        <span>
                                            Strong TypeScript skills (we use strict mode
                                            everywhere—no{" "}
                                            <code className="px-1.5 py-0.5 rounded bg-card text-foreground text-sm">
                                                any
                                            </code>{" "}
                                            types)
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                        <span>
                                            Deep experience across the stack: React frontends,
                                            Node.js backends, PostgreSQL
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                        <span>
                                            You've shipped features end-to-end—from database schema
                                            to UI polish
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                        <span>
                                            Experience with AI/ML or LLM APIs (OpenAI, Anthropic, or
                                            similar)
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                        <span>
                                            Product mindset: you think about user problems, not just
                                            code
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                        <span>
                                            Comfortable making technical decisions and owning
                                            outcomes
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            {/* Even better if you have */}
                            <div className="mb-10">
                                <h2 className="text-2xl font-bold mb-4 text-foreground">
                                    Even better if you have
                                </h2>
                                <ul className="space-y-2 text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                        <span>
                                            Experience with workflow orchestration (Temporal,
                                            Airflow, Prefect)
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                        <span>
                                            Built integrations with third-party APIs (OAuth flows,
                                            webhooks, rate limiting)
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                        <span>
                                            Kubernetes and infrastructure-as-code (Pulumi,
                                            Terraform)
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                        <span>Real-time systems (WebSockets, SSE, streaming)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                        <span>
                                            Built CLI tools or language SDKs (experience with
                                            Commander.js, httpx, or similar)
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            {/* What we offer */}
                            <div className="mb-10">
                                <h2 className="text-2xl font-bold mb-4 text-foreground">
                                    What we offer
                                </h2>
                                <ul className="space-y-2 text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                        <span>Early-stage equity in a rapidly growing space</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                        <span>Remote-first culture with async communication</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                        <span>
                                            Work on meaningful problems at the intersection of AI
                                            and developer tools
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                        <span>Small team where your work has outsized impact</span>
                                    </li>
                                </ul>
                            </div>
                        </motion.div>

                        {/* Apply CTA */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="mt-12 p-8 rounded-xl bg-card border border-stroke text-center"
                        >
                            <h2 className="text-2xl font-bold mb-4">Interested?</h2>
                            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                                Send us your resume and a brief note about why you're excited about
                                FlowMaestro. We'd love to hear from you.
                            </p>
                            <a
                                href={`mailto:careers@flowmaestro.ai?subject=Application: ${job.title}`}
                                className="btn-primary inline-flex items-center justify-center gap-2"
                            >
                                <Mail className="w-4 h-4" />
                                Apply Now
                            </a>
                        </motion.div>
                    </div>
                </section>

                <Footer />
            </div>
        </div>
    );
};
