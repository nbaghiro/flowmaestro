import { Building, Users, Crown, Sparkles } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";

export function Workspace() {
    return (
        <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
            <PageHeader
                title="Workspace"
                description="Manage your team workspace and collaboration settings"
            />

            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-gradient-to-br from-primary/5 to-purple-500/5">
                <div className="relative mb-4">
                    <Building className="w-12 h-12 text-primary" />
                    <Crown className="w-6 h-6 text-amber-500 absolute -top-2 -right-2" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Workspace Features</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                    Unlock team collaboration, shared workflows, and advanced workspace management
                    with FlowMaestro Pro.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 w-full max-w-2xl">
                    <div className="bg-card p-4 rounded-lg border border-border">
                        <Users className="w-5 h-5 text-primary mb-2" />
                        <h4 className="font-medium text-sm mb-1">Team Collaboration</h4>
                        <p className="text-xs text-muted-foreground">
                            Invite team members and collaborate
                        </p>
                    </div>
                    <div className="bg-card p-4 rounded-lg border border-border">
                        <Sparkles className="w-5 h-5 text-primary mb-2" />
                        <h4 className="font-medium text-sm mb-1">Shared Resources</h4>
                        <p className="text-xs text-muted-foreground">
                            Share workflows and credentials
                        </p>
                    </div>
                    <div className="bg-card p-4 rounded-lg border border-border">
                        <Crown className="w-5 h-5 text-primary mb-2" />
                        <h4 className="font-medium text-sm mb-1">Advanced Controls</h4>
                        <p className="text-xs text-muted-foreground">
                            Roles, permissions, and audit logs
                        </p>
                    </div>
                </div>

                <button className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 rounded-lg transition-opacity shadow-lg">
                    <Crown className="w-4 h-4" />
                    Upgrade to Pro
                </button>
            </div>
        </div>
    );
}
