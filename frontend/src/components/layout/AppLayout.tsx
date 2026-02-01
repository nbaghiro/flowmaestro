import { Outlet } from "react-router-dom";
import { useMobile } from "../../hooks/useMobile";
import { useMobileNavStore } from "../../stores/mobileNavStore";
import { useWorkflowGenerationChatStore } from "../../stores/workflowGenerationChatStore";
import { AbstractBackground } from "../common/AbstractBackground";
import { WorkflowGenerationChatPanel } from "../WorkflowGenerationChatPanel";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { MobileDrawer } from "./MobileDrawer";

export function AppLayout() {
    const isMobile = useMobile();
    const { isDrawerOpen, closeDrawer } = useMobileNavStore();
    const { isPanelOpen } = useWorkflowGenerationChatStore();

    return (
        <div className="flex h-screen overflow-hidden bg-muted/30">
            {/* Desktop Sidebar - hidden on mobile */}
            {!isMobile && <AppSidebar />}

            {/* Mobile Drawer - only rendered on mobile */}
            {isMobile && <MobileDrawer isOpen={isDrawerOpen} onClose={closeDrawer} />}

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <AppHeader isMobile={isMobile} />

                {/* Content + Chat Panel container */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Page content */}
                    <AbstractBackground variant="app" className="flex-1 overflow-y-auto">
                        <Outlet />
                    </AbstractBackground>

                    {/* Workflow Generation Chat Panel - rendered alongside content */}
                    {isPanelOpen && <WorkflowGenerationChatPanel />}
                </div>
            </div>
        </div>
    );
}
