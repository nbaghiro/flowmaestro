import React from "react";
import { useParams, Navigate } from "react-router-dom";
import { CaseStudyContent } from "../components/CaseStudyContent";
import { CaseStudyHero } from "../components/CaseStudyHero";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { getCaseStudyBySlug } from "../data/caseStudies";

export const CaseStudyDetailPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const caseStudy = slug ? getCaseStudyBySlug(slug) : undefined;

    if (!caseStudy) {
        return <Navigate to="/case-studies" replace />;
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navigation />
            <CaseStudyHero caseStudy={caseStudy} />
            <CaseStudyContent caseStudy={caseStudy} />
            <Footer />
        </div>
    );
};
