import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { HelmetProvider } from "react-helmet-async";
import { Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "./hooks/useTheme";
import { AboutPage } from "./pages/AboutPage";
import { BlogDetailPage } from "./pages/BlogDetailPage";
import { BlogPage } from "./pages/BlogPage";
import { CareersPage } from "./pages/CareersPage";
import { CaseStudiesPage } from "./pages/CaseStudiesPage";
import { CaseStudyDetailPage } from "./pages/CaseStudyDetailPage";
import { ChangelogPage } from "./pages/ChangelogPage";
import { CommunityPage } from "./pages/CommunityPage";
import { ContactPage } from "./pages/ContactPage";
import { CookiesPage } from "./pages/CookiesPage";
import { DocsPage } from "./pages/DocsPage";
import { HelpPage } from "./pages/HelpPage";
import { Home } from "./pages/Home";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PricingPage } from "./pages/PricingPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { SecurityPage } from "./pages/SecurityPage";
import { SolutionPage } from "./pages/SolutionPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { TermsPage } from "./pages/TermsPage";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1
        }
    }
});

const ScrollToTop: React.FC = () => {
    const { pathname } = useLocation();

    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
};

const App: React.FC = () => {
    return (
        <HelmetProvider>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <ScrollToTop />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/solutions/:category" element={<SolutionPage />} />
                        <Route path="/integrations" element={<IntegrationsPage />} />
                        <Route path="/pricing" element={<PricingPage />} />
                        <Route path="/case-studies" element={<CaseStudiesPage />} />
                        <Route path="/case-studies/:slug" element={<CaseStudyDetailPage />} />
                        {/* Company pages */}
                        <Route path="/about" element={<AboutPage />} />
                        <Route path="/blog" element={<BlogPage />} />
                        <Route path="/blog/:slug" element={<BlogDetailPage />} />
                        <Route path="/careers" element={<CareersPage />} />
                        <Route path="/careers/:jobId" element={<JobDetailPage />} />
                        <Route path="/contact" element={<ContactPage />} />
                        <Route path="/security" element={<SecurityPage />} />
                        {/* Resources pages */}
                        <Route path="/docs" element={<DocsPage />} />
                        <Route path="/changelog" element={<ChangelogPage />} />
                        <Route path="/community" element={<CommunityPage />} />
                        <Route path="/help" element={<HelpPage />} />
                        <Route path="/templates" element={<TemplatesPage />} />
                        {/* Legal pages */}
                        <Route path="/privacy" element={<PrivacyPage />} />
                        <Route path="/terms" element={<TermsPage />} />
                        <Route path="/cookies" element={<CookiesPage />} />
                        {/* 404 */}
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </ThemeProvider>
            </QueryClientProvider>
        </HelmetProvider>
    );
};

export default App;
