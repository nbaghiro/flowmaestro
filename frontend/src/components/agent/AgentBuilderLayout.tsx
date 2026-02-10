import { useAgentBuilderLayoutStore, type PanelId } from "../../stores/agentBuilderLayoutStore";

interface AgentBuilderLayoutProps {
    /** Navigation panel content */
    navigationPanel: React.ReactNode;
    /** Config panel content */
    configPanel: React.ReactNode;
    /** Chat panel content */
    chatPanel: React.ReactNode;
}

export function AgentBuilderLayout({
    navigationPanel,
    configPanel,
    chatPanel
}: AgentBuilderLayoutProps) {
    const { getPanelsByOrder } = useAgentBuilderLayoutStore();
    const orderedPanels = getPanelsByOrder();

    // Map panel IDs to their content
    const panelContent: Record<PanelId, React.ReactNode> = {
        navigation: navigationPanel,
        config: configPanel,
        chat: chatPanel
    };

    return (
        <div className="flex-1 flex overflow-hidden">
            {orderedPanels.map((panelId) => (
                <div key={panelId} className="contents">
                    {panelContent[panelId]}
                </div>
            ))}
        </div>
    );
}
