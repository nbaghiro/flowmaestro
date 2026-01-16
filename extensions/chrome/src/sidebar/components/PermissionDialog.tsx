import { Shield, AlertTriangle, X } from "lucide-react";

interface PermissionDialogProps {
    isOpen: boolean;
    domain: string;
    isSensitive: boolean;
    onAllow: () => void;
    onAllowSite: () => void;
    onDecline: () => void;
}

export function PermissionDialog({
    isOpen,
    domain,
    isSensitive,
    onAllow,
    onAllowSite,
    onDecline
}: PermissionDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        {isSensitive ? (
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                        ) : (
                            <Shield className="w-5 h-5 text-primary-600" />
                        )}
                        <span className="font-semibold text-gray-900">Permission Required</span>
                    </div>
                    <button
                        onClick={onDecline}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className="text-sm text-gray-600 mb-3">
                        FlowMaestro wants to read page content on:
                    </p>
                    <p className="text-sm font-medium text-gray-900 bg-gray-100 px-3 py-2 rounded-md break-all">
                        {domain}
                    </p>

                    {isSensitive && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700">
                                    This appears to be a sensitive site (banking, authentication).
                                    Be careful about what data you share.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-gray-200 space-y-2">
                    <button
                        onClick={onAllow}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <span className="text-sm font-medium">Allow this action</span>
                        <span className="text-xs text-primary-200">Enter</span>
                    </button>

                    {!isSensitive && (
                        <button
                            onClick={onAllowSite}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <span className="text-sm font-medium">Always allow on this site</span>
                        </button>
                    )}

                    <button
                        onClick={onDecline}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <span className="text-sm">Decline</span>
                        <span className="text-xs text-gray-400">ESC</span>
                    </button>
                </div>

                {/* Footer */}
                <div className="px-4 pb-4">
                    <p className="text-xs text-gray-400 text-center">
                        FlowMaestro will not purchase items, create accounts, or bypass captchas
                        without input.
                    </p>
                </div>
            </div>
        </div>
    );
}
