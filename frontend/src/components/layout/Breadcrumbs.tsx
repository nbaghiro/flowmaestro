import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const routeLabels: Record<string, string> = {
    "/": "Home",
    "/workflows": "Workflows",
    "/credentials": "Credentials",
    "/integrations": "Integrations",
    "/templates": "Templates",
    "/settings": "Settings",
    "/account": "Account",
    "/workspace": "Workspace"
};

// Check if a string looks like a UUID
const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

// Truncate UUID to show only first 8 characters
const truncateUUID = (uuid: string): string => {
    return uuid.slice(0, 8) + "...";
};

export function Breadcrumbs() {
    const location = useLocation();
    const pathSegments = location.pathname.split("/").filter(Boolean);

    // Build breadcrumb items
    const breadcrumbs: Array<{ label: string; path: string; isLast: boolean }> = [];

    if (location.pathname === "/") {
        // Show home icon for root path
        breadcrumbs.push({ label: "Home", path: "/", isLast: true });
    } else {
        // Add home
        breadcrumbs.push({ label: "Home", path: "/", isLast: false });

        // Add segments
        let currentPath = "";
        pathSegments.forEach((segment, index) => {
            currentPath += `/${segment}`;
            let label =
                routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);

            // Truncate UUIDs for cleaner display
            if (isUUID(segment)) {
                label = truncateUUID(segment);
            }

            const isLast = index === pathSegments.length - 1;
            breadcrumbs.push({ label, path: currentPath, isLast });
        });
    }

    return (
        <nav className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => {
                const isHome = crumb.path === "/";

                return (
                    <div key={crumb.path} className="flex items-center gap-2">
                        {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        {crumb.isLast ? (
                            <span className="text-foreground font-medium flex items-center gap-1">
                                {isHome && <Home className="w-3.5 h-3.5" />}
                                {crumb.label}
                            </span>
                        ) : (
                            <Link
                                to={crumb.path}
                                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                            >
                                {isHome && <Home className="w-3.5 h-3.5" />}
                                <span>{crumb.label}</span>
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
