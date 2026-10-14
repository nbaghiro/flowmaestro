import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { SOLUTION_NAV_ITEMS } from "../data/solutions";
import { EngagementEvents, NavigationEvents } from "../lib/analytics";
import { BOOK_DEMO_URL } from "../lib/links";
import { PixelMark } from "./brand/PixelMark";
import { Dropdown } from "./common/Dropdown";
import type { DropdownItem } from "./common/Dropdown";

const desktopLink =
    "text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap";
const mobileLink = "block py-4 text-lg font-medium text-foreground border-b border-border";

interface MobileGroupProps {
    label: string;
    items: DropdownItem[];
    onNavigate: () => void;
}

const MobileGroup: React.FC<MobileGroupProps> = ({ label, items, onNavigate }) => {
    const [open, setOpen] = React.useState(false);
    const itemClass =
        "flex items-center gap-3 py-3 text-muted-foreground hover:text-foreground transition-colors";

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center justify-between w-full py-4 text-lg font-medium text-foreground border-b border-border"
                aria-expanded={open}
            >
                {label}
                <ChevronDown
                    className={`w-5 h-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="py-2 pl-4 space-y-1">
                            {items.map((item) => {
                                const content = (
                                    <>
                                        {item.icon && <item.icon className="w-5 h-5" />}
                                        <div>
                                            <div className="text-base font-medium">
                                                {item.label}
                                            </div>
                                            {item.description && (
                                                <div className="text-sm text-muted-foreground">
                                                    {item.description}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                                return item.href.startsWith("http") ? (
                                    <a
                                        key={item.href}
                                        href={item.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={onNavigate}
                                        className={itemClass}
                                    >
                                        {content}
                                    </a>
                                ) : (
                                    <Link
                                        key={item.href}
                                        to={item.href}
                                        onClick={onNavigate}
                                        className={itemClass}
                                    >
                                        {content}
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const Navigation: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    const handleMobileMenuToggle = () => {
        const newState = !isMobileMenuOpen;
        setIsMobileMenuOpen(newState);
        NavigationEvents.navMenuToggled({ isOpen: newState });
    };

    const handleDemoClick = () => {
        EngagementEvents.demoRequested({ referringPage: window.location.pathname });
    };

    const handleNavLinkClick = (menuItem: string) => {
        NavigationEvents.navLinkClicked({ menuItem, isDropdown: false });
    };

    // Close the mobile menu when the viewport grows past the breakpoint
    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Prevent body scroll when the mobile menu is open
    React.useEffect(() => {
        document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [isMobileMenuOpen]);

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-line bg-background/75 backdrop-blur-md">
                <div className="max-w-[1120px] mx-auto px-6 flex items-center justify-between gap-6 h-16">
                    <a
                        href="/"
                        className="flex items-center gap-2.5 text-foreground font-bold text-[17px]"
                    >
                        <PixelMark size={24} variant="monogram" />
                        FlowMaestro
                    </a>

                    <div className="hidden md:flex items-center gap-6">
                        <a
                            href="/#product"
                            onClick={() => handleNavLinkClick("Product")}
                            className={desktopLink}
                        >
                            Product
                        </a>
                        <Dropdown label="Solutions" items={SOLUTION_NAV_ITEMS} />
                        <Link
                            to="/integrations"
                            onClick={() => handleNavLinkClick("Integrations")}
                            className={desktopLink}
                        >
                            Integrations
                        </Link>
                        <Link
                            to="/templates"
                            onClick={() => handleNavLinkClick("Templates")}
                            className={desktopLink}
                        >
                            Templates
                        </Link>
                        <Link
                            to="/pricing"
                            onClick={() => handleNavLinkClick("Pricing")}
                            className={desktopLink}
                        >
                            Pricing
                        </Link>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <a
                            href={BOOK_DEMO_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleDemoClick}
                            className="hidden sm:inline-flex items-center h-[38px] px-4 rounded-xl text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
                        >
                            Book a demo
                        </a>
                        <button
                            type="button"
                            onClick={handleMobileMenuToggle}
                            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                            aria-expanded={isMobileMenuOpen}
                        >
                            {isMobileMenuOpen ? (
                                <X className="w-6 h-6" />
                            ) : (
                                <Menu className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>
            </nav>

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
                                <a
                                    href="/#product"
                                    onClick={closeMobileMenu}
                                    className={mobileLink}
                                >
                                    Product
                                </a>
                                <MobileGroup
                                    label="Solutions"
                                    items={SOLUTION_NAV_ITEMS}
                                    onNavigate={closeMobileMenu}
                                />
                                <Link
                                    to="/integrations"
                                    onClick={closeMobileMenu}
                                    className={mobileLink}
                                >
                                    Integrations
                                </Link>
                                <Link
                                    to="/templates"
                                    onClick={closeMobileMenu}
                                    className={mobileLink}
                                >
                                    Templates
                                </Link>
                                <Link
                                    to="/pricing"
                                    onClick={closeMobileMenu}
                                    className={mobileLink}
                                >
                                    Pricing
                                </Link>
                            </nav>

                            <div className="mt-6">
                                <a
                                    href={BOOK_DEMO_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => {
                                        handleDemoClick();
                                        closeMobileMenu();
                                    }}
                                    className="block w-full py-3 text-center bg-foreground text-background font-semibold rounded-xl hover:opacity-90 transition-opacity"
                                >
                                    Book a demo
                                </a>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
