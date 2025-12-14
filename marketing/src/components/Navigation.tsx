import { ChevronDown } from "lucide-react";
import React from "react";

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
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800 bg-black/80 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <a href="/" className="text-white font-semibold text-lg">
                            FlowMaestro
                        </a>
                    </div>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center gap-8">
                        <NavLink label="Features" hasDropdown />
                        <NavLink label="Company" hasDropdown />
                        <NavLink label="Resources" hasDropdown />
                        <NavLink label="Help" hasDropdown />
                        <NavLink label="Docs" />
                        <NavLink label="Pricing" />
                    </div>

                    {/* Auth Buttons */}
                    <div className="flex items-center gap-4">
                        <a
                            href={import.meta.env.VITE_APP_URL || "http://localhost:3000"}
                            className="text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Log In
                        </a>
                        <a
                            href={import.meta.env.VITE_APP_URL || "http://localhost:3000"}
                            className="px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
                        >
                            Get Started
                        </a>
                    </div>
                </div>
            </div>
        </nav>
    );
};
