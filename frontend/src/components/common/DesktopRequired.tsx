import { Monitor, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./Button";
import { Logo } from "./Logo";

interface DesktopRequiredProps {
    title?: string;
    description?: string;
    backUrl?: string;
}

export function DesktopRequired({
    title = "Desktop Required",
    description = "This feature requires a larger screen for the best experience. Please open FlowMaestro on a desktop or laptop computer.",
    backUrl = "/"
}: DesktopRequiredProps) {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Simple header */}
            <header className="h-16 border-b border-border bg-card flex items-center px-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Logo size="md" />
                    <span className="font-semibold text-foreground">FlowMaestro</span>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mb-6">
                    <Monitor className="w-10 h-10 text-muted-foreground" />
                </div>

                <h1 className="text-2xl font-bold text-foreground text-center mb-3">{title}</h1>

                <p className="text-base text-muted-foreground text-center max-w-md mb-8 leading-relaxed">
                    {description}
                </p>

                <Button
                    variant="primary"
                    size="lg"
                    onClick={() => navigate(backUrl)}
                    className="min-w-[200px] gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Go Back
                </Button>
            </div>
        </div>
    );
}
