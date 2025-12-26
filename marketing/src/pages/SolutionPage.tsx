import React from "react";
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

export const SolutionPage: React.FC = () => {
    const { category } = useParams<{ category: string }>();

    // Validate category and get solution data
    const solution = getSolutionBySlug(category || "");
    const validSlugs = getAllSolutionSlugs();

    // Redirect to sales if invalid category
    if (!solution || !category || !validSlugs.includes(category)) {
        return <Navigate to="/solutions/sales" replace />;
    }

    // Get relevant providers for this solution
    const providers = getProvidersForSolution(category, ALL_PROVIDERS);

    return (
        <div className="min-h-screen bg-background text-gray-50">
            <Navigation />
            <SolutionHero solution={solution} />
            <IntegrationShowcase providers={providers} solution={solution} />
            <PainPointsComparison solution={solution} />
            <WorkflowExamples solution={solution} />
            <SolutionCTA solution={solution} />
            <Footer />
        </div>
    );
};
