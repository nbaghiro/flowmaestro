import React, { useEffect, useRef } from "react";
import { useParams, Navigate } from "react-router-dom";
import { ALL_PROVIDERS } from "@flowmaestro/shared";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { IntegrationShowcase } from "../components/solutions/IntegrationShowcase";
import { PainPointsComparison } from "../components/solutions/PainPointsComparison";
import { SolutionCTA } from "../components/solutions/SolutionCTA";
import { SolutionHero } from "../components/solutions/SolutionHero";
import { WorkflowExamples } from "../components/solutions/WorkflowExamples";
import { getSolutionBySlug, getProvidersForSolution, getAllSolutionSlugs } from "../data/solutions";
import { SolutionsPageEvents } from "../lib/analytics";

export const SolutionPage: React.FC = () => {
    const { category } = useParams<{ category: string }>();
    const hasTrackedPageView = useRef(false);

    // Validate category and get solution data
    const solution = getSolutionBySlug(category || "");
    const validSlugs = getAllSolutionSlugs();

    // Track page view
    useEffect(() => {
        if (solution && category && !hasTrackedPageView.current) {
            SolutionsPageEvents.pageViewed({ solutionName: solution.name });
            hasTrackedPageView.current = true;
        }
    }, [solution, category]);

    // Redirect to sales if invalid category
    if (!solution || !category || !validSlugs.includes(category)) {
        return <Navigate to="/solutions/sales" replace />;
    }

    // Get relevant providers for this solution
    const providers = getProvidersForSolution(category, ALL_PROVIDERS);

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            {/* Full-page background pattern */}
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <div className="relative z-10">
                <Navigation />
                <SolutionHero solution={solution} />
                <WorkflowExamples solution={solution} />
                <IntegrationShowcase providers={providers} solution={solution} />
                <PainPointsComparison solution={solution} />
                <SolutionCTA solution={solution} />
                <Footer />
            </div>
        </div>
    );
};
