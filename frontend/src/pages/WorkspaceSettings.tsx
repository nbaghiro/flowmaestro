import { Building2, Users, CreditCard, Trash2, ArrowUpCircle, Loader2 } from "lucide-react";
import { useEffect, useState, FormEvent, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { WORKSPACE_LIMITS } from "@flowmaestro/shared";
import { UpgradeDialog } from "../components/billing";
import { Alert } from "../components/common/Alert";
import { Button } from "../components/common/Button";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { Input } from "../components/common/Input";
import { PageHeader } from "../components/common/PageHeader";
import { Textarea } from "../components/common/Textarea";
import { CreateWorkspaceDialog, InviteMemberDialog, MemberList } from "../components/workspace";
import { WorkspaceEvents, BillingEvents } from "../lib/analytics";
import { useWorkspaceStore } from "../stores/workspaceStore";

function WorkspaceInfoSection() {
    const { currentWorkspace, isOwner, updateWorkspace } = useWorkspaceStore();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(currentWorkspace?.name || "");
    const [description, setDescription] = useState(currentWorkspace?.description || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (currentWorkspace) {
            setName(currentWorkspace.name);
            setDescription(currentWorkspace.description || "");
        }
    }, [currentWorkspace]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentWorkspace) return;

        setError(null);
        setSuccess(false);
        setIsSubmitting(true);

        try {
            const fieldsUpdated: string[] = [];
            if (name.trim() !== currentWorkspace.name) fieldsUpdated.push("name");
            if (description.trim() !== (currentWorkspace.description || ""))
                fieldsUpdated.push("description");

            await updateWorkspace(currentWorkspace.id, {
                name: name.trim(),
                description: description.trim() || undefined
            });

            if (fieldsUpdated.length > 0) {
                WorkspaceEvents.infoUpdated({ workspaceId: currentWorkspace.id, fieldsUpdated });
            }

            setSuccess(true);
            setIsEditing(false);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update workspace");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setName(currentWorkspace?.name || "");
        setDescription(currentWorkspace?.description || "");
        setIsEditing(false);
        setError(null);
    };

    if (!currentWorkspace) return null;

    const limits = WORKSPACE_LIMITS[currentWorkspace.type];

    return (
        <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground mb-1">
                                Workspace Details
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Manage your workspace information
                            </p>
                        </div>
                        {isOwner && !isEditing && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                            >
                                Edit
                            </Button>
                        )}
                    </div>

                    {error && (
                        <Alert variant="error" className="mb-4" onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert variant="success" className="mb-4">
                            Workspace updated successfully
                        </Alert>
                    )}

                    {isEditing ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">
                                    Name
                                </label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Workspace name"
                                    maxLength={100}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">
                                    Description
                                </label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What is this workspace for?"
                                    rows={2}
                                    maxLength={500}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleCancel}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={isSubmitting || !name.trim()}
                                    loading={isSubmitting}
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm text-muted-foreground">Name</span>
                                    <p className="font-medium text-foreground">
                                        {currentWorkspace.name}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Plan</span>
                                    <p className="font-medium text-foreground capitalize">
                                        {currentWorkspace.type}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Category</span>
                                    <p className="font-medium text-foreground capitalize">
                                        {currentWorkspace.category}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">
                                        Member Limit
                                    </span>
                                    <p className="font-medium text-foreground">
                                        {limits.max_members === -1
                                            ? "Unlimited"
                                            : limits.max_members}
                                    </p>
                                </div>
                            </div>
                            {currentWorkspace.description && (
                                <div>
                                    <span className="text-sm text-muted-foreground">
                                        Description
                                    </span>
                                    <p className="text-foreground">
                                        {currentWorkspace.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function UsageSection() {
    const { currentWorkspace, creditBalance, creditsLoading, fetchCredits } = useWorkspaceStore();

    useEffect(() => {
        if (currentWorkspace) {
            fetchCredits();
        }
    }, [currentWorkspace, fetchCredits]);

    if (!currentWorkspace) return null;

    const limits = WORKSPACE_LIMITS[currentWorkspace.type];

    return (
        <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <CreditCard className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">Usage & Limits</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Current usage and plan limits
                    </p>

                    <div className="space-y-4">
                        {/* Credits */}
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-foreground">Credits</span>
                                {creditsLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                    <span className="text-sm text-muted-foreground">
                                        {creditBalance?.available || 0} available
                                    </span>
                                )}
                            </div>
                            {creditBalance && (
                                <div className="text-xs text-muted-foreground space-y-1">
                                    <div className="flex justify-between">
                                        <span>Subscription</span>
                                        <span>{creditBalance.subscription}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Purchased</span>
                                        <span>{creditBalance.purchased}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Bonus</span>
                                        <span>{creditBalance.bonus}</span>
                                    </div>
                                    {creditBalance.reserved > 0 && (
                                        <div className="flex justify-between text-amber-500">
                                            <span>Reserved</span>
                                            <span>-{creditBalance.reserved}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Resource Counts */}
                        {currentWorkspace._count && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <div className="text-xs text-muted-foreground">Workflows</div>
                                    <div className="font-medium text-foreground">
                                        {currentWorkspace._count.workflows || 0} /{" "}
                                        {limits.max_workflows === -1 ? "∞" : limits.max_workflows}
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <div className="text-xs text-muted-foreground">Agents</div>
                                    <div className="font-medium text-foreground">
                                        {currentWorkspace._count.agents || 0} /{" "}
                                        {limits.max_agents === -1 ? "∞" : limits.max_agents}
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <div className="text-xs text-muted-foreground">
                                        Knowledge Bases
                                    </div>
                                    <div className="font-medium text-foreground">
                                        {currentWorkspace._count.knowledgeBases || 0} /{" "}
                                        {limits.max_knowledge_bases}
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <div className="text-xs text-muted-foreground">Members</div>
                                    <div className="font-medium text-foreground">
                                        {currentWorkspace._count.members || 1} /{" "}
                                        {limits.max_members === -1 ? "∞" : limits.max_members}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function UpgradeSection() {
    const { currentWorkspace, initialize } = useWorkspaceStore();
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

    if (!currentWorkspace || currentWorkspace.type === "team") return null;

    const plans = [
        {
            type: "pro" as const,
            name: "Pro",
            price: "$29/mo",
            credits: "2,500 credits/month",
            features: ["50 workflows", "20 agents", "10 knowledge bases", "5 team members"]
        },
        {
            type: "team" as const,
            name: "Team",
            price: "$99/mo",
            credits: "10,000 credits/month",
            features: [
                "Unlimited workflows",
                "Unlimited agents",
                "50 knowledge bases",
                "Unlimited members"
            ]
        }
    ];

    const availablePlans = plans.filter((p) => {
        if (currentWorkspace.type === "free") return true;
        if (currentWorkspace.type === "pro") return p.type === "team";
        return false;
    });

    if (availablePlans.length === 0) return null;

    const handleUpgradeSuccess = () => {
        // Refresh workspace data to get updated plan/limits
        initialize();
    };

    return (
        <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <ArrowUpCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">Upgrade Plan</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Get more resources and features
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                        {availablePlans.map((plan) => (
                            <div
                                key={plan.type}
                                className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-foreground">{plan.name}</h4>
                                    <span className="text-sm font-medium text-primary">
                                        {plan.price}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{plan.credits}</p>
                                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                                    {plan.features.map((feature) => (
                                        <li key={feature}>• {feature}</li>
                                    ))}
                                </ul>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                        BillingEvents.upgradeDialogOpened({
                                            currentPlan: currentWorkspace.type,
                                            targetPlan: plan.type
                                        });
                                        setShowUpgradeDialog(true);
                                    }}
                                >
                                    Upgrade to {plan.name}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <UpgradeDialog
                isOpen={showUpgradeDialog}
                onClose={() => setShowUpgradeDialog(false)}
                workspaceId={currentWorkspace.id}
                currentPlan={currentWorkspace.type}
                onSuccess={handleUpgradeSuccess}
            />
        </div>
    );
}

function DangerZoneSection() {
    const navigate = useNavigate();
    const { currentWorkspace, isOwner, deleteWorkspace, ownedWorkspaces, memberWorkspaces } =
        useWorkspaceStore();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!currentWorkspace || !isOwner) return null;

    // Can't delete the last workspace
    const totalWorkspaces = ownedWorkspaces.length + memberWorkspaces.length;
    const canDelete = totalWorkspaces > 1;

    const handleDelete = async () => {
        setIsDeleting(true);
        setError(null);

        try {
            WorkspaceEvents.deleted({ workspaceId: currentWorkspace.id });
            await deleteWorkspace(currentWorkspace.id);
            navigate("/");
            window.location.reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete workspace");
            setIsDeleting(false);
        }
    };

    return (
        <div className="bg-card border border-red-500/30 rounded-lg p-6">
            <div className="flex items-start gap-4">
                <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                    <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Irreversible and destructive actions
                    </p>

                    {error && (
                        <Alert variant="error" className="mb-4" onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <div className="flex items-center justify-between p-4 border border-red-500/30 rounded-lg">
                        <div>
                            <p className="font-medium text-foreground">Delete Workspace</p>
                            <p className="text-sm text-muted-foreground">
                                {canDelete
                                    ? "Permanently delete this workspace and all its data"
                                    : "You cannot delete your only workspace"}
                            </p>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={!canDelete}
                        >
                            Delete
                        </Button>
                    </div>

                    <ConfirmDialog
                        isOpen={showDeleteConfirm && !isDeleting}
                        onClose={() => setShowDeleteConfirm(false)}
                        onConfirm={handleDelete}
                        title="Delete Workspace"
                        message={`Are you sure you want to delete "${currentWorkspace.name}"? This will permanently delete all workflows, agents, knowledge bases, and other resources in this workspace. This action cannot be undone.`}
                        confirmText={isDeleting ? "Deleting..." : "Delete Workspace"}
                        variant="danger"
                    />
                </div>
            </div>
        </div>
    );
}

export function WorkspaceSettings() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { currentWorkspace, isLoading, isInitialized, initialize } = useWorkspaceStore();

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showInviteDialog, setShowInviteDialog] = useState(false);

    // Track page view
    const hasTrackedPageView = useRef(false);
    useEffect(() => {
        if (currentWorkspace && !hasTrackedPageView.current) {
            WorkspaceEvents.settingsOpened({ workspaceId: currentWorkspace.id });
            hasTrackedPageView.current = true;
        }
    }, [currentWorkspace]);

    // Initialize workspace store
    useEffect(() => {
        if (!isInitialized && !isLoading) {
            initialize();
        }
    }, [isInitialized, isLoading, initialize]);

    // Handle URL action params
    useEffect(() => {
        const action = searchParams.get("action");
        if (action === "create") {
            setShowCreateDialog(true);
            // Clean up URL
            navigate("/workspace/settings", { replace: true });
        } else if (action === "invite") {
            setShowInviteDialog(true);
            navigate("/workspace/settings", { replace: true });
        }
    }, [searchParams, navigate]);

    if (isLoading && !currentWorkspace) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8 flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!currentWorkspace) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8">
                <Alert variant="error">No workspace selected</Alert>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8">
            <PageHeader
                title="Workspace Settings"
                description={`Manage settings for ${currentWorkspace.name}`}
            />

            <div className="space-y-6">
                {/* Workspace Info */}
                <WorkspaceInfoSection />

                {/* Team Members */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <MemberList onInvite={() => setShowInviteDialog(true)} />
                        </div>
                    </div>
                </div>

                {/* Usage & Limits */}
                <UsageSection />

                {/* Upgrade */}
                <UpgradeSection />

                {/* Danger Zone */}
                <DangerZoneSection />
            </div>

            {/* Dialogs */}
            <CreateWorkspaceDialog
                isOpen={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
            />

            <InviteMemberDialog
                isOpen={showInviteDialog}
                onClose={() => setShowInviteDialog(false)}
                onSuccess={() => {
                    // Refresh members list
                    useWorkspaceStore.getState().fetchMembers();
                }}
            />
        </div>
    );
}
