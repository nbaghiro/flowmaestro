import { Menu } from "lucide-react";
import { useMobileNavStore } from "../../stores/mobileNavStore";
import { Breadcrumbs } from "./Breadcrumbs";
import { UserDropdown } from "./UserDropdown";

interface AppHeaderProps {
    isMobile?: boolean;
}

export function AppHeader({ isMobile = false }: AppHeaderProps) {
    const { openDrawer } = useMobileNavStore();

    return (
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 flex-shrink-0">
            <div className="flex items-center gap-3">
                {/* Hamburger menu - only on mobile */}
                {isMobile && (
                    <button
                        onClick={openDrawer}
                        className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Open navigation menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                )}
                <Breadcrumbs />
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                <UserDropdown />
            </div>
        </header>
    );
}
