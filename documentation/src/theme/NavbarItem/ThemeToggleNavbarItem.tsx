import { useColorMode } from "@docusaurus/theme-common";
import { Moon, Sun } from "lucide-react";
import React from "react";

export default function ThemeToggleNavbarItem(): JSX.Element {
    const { colorMode, setColorMode } = useColorMode();

    const toggleColorMode = () => {
        setColorMode(colorMode === "dark" ? "light" : "dark");
    };

    const Icon = colorMode === "light" ? Sun : Moon;

    return (
        <button
            className="navbar-theme-toggle clean-btn navbar__item"
            onClick={toggleColorMode}
            title={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
            <Icon size={18} />
        </button>
    );
}
