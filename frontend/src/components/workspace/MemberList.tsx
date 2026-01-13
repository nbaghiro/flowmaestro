import { Crown, MoreVertical, Shield, User, UserMinus, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import type { WorkspaceRole, WorkspaceMemberWithUser } from "@flowmaestro/shared";
import { useAuthStore } from "../../stores/authStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { Alert } from "../common/Alert";
import { Button } from "../common/Button";
import { ConfirmDialog } from "../common/ConfirmDialog";

interface MemberListProps {
    onInvite?: () => void;
}

const ROLE_LABELS: Record<WorkspaceRole, { label: string; icon: typeof Crown; color: string }> = {
    owner: { label: "Owner", icon: Crown, color: "text-amber-500" },
    admin: { label: "Admin", icon: Shield, color: "text-blue-500" },
    member: { label: "Member", icon: User, color: "text-muted-foreground" },
    viewer: { label: "Viewer", icon: User, color: "text-muted-foreground" }
};

function MemberAvatar({ name, avatarUrl }: { name?: string | null; avatarUrl?: string | null }) {
    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={name || "Member"}
                className="w-10 h-10 rounded-full object-cover"
            />
        );
    }

    const initials = name
        ? name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
        : "?";

    return (
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
            {initials}
        </div>
    );
}

function MemberActions({
    member,
    currentUserId,
    currentRole,
    onUpdateRole,
    onRemove
}: {
    member: WorkspaceMemberWithUser;
    currentUserId: string;
    currentRole: WorkspaceRole | null;
    onUpdateRole: (userId: string, role: WorkspaceRole) => void;
    onRemove: (userId: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Can't modify owners
    if (member.role === "owner") return null;

    // Only owners and admins can manage members
    if (currentRole !== "owner" && currentRole !== "admin") return null;

    // Admins can't manage other admins
    if (currentRole === "admin" && member.role === "admin") return null;

    // Can't manage yourself
    if (member.userId === currentUserId) return null;

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
        return undefined;
    }, [isOpen]);

    const availableRoles: WorkspaceRole[] =
        currentRole === "owner" ? ["admin", "member", "viewer"] : ["member", "viewer"];

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
                <MoreVertical className="h-4 w-4" />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden min-w-[160px]">
                    <div className="py-1">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Change Role
                        </div>
                        {availableRoles.map((role) => (
                            <button
                                key={role}
                                onClick={() => {
                                    onUpdateRole(member.userId, role);
                                    setIsOpen(false);
                                }}
                                disabled={role === member.role}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                                    role === member.role
                                        ? "text-muted-foreground cursor-default"
                                        : "text-foreground"
                                }`}
                            >
                                {role === member.role && "✓ "}
                                {ROLE_LABELS[role].label}
                            </button>
                        ))}
                    </div>
                    <div className="border-t border-border py-1">
                        <button
                            onClick={() => {
                                onRemove(member.userId);
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                        >
                            <UserMinus className="h-4 w-4" />
                            Remove Member
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export function MemberList({ onInvite }: MemberListProps) {
    const {
        members,
        membersLoading,
        currentWorkspace,
        currentRole,
        isOwner,
        fetchMembers,
        updateMemberRole,
        removeMember
    } = useWorkspaceStore();

    const { user: currentUser } = useAuthStore();
    const [error, setError] = useState<string | null>(null);
    const [memberToRemove, setMemberToRemove] = useState<WorkspaceMemberWithUser | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    // Fetch members on mount
    useEffect(() => {
        if (currentWorkspace) {
            fetchMembers().catch((err) => {
                setError(err instanceof Error ? err.message : "Failed to load members");
            });
        }
    }, [currentWorkspace, fetchMembers]);

    const handleUpdateRole = async (userId: string, role: WorkspaceRole) => {
        setError(null);
        try {
            await updateMemberRole(userId, role);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update role");
        }
    };

    const handleRemoveMember = async () => {
        if (!memberToRemove) return;

        setIsRemoving(true);
        setError(null);
        try {
            await removeMember(memberToRemove.userId);
            setMemberToRemove(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to remove member");
        } finally {
            setIsRemoving(false);
        }
    };

    if (membersLoading && members.length === 0) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const canInvite = isOwner || currentRole === "admin";

    return (
        <div className="space-y-4">
            {error && (
                <Alert variant="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-medium text-foreground">Team Members</h3>
                    <p className="text-sm text-muted-foreground">
                        {members.length} member{members.length !== 1 ? "s" : ""} in this workspace
                    </p>
                </div>
                {canInvite && onInvite && (
                    <Button variant="primary" size="sm" onClick={onInvite}>
                        Invite Member
                    </Button>
                )}
            </div>

            {/* Member List */}
            <div className="border border-border rounded-lg divide-y divide-border">
                {members.map((member) => {
                    const roleInfo = ROLE_LABELS[member.role as WorkspaceRole];
                    const RoleIcon = roleInfo?.icon || User;

                    return (
                        <div
                            key={member.userId}
                            className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                        >
                            <MemberAvatar name={member.user?.name} avatarUrl={undefined} />

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground truncate">
                                        {member.user?.name || "Unknown User"}
                                    </span>
                                    {member.userId === currentUser?.id && (
                                        <span className="text-xs text-muted-foreground">(you)</span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                    {member.user?.email}
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex items-center gap-1.5 text-sm ${roleInfo?.color || "text-muted-foreground"}`}
                                >
                                    <RoleIcon className="h-4 w-4" />
                                    <span>{roleInfo?.label || member.role}</span>
                                </div>

                                <MemberActions
                                    member={member}
                                    currentUserId={currentUser?.id || ""}
                                    currentRole={currentRole}
                                    onUpdateRole={handleUpdateRole}
                                    onRemove={(userId) => {
                                        const m = members.find((mem) => mem.userId === userId);
                                        if (m) setMemberToRemove(m);
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}

                {members.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                        <p>No members found</p>
                    </div>
                )}
            </div>

            {/* Remove Member Confirmation */}
            <ConfirmDialog
                isOpen={!!memberToRemove && !isRemoving}
                onClose={() => setMemberToRemove(null)}
                onConfirm={handleRemoveMember}
                title="Remove Member"
                message={`Are you sure you want to remove ${memberToRemove?.user?.name || memberToRemove?.user?.email} from this workspace? They will lose access to all resources.`}
                confirmText={isRemoving ? "Removing..." : "Remove"}
                variant="danger"
            />
        </div>
    );
}
