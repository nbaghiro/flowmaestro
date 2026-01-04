import {
    ArrowLeft,
    MessageSquare,
    Clock,
    Globe,
    Monitor,
    RefreshCw,
    Loader2,
    ChevronRight
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import type { ChatInterface, ChatInterfaceSession } from "@flowmaestro/shared";
import { getChatInterface, getChatInterfaceSessions } from "../lib/api";

export function ChatInterfaceSessionsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [chatInterface, setChatInterface] = useState<ChatInterface | null>(null);
    const [sessions, setSessions] = useState<ChatInterfaceSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [selectedSession, setSelectedSession] = useState<ChatInterfaceSession | null>(null);

    const loadData = async (refresh = false) => {
        if (!id) return;

        if (refresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            // Load chat interface if not already loaded
            if (!chatInterface) {
                const interfaceResponse = await getChatInterface(id);
                if (interfaceResponse.success && interfaceResponse.data) {
                    setChatInterface(interfaceResponse.data);
                } else {
                    setError(interfaceResponse.error || "Failed to load chat interface");
                    return;
                }
            }

            // Load sessions
            const sessionsResponse = await getChatInterfaceSessions(id, {
                offset: (page - 1) * 20,
                limit: 20
            });

            if (sessionsResponse.success && sessionsResponse.data) {
                setSessions(sessionsResponse.data.items);
                setHasMore(sessionsResponse.data.hasMore);
            } else {
                setError(sessionsResponse.error || "Failed to load sessions");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id, page]);

    const formatDate = (date: Date | string) => {
        const d = new Date(date);
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });
    };

    const formatDuration = (firstSeen: Date | string, lastActivity: Date | string) => {
        const start = new Date(firstSeen);
        const end = new Date(lastActivity);
        const diffMs = end.getTime() - start.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "< 1 min";
        if (diffMins < 60) return `${diffMins} min`;

        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}h ${mins}m`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                        Active
                    </span>
                );
            case "ended":
                return (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                        Ended
                    </span>
                );
            case "expired":
                return (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                        Expired
                    </span>
                );
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !chatInterface) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                        {error || "Chat interface not found"}
                    </p>
                    <button
                        onClick={() => navigate("/chat-interfaces")}
                        className="text-primary hover:underline"
                    >
                        Back to Chat Interfaces
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/chat-interfaces")}
                        className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="font-semibold text-foreground">{chatInterface.name}</h1>
                        <p className="text-xs text-muted-foreground">Sessions</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => loadData(true)}
                        disabled={isRefreshing}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    <Link
                        to={`/chat-interfaces/${id}/edit`}
                        className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                        Edit Interface
                    </Link>
                </div>
            </header>

            {/* Stats bar */}
            <div className="border-b border-border bg-card px-6 py-4">
                <div className="flex items-center gap-8">
                    <div>
                        <p className="text-sm text-muted-foreground">Total Sessions</p>
                        <p className="text-2xl font-semibold text-foreground">
                            {chatInterface.sessionCount.toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Messages</p>
                        <p className="text-2xl font-semibold text-foreground">
                            {chatInterface.messageCount.toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Avg Messages/Session</p>
                        <p className="text-2xl font-semibold text-foreground">
                            {chatInterface.sessionCount > 0
                                ? (chatInterface.messageCount / chatInterface.sessionCount).toFixed(
                                      1
                                  )
                                : "0"}
                        </p>
                    </div>
                    {chatInterface.lastActivityAt && (
                        <div>
                            <p className="text-sm text-muted-foreground">Last Activity</p>
                            <p className="text-lg font-medium text-foreground">
                                {formatDate(chatInterface.lastActivityAt)}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sessions list */}
            <div className="max-w-6xl mx-auto p-6">
                {sessions.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            No sessions yet
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Sessions will appear here when visitors start chatting.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border bg-muted/50">
                                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Session
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Messages
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Duration
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Source
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Started
                                        </th>
                                        <th className="w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {sessions.map((session) => (
                                        <tr
                                            key={session.id}
                                            className="hover:bg-muted/50 cursor-pointer"
                                            onClick={() => setSelectedSession(session)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">
                                                            {session.id.slice(0, 8)}...
                                                        </p>
                                                        {session.countryCode && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {session.countryCode}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {getStatusBadge(session.status)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-foreground">
                                                {session.messageCount}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatDuration(
                                                        session.firstSeenAt,
                                                        session.lastActivityAt
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    {session.referrer ? (
                                                        <>
                                                            <Globe className="w-3.5 h-3.5" />
                                                            <span className="truncate max-w-[150px]">
                                                                {new URL(session.referrer).hostname}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Monitor className="w-3.5 h-3.5" />
                                                            <span>Direct</span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {formatDate(session.firstSeenAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {(hasMore || page > 1) && (
                            <div className="flex items-center justify-center gap-2 mt-6">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-muted-foreground">Page {page}</span>
                                <button
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={!hasMore}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Session detail drawer - Phase 2 will add message viewing */}
            {selectedSession && (
                <div className="fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setSelectedSession(null)}
                    />
                    <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-xl">
                        <div className="h-14 border-b border-border flex items-center justify-between px-4">
                            <h3 className="font-semibold text-foreground">Session Details</h3>
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="p-2 hover:bg-muted rounded-md text-muted-foreground"
                            >
                                <svg
                                    className="w-5 h-5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Session ID</p>
                                <p className="text-sm font-mono text-foreground">
                                    {selectedSession.id}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Status</p>
                                {getStatusBadge(selectedSession.status)}
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Messages</p>
                                <p className="text-sm text-foreground">
                                    {selectedSession.messageCount}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Started</p>
                                <p className="text-sm text-foreground">
                                    {formatDate(selectedSession.firstSeenAt)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Last Activity</p>
                                <p className="text-sm text-foreground">
                                    {formatDate(selectedSession.lastActivityAt)}
                                </p>
                            </div>
                            {selectedSession.referrer && (
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Referrer</p>
                                    <p className="text-sm text-foreground truncate">
                                        {selectedSession.referrer}
                                    </p>
                                </div>
                            )}
                            {selectedSession.userAgent && (
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">User Agent</p>
                                    <p className="text-xs text-foreground font-mono line-clamp-2">
                                        {selectedSession.userAgent}
                                    </p>
                                </div>
                            )}
                            {selectedSession.countryCode && (
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Country</p>
                                    <p className="text-sm text-foreground">
                                        {selectedSession.countryCode}
                                    </p>
                                </div>
                            )}

                            <div className="pt-4 border-t border-border">
                                <p className="text-sm text-muted-foreground text-center">
                                    Message history will be available in Phase 2
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
