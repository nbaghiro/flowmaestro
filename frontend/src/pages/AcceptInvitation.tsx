import { Loader2, Users, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert } from "../components/common/Alert";
import { Button } from "../components/common/Button";
import { Logo } from "../components/common/Logo";
import { getInvitation, acceptInvitation, declineInvitation } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { useWorkspaceStore } from "../stores/workspaceStore";

interface InvitationData {
    id: string;
    email: string;
    role: string;
    message: string | null;
    expiresAt: string;
    workspace: { id: string; name: string; slug: string };
    inviter: { id: string; name: string | null; email: string };
}

export function AcceptInvitation() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();
    const { fetchWorkspaces, switchWorkspace } = useWorkspaceStore();

    const [token, setToken] = useState<string | null>(null);
    const [invitation, setInvitation] = useState<InvitationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [declined, setDeclined] = useState(false);

    // Get token from URL
    useEffect(() => {
        const tokenParam = searchParams.get("token");
        if (!tokenParam) {
            setError("Invalid or missing invitation token.");
            setIsLoading(false);
        } else {
            setToken(tokenParam);
        }
    }, [searchParams]);

    // Fetch invitation details
    useEffect(() => {
        async function fetchInvitation() {
            if (!token) return;

            try {
                const response = await getInvitation(token);
                if (response.data) {
                    setInvitation(response.data);
                } else {
                    setError("Invalid invitation");
                }
            } catch (err) {
                setError((err as Error).message || "Failed to load invitation");
            } finally {
                setIsLoading(false);
            }
        }

        fetchInvitation();
    }, [token]);

    const handleAccept = async () => {
        if (!token) return;

        setIsAccepting(true);
        setError("");

        try {
            const response = await acceptInvitation(token);
            if (!response.data) {
                throw new Error("Failed to accept invitation");
            }
            setSuccess(true);

            // Refresh workspaces and switch to the new one
            await fetchWorkspaces();
            await switchWorkspace(response.data.workspaceId);

            // Redirect to home after a short delay
            setTimeout(() => {
                navigate("/");
            }, 2000);
        } catch (err) {
            setError((err as Error).message || "Failed to accept invitation");
        } finally {
            setIsAccepting(false);
        }
    };

    const handleDecline = async () => {
        if (!token) return;

        setIsDeclining(true);
        setError("");

        try {
            await declineInvitation(token);
            setDeclined(true);
        } catch (err) {
            setError((err as Error).message || "Failed to decline invitation");
        } finally {
            setIsDeclining(false);
        }
    };

    const roleDisplay = invitation?.role
        ? invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)
        : "";

    // Check if user email matches invitation email
    const emailMismatch =
        isAuthenticated &&
        invitation &&
        user?.email?.toLowerCase() !== invitation.email.toLowerCase();

    return (
        <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#222222] px-4">
            <div className="w-full max-w-md">
                <div className="bg-card rounded-lg shadow-lg p-8">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="inline-flex mb-4">
                            <Logo size="lg" />
                        </div>
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="text-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                            <p className="text-muted-foreground">Loading invitation...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !isLoading && (
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-foreground mb-2">
                                Unable to load invitation
                            </h2>
                            <Alert variant="error" className="mb-6">
                                {error}
                            </Alert>
                            <Link to="/">
                                <Button variant="secondary">Go to Dashboard</Button>
                            </Link>
                        </div>
                    )}

                    {/* Success State */}
                    {success && (
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-foreground mb-2">
                                Welcome to {invitation?.workspace.name}!
                            </h2>
                            <p className="text-muted-foreground mb-6">
                                You've joined as a {roleDisplay}. Redirecting to your new
                                workspace...
                            </p>
                            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                        </div>
                    )}

                    {/* Declined State */}
                    {declined && (
                        <div className="text-center">
                            <h2 className="text-xl font-semibold text-foreground mb-2">
                                Invitation Declined
                            </h2>
                            <p className="text-muted-foreground mb-6">
                                You've declined the invitation to join {invitation?.workspace.name}.
                            </p>
                            <Link to="/">
                                <Button variant="secondary">Go to Dashboard</Button>
                            </Link>
                        </div>
                    )}

                    {/* Invitation Details */}
                    {!isLoading && !error && !success && !declined && invitation && (
                        <>
                            <div className="text-center mb-6">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-6 h-6 text-primary" />
                                </div>
                                <h2 className="text-xl font-semibold text-foreground mb-2">
                                    You're invited!
                                </h2>
                                <p className="text-muted-foreground">
                                    <strong>
                                        {invitation.inviter.name || invitation.inviter.email}
                                    </strong>{" "}
                                    invited you to join
                                </p>
                            </div>

                            {/* Workspace Card */}
                            <div className="bg-muted/50 rounded-lg p-4 mb-6">
                                <h3 className="font-semibold text-foreground text-lg mb-1">
                                    {invitation.workspace.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Role:{" "}
                                    <span className="font-medium text-foreground">
                                        {roleDisplay}
                                    </span>
                                </p>
                                {invitation.message && (
                                    <div className="mt-3 pt-3 border-t border-border">
                                        <p className="text-xs text-muted-foreground mb-1">
                                            Message:
                                        </p>
                                        <p className="text-sm text-foreground italic">
                                            "{invitation.message}"
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Email Mismatch Warning */}
                            {emailMismatch && (
                                <Alert variant="warning" className="mb-6">
                                    This invitation was sent to <strong>{invitation.email}</strong>,
                                    but you're logged in as <strong>{user?.email}</strong>. Please
                                    log in with the correct account to accept this invitation.
                                </Alert>
                            )}

                            {/* Not Logged In */}
                            {!isAuthenticated && (
                                <Alert variant="info" className="mb-6">
                                    Please log in or create an account to accept this invitation.
                                </Alert>
                            )}

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                {isAuthenticated && !emailMismatch ? (
                                    <>
                                        <Button
                                            variant="primary"
                                            className="w-full"
                                            onClick={handleAccept}
                                            loading={isAccepting}
                                            disabled={isAccepting || isDeclining}
                                        >
                                            Accept Invitation
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="w-full"
                                            onClick={handleDecline}
                                            loading={isDeclining}
                                            disabled={isAccepting || isDeclining}
                                        >
                                            Decline
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                                        >
                                            <Button variant="primary" className="w-full">
                                                Log In
                                            </Button>
                                        </Link>
                                        <Link
                                            to={`/register?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}&email=${encodeURIComponent(invitation.email)}`}
                                        >
                                            <Button variant="secondary" className="w-full">
                                                Create Account
                                            </Button>
                                        </Link>
                                    </>
                                )}
                            </div>

                            {/* Expiry Notice */}
                            <p className="text-xs text-muted-foreground text-center mt-6">
                                This invitation expires on{" "}
                                {new Date(invitation.expiresAt).toLocaleDateString()}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
