import { Breadcrumbs } from "./Breadcrumbs";
import { UserDropdown } from "./UserDropdown";

export function AppHeader() {
    return (
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-4">
                <Breadcrumbs />
            </div>

            <div className="flex items-center gap-4">
                {/* Future: Workspace Switcher */}
                {/* Future: Global Search */}
                <UserDropdown />
            </div>
        </header>
    );
}
