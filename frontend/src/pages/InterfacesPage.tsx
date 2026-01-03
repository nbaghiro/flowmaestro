import {
    Calendar,
    ClipboardList,
    Copy,
    Edit2,
    FileText,
    MoreVertical,
    Plus,
    Trash2
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FormInterface } from "@flowmaestro/shared";
import { Alert } from "../components/common/Alert";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { PageHeader } from "../components/common/PageHeader";
import { LoadingState } from "../components/common/Spinner";
import {
    getFormInterface,
    deleteFormInterface,
    duplicateFormInterface,
    publishFormInterface,
    unpublishFormInterface
} from "@/lib/api";

export function InterfacesPage() {
    const navigate = useNavigate();
    const [interfaces, setInterfaces] = useState<FormInterface[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [interfaceToDelete, setInterfaceToDelete] = useState<FormInterface | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                setIsLoading(true);
                setError(null);
                const res = await getFormInterface();
                if (cancelled) return;

                setInterfaces(res.data);
            } catch (error) {
                if (cancelled) return;

                setError(error instanceof Error ? error.message : "Failed to load form interfaces");
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };

        if (openMenuId) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
        return undefined;
    }, [openMenuId]);

    const handleDeleteInterface = async () => {
        if (!interfaceToDelete) return;
        setIsDeleting(true);
        try {
            await deleteFormInterface(interfaceToDelete.id);
            setInterfaces((prev) => prev.filter((iface) => iface.id !== interfaceToDelete.id));
            setInterfaceToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDuplicate = async (id: string) => {
        const duplicated = await duplicateFormInterface(id);
        setInterfaces((prev) => [duplicated, ...prev]);
    };

    const handleTogglePublish = async (iface: FormInterface) => {
        const updated =
            iface.status === "published"
                ? await unpublishFormInterface(iface.id)
                : await publishFormInterface(iface.id);
        setInterfaces((prev) => prev.map((item) => (item.id === iface.id ? updated : item)));
    };

    const formatDate = (dateString?: string | Date | null) => {
        if (!dateString) return "Unknown";
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return "Unknown";
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Form Interfaces"
                description={`${interfaces.length} ${
                    interfaces.length === 1 ? "interface" : "interfaces"
                }`}
                action={
                    <Button variant="primary" onClick={() => navigate("/interfaces/new")}>
                        <Plus className="w-4 h-4" />
                        New Interface
                    </Button>
                }
            />

            {error && (
                <div className="mb-4">
                    <Alert variant="error">{error}</Alert>
                </div>
            )}

            {isLoading ? (
                <LoadingState message="Loading interfaces..." />
            ) : interfaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-card">
                    <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No interfaces yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                        Create a public-facing interface to collect submissions and run workflows or
                        agents.
                    </p>
                    <Button variant="primary" onClick={() => navigate("/interfaces/new")} size="lg">
                        <Plus className="w-4 h-4" />
                        Create Your First Interface
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {interfaces.map((iface) => (
                        <div
                            key={iface.id}
                            className="bg-card border border-border rounded-lg p-5 hover:border-primary hover:shadow-md transition-all group relative"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <FileText className="w-5 h-5 text-primary" />
                                    <div className="flex items-center gap-1">
                                        <Badge variant="default" size="sm">
                                            {iface.targetType === "workflow" ? "Workflow" : "Agent"}
                                        </Badge>
                                        <StatusBadge status={iface.status} />

                                        <div
                                            className="relative"
                                            ref={openMenuId === iface.id ? menuRef : null}
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(
                                                        openMenuId === iface.id ? null : iface.id
                                                    );
                                                }}
                                                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                                title="More options"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>

                                            {openMenuId === iface.id && (
                                                <div className="absolute right-0 mt-1 w-52 bg-card border border-border rounded-lg shadow-lg py-1 z-10">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            navigate(`/interfaces/${iface.id}`);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            navigate(
                                                                `/interfaces/${iface.id}/submissions`
                                                            );
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                    >
                                                        <ClipboardList className="w-4 h-4" />
                                                        View submissions
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            handleDuplicate(iface.id);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                        Duplicate
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            handleTogglePublish(iface);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                    >
                                                        <ClipboardList className="w-4 h-4" />
                                                        {iface.status === "published"
                                                            ? "Unpublish"
                                                            : "Publish"}
                                                    </button>
                                                    {iface.status === "published" ? (
                                                        <a
                                                            href={`/i/${iface.slug}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            Open public page
                                                        </a>
                                                    ) : (
                                                        <button
                                                            disabled
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            Open public page
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            setInterfaceToDelete(iface);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                                    {iface.name}
                                </h3>
                                <p className="text-xs text-muted-foreground">i/{iface.slug}</p>

                                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border mt-4">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>Created {formatDate(iface.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <ClipboardList className="w-3 h-3" />
                                        <span>{iface.submissionCount ?? 0} submissions</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {interfaceToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-card rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            Delete Interface
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Are you sure you want to delete "{interfaceToDelete.name}"? This action
                            cannot be undone.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setInterfaceToDelete(null)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteInterface}
                                disabled={isDeleting}
                                loading={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: FormInterface["status"] }) {
    return (
        <span
            className={
                status === "published"
                    ? "inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600"
                    : "inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600"
            }
        >
            {status === "published" ? "Published" : "Unpublished"}
        </span>
    );
}
