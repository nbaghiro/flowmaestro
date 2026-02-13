import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { ErrorEvents } from "../lib/analytics";

export const NotFoundPage: React.FC = () => {
    const location = useLocation();
    const hasTrackedError = useRef(false);

    useEffect(() => {
        if (!hasTrackedError.current) {
            ErrorEvents.pageNotFound({
                attemptedPath: location.pathname,
                referrer: document.referrer || undefined
            });
            hasTrackedError.current = true;
        }
    }, [location.pathname]);

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <div className="relative z-10">
                <Navigation />

                <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 min-h-[70vh] flex items-center">
                    <div className="relative z-10 max-w-2xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="text-8xl font-bold gradient-text mb-6">404</div>
                            <h1 className="text-3xl sm:text-4xl font-bold mb-4">Page Not Found</h1>
                            <p className="text-xl text-muted-foreground mb-8">
                                The page you're looking for doesn't exist or has been moved.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    to="/"
                                    className="btn-primary inline-flex items-center justify-center gap-2"
                                >
                                    <Home className="w-4 h-4" />
                                    Go Home
                                </Link>
                                <button
                                    onClick={() => window.history.back()}
                                    className="btn-secondary inline-flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Go Back
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </section>

                <Footer />
            </div>
        </div>
    );
};
