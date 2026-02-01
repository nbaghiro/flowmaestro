import { motion, useInView } from "framer-motion";
import { ArrowRight, Quote, Star } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

interface Testimonial {
    quote: string;
    author: string;
    role: string;
    company: string;
}

const testimonials: Testimonial[] = [
    {
        quote: "FlowMaestro has transformed how we handle data processing. What used to take our team days now runs automatically in minutes.",
        author: "Sarah Chen",
        role: "Head of Engineering",
        company: "TechCorp"
    },
    {
        quote: "The visual workflow builder is incredibly intuitive. Our non-technical team members can now build complex automations without writing code.",
        author: "Michael Rodriguez",
        role: "Director of Operations",
        company: "DataFlow Inc"
    },
    {
        quote: "We've reduced operational costs by 60% and increased reliability by moving to FlowMaestro. The Temporal integration is rock solid.",
        author: "Emily Watson",
        role: "CTO",
        company: "CloudScale"
    }
];

export const SocialProof: React.FC = () => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section ref={ref} className="relative py-24 px-4 sm:px-6 lg:px-8 bg-background">
            <div className="absolute inset-0 grid-pattern opacity-50" />
            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-foreground">
                        Loved by
                        <span className="gradient-text"> Teams Worldwide</span>
                    </h2>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                        ))}
                    </div>
                    <p className="text-xl text-muted-foreground">4.9/5 from 1,200+ reviews</p>
                </motion.div>

                {/* Testimonials Grid */}
                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="relative p-8 rounded-2xl bg-card backdrop-blur-sm border border-border"
                        >
                            <Quote className="w-10 h-10 text-muted-foreground mb-4 opacity-50" />

                            <p className="text-muted-foreground mb-6 leading-relaxed">
                                {testimonial.quote}
                            </p>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-muted-foreground to-foreground"></div>
                                <div>
                                    <div className="font-semibold text-foreground">
                                        {testimonial.author}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {testimonial.role} at {testimonial.company}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Trusted By */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="mt-20 text-center"
                >
                    <p className="text-muted-foreground mb-8">Trusted by teams at</p>
                    <div className="flex flex-wrap justify-center items-center gap-12 opacity-50">
                        {["TechCorp", "DataFlow", "CloudScale", "AI Labs", "Enterprise Co"].map(
                            (company) => (
                                <div
                                    key={company}
                                    className="text-2xl font-bold text-muted-foreground"
                                >
                                    {company}
                                </div>
                            )
                        )}
                    </div>
                </motion.div>

                {/* View Case Studies CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="mt-16 text-center"
                >
                    <Link
                        to="/case-studies"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border hover:border-foreground text-foreground hover:text-foreground transition-all duration-200 group"
                    >
                        <span>View Customer Case Studies</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </motion.div>
            </div>
        </section>
    );
};
