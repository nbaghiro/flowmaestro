import React from "react";
import { caseStudies } from "../data/caseStudies";
import { CaseStudyCard } from "./CaseStudyCard";

export const CaseStudiesGrid: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {caseStudies.map((caseStudy, index) => (
                <CaseStudyCard key={caseStudy.slug} caseStudy={caseStudy} index={index} />
            ))}
        </div>
    );
};
