import { useLocation } from "@docusaurus/router";
import React, { useEffect } from "react";

export default function Root({ children }: { children: React.ReactNode }): JSX.Element {
    const location = useLocation();

    useEffect(() => {
        // Scroll the main content container to top on route change
        const mainContainer = document.querySelector("[class*='docMainContainer']");
        if (mainContainer) {
            mainContainer.scrollTo({ top: 0, behavior: "instant" });
        }
    }, [location.pathname]);

    return <>{children}</>;
}
