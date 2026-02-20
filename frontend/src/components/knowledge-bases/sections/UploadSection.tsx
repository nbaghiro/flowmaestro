import { Upload, Link as LinkIcon, Loader2, Cloud } from "lucide-react";
import { Input } from "../../common/Input";

interface UploadSectionProps {
    onFileUpload: (file: File) => Promise<void>;
    onAddUrlClick: () => void;
    onImportFromAppsClick?: () => void;
    isUploading: boolean;
    hasIntegrations?: boolean;
}

export function UploadSection({
    onFileUpload,
    onAddUrlClick,
    onImportFromAppsClick,
    isUploading,
    hasIntegrations = false
}: UploadSectionProps) {
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];
        await onFileUpload(file);
        e.target.value = "";
    };

    return (
        <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add Documents</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary transition-colors cursor-pointer">
                    <Input
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.doc,.txt,.md,.html,.json,.csv"
                        className="hidden"
                        disabled={isUploading}
                    />
                    <div className="text-center">
                        {isUploading ? (
                            <>
                                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Uploading...</p>
                            </>
                        ) : (
                            <>
                                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="font-medium mb-1">Upload File</p>
                                <p className="text-xs text-muted-foreground">
                                    PDF, DOCX, TXT, MD, HTML, JSON, CSV
                                </p>
                            </>
                        )}
                    </div>
                </label>

                <button
                    onClick={onAddUrlClick}
                    disabled={isUploading}
                    className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="text-center">
                        <LinkIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="font-medium mb-1">Add from URL</p>
                        <p className="text-xs text-muted-foreground">
                            Scrape content from a website
                        </p>
                    </div>
                </button>

                <button
                    onClick={onImportFromAppsClick}
                    disabled={isUploading || !hasIntegrations}
                    className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="text-center">
                        <Cloud className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="font-medium mb-1">Import from Apps</p>
                        <p className="text-xs text-muted-foreground">
                            {hasIntegrations ? "Connect to your apps" : "Connect an app first"}
                        </p>
                    </div>
                </button>
            </div>
        </div>
    );
}
