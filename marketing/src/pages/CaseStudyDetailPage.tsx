import React, { useEffect, useRef } from "react";
import { useParams, Navigate } from "react-router-dom";
import { CaseStudyContent } from "../components/CaseStudyContent";
import { CaseStudyHero } from "../components/CaseStudyHero";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { getCaseStudyBySlug } from "../data/caseStudies";
import { CaseStudiesEvents } from "../lib/analytics";

export const CaseStudyDetailPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const caseStudy = slug ? getCaseStudyBySlug(slug) : undefined;
    const hasTrackedDetailView = useRef(false);

    useEffect(() => {
        if (caseStudy && slug && !hasTrackedDetailView.current) {
            CaseStudiesEvents.detailOpened({ caseStudySlug: slug });
            hasTrackedDetailView.current = true;
        }
    }, [caseStudy, slug]);

    if (!caseStudy) {
        return <Navigate to="/case-studies" replace />;
    }

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            {/* Full-page background pattern */}
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <div className="relative z-10">
                <Navigation />
                <CaseStudyHero caseStudy={caseStudy} />
                <CaseStudyContent caseStudy={caseStudy} />
                <Footer />
            </div>
        </div>
    );
};
