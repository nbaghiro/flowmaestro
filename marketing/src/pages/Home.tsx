import React from "react";
import { CTA } from "../components/CTA";
import { Features } from "../components/Features";
import { Footer } from "../components/Footer";
import { Hero } from "../components/Hero";
import { Integrations } from "../components/Integrations";
import { Navigation } from "../components/Navigation";
import { SocialProof } from "../components/SocialProof";

export const Home: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-gray-50">
            <Navigation />
            <Hero />
            <Integrations />
            <SocialProof />
            <Features />
            <CTA />
            <Footer />
        </div>
    );
};
