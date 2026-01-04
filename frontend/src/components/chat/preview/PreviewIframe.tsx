import type { ChatInterface } from "@flowmaestro/shared";

interface PreviewIframeProps {
    chatInterface: ChatInterface;
}

export function PreviewIframe({ chatInterface }: PreviewIframeProps) {
    // This shows what the iframe embed would look like on a website
    const iframeSrc = `/embed/${chatInterface.slug}`;

    return (
        <div className="bg-muted/30 h-full p-4 overflow-hidden">
            {/* Simulated webpage container */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
                {/* Fake browser chrome */}
                <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 ml-4">
                        <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-500 border border-gray-200">
                            https://example.com/support
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <div className="flex-1 flex flex-col bg-gray-50 p-6 overflow-hidden">
                    {/* Fake page header */}
                    <div className="mb-6">
                        <div className="h-6 w-32 bg-gray-300 rounded mb-2" />
                        <div className="h-4 w-64 bg-gray-200 rounded" />
                    </div>

                    {/* Fake page content */}
                    <div className="space-y-3 mb-6">
                        <div className="h-3 w-full bg-gray-200 rounded" />
                        <div className="h-3 w-5/6 bg-gray-200 rounded" />
                        <div className="h-3 w-4/6 bg-gray-200 rounded" />
                    </div>

                    {/* Embedded iframe */}
                    <div className="flex-1 min-h-0">
                        <p className="text-xs text-gray-500 mb-2">Embedded chat:</p>
                        <div
                            className="h-full border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
                            style={{ borderRadius: `${chatInterface.borderRadius}px` }}
                        >
                            <iframe
                                src={iframeSrc}
                                className="w-full h-full border-0"
                                title="Chat preview"
                                sandbox="allow-scripts allow-same-origin"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
