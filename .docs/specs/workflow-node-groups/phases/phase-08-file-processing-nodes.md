# Phase 08: File Processing Nodes

## Overview

Implement 2 file processing nodes for extracting text from PDFs and other documents.

---

## Prerequisites

- **Phase 07**: Data Processing nodes (Transform for post-processing)

---

## Existing Infrastructure

### File Operations Executor

**File**: `backend/src/temporal/activities/node-executors/file-executor.ts`

```typescript
// File executor already exists with some operations
export interface FileOperationsNodeConfig {
    operation: "read" | "write" | "list" | "delete" | "copy" | "move";
    // ... file operation config
}

export async function executeFileOperationsNode(
    config: FileOperationsNodeConfig,
    context: JsonObject
): Promise<FileOperationsNodeResult>;
```

### Variable Interpolation for File Paths

**File**: `backend/src/temporal/activities/node-executors/utils.ts`

```typescript
// Use for dynamic file paths
import { interpolateVariables } from "./utils";

const filePath = interpolateVariables(config.filePath, context);
// "${workflowId}/documents/${filename}.pdf" → "wf-123/documents/invoice.pdf"
```

### Node Executor Pattern

**File**: `backend/src/temporal/activities/node-executors/index.ts`

```typescript
// Add PDF and document parsing to the executor switch:
case "parsePdf":
    return await executeParsePdfNode(nodeConfig, context);
case "parseDocument":
    return await executeParseDocumentNode(nodeConfig, context);
```

### Suggested NPM Packages

```json
{
    "pdf-parse": "^1.1.1", // PDF text extraction
    "mammoth": "^1.6.0", // DOCX to text
    "tesseract.js": "^5.0.0" // OCR for scanned PDFs (optional)
}
```

---

## Nodes (2)

| Node               | Description                 | Category              |
| ------------------ | --------------------------- | --------------------- |
| **Parse PDF**      | Extract text from PDF files | tools/file-processing |
| **Parse Document** | Handle DOCX, TXT, etc.      | tools/file-processing |

---

## Node Specifications

### Parse PDF Node

**Purpose**: Extract text, tables, and metadata from PDF files

**Config**:

```typescript
interface ParsePdfNodeConfig {
    // Input source (one of these)
    fileInput: string; // "${uploadedFile}" - file reference
    urlInput?: string; // "https://example.com/doc.pdf"
    base64Input?: string; // "${base64Data}"

    // Extraction options
    ocrEnabled: boolean; // Use OCR for scanned PDFs
    ocrLanguage?: string; // "eng", "spa", "fra", etc.
    extractTables: boolean; // Parse tables as structured data
    pageRange?: {
        start?: number; // 1-indexed
        end?: number;
    };

    // Output configuration
    outputVariable: string;
}
```

**Backend Executor**:

```typescript
// backend/src/temporal/activities/node-executors/parse-pdf-executor.ts
import pdf from "pdf-parse";
import Tesseract from "tesseract.js";

export interface ParsePdfNodeResult {
    text: string; // Full extracted text
    pages: Array<{
        pageNumber: number;
        text: string;
        tables?: JsonArray[];
    }>;
    metadata: {
        title?: string;
        author?: string;
        creationDate?: string;
        pageCount: number;
    };
}

export async function executeParsePdfNode(
    config: ParsePdfNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    // Get PDF buffer from input
    const pdfBuffer = await getPdfBuffer(config, context);

    // Extract text using pdf-parse
    const data = await pdf(pdfBuffer);

    let text = data.text;
    const pages: ParsePdfNodeResult["pages"] = [];

    // If OCR is enabled and text is sparse, use Tesseract
    if (config.ocrEnabled && text.trim().length < 100) {
        console.log("[ParsePDF] Text sparse, running OCR...");
        const ocrResult = await Tesseract.recognize(pdfBuffer, config.ocrLanguage || "eng");
        text = ocrResult.data.text;
    }

    // Extract tables if requested
    if (config.extractTables) {
        // Use tabula-js or similar for table extraction
        // This is simplified - real implementation needs table detection
    }

    const result: ParsePdfNodeResult = {
        text,
        pages,
        metadata: {
            title: data.info?.Title,
            author: data.info?.Author,
            creationDate: data.info?.CreationDate,
            pageCount: data.numpages
        }
    };

    return { [config.outputVariable]: result };
}

async function getPdfBuffer(config: ParsePdfNodeConfig, context: JsonObject): Promise<Buffer> {
    if (config.urlInput) {
        const url = interpolateVariables(config.urlInput, context);
        const response = await fetch(url);
        return Buffer.from(await response.arrayBuffer());
    }

    if (config.base64Input) {
        const base64 = interpolateVariables(config.base64Input, context);
        return Buffer.from(base64, "base64");
    }

    // File reference from context
    const fileRef = interpolateVariables(config.fileInput, context);
    return await readFileFromStorage(fileRef);
}
```

**Frontend Component**:

```typescript
// frontend/src/canvas/nodes/ParsePDFNode.tsx
function ParsePDFNode({ id, data, selected }: NodeProps<ParsePDFNodeData>) {
    return (
        <>
            <BaseNode
                id={id}
                icon={FileText}
                label={data.label || "Parse PDF"}
                category="tools"
                selected={selected}
                configPreview={
                    data.ocrEnabled ? "OCR enabled" : "Text extraction"
                }
                inputs={[{ name: "file", type: "file/URL/base64" }]}
                outputs={[
                    { name: "text", type: "string" },
                    { name: "pages", type: "array" },
                    { name: "metadata", type: "object" }
                ]}
            />
            <NodeConfigWrapper nodeId={id} title="Parse PDF" category="tools">
                <ParsePDFNodeConfig data={data} onUpdate={(cfg) => updateNode(id, cfg)} />
            </NodeConfigWrapper>
        </>
    );
}
```

**Inputs**: `file` (file/URL/base64)
**Outputs**: `text` (string), `pages` (array), `tables` (array), `metadata` (object)

### Parse Document Node

**Purpose**: Extract text from various document formats

**Config**:

```typescript
interface ParseDocumentNodeConfig {
    // Input source
    fileInput: string; // "${uploadedFile}"
    urlInput?: string;
    base64Input?: string;

    // File type (auto-detected if not specified)
    fileType?: "docx" | "doc" | "txt" | "rtf" | "odt" | "html" | "md";

    // Extraction options
    preserveFormatting: boolean; // Keep headings, lists, etc.
    extractImages: boolean; // Extract embedded images

    // Output configuration
    outputVariable: string;
}
```

**Backend Executor**:

```typescript
// backend/src/temporal/activities/node-executors/parse-document-executor.ts
import mammoth from "mammoth";

export interface ParseDocumentNodeResult {
    text: string; // Plain text content
    html?: string; // HTML content (if preserveFormatting)
    sections: Array<{
        type: "heading" | "paragraph" | "list" | "table";
        level?: number; // For headings: 1-6
        content: string;
    }>;
    images?: Array<{
        id: string;
        contentType: string;
        base64: string;
    }>;
    metadata: {
        wordCount: number;
        characterCount: number;
        fileType: string;
    };
}

export async function executeParseDocumentNode(
    config: ParseDocumentNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const buffer = await getDocumentBuffer(config, context);
    const fileType = config.fileType || detectFileType(buffer);

    let result: ParseDocumentNodeResult;

    switch (fileType) {
        case "docx":
            result = await parseDocx(buffer, config);
            break;
        case "txt":
        case "md":
            result = await parsePlainText(buffer, config);
            break;
        case "html":
            result = await parseHtml(buffer, config);
            break;
        default:
            throw new Error(`Unsupported file type: ${fileType}`);
    }

    return { [config.outputVariable]: result };
}

async function parseDocx(
    buffer: Buffer,
    config: ParseDocumentNodeConfig
): Promise<ParseDocumentNodeResult> {
    const options: mammoth.Options = {};

    if (config.extractImages) {
        options.convertImage = mammoth.images.imgElement(async (image) => {
            const buffer = await image.read();
            return {
                src: `data:${image.contentType};base64,${buffer.toString("base64")}`
            };
        });
    }

    const extracted = config.preserveFormatting
        ? await mammoth.convertToHtml({ buffer }, options)
        : await mammoth.extractRawText({ buffer });

    const text = config.preserveFormatting ? stripHtml(extracted.value) : extracted.value;

    return {
        text,
        html: config.preserveFormatting ? extracted.value : undefined,
        sections: parseSections(extracted.value),
        metadata: {
            wordCount: text.split(/\s+/).length,
            characterCount: text.length,
            fileType: "docx"
        }
    };
}
```

**Inputs**: `file` (file/URL/base64)
**Outputs**: `text` (string), `sections` (array), `metadata` (object)

---

## Unit Tests

### Test Pattern

**Pattern A (Pure Logic)**: File parsing uses libraries (pdf-parse, mammoth) that can be tested with fixture files.

### Files to Create

| Executor      | Test File                                                                           | Pattern |
| ------------- | ----------------------------------------------------------------------------------- | ------- |
| ParsePDF      | `backend/tests/unit/node-executors/file-processing/parse-pdf-executor.test.ts`      | A       |
| ParseDocument | `backend/tests/unit/node-executors/file-processing/parse-document-executor.test.ts` | A       |

### Test Fixtures Required

```
backend/tests/fixtures/data/
├── sample-invoice.pdf
├── sample-contract.pdf
├── sample-document.docx
├── sample-spreadsheet.xlsx
└── sample-presentation.pptx
```

### Required Test Cases

#### parse-pdf-executor.test.ts

- `should extract text from simple PDF`
- `should extract text from multi-page PDF`
- `should return page count in metadata`
- `should handle scanned PDFs with OCR flag`
- `should extract text by page when splitPages is true`
- `should handle password-protected PDFs`
- `should throw on corrupted PDF files`

#### parse-document-executor.test.ts

- `should extract text from DOCX files`
- `should extract text from XLSX files`
- `should extract text from PPTX files`
- `should detect document type automatically`
- `should extract sections/slides as array`
- `should include document metadata`
- `should handle empty documents`

---

## Test Workflow: Invoice Extraction

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   Input     │───▶│  Parse PDF   │───▶│  Transform  │───▶│   Output    │
│ (invoice)   │    │  (OCR: on)   │    │ (extract)   │    │ (fields)    │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
```

**Test**: Upload sample invoice PDF
**Expected**: Text extracted, ready for AI extraction

---

## Files to Create

### Frontend Components

```
frontend/src/canvas/nodes/tools/file-processing/
├── ParsePDFNode.tsx
├── ParseDocumentNode.tsx
├── config/
│   ├── ParsePDFNodeConfig.tsx
│   └── ParseDocumentNodeConfig.tsx
└── index.ts
```

### Backend Executors

```
backend/src/temporal/activities/node-executors/
├── parse-pdf-executor.ts
└── parse-document-executor.ts
```

### Backend Services

```
backend/src/services/document-parsing/
├── pdf-parser.ts        # Uses pdf-parse or pdf.js
├── ocr-service.ts       # Uses Tesseract or cloud OCR
├── docx-parser.ts       # Uses mammoth.js
└── index.ts
```

---

## Node Registration

```typescript
// frontend/src/config/node-registrations/file-processing.ts
import { registerNode } from "../node-registry";

registerNode({
    type: "parsePdf",
    label: "Parse PDF",
    description: "Extract text, tables, and metadata from PDF files",
    category: "tools",
    subcategory: "file-processing",
    icon: "FileText",
    keywords: ["pdf", "document", "extract", "text", "ocr", "scan"]
});

registerNode({
    type: "parseDocument",
    label: "Parse Document",
    description: "Extract text from DOCX, TXT, HTML, and other formats",
    category: "tools",
    subcategory: "file-processing",
    icon: "FileType",
    keywords: ["docx", "word", "txt", "html", "document", "extract"]
});
```

---

## How to Deliver

1. Install required packages: `npm install pdf-parse mammoth tesseract.js`
2. Register both nodes in `node-registry.ts` (see Node Registration above)
3. Create frontend node components following BaseNode pattern
4. Create config forms with file upload component
5. Implement `parse-pdf-executor.ts` with pdf-parse and optional Tesseract
6. Implement `parse-document-executor.ts` with mammoth for DOCX
7. Add executors to `node-executors/index.ts` switch statement
8. Test with various document types (see Test Files below)

---

## How to Test

| Test                       | Expected Result               |
| -------------------------- | ----------------------------- |
| Parse text-based PDF       | Text extracted cleanly        |
| Parse scanned PDF with OCR | Text extracted via OCR        |
| Parse PDF with tables      | Tables extracted as arrays    |
| Parse DOCX                 | Text and formatting extracted |
| Parse TXT                  | Raw text returned             |
| Invalid file type          | Clear error message           |

### Test Files

Prepare test files:

- `invoice-text.pdf` - Text-based invoice
- `invoice-scanned.pdf` - Scanned invoice image
- `report-with-tables.pdf` - PDF with data tables
- `contract.docx` - Word document
- `readme.txt` - Plain text file

### Unit Tests

```typescript
describe("Parse PDF Node", () => {
    it("extracts text from text-based PDF", async () => {
        const result = await parsePDF(textPdfBuffer);
        expect(result.text).toContain("Invoice #12345");
    });

    it("extracts text from scanned PDF with OCR", async () => {
        const result = await parsePDF(scannedPdfBuffer, { ocr: true });
        expect(result.text.length).toBeGreaterThan(0);
    });

    it("extracts tables as structured data", async () => {
        const result = await parsePDF(tablePdfBuffer, { extractTables: true });
        expect(result.tables).toHaveLength(1);
        expect(result.tables[0].rows).toBeGreaterThan(0);
    });
});
```

---

## Acceptance Criteria

- [ ] Parse PDF extracts text from text-based PDFs
- [ ] Parse PDF handles scanned PDFs with OCR
- [ ] Parse PDF extracts tables as structured arrays
- [ ] Parse PDF returns page-by-page content
- [ ] Parse PDF extracts metadata (title, author, dates)
- [ ] Parse Document handles DOCX files
- [ ] Parse Document handles TXT files
- [ ] Parse Document handles RTF files
- [ ] Both nodes accept file upload, URL, or base64
- [ ] Both nodes display with Tools category styling
- [ ] Clear error messages for unsupported formats

---

## Dependencies

These nodes prepare documents for AI processing (Phase 09: Extract Data node).
