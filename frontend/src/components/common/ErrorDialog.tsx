/**
 * Error Dialog Component
 * Custom dialog for displaying error messages
 */

import { X } from "lucide-react";
import { Button } from "./Button";

interface ErrorDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onClose: () => void;
}

export function ErrorDialog({ isOpen, title, message, onClose }: ErrorDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                    <Button variant="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{message}</p>
                <div className="flex items-center justify-end">
                    <Button variant="primary" onClick={onClose}>
                        OK
                    </Button>
                </div>
            </div>
        </div>
    );
}
