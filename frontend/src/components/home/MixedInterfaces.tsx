import { PanelTop } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ChatInterfaceSummary, FormInterfaceSummary } from "@flowmaestro/shared";
import { ChatInterfaceCard } from "../cards/ChatInterfaceCard";
import { FormInterfaceCard } from "../cards/FormInterfaceCard";
import { HorizontalCardRow } from "./HorizontalCardRow";

type MixedInterface =
    | { type: "form"; interface: FormInterfaceSummary }
    | { type: "chat"; interface: ChatInterfaceSummary };

interface MixedInterfacesProps {
    interfaces: MixedInterface[];
}

export function MixedInterfaces({ interfaces }: MixedInterfacesProps) {
    const navigate = useNavigate();

    const handleFormClick = (fi: FormInterfaceSummary) => {
        navigate(`/forms/${fi.id}/edit`);
    };

    const handleChatClick = (ci: ChatInterfaceSummary) => {
        navigate(`/chats/${ci.id}/edit`);
    };

    const emptyState = (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-lg bg-card">
            <PanelTop className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">No interfaces yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
                Create form or chat interfaces to collect data and interact with users.
            </p>
        </div>
    );

    return (
        <HorizontalCardRow
            title="Recent Interfaces"
            viewAllLink="/forms"
            viewAllText="View all"
            isEmpty={interfaces.length === 0}
            emptyState={emptyState}
        >
            {interfaces.map((item, index) => (
                <div
                    key={`${item.type}-${item.interface.id}-${index}`}
                    className="flex-shrink-0 w-[380px]"
                >
                    {item.type === "form" ? (
                        <FormInterfaceCard
                            formInterface={item.interface}
                            onClick={() => handleFormClick(item.interface)}
                        />
                    ) : (
                        <ChatInterfaceCard
                            chatInterface={item.interface}
                            onClick={() => handleChatClick(item.interface)}
                        />
                    )}
                </div>
            ))}
        </HorizontalCardRow>
    );
}
