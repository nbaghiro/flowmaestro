import { ArrowLeftRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAgentBuilderLayoutStore, type PanelId } from "../../stores/agentBuilderLayoutStore";

interface AgentBuilderLayoutProps {
    /** Navigation panel content */
    navigationPanel: React.ReactNode;
    /** Config panel content */
    configPanel: React.ReactNode;
    /** Chat panel content */
    chatPanel: React.ReactNode;
}

interface SwapButtonProps {
    panelA: PanelId;
    panelB: PanelId;
}

function SwapButton({ panelA, panelB }: SwapButtonProps) {
    const { swapPanels } = useAgentBuilderLayoutStore();

    return (
        <div className="relative flex items-center justify-center w-0 z-30">
            <button
                onClick={() => swapPanels(panelA, panelB)}
                className={cn(
                    "absolute left-1/2 -translate-x-1/2 p-1.5 rounded-full",
                    "bg-card border border-border shadow-sm",
                    "text-muted-foreground hover:text-foreground",
                    "hover:bg-muted hover:border-primary/50 hover:shadow-md",
                    "opacity-60 hover:opacity-100",
                    "transition-all duration-200",
                    "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary"
                )}
            >
                <ArrowLeftRight className="w-3 h-3" />
            </button>
        </div>
    );
}

export function AgentBuilderLayout({
    navigationPanel,
    configPanel,
    chatPanel
}: AgentBuilderLayoutProps) {
    const { getPanelsByOrder, panels } = useAgentBuilderLayoutStore();
    const orderedPanels = getPanelsByOrder();

    // Map panel IDs to their content
    const panelContent: Record<PanelId, React.ReactNode> = {
        navigation: navigationPanel,
        config: configPanel,
        chat: chatPanel
    };

    // Render panels in order with swap buttons between them
    const renderPanels = () => {
        const elements: React.ReactNode[] = [];

        orderedPanels.forEach((panelId, index) => {
            const nextPanelId = index < orderedPanels.length - 1 ? orderedPanels[index + 1] : null;

            // Determine if swap button should show for this panel pair
            // Don't show swap button next to navigation panel (it has fixed position)
            const showSwap = nextPanelId
                ? panelId !== "navigation" &&
                  nextPanelId !== "navigation" &&
                  (panels[panelId].state === "expanded" || panels[nextPanelId].state === "expanded")
                : false;

            // Render the panel
            elements.push(
                <div key={panelId} className="contents group/panel-pair">
                    {panelContent[panelId]}
                </div>
            );

            // Add swap button between panels (not after the last one)
            if (nextPanelId && showSwap) {
                elements.push(
                    <SwapButton
                        key={`swap-${panelId}-${nextPanelId}`}
                        panelA={panelId}
                        panelB={nextPanelId}
                    />
                );
            }
        });

        return elements;
    };

    return <div className="flex-1 flex overflow-hidden">{renderPanels()}</div>;
}
