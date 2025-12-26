import {
    ChevronLeft,
    ChevronRight,
    Download,
    Loader2,
    AlertCircle,
    ZoomIn,
    ZoomOut
} from "lucide-react";
import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { downloadDocument } from "../../../lib/api";
import { logger } from "../../../lib/logger";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
    knowledgeBaseId: string;
    documentId: string;
    documentName: string;
}

export function PDFViewer({
    knowledgeBaseId,
    documentId,
    documentName: _documentName
}: PDFViewerProps) {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPdfUrl = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await downloadDocument(knowledgeBaseId, documentId);
                if (response.success && response.data) {
                    setPdfUrl(response.data.url);
                } else {
                    setError("Failed to get document URL");
                }
            } catch (err) {
                setError("Failed to load PDF");
                logger.error("Failed to fetch PDF URL", err);
            }
        };

        fetchPdfUrl();
    }, [knowledgeBaseId, documentId]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setIsLoading(false);
    };

    const onDocumentLoadError = () => {
        setError("Failed to load PDF document");
        setIsLoading(false);
    };

    const goToPrevPage = () => {
        setPageNumber((prev) => Math.max(prev - 1, 1));
    };

    const goToNextPage = () => {
        setPageNumber((prev) => Math.min(prev + 1, numPages));
    };

    const zoomIn = () => {
        setScale((prev) => Math.min(prev + 0.25, 2.5));
    };

    const zoomOut = () => {
        setScale((prev) => Math.max(prev - 0.25, 0.5));
    };

    const handleDownload = () => {
        if (pdfUrl) {
            window.open(pdfUrl, "_blank");
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                <AlertCircle className="w-12 h-12 mb-4 text-destructive" />
                <p className="text-center mb-4">{error}</p>
                {pdfUrl && (
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Download PDF
                    </button>
                )}
            </div>
        );
    }

    if (isLoading && !pdfUrl) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Controls */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToPrevPage}
                        disabled={pageNumber <= 1}
                        className="p-1.5 hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Previous page"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                        {pageNumber} / {numPages}
                    </span>
                    <button
                        onClick={goToNextPage}
                        disabled={pageNumber >= numPages}
                        className="p-1.5 hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Next page"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={zoomOut}
                        disabled={scale <= 0.5}
                        className="p-1.5 hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Zoom out"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-muted-foreground min-w-[50px] text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        onClick={zoomIn}
                        disabled={scale >= 2.5}
                        className="p-1.5 hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Zoom in"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-border mx-1" />
                    <button
                        onClick={handleDownload}
                        className="p-1.5 hover:bg-muted rounded"
                        title="Download PDF"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* PDF Content */}
            <div className="flex-1 overflow-auto bg-muted/50 flex justify-center">
                {pdfUrl && (
                    <Document
                        file={pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                        }
                        className="py-4"
                    >
                        <Page
                            pageNumber={pageNumber}
                            scale={scale}
                            loading={
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                </div>
                            }
                            className="shadow-lg"
                        />
                    </Document>
                )}
            </div>
        </div>
    );
}
