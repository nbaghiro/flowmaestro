import { useMobile } from "../../hooks/useMobile";
import { DesktopRequired } from "./DesktopRequired";
import type { ReactNode } from "react";

interface MobileBuilderGuardProps {
    children: ReactNode;
    title?: string;
    description?: string;
    backUrl?: string;
}

/**
 * Wrapper component that shows a "Desktop Required" message on mobile devices.
 * Use this to wrap builder/editor pages that require a larger screen.
 */
export function MobileBuilderGuard({
    children,
    title,
    description,
    backUrl
}: MobileBuilderGuardProps) {
    const isMobile = useMobile();

    if (isMobile) {
        return <DesktopRequired title={title} description={description} backUrl={backUrl} />;
    }

    return <>{children}</>;
}
