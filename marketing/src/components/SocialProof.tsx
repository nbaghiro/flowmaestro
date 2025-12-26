import { motion, useInView } from "framer-motion";
import { Star, Quote } from "lucide-react";
import React from "react";

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
            <div className="max-w-7xl mx-auto">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                        Loved by
                        <span className="gradient-text"> Teams Worldwide</span>
                    </h2>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                        ))}
                    </div>
                    <p className="text-xl text-gray-400">4.9/5 from 1,200+ reviews</p>
                </motion.div>

                {/* Testimonials Grid */}
                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="relative p-8 rounded-2xl bg-background-surface backdrop-blur-sm border border-stroke"
                        >
                            <Quote className="w-10 h-10 text-primary-400 mb-4 opacity-50" />

                            <p className="text-gray-300 mb-6 leading-relaxed">
                                {testimonial.quote}
                            </p>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500"></div>
                                <div>
                                    <div className="font-semibold">{testimonial.author}</div>
                                    <div className="text-sm text-gray-400">
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
                    <p className="text-gray-400 mb-8">Trusted by teams at</p>
                    <div className="flex flex-wrap justify-center items-center gap-12 opacity-50">
                        {["TechCorp", "DataFlow", "CloudScale", "AI Labs", "Enterprise Co"].map(
                            (company) => (
                                <div key={company} className="text-2xl font-bold text-gray-500">
                                    {company}
                                </div>
                            )
                        )}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
