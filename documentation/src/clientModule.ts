import type { ClientModule } from "@docusaurus/types";

const clientModule: ClientModule = {
    onRouteDidUpdate({ location, previousLocation }) {
        // Only scroll if the path actually changed (not just hash)
        if (location.pathname !== previousLocation?.pathname) {
            // Try multiple selectors to find the scrollable container
            const selectors = [
                "[class*='docMainContainer']",
                ".main-wrapper > div:last-child",
                "main",
                ".docPage"
            ];

            for (const selector of selectors) {
                const container = document.querySelector(selector);
                if (container && container.scrollTop > 0) {
                    container.scrollTo({ top: 0, behavior: "instant" });
                    return;
                }
            }

            // Fallback: try to scroll any element with scrollTop
            const mainContainer = document.querySelector("[class*='docMainContainer']");
            if (mainContainer) {
                mainContainer.scrollTop = 0;
            }
        }
    }
};

export default clientModule;
