import { useState, useEffect, FormEvent } from "react";
import type { WorkspaceRole } from "@flowmaestro/shared";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { Alert } from "../common/Alert";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";
import { Select, SelectItem } from "../common/Select";
import { Textarea } from "../common/Textarea";

interface InviteMemberDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const ROLE_OPTIONS: { value: WorkspaceRole; label: string; description: string }[] = [
    {
        value: "member",
        label: "Member",
        description: "Can create and edit workflows, agents, and other resources"
    },
    {
        value: "admin",
        label: "Admin",
        description: "Can manage members and workspace settings"
    },
    {
        value: "viewer",
        label: "Viewer",
        description: "Can only view resources, cannot make changes"
    }
];

export function InviteMemberDialog({ isOpen, onClose, onSuccess }: InviteMemberDialogProps) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<WorkspaceRole>("member");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const { inviteMember, currentWorkspace } = useWorkspaceStore();

    // Reset form when dialog opens
    useEffect(() => {
        if (isOpen) {
            setEmail("");
            setRole("member");
            setMessage("");
            setError("");
            setSuccess(false);
        }
    }, [isOpen]);

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail) {
            setError("Email address is required");
            return;
        }

        if (!validateEmail(trimmedEmail)) {
            setError("Please enter a valid email address");
            return;
        }

        setIsSubmitting(true);
        try {
            await inviteMember(trimmedEmail, role, message.trim() || undefined);
            setSuccess(true);

            // Close dialog after short delay to show success message
            setTimeout(() => {
                handleClose();
                if (onSuccess) {
                    onSuccess();
                }
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send invitation");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setEmail("");
            setRole("member");
            setMessage("");
            setError("");
            setSuccess(false);
            onClose();
        }
    };

    const selectedRoleOption = ROLE_OPTIONS.find((opt) => opt.value === role);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title="Invite Team Member"
            size="sm"
            closeOnBackdropClick={!isSubmitting}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert variant="error">{error}</Alert>}
                {success && <Alert variant="success">Invitation sent to {email}!</Alert>}

                <div>
                    <label
                        htmlFor="member-email"
                        className="block text-sm font-medium text-foreground mb-1.5"
                    >
                        Email Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                        id="member-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        required
                        disabled={isSubmitting || success}
                        autoFocus
                    />
                </div>

                <div>
                    <label
                        htmlFor="member-role"
                        className="block text-sm font-medium text-foreground mb-1.5"
                    >
                        Role
                    </label>
                    <Select
                        value={role}
                        onChange={(value) => setRole(value as WorkspaceRole)}
                        disabled={isSubmitting || success}
                        placeholder="Select a role"
                    >
                        {ROLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </Select>
                    {selectedRoleOption && (
                        <p className="mt-1 text-xs text-muted-foreground">
                            {selectedRoleOption.description}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="invite-message"
                        className="block text-sm font-medium text-foreground mb-1.5"
                    >
                        Personal Message (optional)
                    </label>
                    <Textarea
                        id="invite-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Add a personal note to the invitation..."
                        rows={2}
                        maxLength={500}
                        disabled={isSubmitting || success}
                    />
                </div>

                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="text-muted-foreground">
                        An email invitation will be sent to join{" "}
                        <span className="font-medium text-foreground">
                            {currentWorkspace?.name || "this workspace"}
                        </span>
                        . They will need to create an account or sign in to accept.
                    </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        {success ? "Close" : "Cancel"}
                    </Button>
                    {!success && (
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isSubmitting || !email.trim()}
                            loading={isSubmitting}
                        >
                            {isSubmitting ? "Sending..." : "Send Invitation"}
                        </Button>
                    )}
                </div>
            </form>
        </Dialog>
    );
}
