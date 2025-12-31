/**
 * Error Dialog Component
 * Custom dialog for displaying error messages
 */

import { Button } from "./Button";
import { Dialog } from "./Dialog";

interface ErrorDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onClose: () => void;
}

export function ErrorDialog({ isOpen, title, message, onClose }: ErrorDialogProps) {
    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="md"
            footer={
                <div className="flex items-center justify-end">
                    <Button variant="primary" onClick={onClose}>
                        OK
                    </Button>
                </div>
            }
        >
            <p className="text-sm text-muted-foreground">{message}</p>
        </Dialog>
    );
}
