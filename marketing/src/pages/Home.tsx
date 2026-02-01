import React from "react";
import { CTA } from "../components/CTA";
import { Features } from "../components/Features";
import { Footer } from "../components/Footer";
import { Hero } from "../components/Hero";
import { Integrations } from "../components/Integrations";
import { Navigation } from "../components/Navigation";
import { ProductShowcase } from "../components/ProductShowcase";

export const Home: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-foreground relative">
            {/* Full-page background pattern */}
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <div className="relative z-10">
                <Navigation />
                <Hero />
                <Integrations />
                <Features />
                <ProductShowcase />
                <CTA />
                <Footer />
            </div>
        </div>
    );
};
