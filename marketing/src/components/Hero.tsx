import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import React, { useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useThemedScreenshot } from "../hooks/useThemedScreenshot";
import { InteractiveBackground } from "./InteractiveBackground";

export const Hero: React.FC = () => {
    const sectionRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end start"]
    });

    // Transform scroll progress (0-1) to rotation (8deg to 0deg)
    const rotateX = useTransform(scrollYProgress, [0, 0.5], [8, 0]);

    // Get themed screenshot path
    const heroScreenshot = useThemedScreenshot("hero-dashboard");
    const { theme } = useTheme();

    return (
        <section
            ref={sectionRef}
            className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16"
        >
            {/* Interactive Background with Mouse Effect */}
            <InteractiveBackground />

            {/* Content */}
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 pb-12">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border mb-8">
                    <span className="text-sm text-muted-foreground">
                        AI-powered automation for enterprises
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                </div>

                {/* Main Heading - Using serif font like Resend */}
                <h1 className="text-6xl sm:text-7xl lg:text-8xl font-serif font-normal mb-6 leading-tight text-foreground">
                    Automate
                    <br />
                    everything with
                    <br />
                    AI agents & workflows
                </h1>

                {/* Subheading */}
                <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                    Deploy intelligent AI agents and reliable workflows to automate your business
                    processes at scale.
                </p>
            </div>

            {/* Hero Screenshot with 3D Perspective and Glow */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative z-10 w-full max-w-5xl mx-auto px-4 pb-16"
            >
                <div className="relative group" style={{ perspective: "1000px" }}>
                    {/* Ambient glow effect - theme aware */}
                    <div
                        className="absolute -inset-8 rounded-3xl blur-3xl opacity-60 transition-opacity duration-500"
                        style={{
                            background:
                                theme === "dark"
                                    ? "radial-gradient(ellipse at center, rgba(120, 120, 140, 0.3) 0%, rgba(80, 80, 100, 0.15) 40%, transparent 70%)"
                                    : "radial-gradient(ellipse at center, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.04) 40%, transparent 70%)"
                        }}
                    />

                    {/* Subtle glow on hover */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-foreground/5 via-foreground/10 to-foreground/5 rounded-2xl blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />

                    {/* Screenshot image with scroll-based rotation */}
                    <motion.div
                        className="relative"
                        style={{
                            rotateX,
                            transformStyle: "preserve-3d"
                        }}
                    >
                        <img
                            src={heroScreenshot}
                            alt="FlowMaestro Dashboard - Manage AI workflows and agents"
                            className="w-full rounded-xl border border-border"
                            style={{
                                boxShadow:
                                    theme === "dark"
                                        ? "0 0 0 1px hsl(var(--border)), 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 80px -20px rgba(150, 150, 180, 0.25)"
                                        : "0 0 0 1px hsl(var(--border)), 0 25px 50px -12px rgba(0,0,0,0.15), 0 0 80px -20px rgba(0, 0, 0, 0.1)"
                            }}
                        />

                        {/* Overlay gradient for depth */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-background/10 to-transparent pointer-events-none" />
                    </motion.div>
                </div>
            </motion.div>
        </section>
    );
};
