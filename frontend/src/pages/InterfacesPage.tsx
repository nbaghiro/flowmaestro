import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FormInterface } from "@flowmaestro/shared";
import { getFormInterface } from "@/lib/api";

type State =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; interfaces: FormInterface[] };

export function InterfacesPage() {
    const navigate = useNavigate();
    const [state, setState] = useState<State>({ status: "loading" });

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const res = await getFormInterface();
                if (cancelled) return;

                setState({
                    status: "ready",
                    interfaces: res.data
                });
            } catch (error) {
                if (cancelled) return;

                setState({
                    status: "error",
                    message:
                        error instanceof Error ? error.message : "Failed to load form interfaces"
                });
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    if (state.status === "loading") {
        return <div>Loading interfaces...</div>;
    }

    if (state.status === "error") {
        return <div>{state.message}</div>;
    }

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Form Interfaces</h1>

                <button
                    onClick={() => navigate("/interfaces/new")}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                    New interface
                </button>
            </div>

            {state.interfaces.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="mb-4 text-sm text-muted-foreground">No interfaces yet.</p>
                    <button
                        onClick={() => navigate("/interfaces/new")}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Create your first interface
                    </button>
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr className="text-left">
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">Slug</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {state.interfaces.map((iface) => (
                                <tr key={iface.id} className="border-t hover:bg-muted/30">
                                    <td className="px-4 py-3 font-medium">{iface.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {iface.slug}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={iface.status} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => navigate(`/interfaces/${iface.id}`)}
                                            className="mr-2 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => navigate(`/i/${iface.slug}`)}
                                            disabled={iface.status !== "published"}
                                            className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Public
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
            {status === "published" ? "Published" : "Draft"}
        </span>
    );
}
