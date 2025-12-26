import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { SOLUTION_NAV_ITEMS } from "../data/solutions";
import { Dropdown } from "./common/Dropdown";

interface NavLinkProps {
    label: string;
    hasDropdown?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ label, hasDropdown }) => {
    return (
        <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
            {label}
            {hasDropdown && <ChevronDown className="w-3 h-3" />}
        </button>
    );
};

export const Navigation: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isSolutionsExpanded, setIsSolutionsExpanded] = React.useState(false);

    // Close mobile menu on route change
    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Prevent body scroll when mobile menu is open
    React.useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isMobileMenuOpen]);

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-stroke bg-background/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center">
                            <a
                                href="/"
                                className="flex items-center gap-2 text-white font-semibold text-lg"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="32"
                                    height="32"
                                    viewBox="0 0 32 32"
                                >
                                    <rect width="32" height="32" rx="6" fill="white" />
                                    <text
                                        x="16"
                                        y="21"
                                        fontFamily="Arial, sans-serif"
                                        fontSize="13"
                                        fontWeight="bold"
                                        fill="black"
                                        textAnchor="middle"
                                    >
                                        FM
                                    </text>
                                </svg>
                                FlowMaestro
                            </a>
                        </div>

                        {/* Desktop Navigation Links */}
                        <div className="hidden md:flex items-center gap-8">
                            <Dropdown label="Solutions" items={SOLUTION_NAV_ITEMS} />
                            <Link
                                to="/integrations"
                                className="text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Integrations
                            </Link>
                            <NavLink label="Company" hasDropdown />
                            <NavLink label="Resources" hasDropdown />
                            <NavLink label="Docs" />
                            <Link
                                to="/pricing"
                                className="text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Pricing
                            </Link>
                        </div>

                        {/* Auth Buttons + Mobile Menu Toggle */}
                        <div className="flex items-center gap-4">
                            <a
                                href={import.meta.env.VITE_APP_URL || "http://localhost:3000"}
                                className="hidden sm:block text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Log In
                            </a>
                            <a
                                href={import.meta.env.VITE_APP_URL || "http://localhost:3000"}
                                className="hidden sm:block px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
                            >
                                Get Started
                            </a>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
                                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                            >
                                {isMobileMenuOpen ? (
                                    <X className="w-6 h-6" />
                                ) : (
                                    <Menu className="w-6 h-6" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 bg-background/95 backdrop-blur-lg md:hidden"
                    >
                        <div className="pt-20 px-6 pb-6 h-full overflow-y-auto">
                            <nav className="space-y-1">
                                {/* Solutions Expandable Section */}
                                <div>
                                    <button
                                        onClick={() => setIsSolutionsExpanded(!isSolutionsExpanded)}
                                        className="flex items-center justify-between w-full py-4 text-lg font-medium text-white border-b border-stroke"
                                    >
                                        Solutions
                                        <ChevronDown
                                            className={`w-5 h-5 transition-transform duration-200 ${
                                                isSolutionsExpanded ? "rotate-180" : ""
                                            }`}
                                        />
                                    </button>
                                    <AnimatePresence>
                                        {isSolutionsExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="py-2 pl-4 space-y-1">
                                                    {SOLUTION_NAV_ITEMS.map((item) => (
                                                        <Link
                                                            key={item.href}
                                                            to={item.href}
                                                            onClick={() =>
                                                                setIsMobileMenuOpen(false)
                                                            }
                                                            className="flex items-center gap-3 py-3 text-gray-400 hover:text-white transition-colors"
                                                        >
                                                            {item.icon && (
                                                                <item.icon className="w-5 h-5" />
                                                            )}
                                                            <div>
                                                                <div className="text-base font-medium">
                                                                    {item.label}
                                                                </div>
                                                                {item.description && (
                                                                    <div className="text-sm text-gray-500">
                                                                        {item.description}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Other Nav Items */}
                                <Link
                                    to="/integrations"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="block py-4 text-lg font-medium text-white border-b border-stroke"
                                >
                                    Integrations
                                </Link>
                                <button className="flex items-center justify-between w-full py-4 text-lg font-medium text-white border-b border-stroke">
                                    Company
                                    <ChevronDown className="w-5 h-5" />
                                </button>
                                <button className="flex items-center justify-between w-full py-4 text-lg font-medium text-white border-b border-stroke">
                                    Resources
                                    <ChevronDown className="w-5 h-5" />
                                </button>
                                <button className="block py-4 text-lg font-medium text-white border-b border-stroke text-left w-full">
                                    Docs
                                </button>
                                <Link
                                    to="/pricing"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="block py-4 text-lg font-medium text-white border-b border-stroke"
                                >
                                    Pricing
                                </Link>
                            </nav>

                            {/* Mobile Auth Buttons */}
                            <div className="mt-8 space-y-3">
                                <a
                                    href={import.meta.env.VITE_APP_URL || "http://localhost:3000"}
                                    className="block w-full py-3 text-center text-white border border-stroke rounded-lg hover:bg-background-elevated transition-colors"
                                >
                                    Log In
                                </a>
                                <a
                                    href={import.meta.env.VITE_APP_URL || "http://localhost:3000"}
                                    className="block w-full py-3 text-center bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    Get Started
                                </a>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
