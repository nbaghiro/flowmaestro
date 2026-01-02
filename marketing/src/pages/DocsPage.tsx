import React from "react";

// DocsPage redirects to external documentation
// This component exists so internal links work, then redirect externally
export const DocsPage: React.FC = () => {
    React.useEffect(() => {
        // Redirect to external docs
        window.location.href = import.meta.env.VITE_DOCS_URL || "https://docs.flowmaestro.ai";
    }, []);

    // Show loading state while redirecting
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Redirecting to documentation...</p>
            </div>
        </div>
    );
};
