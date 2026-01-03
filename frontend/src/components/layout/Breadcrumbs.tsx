import { ChevronRight, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getFormInterfaceById } from "@/lib/api";

const routeLabels: Record<string, string> = {
    "/": "Workflows",
    "/credentials": "Credentials",
    "/integrations": "Integrations",
    "/templates": "Templates",
    "/settings": "Settings",
    "/account": "Account",
    "/workspace": "Workspace"
};

export function Breadcrumbs() {
    const location = useLocation();
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const [interfaceNames, setInterfaceNames] = useState<Record<string, string>>({});

    useEffect(() => {
        const interfacesIndex = pathSegments.indexOf("interfaces");
        if (interfacesIndex === -1) return;

        const candidateId = pathSegments[interfacesIndex + 1];
        if (!candidateId || candidateId === "new" || interfaceNames[candidateId]) return;

        let cancelled = false;

        async function loadName() {
            try {
                const res = await getFormInterfaceById(candidateId);
                if (!cancelled) {
                    setInterfaceNames((prev) => ({ ...prev, [candidateId]: res.data.name }));
                }
            } catch {
                // Keep fallback label if the fetch fails
            }
        }

        loadName();
        return () => {
            cancelled = true;
        };
    }, [pathSegments, interfaceNames]);

    // Build breadcrumb items
    const breadcrumbs: Array<{ label: string; path: string; isLast: boolean }> = [];

    if (location.pathname === "/") {
        breadcrumbs.push({ label: "Workflows", path: "/", isLast: true });
    } else {
        // Add home
        breadcrumbs.push({ label: "Home", path: "/", isLast: false });

        // Add segments
        let currentPath = "";
        pathSegments.forEach((segment, index) => {
            currentPath += `/${segment}`;
            const previousSegment = pathSegments[index - 1];
            const interfaceLabel =
                previousSegment === "interfaces" ? interfaceNames[segment] : undefined;
            const label =
                routeLabels[currentPath] ||
                interfaceLabel ||
                segment.charAt(0).toUpperCase() + segment.slice(1);
            const isLast = index === pathSegments.length - 1;
            breadcrumbs.push({ label, path: currentPath, isLast });
        });
    }

    return (
        <nav className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
                <div key={crumb.path} className="flex items-center gap-2">
                    {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    {crumb.isLast ? (
                        <span className="text-foreground font-medium">{crumb.label}</span>
                    ) : (
                        <Link
                            to={crumb.path}
                            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                            {index === 0 && <Home className="w-3.5 h-3.5" />}
                            <span>{crumb.label}</span>
                        </Link>
                    )}
                </div>
            ))}
        </nav>
    );
}
