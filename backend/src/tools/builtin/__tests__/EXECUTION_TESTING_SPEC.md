# Python Execution Testing Specification

## Overview

This document specifies how to test the **actual execution** of generated Python code for builtin tools, beyond just syntax validation.

---

## Current State

| Layer                 | What's Tested                   | Coverage      |
| --------------------- | ------------------------------- | ------------- |
| Schema Validation     | Zod schemas validate input      | ✅ Complete   |
| Security Checks       | Path traversal, SSRF prevention | ✅ Complete   |
| Context Requirements  | Sandbox required, auth checks   | ✅ Complete   |
| Python Syntax         | `ast.parse()` validates syntax  | ✅ Complete   |
| **Python Execution**  | Actually run the code           | ❌ Not tested |
| **Output Validation** | Verify generated files          | ❌ Not tested |

---

## Proposed Architecture

### Option A: Local Python Execution (Recommended for Unit Tests)

```
┌─────────────────────────────────────────────────────────────┐
│                      Test Runner (Jest)                      │
├─────────────────────────────────────────────────────────────┤
│  1. Tool generates Python code                               │
│  2. Write code to temp file                                  │
│  3. Execute via child_process.spawn('python3', [file])       │
│  4. Capture stdout/stderr                                    │
│  5. Parse JSON output                                        │
│  6. Validate output files exist and have correct format      │
│  7. Cleanup temp files                                       │
└─────────────────────────────────────────────────────────────┘
```

**Pros:**

- Fast execution (~1-5 seconds per test)
- No external dependencies (just Python + pip packages)
- Can run in CI with proper setup
- Good for regression testing

**Cons:**

- Need to install Python dependencies locally/CI
- Doesn't test E2B-specific behavior
- Some tools may behave differently in sandbox

### Option B: Docker-Based Execution (Recommended for Integration Tests)

```
┌─────────────────────────────────────────────────────────────┐
│                      Test Runner (Jest)                      │
├─────────────────────────────────────────────────────────────┤
│  1. Tool generates Python code                               │
│  2. Mount code + fixtures into Docker container              │
│  3. Execute in container matching E2B environment            │
│  4. Capture output via volume mount                          │
│  5. Validate output files                                    │
│  6. Cleanup container                                        │
└─────────────────────────────────────────────────────────────┘
```

**Pros:**

- Closer to production E2B environment
- Isolated, reproducible environment
- Can test with exact dependency versions

**Cons:**

- Slower (~10-30 seconds per test)
- Requires Docker in CI
- More complex setup

### Option C: Actual E2B Sandbox (Recommended for E2E Tests)

```
┌─────────────────────────────────────────────────────────────┐
│                      Test Runner (Jest)                      │
├─────────────────────────────────────────────────────────────┤
│  1. Tool generates Python code                               │
│  2. Call E2B API to create sandbox                           │
│  3. Upload code + fixtures to sandbox                        │
│  4. Execute in sandbox                                       │
│  5. Download output files                                    │
│  6. Validate outputs                                         │
│  7. Terminate sandbox                                        │
└─────────────────────────────────────────────────────────────┘
```

**Pros:**

- Tests actual production path
- Validates E2B integration

**Cons:**

- Expensive (E2B costs per sandbox)
- Slow (~30-60 seconds per test)
- Requires E2B API key in CI
- Flaky due to network/service issues

---

## Recommended Approach: Layered Testing

```
┌─────────────────────────────────────────────────────────────┐
│  E2E Tests (Option C)                                        │
│  - Run nightly or on release                                 │
│  - 1-2 tests per tool (happy path)                          │
│  - Validates full E2B integration                            │
├─────────────────────────────────────────────────────────────┤
│  Integration Tests (Option B)                                │
│  - Run on PR/merge to main                                   │
│  - 3-5 tests per tool                                        │
│  - Docker container with all dependencies                    │
├─────────────────────────────────────────────────────────────┤
│  Unit Tests (Option A) ← Current + Execution                 │
│  - Run on every commit                                       │
│  - Fast feedback                                             │
│  - Syntax validation + basic execution                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Local Python Execution Tests

#### 1.1 Create Python Test Environment

**File: `backend/src/tools/builtin/__tests__/python-executor.ts`**

```typescript
import { spawn } from "child_process";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

export interface PythonExecutionResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    output?: Record<string, unknown>; // Parsed JSON from stdout
    duration: number;
}

export interface PythonExecutionOptions {
    timeout?: number; // Default: 30000ms
    fixtures?: {
        // Files to create before execution
        [path: string]: Buffer | string;
    };
    collectFiles?: string[]; // Files to read after execution
}

export async function executePythonCode(
    code: string,
    options: PythonExecutionOptions = {}
): Promise<PythonExecutionResult> {
    const workDir = join(tmpdir(), `flowmaestro-test-${randomUUID()}`);
    const scriptPath = join(workDir, "script.py");
    const timeout = options.timeout ?? 30000;

    try {
        // Create work directory
        await mkdir(workDir, { recursive: true });

        // Write fixtures
        if (options.fixtures) {
            for (const [path, content] of Object.entries(options.fixtures)) {
                const fullPath = join(workDir, path);
                await mkdir(dirname(fullPath), { recursive: true });
                await writeFile(fullPath, content);
            }
        }

        // Write script (replace /tmp with workDir)
        const adjustedCode = code.replace(/\/tmp\//g, `${workDir}/`);
        await writeFile(scriptPath, adjustedCode);

        // Execute
        const startTime = Date.now();
        const result = await runPython(scriptPath, timeout);
        const duration = Date.now() - startTime;

        // Parse JSON output if present
        let output: Record<string, unknown> | undefined;
        try {
            const lastLine = result.stdout.trim().split("\n").pop();
            if (lastLine?.startsWith("{")) {
                output = JSON.parse(lastLine);
            }
        } catch {
            // Not JSON output, that's fine
        }

        return {
            ...result,
            output,
            duration
        };
    } finally {
        // Cleanup
        await rm(workDir, { recursive: true, force: true });
    }
}

function runPython(
    scriptPath: string,
    timeout: number
): Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
}> {
    return new Promise((resolve) => {
        const proc = spawn("python3", [scriptPath], {
            timeout,
            cwd: dirname(scriptPath)
        });

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (data) => {
            stdout += data;
        });
        proc.stderr.on("data", (data) => {
            stderr += data;
        });

        proc.on("close", (code) => {
            resolve({
                success: code === 0,
                stdout,
                stderr,
                exitCode: code ?? 1
            });
        });

        proc.on("error", (err) => {
            resolve({
                success: false,
                stdout,
                stderr: stderr + err.message,
                exitCode: 1
            });
        });
    });
}
```

#### 1.2 Create Test Fixtures

**Directory: `backend/src/tools/builtin/__tests__/fixtures/`**

```
fixtures/
├── audio/
│   ├── sample-speech.mp3      # Short audio clip for transcription
│   └── sample-speech.wav
├── images/
│   ├── sample-text.png        # Image with text for OCR
│   ├── sample-receipt.jpg     # Receipt image for OCR
│   └── sample-photo.jpg
├── documents/
│   ├── sample.pdf             # PDF with text and tables
│   ├── sample-encrypted.pdf   # Password-protected PDF
│   └── sample-images.pdf      # PDF with embedded images
└── data/
    └── sample-data.json       # Sample data for charts/spreadsheets
```

#### 1.3 Python Dependencies for Tests

**File: `backend/src/tools/builtin/__tests__/requirements-test.txt`**

```
# Core dependencies for all tools
matplotlib>=3.7.0
numpy>=1.24.0
Pillow>=9.5.0

# Spreadsheet generation
openpyxl>=3.1.0

# PDF extraction
PyMuPDF>=1.22.0
pdfplumber>=0.9.0

# OCR
pytesseract>=0.3.10
opencv-python-headless>=4.8.0

# Audio transcription (use tiny model for tests)
openai-whisper>=20230314

# Text-to-speech (lightweight for tests)
TTS>=0.17.0

# Screenshot capture
playwright>=1.40.0

# File download (stdlib, no extra deps)
```

#### 1.4 CI Setup Script

**File: `backend/src/tools/builtin/__tests__/setup-python-env.sh`**

```bash
#!/bin/bash
set -e

# Create virtual environment for tests
python3 -m venv .venv-test
source .venv-test/bin/activate

# Install test dependencies
pip install -r backend/src/tools/builtin/__tests__/requirements-test.txt

# Install Playwright browsers (for screenshot tests)
playwright install chromium

# Download Whisper tiny model (smallest, for fast tests)
python3 -c "import whisper; whisper.load_model('tiny')"

echo "Python test environment ready"
```

---

### Phase 2: Tool-Specific Execution Tests

#### 2.1 Chart Generation Execution Tests

**File: `backend/src/tools/builtin/__tests__/chart-generate.execution.test.ts`**

```typescript
import { chartGenerateTool } from "../chart-generate";
import { createMockContext } from "./test-helpers";
import { executePythonCode, requirePythonDeps } from "./python-executor";
import { readFile } from "fs/promises";

describe("ChartGenerateTool Execution", () => {
    beforeAll(async () => {
        await requirePythonDeps(["matplotlib", "numpy"]);
    });

    it("generates a valid PNG bar chart", async () => {
        const context = createMockContext();
        const params = {
            type: "bar",
            data: {
                labels: ["Q1", "Q2", "Q3", "Q4"],
                datasets: [{ label: "Sales", data: [100, 150, 200, 175] }]
            },
            options: { title: "Quarterly Sales" },
            filename: "test_chart"
        };

        const toolResult = await chartGenerateTool.execute(params, context);
        const code = toolResult.data?.generatedCode as string;

        const execResult = await executePythonCode(code);

        expect(execResult.success).toBe(true);
        expect(execResult.exitCode).toBe(0);
        expect(execResult.output?.path).toContain("test_chart.png");

        // Verify output is valid JSON with expected fields
        expect(execResult.output).toMatchObject({
            format: "png",
            chartType: "bar",
            width: 800,
            height: 600
        });
    });

    it("generates a valid SVG line chart", async () => {
        const context = createMockContext();
        const params = {
            type: "line",
            data: {
                labels: ["Jan", "Feb", "Mar"],
                datasets: [{ label: "Revenue", data: [10, 20, 15] }]
            },
            options: { format: "svg" }
        };

        const toolResult = await chartGenerateTool.execute(params, context);
        const code = toolResult.data?.generatedCode as string;

        const execResult = await executePythonCode(code, {
            collectFiles: ["chart.svg"]
        });

        expect(execResult.success).toBe(true);

        // Verify SVG is valid
        const svgContent = execResult.collectedFiles?.["chart.svg"];
        expect(svgContent).toContain("<svg");
        expect(svgContent).toContain("</svg>");
    });

    it("handles all chart types", async () => {
        const chartTypes = ["bar", "line", "pie", "scatter", "area", "donut"];

        for (const type of chartTypes) {
            const context = createMockContext();
            const params = {
                type,
                data: {
                    labels: ["A", "B", "C"],
                    datasets: [{ label: "Data", data: [30, 40, 30] }]
                }
            };

            const toolResult = await chartGenerateTool.execute(params, context);
            const code = toolResult.data?.generatedCode as string;

            const execResult = await executePythonCode(code);

            expect(execResult.success).toBe(true);
            expect(execResult.output?.chartType).toBe(type);
        }
    }, 60000); // Longer timeout for multiple charts
});
```

#### 2.2 Spreadsheet Generation Execution Tests

```typescript
describe("SpreadsheetGenerateTool Execution", () => {
    beforeAll(async () => {
        await requirePythonDeps(["openpyxl"]);
    });

    it("generates a valid XLSX file", async () => {
        const context = createMockContext();
        const params = {
            data: [
                { name: "Alice", age: 30, city: "NYC" },
                { name: "Bob", age: 25, city: "LA" }
            ],
            format: "xlsx"
        };

        const toolResult = await spreadsheetGenerateTool.execute(params, context);
        const code = toolResult.data?.generatedCode as string;

        const execResult = await executePythonCode(code, {
            collectFiles: ["spreadsheet.xlsx"]
        });

        expect(execResult.success).toBe(true);

        // Verify XLSX magic bytes
        const xlsxContent = execResult.collectedFiles?.["spreadsheet.xlsx"];
        expect(xlsxContent?.slice(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    });

    it("generates a valid CSV file", async () => {
        const context = createMockContext();
        const params = {
            data: [{ col1: "a", col2: "b" }],
            format: "csv"
        };

        const toolResult = await spreadsheetGenerateTool.execute(params, context);
        const code = toolResult.data?.generatedCode as string;

        const execResult = await executePythonCode(code, {
            collectFiles: ["spreadsheet.csv"]
        });

        expect(execResult.success).toBe(true);

        const csvContent = execResult.collectedFiles?.["spreadsheet.csv"]?.toString();
        expect(csvContent).toContain("col1,col2");
        expect(csvContent).toContain("a,b");
    });
});
```

#### 2.3 OCR Extraction Execution Tests

```typescript
describe("OCRExtractTool Execution", () => {
    beforeAll(async () => {
        await requirePythonDeps(["pytesseract", "cv2"]);
    });

    it("extracts text from image", async () => {
        const context = createMockContext();
        const params = {
            path: "/tmp/test-image.png",
            language: ["eng"]
        };

        const toolResult = await ocrExtractTool.execute(params, context);
        const code = toolResult.data?.generatedCode as string;

        // Create a simple test image with text
        const testImagePath = await createTestImageWithText("Hello World");

        const execResult = await executePythonCode(code, {
            fixtures: {
                "test-image.png": await readFile(testImagePath)
            }
        });

        expect(execResult.success).toBe(true);
        expect(execResult.output?.text).toContain("Hello");
        expect(execResult.output?.text).toContain("World");
    });
});
```

---

### Phase 3: CI Integration

#### 3.1 Update GitHub Actions Workflow

```yaml
unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: [lint-app]
    steps:
        - name: Checkout code
          uses: actions/checkout@v4

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
              node-version: ${{ env.NODE_VERSION }}
              cache: "npm"

        - name: Setup Python
          uses: actions/setup-python@v5
          with:
              python-version: "3.11"

        - name: Cache Python dependencies
          uses: actions/cache@v4
          with:
              path: ~/.cache/pip
              key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements-test.txt') }}
              restore-keys: |
                  ${{ runner.os }}-pip-

        - name: Install Python test dependencies
          run: |
              pip install -r backend/src/tools/builtin/__tests__/requirements-test.txt

        - name: Install Tesseract (for OCR tests)
          run: sudo apt-get install -y tesseract-ocr

        - name: Install Node dependencies
          run: npm ci

        - name: Run unit tests
          run: npm run test:unit

execution-tests:
    name: Python Execution Tests
    runs-on: ubuntu-latest
    needs: [unit-tests]
    steps:
        - name: Checkout code
          uses: actions/checkout@v4

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
              node-version: ${{ env.NODE_VERSION }}
              cache: "npm"

        - name: Setup Python
          uses: actions/setup-python@v5
          with:
              python-version: "3.11"

        - name: Install full Python dependencies
          run: |
              pip install -r backend/src/tools/builtin/__tests__/requirements-test.txt
              playwright install chromium

        - name: Install system dependencies
          run: |
              sudo apt-get update
              sudo apt-get install -y tesseract-ocr ffmpeg

        - name: Install Node dependencies
          run: npm ci

        - name: Run execution tests
          run: npm run test:execution
          timeout-minutes: 15
```

#### 3.2 Add npm scripts

```json
{
    "scripts": {
        "test:unit": "jest --selectProjects unit",
        "test:execution": "jest --selectProjects execution --runInBand",
        "test:integration": "jest --selectProjects integration"
    }
}
```

---

## Test Matrix

| Tool                 | Syntax | Execution | Docker  | E2B     |
| -------------------- | ------ | --------- | ------- | ------- |
| chart_generate       | ✅     | Phase 2   | Phase 3 | Phase 4 |
| spreadsheet_generate | ✅     | Phase 2   | Phase 3 | Phase 4 |
| screenshot_capture   | ✅     | Phase 2   | Phase 3 | Phase 4 |
| file_download        | ✅     | Phase 2   | Phase 3 | Phase 4 |
| pdf_extract          | ✅     | Phase 2   | Phase 3 | Phase 4 |
| audio_transcribe     | ✅     | Phase 2\* | Phase 3 | Phase 4 |
| ocr_extract          | ✅     | Phase 2   | Phase 3 | Phase 4 |
| text_to_speech       | ✅     | Phase 2\* | Phase 3 | Phase 4 |

\*Audio tools require larger models/dependencies, may be slower

---

## Dependencies by Tool

| Tool                 | Python Packages     | System Dependencies |
| -------------------- | ------------------- | ------------------- |
| chart_generate       | matplotlib, numpy   | -                   |
| spreadsheet_generate | openpyxl            | -                   |
| screenshot_capture   | playwright          | chromium            |
| file_download        | (stdlib)            | -                   |
| pdf_extract          | PyMuPDF, pdfplumber | -                   |
| audio_transcribe     | whisper             | ffmpeg              |
| ocr_extract          | pytesseract, opencv | tesseract-ocr       |
| text_to_speech       | TTS                 | -                   |

---

## Timeline Estimate

| Phase   | Description                    | Effort   |
| ------- | ------------------------------ | -------- |
| Phase 1 | Python executor infrastructure | 2-3 days |
| Phase 2 | Tool-specific execution tests  | 3-5 days |
| Phase 3 | CI integration + Docker tests  | 2-3 days |
| Phase 4 | E2B integration tests          | 2-3 days |

---

## Open Questions

1. **Whisper model size**: Use `tiny` (fast, less accurate) or `base` (slower, more accurate) for tests?
2. **TTS model**: Which TTS model to use? Some are very large (1GB+)
3. **Test fixtures**: Should we commit binary fixtures to git or generate them?
4. **Flakiness**: How to handle flaky tests (especially audio/TTS)?
5. **Cost**: E2B sandbox costs for E2E tests - run nightly only?

---

## Next Steps

1. [ ] Review and approve this spec
2. [ ] Implement `python-executor.ts` helper
3. [ ] Create test fixtures
4. [ ] Add `requirements-test.txt`
5. [ ] Implement execution tests for each tool
6. [ ] Update CI workflow
7. [ ] Add Docker-based tests (Phase 3)
8. [ ] Add E2B tests (Phase 4)
