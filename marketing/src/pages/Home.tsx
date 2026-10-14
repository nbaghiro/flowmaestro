import React, { useEffect, useRef } from "react";
import { Footer } from "../components/Footer";
import { ArchitectureSection } from "../components/home/ArchitectureSection";
import { FaqSection } from "../components/home/FaqSection";
import { FeatureBento } from "../components/home/FeatureBento";
import { FinalCta } from "../components/home/FinalCta";
import { HeroSection } from "../components/home/HeroSection";
import { IntegrationsRoll } from "../components/home/IntegrationsRoll";
import { PricingSection } from "../components/home/PricingSection";
import { SecuritySection } from "../components/home/SecuritySection";
import { ShowcaseTabs } from "../components/home/ShowcaseTabs";
import { SolutionsSection } from "../components/home/SolutionsSection";
import { StatsStrip } from "../components/home/StatsStrip";
import { TemplatesSection } from "../components/home/TemplatesSection";
import { Navigation } from "../components/Navigation";
import { HomePageEvents } from "../lib/analytics";
import "../styles/home.css";
import "../styles/previews.css";

export const Home: React.FC = () => {
    const hasTrackedPageView = useRef(false);

    useEffect(() => {
        if (!hasTrackedPageView.current) {
            HomePageEvents.viewed();
            hasTrackedPageView.current = true;
        }
    }, []);

    return (
        <div className="lp min-h-screen bg-background text-foreground flex flex-col">
            <Navigation />
            <main className="flex-1">
                <HeroSection />
                <StatsStrip />
                <ArchitectureSection />
                <ShowcaseTabs />
                <FeatureBento />
                <IntegrationsRoll />
                <TemplatesSection />
                <SolutionsSection />
                <SecuritySection />
                <PricingSection />
                <FaqSection />
                <FinalCta />
            </main>
            <Footer />
        </div>
    );
};
