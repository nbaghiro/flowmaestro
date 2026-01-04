import { Bot } from "lucide-react";
import type { PublicChatInterface } from "@flowmaestro/shared";

interface WelcomeScreenProps {
    chatInterface: PublicChatInterface;
}

export function WelcomeScreen({ chatInterface }: WelcomeScreenProps) {
    const { welcomeMessage } = chatInterface;

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            {/* Bot icon */}
            <Bot className="w-12 h-12 text-muted-foreground/50 mb-3" />

            {/* Welcome message */}
            <p className="text-sm text-muted-foreground max-w-sm whitespace-pre-wrap">
                {welcomeMessage}
            </p>
        </div>
    );
}
