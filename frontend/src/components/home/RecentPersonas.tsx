import { Users } from "lucide-react";
import type { PersonaDefinitionSummary } from "@flowmaestro/shared";
import { PersonaCard } from "../personas/cards/PersonaCard";
import { HorizontalCardRow } from "./HorizontalCardRow";

interface RecentPersonasProps {
    personas: PersonaDefinitionSummary[];
    onPersonaClick: (persona: PersonaDefinitionSummary) => void;
    onPersonaLaunch: (persona: PersonaDefinitionSummary) => void;
}

export function RecentPersonas({ personas, onPersonaClick, onPersonaLaunch }: RecentPersonasProps) {
    const emptyState = (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-lg bg-card">
            <Users className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">No personas yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
                Explore AI personas to delegate complex tasks.
            </p>
        </div>
    );

    return (
        <HorizontalCardRow
            title="Personas"
            viewAllLink="/personas"
            isEmpty={personas.length === 0}
            emptyState={emptyState}
        >
            {personas.map((persona) => (
                <div key={persona.id} className="flex-shrink-0 w-[380px]">
                    <PersonaCard
                        persona={persona}
                        onClick={() => onPersonaClick(persona)}
                        onLaunch={() => onPersonaLaunch(persona)}
                    />
                </div>
            ))}
        </HorizontalCardRow>
    );
}
