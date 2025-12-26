import { ArrowRight } from "lucide-react";
import React from "react";
import { InteractiveBackground } from "./InteractiveBackground";

export const Hero: React.FC = () => {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
            {/* Interactive Background with Mouse Effect */}
            <InteractiveBackground />

            {/* Content */}
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-32">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background-elevated border border-stroke mb-8">
                    <span className="text-sm text-gray-300">
                        AI-powered automation for enterprises
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-500" />
                </div>

                {/* Main Heading - Using serif font like Resend */}
                <h1 className="text-6xl sm:text-7xl lg:text-8xl font-serif font-normal mb-6 leading-tight">
                    Automate
                    <br />
                    everything with
                    <br />
                    AI agents & workflows
                </h1>

                {/* Subheading */}
                <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
                    Deploy intelligent AI agents and reliable workflows to automate your business
                    processes at scale.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <a
                        href={import.meta.env.VITE_APP_URL || "http://localhost:3000"}
                        className="px-6 py-3 bg-white text-black text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
                    >
                        Get Started
                    </a>
                    <a
                        href={import.meta.env.VITE_DOCS_URL || "https://docs.flowmaestro.ai"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Documentation
                    </a>
                </div>
            </div>
        </section>
    );
};
