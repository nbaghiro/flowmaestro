import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { CaseStudiesPage } from "./pages/CaseStudiesPage";
import { CaseStudyDetailPage } from "./pages/CaseStudyDetailPage";
import { Home } from "./pages/Home";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { PricingPage } from "./pages/PricingPage";
import { SolutionPage } from "./pages/SolutionPage";

const ScrollToTop: React.FC = () => {
    const { pathname } = useLocation();

    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
};

const App: React.FC = () => {
    return (
        <>
            <ScrollToTop />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/solutions/:category" element={<SolutionPage />} />
                <Route path="/integrations" element={<IntegrationsPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/case-studies" element={<CaseStudiesPage />} />
                <Route path="/case-studies/:slug" element={<CaseStudyDetailPage />} />
            </Routes>
        </>
    );
};

export default App;
