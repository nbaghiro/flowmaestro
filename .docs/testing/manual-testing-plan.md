# FlowMaestro Manual Testing Plan

> **Purpose**: Comprehensive manual testing plan for QA testers to validate all FlowMaestro functionality.
> **Format**: Structured for Linear import (Projects → Epics → Stories → Tasks)
> **Total Estimated Test Cases**: 400+

---

## Linear Project Structure

```
Project: FlowMaestro Manual Testing
├── Epic: Workflow Nodes - AI
├── Epic: Workflow Nodes - Input
├── Epic: Workflow Nodes - Output
├── Epic: Workflow Nodes - Logic
├── Epic: Workflow Nodes - Utility
├── Epic: Workflow Nodes - Integration
├── Epic: Agent Tools
├── Epic: Knowledge Bases
├── Epic: Connections & OAuth
├── Epic: Triggers
├── Epic: Executions & Runtime
├── Epic: Agents & Personas
├── Epic: Chat & Form Interfaces
├── Epic: Workspaces & Billing
├── Epic: Authentication & Users
└── Epic: End-to-End Scenarios
```

---

# Epic 1: Workflow Nodes - AI

**Labels**: `testing`, `workflow`, `ai`, `critical`
**Priority**: Urgent

---

## Story: WF-AI-001 - LLM Node

**Description**: Test the LLM node for text generation across all supported providers and configurations.
**Labels**: `llm`, `P0`
**Estimate**: 5 points

### Acceptance Criteria

- [ ] All 6 LLM providers generate text successfully
- [ ] Temperature and sampling parameters affect output
- [ ] Token limits are respected
- [ ] Variable interpolation works in prompts
- [ ] Extended thinking mode works for supported models
- [ ] Errors are handled gracefully

### Tasks

#### WF-AI-001-01: Basic Generation - All Providers

**Priority**: P0 | **Labels**: `smoke-test`

| Test             | Steps                                                                            | Expected                      |
| ---------------- | -------------------------------------------------------------------------------- | ----------------------------- |
| OpenAI GPT-4     | Create LLM node → provider: openai, model: gpt-4 → prompt: "Say hello" → Execute | Text response + usage metrics |
| Anthropic Claude | provider: anthropic, model: claude-3-sonnet-20240229                             | Text response + usage metrics |
| Google Gemini    | provider: google, model: gemini-pro                                              | Text response                 |
| XAI Grok         | provider: xai, model: grok-1                                                     | Text response                 |
| Cohere Command   | provider: cohere, model: command                                                 | Text response                 |
| HuggingFace      | provider: huggingface, model: [any supported]                                    | Text response                 |

#### WF-AI-001-02: Temperature & Sampling

**Priority**: P1 | **Labels**: `parameters`

| Test                       | Config                         | Expected                           |
| -------------------------- | ------------------------------ | ---------------------------------- |
| Temperature 0              | temperature: 0, same prompt 3x | Identical/near-identical responses |
| Temperature 2              | temperature: 2, same prompt 3x | Varied responses                   |
| Temperature -0.5 (invalid) | temperature: -0.5              | Validation error or clamp to 0     |
| Temperature 2.5 (invalid)  | temperature: 2.5               | Validation error or clamp to 2     |
| topP 0.1                   | topP: 0.1                      | More focused response              |
| topP 1.0                   | topP: 1.0                      | More varied response               |

#### WF-AI-001-03: Token Limits

**Priority**: P1 | **Labels**: `limits`

| Test           | Config                                 | Expected                                                  |
| -------------- | -------------------------------------- | --------------------------------------------------------- |
| maxTokens 10   | maxTokens: 10, prompt: "Write a story" | Response ~10 tokens                                       |
| maxTokens 4096 | maxTokens: 4096                        | Full response up to limit                                 |
| No maxTokens   | Leave empty                            | Model default used                                        |
| Usage metrics  | Any call                               | usage.promptTokens, completionTokens, totalTokens present |

#### WF-AI-001-04: System Prompt & Variables

**Priority**: P0 | **Labels**: `variables`

| Test                      | Config                                         | Expected              |
| ------------------------- | ---------------------------------------------- | --------------------- |
| System prompt             | systemPrompt: "You are a pirate"               | Pirate-style response |
| Variable in prompt        | prompt: "Hello {{userName}}", userName="Alice" | References "Alice"    |
| Variable in system prompt | systemPrompt: "You are {{role}}"               | Behavior matches role |
| Nested variable           | prompt: "{{user.name}} from {{user.city}}"     | Both interpolated     |
| Missing variable          | prompt: "Hello {{missing}}"                    | Empty string or error |
| Array variable            | prompt: "Items: {{items}}"                     | Array rendered        |

#### WF-AI-001-05: Extended Thinking

**Priority**: P1 | **Labels**: `thinking`, `claude`

| Test                 | Config                                     | Expected                       |
| -------------------- | ------------------------------------------ | ------------------------------ |
| Enable thinking      | enableThinking: true, thinkingBudget: 2048 | `thinking` field in response   |
| Min budget (1024)    | thinkingBudget: 1024                       | Thinking within budget         |
| Max budget (32768)   | thinkingBudget: 32768                      | Extended thinking              |
| Invalid budget (500) | thinkingBudget: 500                        | Validation error or clamp      |
| Thinking tokens      | Enable thinking                            | usage.thinkingTokens populated |

#### WF-AI-001-06: Error Handling

**Priority**: P0 | **Labels**: `errors`

| Test              | Config                            | Expected                      |
| ----------------- | --------------------------------- | ----------------------------- |
| Invalid API key   | Bad connection credentials        | Auth error message            |
| Rate limit        | Rapid requests                    | Retry info or circuit breaker |
| Empty prompt      | prompt: ""                        | Validation error              |
| Invalid model     | model: "fake-model"               | Model error message           |
| Provider mismatch | provider: openai, model: claude-3 | Incompatible config error     |

---

## Story: WF-AI-002 - Vision Node

**Description**: Test image analysis and generation capabilities.
**Labels**: `vision`, `P1`
**Estimate**: 3 points

### Tasks

#### WF-AI-002-01: Image Analysis

**Priority**: P0

| Test                 | Config                                | Expected               |
| -------------------- | ------------------------------------- | ---------------------- |
| Analyze URL image    | operation: analyze, imageInput: [URL] | Analysis text returned |
| Analyze base64 image | imageInput: [base64 string]           | Analysis text returned |
| Detail: low          | detail: "low"                         | Faster, less detailed  |
| Detail: high         | detail: "high"                        | Slower, more detailed  |
| OpenAI analysis      | provider: openai                      | Works with GPT-4V      |
| Anthropic analysis   | provider: anthropic                   | Works with Claude      |
| Google analysis      | provider: google                      | Works with Gemini      |

#### WF-AI-002-02: Image Generation

**Priority**: P1

| Test               | Config                               | Expected              |
| ------------------ | ------------------------------------ | --------------------- |
| Generate 1024x1024 | operation: generate, size: 1024x1024 | Image URL returned    |
| Generate 1792x1024 | size: 1792x1024                      | Landscape image       |
| Quality: HD        | quality: "hd"                        | Higher quality image  |
| Style: vivid       | style: "vivid"                       | Vivid style applied   |
| Style: natural     | style: "natural"                     | Natural style applied |
| Generate N images  | n: 3                                 | 3 images returned     |
| Negative prompt    | negativePrompt: "blur"               | Element avoided       |

---

## Story: WF-AI-003 - Audio Nodes

**Description**: Test audio transcription (STT) and synthesis (TTS).
**Labels**: `audio`, `P1`
**Estimate**: 3 points

### Tasks

#### WF-AI-003-01: Speech-to-Text (audioInput)

**Priority**: P1

| Test                | Config                             | Expected           |
| ------------------- | ---------------------------------- | ------------------ |
| OpenAI Whisper      | provider: openai, model: whisper-1 | Transcription text |
| Deepgram            | provider: deepgram                 | Transcription text |
| Language hint       | language: "en"                     | Improved accuracy  |
| Punctuation on      | punctuate: true                    | Punctuated output  |
| Speaker diarization | diarize: true (Deepgram)           | Speaker labels     |

#### WF-AI-003-02: Text-to-Speech (audioOutput)

**Priority**: P1

| Test                 | Config               | Expected                  |
| -------------------- | -------------------- | ------------------------- |
| OpenAI TTS           | provider: openai     | Audio output (base64/URL) |
| ElevenLabs TTS       | provider: elevenlabs | Audio output              |
| Deepgram TTS         | provider: deepgram   | Audio output              |
| Speed 0.5x           | speed: 0.5           | Slower playback           |
| Speed 2x             | speed: 2.0           | Faster playback           |
| MP3 format           | outputFormat: "mp3"  | MP3 file                  |
| WAV format           | outputFormat: "wav"  | WAV file                  |
| ElevenLabs stability | stability: 0.8       | More stable voice         |

---

## Story: WF-AI-004 - Embeddings Node

**Description**: Test vector embedding generation.
**Labels**: `embeddings`, `P1`
**Estimate**: 2 points

### Tasks

#### WF-AI-004-01: Embedding Generation

**Priority**: P1

| Test              | Config                                          | Expected                              |
| ----------------- | ----------------------------------------------- | ------------------------------------- |
| OpenAI embeddings | provider: openai, model: text-embedding-3-small | Vector array                          |
| Cohere embeddings | provider: cohere                                | Vector array                          |
| Google embeddings | provider: google                                | Vector array                          |
| Dimension check   | Any provider                                    | dimension field matches vector length |
| Batch mode        | batchMode: true, input: [array]                 | Multiple vectors                      |

---

## Story: WF-AI-005 - Router Node

**Description**: Test LLM-based intelligent routing/classification.
**Labels**: `router`, `P1`
**Estimate**: 2 points

### Tasks

#### WF-AI-005-01: Route Classification

**Priority**: P1

| Test             | Config                                         | Expected                 |
| ---------------- | ---------------------------------------------- | ------------------------ |
| 2 routes         | routes: [{value: "support"}, {value: "sales"}] | Correct route selected   |
| 4 routes         | routes: [support, sales, billing, technical]   | Correct classification   |
| Default route    | defaultRoute: "other", ambiguous input         | Falls back to default    |
| Confidence score | Any classification                             | confidence: 0-1 returned |
| Temperature 0    | temperature: 0                                 | Deterministic routing    |

---

## Story: WF-AI-006 - Knowledge Base Query Node

**Description**: Test semantic search in knowledge bases.
**Labels**: `kb`, `rag`, `P0`
**Estimate**: 2 points

### Tasks

#### WF-AI-006-01: KB Search

**Priority**: P0

| Test           | Config                                         | Expected                      |
| -------------- | ---------------------------------------------- | ----------------------------- |
| Basic query    | knowledgeBaseId: [valid], query: "search term" | Results array                 |
| topK = 5       | topK: 5                                        | Max 5 results                 |
| topK = 20      | topK: 20                                       | Max 20 results                |
| Threshold 0.7  | threshold: 0.7                                 | Only results > 0.7 similarity |
| Threshold 0.9  | threshold: 0.9                                 | Fewer, more relevant results  |
| Variable query | query: "{{userQuestion}}"                      | Variable interpolated         |
| Invalid KB ID  | knowledgeBaseId: "fake"                        | Error message                 |

---

## Story: WF-AI-007 - Image Generation Node

**Description**: Test image generation across providers.
**Labels**: `image-gen`, `P1`
**Estimate**: 3 points

### Tasks

#### WF-AI-007-01: Generate Images

**Priority**: P1

| Test              | Config                            | Expected           |
| ----------------- | --------------------------------- | ------------------ |
| OpenAI DALL-E     | provider: openai                  | Image URL/base64   |
| Replicate         | provider: replicate               | Image URL          |
| Stability AI      | provider: stabilityai             | Image URL          |
| FAL               | provider: fal                     | Image URL          |
| Aspect ratio 16:9 | aspectRatio: "16:9"               | Correct dimensions |
| Negative prompt   | negativePrompt: "text, watermark" | Elements avoided   |

#### WF-AI-007-02: Image Editing

**Priority**: P2

| Test              | Config                                  | Expected               |
| ----------------- | --------------------------------------- | ---------------------- |
| Inpaint           | operation: inpaint, sourceImage, mask   | Edited image           |
| Outpaint          | operation: outpaint, direction: "right" | Extended image         |
| Upscale 2x        | operation: upscale, scaleFactor: 2      | 2x resolution          |
| Remove background | operation: removeBackground             | Transparent background |

---

## Story: WF-AI-008 - Video Generation Node

**Description**: Test video generation capabilities.
**Labels**: `video-gen`, `P2`
**Estimate**: 2 points

### Tasks

#### WF-AI-008-01: Generate Videos

**Priority**: P2

| Test           | Config                | Expected         |
| -------------- | --------------------- | ---------------- |
| Runway         | provider: runwayml    | Video URL        |
| Stability      | provider: stabilityai | Video URL        |
| Duration 4s    | duration: 4           | ~4 second video  |
| Image-to-video | sourceImage: [URL]    | Video from image |

---

## Story: WF-AI-009 - OCR Extraction Node

**Description**: Test OCR text extraction from images.
**Labels**: `ocr`, `P1`
**Estimate**: 2 points

### Tasks

#### WF-AI-009-01: OCR Extraction

**Priority**: P1

| Test                    | Config                        | Expected                  |
| ----------------------- | ----------------------------- | ------------------------- |
| Basic OCR               | imageSource: [URL]            | Extracted text            |
| English language        | languages: ["eng"]            | English text extracted    |
| Multi-language          | languages: ["eng", "fra"]     | Both languages            |
| PSM auto (3)            | psm: 3                        | Automatic segmentation    |
| Grayscale preprocessing | preprocessing.grayscale: true | Improved accuracy         |
| Confidence threshold    | confidenceThreshold: 80       | Only high-confidence text |

---

## Story: WF-AI-010 - Audio Transcription Node

**Description**: Test Whisper audio transcription.
**Labels**: `transcription`, `P1`
**Estimate**: 2 points

### Tasks

#### WF-AI-010-01: Transcription

**Priority**: P1

| Test                 | Config              | Expected             |
| -------------------- | ------------------- | -------------------- |
| Basic transcription  | audioSource: [URL]  | Transcribed text     |
| Translate to English | task: "translate"   | English translation  |
| SRT format           | outputFormat: "srt" | SRT subtitles        |
| VTT format           | outputFormat: "vtt" | VTT subtitles        |
| With timestamps      | timestamps: true    | Segment timestamps   |
| Language hint        | language: "fr"      | French transcription |

---

# Epic 2: Workflow Nodes - Input

**Labels**: `testing`, `workflow`, `input`
**Priority**: High

---

## Story: WF-IN-001 - Input Node

**Description**: Test basic text/JSON input.
**Labels**: `input`, `P0`
**Estimate**: 1 point

### Tasks

#### WF-IN-001-01: Input Types

**Priority**: P0

| Test         | Config                                    | Expected             |
| ------------ | ----------------------------------------- | -------------------- |
| Text input   | inputType: "text", value: "hello"         | text field in output |
| JSON input   | inputType: "json", value: '{"key":"val"}' | Parsed JSON object   |
| Empty text   | value: ""                                 | Empty string handled |
| Invalid JSON | inputType: "json", value: "not json"      | Validation error     |

---

## Story: WF-IN-002 - Files Node

**Description**: Test file upload and processing.
**Labels**: `files`, `P0`
**Estimate**: 3 points

### Tasks

#### WF-IN-002-01: File Type Support

**Priority**: P0

| Test             | File Type | Expected                       |
| ---------------- | --------- | ------------------------------ |
| PDF upload       | .pdf      | Text extracted, chunks created |
| DOCX upload      | .docx     | Text extracted                 |
| DOC upload       | .doc      | Text extracted                 |
| TXT upload       | .txt      | Raw text                       |
| Markdown upload  | .md       | Content preserved              |
| HTML upload      | .html     | Tags stripped, text extracted  |
| JSON upload      | .json     | Parsed and accessible          |
| CSV upload       | .csv      | Rows parsed                    |
| Unsupported type | .exe      | Clear rejection error          |

#### WF-IN-002-02: Chunking

**Priority**: P1

| Test               | chunkSize | chunkOverlap | Expected           |
| ------------------ | --------- | ------------ | ------------------ |
| Default (1000/200) | 1000      | 200          | Standard chunks    |
| Small chunks       | 100       | 20           | Many small chunks  |
| Large chunks       | 5000      | 500          | Fewer large chunks |
| No overlap         | 1000      | 0            | No overlap         |
| Invalid overlap    | 1000      | 1500         | Validation error   |

#### WF-IN-002-03: Output Access

**Priority**: P0

| Test           | Access Path             | Expected              |
| -------------- | ----------------------- | --------------------- |
| Files array    | {{output.files}}        | Array of file objects |
| All chunks     | {{output.allChunks}}    | Combined chunk array  |
| Combined text  | {{output.combinedText}} | All text concatenated |
| File count     | {{output.fileCount}}    | Correct count         |
| Chunk metadata | chunk.metadata.fileName | Present               |

---

## Story: WF-IN-003 - URL Node

**Description**: Test web content fetching.
**Labels**: `url`, `scraping`, `P1`
**Estimate**: 3 points

### Tasks

#### WF-IN-003-01: URL Fetching

**Priority**: P1

| Test             | Config                        | Expected             |
| ---------------- | ----------------------------- | -------------------- |
| Single URL       | urls: ["https://example.com"] | Content fetched      |
| Multiple URLs    | urls: [url1, url2, url3]      | All fetched          |
| HTML mode        | scrapingMode: "html"          | Raw HTML             |
| Text mode        | scrapingMode: "text"          | Plain text           |
| Markdown mode    | scrapingMode: "markdown"      | Markdown format      |
| With timeout     | timeout: 10                   | 10 second timeout    |
| Follow redirects | followRedirects: true         | Redirects followed   |
| Subpage scraping | scrapeSubpages: true          | Linked pages scraped |

#### WF-IN-003-02: Chunking Algorithms

**Priority**: P2

| Test               | Algorithm                      | Expected             |
| ------------------ | ------------------------------ | -------------------- |
| Sentence chunking  | chunkingAlgorithm: "sentence"  | Sentence boundaries  |
| Paragraph chunking | chunkingAlgorithm: "paragraph" | Paragraph boundaries |
| Fixed chunking     | chunkingAlgorithm: "fixed"     | Fixed size           |
| Semantic chunking  | chunkingAlgorithm: "semantic"  | Semantic boundaries  |

---

## Story: WF-IN-004 - Web Search Node

**Description**: Test web search functionality.
**Labels**: `search`, `P1`
**Estimate**: 2 points

### Tasks

#### WF-IN-004-01: Search

**Priority**: P1

| Test           | Config                                     | Expected         |
| -------------- | ------------------------------------------ | ---------------- |
| General search | query: "test query", searchType: "general" | Results array    |
| News search    | searchType: "news"                         | News articles    |
| Image search   | searchType: "images"                       | Image results    |
| Max 5 results  | maxResults: 5                              | Max 5 items      |
| Max 20 results | maxResults: 20                             | Max 20 items     |
| Empty query    | query: ""                                  | Validation error |

---

## Story: WF-IN-005 - Web Browse Node

**Description**: Test single page content extraction.
**Labels**: `browse`, `P1`
**Estimate**: 1 point

### Tasks

#### WF-IN-005-01: Browse

**Priority**: P1

| Test         | Config                     | Expected                |
| ------------ | -------------------------- | ----------------------- |
| Fetch page   | url: "https://example.com" | Content, title, status  |
| Extract text | extractText: true          | Plain text content      |
| Max length   | maxLength: 1000            | Truncated to 1000 chars |
| Invalid URL  | url: "not-a-url"           | Error message           |

---

## Story: WF-IN-006 - PDF Extract Node

**Description**: Test PDF text extraction.
**Labels**: `pdf`, `P1`
**Estimate**: 2 points

### Tasks

#### WF-IN-006-01: PDF Extraction

**Priority**: P1

| Test               | Config                   | Expected            |
| ------------------ | ------------------------ | ------------------- |
| Full PDF           | path: [pdf path]         | All text extracted  |
| Page range         | pageStart: 1, pageEnd: 5 | Pages 1-5 only      |
| Specific pages     | specificPages: [1, 3, 5] | Only those pages    |
| With metadata      | extractMetadata: true    | title, author, etc. |
| Password protected | password: "secret"       | Content extracted   |
| Wrong password     | password: "wrong"        | Auth error          |
| Markdown output    | outputFormat: "markdown" | Markdown format     |

---

## Story: WF-IN-007 - File Download Node

**Description**: Test file downloading from URLs.
**Labels**: `download`, `P1`
**Estimate**: 2 points

### Tasks

#### WF-IN-007-01: Download

**Priority**: P1

| Test                | Config                                   | Expected                  |
| ------------------- | ---------------------------------------- | ------------------------- |
| Download file       | url: [file URL]                          | File saved, path returned |
| Custom filename     | filename: "custom.pdf"                   | Named correctly           |
| Max size limit      | maxSize: 1000000                         | Files over 1MB rejected   |
| Follow redirects    | followRedirects: true                    | Redirect followed         |
| Content type filter | allowedContentTypes: ["application/pdf"] | Only PDFs allowed         |
| Timeout             | timeout: 30000                           | 30s timeout               |

---

## Story: WF-IN-008 - File Read Node

**Description**: Test workspace file reading.
**Labels**: `file-read`, `P1`
**Estimate**: 1 point

### Tasks

#### WF-IN-008-01: Read Files

**Priority**: P1

| Test           | Config                      | Expected             |
| -------------- | --------------------------- | -------------------- |
| Read UTF-8     | encoding: "utf-8"           | Text content         |
| Read base64    | encoding: "base64"          | Base64 string        |
| Read binary    | encoding: "binary"          | Hex representation   |
| Max size       | maxSize: 100000             | Large files rejected |
| Path traversal | path: "../../../etc/passwd" | Security error       |
| Missing file   | path: "nonexistent.txt"     | File not found error |

---

# Epic 3: Workflow Nodes - Output

**Labels**: `testing`, `workflow`, `output`
**Priority**: High

---

## Story: WF-OUT-001 - Output Node

**Description**: Test workflow output definition.
**Labels**: `output`, `P0`
**Estimate**: 1 point

### Tasks

#### WF-OUT-001-01: Output Formats

**Priority**: P0

| Test             | Config                                 | Expected                  |
| ---------------- | -------------------------------------- | ------------------------- |
| String output    | format: "string", value: "hello"       | String in workflow output |
| JSON output      | format: "json", value: '{"key":"val"}' | Parsed JSON               |
| Number output    | format: "number", value: "42"          | Number 42                 |
| Boolean output   | format: "boolean", value: "true"       | Boolean true              |
| Multiple outputs | 2 output nodes                         | Both in final output      |

---

## Story: WF-OUT-002 - Template Output Node

**Description**: Test markdown template rendering.
**Labels**: `template`, `P1`
**Estimate**: 2 points

### Tasks

#### WF-OUT-002-01: Template Rendering

**Priority**: P1

| Test                   | Config                     | Expected             |
| ---------------------- | -------------------------- | -------------------- |
| Variable interpolation | template: "Hello {{name}}" | Name replaced        |
| Markdown output        | outputFormat: "markdown"   | Markdown preserved   |
| HTML output            | outputFormat: "html"       | Converted to HTML    |
| Table rendering        | Markdown table syntax      | Table rendered       |
| Missing variable       | template: "{{missing}}"    | Empty or placeholder |

---

## Story: WF-OUT-003 - Action Node

**Description**: Test external service actions.
**Labels**: `action`, `integrations`, `P1`
**Estimate**: 3 points

### Tasks

#### WF-OUT-003-01: Slack Actions

**Priority**: P1
**Precondition**: Valid Slack connection

| Test           | Operation                   | Expected        |
| -------------- | --------------------------- | --------------- |
| Send message   | send_message, channel, text | Message sent    |
| Create channel | create_channel, name        | Channel created |
| Update message | update_message, ts, text    | Message updated |

#### WF-OUT-003-02: Email Actions

**Priority**: P1
**Precondition**: Email connection (Resend)

| Test             | Operation                     | Expected       |
| ---------------- | ----------------------------- | -------------- |
| Send email       | send_email, to, subject, body | Email sent     |
| HTML email       | htmlBody: "<h1>Hi</h1>"       | HTML rendered  |
| With attachments | attachments: [...]            | Files attached |

#### WF-OUT-003-03: Google Sheets Actions

**Priority**: P1
**Precondition**: Google Sheets connection

| Test        | Operation                        | Expected      |
| ----------- | -------------------------------- | ------------- |
| Append rows | append_rows, spreadsheetId, data | Rows added    |
| Update rows | update_rows, range, values       | Cells updated |
| Clear range | clear_range, range               | Range cleared |

---

## Story: WF-OUT-004 - File Write Node

**Description**: Test file writing to workspace.
**Labels**: `file-write`, `P1`
**Estimate**: 1 point

### Tasks

#### WF-OUT-004-01: Write Files

**Priority**: P1

| Test               | Config                              | Expected       |
| ------------------ | ----------------------------------- | -------------- |
| Write UTF-8        | encoding: "utf-8", content: "hello" | File created   |
| Write base64       | encoding: "base64", content: [b64]  | Binary file    |
| Create directories | createDirectories: true             | Dirs created   |
| Overwrite false    | overwrite: false, existing file     | Error          |
| Path traversal     | path: "../outside"                  | Security error |

---

## Story: WF-OUT-005 - Chart Generation Node

**Description**: Test chart image generation.
**Labels**: `chart`, `P1`
**Estimate**: 2 points

### Tasks

#### WF-OUT-005-01: Chart Types

**Priority**: P1

| Test           | chartType        | Expected        |
| -------------- | ---------------- | --------------- |
| Bar chart      | "bar"            | Bar chart image |
| Line chart     | "line"           | Line chart      |
| Pie chart      | "pie"            | Pie chart       |
| Scatter plot   | "scatter"        | Scatter plot    |
| Area chart     | "area"           | Area chart      |
| Donut chart    | "donut"          | Donut chart     |
| Horizontal bar | "horizontal_bar" | Horizontal bars |

#### WF-OUT-005-02: Chart Config

**Priority**: P2

| Test            | Config                   | Expected           |
| --------------- | ------------------------ | ------------------ |
| Custom size     | width: 1200, height: 800 | Correct dimensions |
| Dark theme      | theme: "dark"            | Dark background    |
| Legend position | legend: "bottom"         | Legend at bottom   |
| Show values     | showValues: true         | Values on chart    |
| Hide grid       | showGrid: false          | No grid lines      |

---

## Story: WF-OUT-006 - Spreadsheet Generation Node

**Description**: Test Excel/CSV file generation.
**Labels**: `spreadsheet`, `P1`
**Estimate**: 2 points

### Tasks

#### WF-OUT-006-01: Spreadsheet Generation

**Priority**: P1

| Test              | Config                           | Expected        |
| ----------------- | -------------------------------- | --------------- |
| XLSX format       | format: "xlsx"                   | Excel file      |
| CSV format        | format: "csv"                    | CSV file        |
| Custom sheet name | sheetName: "Data"                | Named sheet     |
| Bold headers      | headerBold: true                 | Bold header row |
| Header color      | headerBackgroundColor: "#FF0000" | Red headers     |
| Freeze header     | freezeHeader: true               | Header frozen   |
| Alternate rows    | alternateRows: true              | Striped rows    |

---

## Story: WF-OUT-007 - PDF Generation Node

**Description**: Test PDF document generation.
**Labels**: `pdf-gen`, `P1`
**Estimate**: 2 points

### Tasks

#### WF-OUT-007-01: PDF Generation

**Priority**: P1

| Test           | Config                   | Expected          |
| -------------- | ------------------------ | ----------------- |
| From markdown  | format: "markdown"       | PDF from MD       |
| From HTML      | format: "html"           | PDF from HTML     |
| A4 size        | pageSize: "a4"           | A4 dimensions     |
| Letter size    | pageSize: "letter"       | Letter dimensions |
| Landscape      | orientation: "landscape" | Landscape PDF     |
| Custom margins | marginTop: "30mm"        | 30mm top margin   |
| Page numbers   | includePageNumbers: true | Numbers in footer |
| Header/footer  | headerText: "Title"      | Header on pages   |

---

## Story: WF-OUT-008 - Screenshot Capture Node

**Description**: Test webpage screenshot capture.
**Labels**: `screenshot`, `P1`
**Estimate**: 2 points

### Tasks

#### WF-OUT-008-01: Screenshot Capture

**Priority**: P1

| Test                 | Config                      | Expected              |
| -------------------- | --------------------------- | --------------------- |
| Basic screenshot     | url: "https://example.com"  | Screenshot image      |
| Full page            | fullPage: true              | Entire page captured  |
| Custom viewport      | width: 1920, height: 1080   | Correct dimensions    |
| Element selector     | selector: "#main"           | Only element captured |
| PNG format           | format: "png"               | PNG file              |
| JPEG format          | format: "jpeg", quality: 80 | JPEG at 80%           |
| Delay before capture | delay: 2000                 | 2s wait then capture  |
| Dark mode            | darkMode: true              | Dark mode emulated    |

---

# Epic 4: Workflow Nodes - Logic

**Labels**: `testing`, `workflow`, `logic`
**Priority**: High

---

## Story: WF-LOG-001 - Conditional Node

**Description**: Test conditional branching logic.
**Labels**: `conditional`, `P0`
**Estimate**: 3 points

### Tasks

#### WF-LOG-001-01: Comparison Operators

**Priority**: P0

| Test             | left          | operator   | right   | Expected Branch |
| ---------------- | ------------- | ---------- | ------- | --------------- |
| Equality true    | "hello"       | ==         | "hello" | true            |
| Equality false   | "hello"       | ==         | "world" | false           |
| Case insensitive | "Hello"       | ==         | "hello" | true            |
| Not equal        | "a"           | !=         | "b"     | true            |
| Greater than     | "10"          | >          | "5"     | true            |
| Less than        | "3"           | <          | "7"     | true            |
| Greater or equal | "5"           | >=         | "5"     | true            |
| Less or equal    | "4"           | <=         | "5"     | true            |
| Contains         | "hello world" | contains   | "world" | true            |
| Starts with      | "hello"       | startsWith | "hel"   | true            |
| Ends with        | "hello"       | endsWith   | "lo"    | true            |

#### WF-LOG-001-02: Null & Empty Checks

**Priority**: P1

| Test             | left    | operator   | Expected |
| ---------------- | ------- | ---------- | -------- |
| isEmpty on ""    | ""      | isEmpty    | true     |
| isEmpty on null  | null    | isEmpty    | true     |
| isEmpty on value | "hello" | isEmpty    | false    |
| isNotEmpty       | "hello" | isNotEmpty | true     |
| isNull on null   | null    | isNull     | true     |
| isNotNull        | "value" | isNotNull  | true     |

#### WF-LOG-001-03: Expression Mode

**Priority**: P1

| Test       | Expression                   | Expected            |
| ---------- | ---------------------------- | ------------------- |
| Arithmetic | "{{count}} > 5"              | Evaluates correctly |
| Complex    | "{{a}} == 'x' && {{b}} > 10" | Boolean result      |

---

## Story: WF-LOG-002 - Switch Node

**Description**: Test multi-way branching.
**Labels**: `switch`, `P1`
**Estimate**: 2 points

### Tasks

#### WF-LOG-002-01: Switch Cases

**Priority**: P1

| Test             | Expression  | Cases                             | Expected   |
| ---------------- | ----------- | --------------------------------- | ---------- |
| Exact match      | "sales"     | [sales, support, billing]         | case-sales |
| Default case     | "other"     | [sales, support], default: "misc" | default    |
| Wildcard \*      | "order-123" | ["order-*"]                       | Matches    |
| Wildcard ?       | "v1"        | ["v?"]                            | Matches    |
| Case insensitive | "SALES"     | [sales]                           | Matches    |
| First match wins | "sales"     | [sales, sales-team]               | First case |

---

## Story: WF-LOG-003 - Loop Node

**Description**: Test iteration constructs.
**Labels**: `loop`, `P0`
**Estimate**: 3 points

### Tasks

#### WF-LOG-003-01: ForEach Loop

**Priority**: P0

| Test            | Config                                | Expected                        |
| --------------- | ------------------------------------- | ------------------------------- |
| Array iteration | arrayPath: "{{items}}", items=[1,2,3] | 3 iterations                    |
| Item variable   | itemVariable: "item"                  | {{item}} accessible             |
| Index variable  | indexVariable: "i"                    | {{i}} accessible (0,1,2)        |
| Empty array     | items=[]                              | 0 iterations, exits immediately |
| Nested objects  | items=[{name:"A"},{name:"B"}]         | {{item.name}} works             |

#### WF-LOG-003-02: Count Loop

**Priority**: P1

| Test                | Config                      | Expected      |
| ------------------- | --------------------------- | ------------- |
| Count 5             | loopType: "count", count: 5 | 5 iterations  |
| Start index 1       | startIndex: 1               | Index 1-5     |
| Count from variable | count: "{{num}}"            | Dynamic count |

#### WF-LOG-003-03: While Loop

**Priority**: P1

| Test                | Config                  | Expected               |
| ------------------- | ----------------------- | ---------------------- |
| While condition     | condition: "{{x}} < 10" | Loops until x >= 10    |
| Max iterations      | maxIterations: 100      | Stops at 100           |
| Infinite protection | condition: "true"       | Stops at maxIterations |

#### WF-LOG-003-04: Loop Control

**Priority**: P1

| Test           | Config                    | Expected                |
| -------------- | ------------------------- | ----------------------- |
| Break          | Set {{loop.break}} = true | Exits loop early        |
| Loop body port | Connect to loop-body      | Executes each iteration |
| Loop exit port | Connect to loop-exit      | Executes after loop     |

---

## Story: WF-LOG-004 - Wait Node

**Description**: Test execution delays.
**Labels**: `wait`, `P1`
**Estimate**: 1 point

### Tasks

#### WF-LOG-004-01: Wait Duration

**Priority**: P1

| Test              | Config                                 | Expected         |
| ----------------- | -------------------------------------- | ---------------- |
| Wait 5 seconds    | duration: 5, unit: "seconds"           | 5s delay         |
| Wait 1 minute     | duration: 1, unit: "minutes"           | 60s delay        |
| Wait milliseconds | duration: 500, unit: "ms"              | 500ms delay      |
| Until timestamp   | waitType: "until", timestamp: [future] | Waits until time |
| With timezone     | timezone: "America/New_York"           | Correct time     |

---

## Story: WF-LOG-005 - Human Review Node

**Description**: Test human-in-the-loop pausing.
**Labels**: `human-review`, `P0`
**Estimate**: 2 points

### Tasks

#### WF-LOG-005-01: Human Input

**Priority**: P0

| Test               | Config                         | Expected                          |
| ------------------ | ------------------------------ | --------------------------------- |
| Text input         | inputType: "text"              | Workflow pauses, text input shown |
| Number input       | inputType: "number"            | Number input field                |
| Boolean input      | inputType: "boolean"           | Checkbox                          |
| JSON input         | inputType: "json"              | JSON editor                       |
| Required field     | required: true                 | Cannot submit empty               |
| Default value      | defaultValue: "default"        | Pre-filled                        |
| Validation pattern | validation.pattern: "^[A-Z]+$" | Regex enforced                    |
| Min/max            | validation.min: 0, max: 100    | Range enforced                    |

---

## Story: WF-LOG-006 - Transform Node

**Description**: Test data transformation operations.
**Labels**: `transform`, `P1`
**Estimate**: 2 points

### Tasks

#### WF-LOG-006-01: Transform Operations

**Priority**: P1

| Test        | Operation                       | Expected          |
| ----------- | ------------------------------- | ----------------- |
| Map         | operation: "map", expression    | Array transformed |
| Filter      | operation: "filter", expression | Array filtered    |
| Reduce      | operation: "reduce", expression | Single value      |
| Sort        | operation: "sort"               | Array sorted      |
| Merge       | operation: "merge"              | Objects merged    |
| Extract     | operation: "extract", path      | Value extracted   |
| Parse JSON  | operation: "parseJSON"          | String → object   |
| Parse XML   | operation: "parseXML"           | XML → object      |
| Passthrough | operation: "passthrough"        | Data unchanged    |

---

## Story: WF-LOG-007 - Shared Memory Node

**Description**: Test key-value storage with semantic search.
**Labels**: `shared-memory`, `P1`
**Estimate**: 2 points

### Tasks

#### WF-LOG-007-01: Store & Search

**Priority**: P1

| Test             | Operation                                    | Expected             |
| ---------------- | -------------------------------------------- | -------------------- |
| Store value      | operation: "store", key: "x", value: "hello" | Stored successfully  |
| Retrieve value   | {{shared.x}}                                 | "hello" returned     |
| Semantic search  | operation: "search", query: "greeting"       | Matches "hello"      |
| TopK search      | topK: 3                                      | Max 3 results        |
| Threshold filter | similarityThreshold: 0.8                     | High similarity only |
| Enable indexing  | enableSemanticSearch: true                   | Value indexed        |

---

## Story: WF-LOG-008 - Code Node

**Description**: Test sandboxed code execution.
**Labels**: `code`, `sandbox`, `P0`
**Estimate**: 3 points

### Tasks

#### WF-LOG-008-01: Language Support

**Priority**: P0

| Test       | Language   | Code           | Expected        |
| ---------- | ---------- | -------------- | --------------- |
| JavaScript | javascript | `return 1 + 1` | result: 2       |
| Python     | python     | `return 1 + 1` | result: 2       |
| Shell      | shell      | `echo "hello"` | stdout: "hello" |

#### WF-LOG-008-02: Input/Output

**Priority**: P1

| Test            | Config                     | Expected               |
| --------------- | -------------------------- | ---------------------- |
| Input variables | inputVariables: ["x"], x=5 | x accessible in code   |
| Return value    | `return {a: 1, b: 2}`      | result contains object |
| Stdout capture  | `console.log("hi")`        | stdout: "hi"           |
| Stderr capture  | throw error                | stderr populated       |

#### WF-LOG-008-03: Sandbox Limits

**Priority**: P0

| Test          | Config                             | Expected         |
| ------------- | ---------------------------------- | ---------------- |
| Timeout       | timeout: 1000, infinite loop       | Execution killed |
| Memory limit  | memory: 128, allocate 500MB        | OOM error        |
| No network    | allowNetworkAccess: false, fetch() | Network blocked  |
| No filesystem | allowFileSystemAccess: false       | FS blocked       |

---

# Epic 5: Workflow Nodes - Utility

**Labels**: `testing`, `workflow`, `utility`
**Priority**: High

---

## Story: WF-UTIL-001 - HTTP Node

**Description**: Test HTTP request capabilities.
**Labels**: `http`, `P0`
**Estimate**: 3 points

### Tasks

#### WF-UTIL-001-01: HTTP Methods

**Priority**: P0

| Test           | Method                | Expected      |
| -------------- | --------------------- | ------------- |
| GET request    | method: "GET"         | Response body |
| POST request   | method: "POST", body  | Response      |
| PUT request    | method: "PUT", body   | Response      |
| PATCH request  | method: "PATCH", body | Response      |
| DELETE request | method: "DELETE"      | Response      |

#### WF-UTIL-001-02: Headers & Auth

**Priority**: P1

| Test           | Config                                          | Expected      |
| -------------- | ----------------------------------------------- | ------------- |
| Custom headers | headers: [{key: "X-Custom", value: "test"}]     | Header sent   |
| Bearer auth    | authType: "bearer", authCredentials: "token"    | Auth header   |
| Basic auth     | authType: "basic", authCredentials: "user:pass" | Basic header  |
| API key auth   | authType: "apiKey"                              | Key in header |

#### WF-UTIL-001-03: Body & Query Params

**Priority**: P1

| Test            | Config                                   | Expected     |
| --------------- | ---------------------------------------- | ------------ |
| JSON body       | bodyType: "json", body: '{"key":"val"}'  | JSON sent    |
| Form body       | bodyType: "form"                         | Form-encoded |
| Query params    | queryParams: [{key: "q", value: "test"}] | URL encoded  |
| Variable in URL | url: "{{baseUrl}}/api"                   | Interpolated |

#### WF-UTIL-001-04: Error Handling

**Priority**: P1

| Test         | Config                      | Expected          |
| ------------ | --------------------------- | ----------------- |
| Timeout      | timeout: 5, slow endpoint   | Timeout error     |
| Retry on 500 | retryCount: 3, 500 response | Retries 3 times   |
| 404 response | Request to missing endpoint | 404 in statusCode |

---

## Story: WF-UTIL-002 - Database Node

**Description**: Test database query execution.
**Labels**: `database`, `P1`
**Estimate**: 3 points

### Tasks

#### WF-UTIL-002-01: Database Types

**Priority**: P1

| Test       | databaseType | Expected         |
| ---------- | ------------ | ---------------- |
| PostgreSQL | postgres     | Connection works |
| MySQL      | mysql        | Connection works |
| MongoDB    | mongodb      | Connection works |

#### WF-UTIL-002-02: Operations

**Priority**: P1

| Test          | Operation           | Expected                   |
| ------------- | ------------------- | -------------------------- |
| SELECT query  | operation: "query"  | rows array                 |
| INSERT        | operation: "insert" | affectedRows, lastInsertId |
| UPDATE        | operation: "update" | affectedRows               |
| DELETE        | operation: "delete" | affectedRows               |
| Parameterized | parameters: {id: 1} | SQL injection safe         |

---

# Epic 6: Workflow Nodes - Integration

**Labels**: `testing`, `workflow`, `integration`
**Priority**: Medium

---

## Story: WF-INT-001 - Integration Node

**Description**: Test third-party service operations.
**Labels**: `integrations`, `P1`
**Estimate**: 3 points

### Tasks

#### WF-INT-001-01: Service Operations

**Priority**: P1
**Precondition**: Valid connection for each service

| Service       | Action         | Expected        |
| ------------- | -------------- | --------------- |
| Slack         | send_message   | Message sent    |
| Slack         | create_channel | Channel created |
| Email         | send_email     | Email delivered |
| Google Sheets | append_rows    | Rows added      |
| Discord       | send_message   | Message sent    |
| Twilio        | send_sms       | SMS sent        |

---

## Story: WF-INT-002 - File Operations Node

**Description**: Test external file storage operations.
**Labels**: `file-ops`, `P2`
**Estimate**: 2 points

### Tasks

#### WF-INT-002-01: File Operations

**Priority**: P2

| Test         | Operation           | Expected         |
| ------------ | ------------------- | ---------------- |
| Read file    | operation: "read"   | Content returned |
| Write file   | operation: "write"  | File created     |
| Delete file  | operation: "delete" | File removed     |
| List files   | operation: "list"   | File list        |
| Check exists | operation: "exists" | Boolean          |

---

# Epic 7: Agent Tools

**Labels**: `testing`, `agents`, `tools`
**Priority**: High

---

## Story: TOOL-001 - Web Tools

**Description**: Test web search and browsing tools.
**Labels**: `web-tools`, `P0`
**Estimate**: 2 points

### Tasks

#### TOOL-001-01: Web Search Tool

**Priority**: P0

| Test           | Input                 | Expected      |
| -------------- | --------------------- | ------------- |
| General search | query: "test query"   | Results array |
| Max results    | max_results: 10       | 10 results    |
| News search    | search_type: "news"   | News results  |
| Image search   | search_type: "images" | Image results |

#### TOOL-001-02: Web Browse Tool

**Priority**: P1

| Test         | Input                      | Expected     |
| ------------ | -------------------------- | ------------ |
| Fetch URL    | url: "https://example.com" | HTML content |
| POST request | method: "POST"             | Response     |
| With headers | headers: {...}             | Headers sent |

---

## Story: TOOL-002 - Code Execution Tool

**Description**: Test sandboxed code execution tool.
**Labels**: `code-tool`, `P0`
**Estimate**: 3 points

### Tasks

#### TOOL-002-01: Code Execution

**Priority**: P0

| Test                | Input                  | Expected          |
| ------------------- | ---------------------- | ----------------- |
| Python code         | language: "python"     | Result            |
| JavaScript code     | language: "javascript" | Result            |
| Shell commands      | language: "shell"      | Result            |
| With packages       | packages: ["requests"] | Package installed |
| With timeout        | timeout: 30            | Enforced          |
| Session persistence | sessionId: "abc"       | State preserved   |
| Input data          | inputData: {...}       | Data accessible   |

---

## Story: TOOL-003 - File Tools

**Description**: Test file manipulation tools.
**Labels**: `file-tools`, `P1`
**Estimate**: 2 points

### Tasks

#### TOOL-003-01: File Operations

**Priority**: P1

| Test          | Tool           | Expected        |
| ------------- | -------------- | --------------- |
| file_read     | path, encoding | Content         |
| file_write    | path, content  | File created    |
| file_download | url            | File downloaded |

---

## Story: TOOL-004 - Media Tools

**Description**: Test media generation tools.
**Labels**: `media-tools`, `P1`
**Estimate**: 3 points

### Tasks

#### TOOL-004-01: Media Generation

**Priority**: P1

| Test                 | Tool           | Expected    |
| -------------------- | -------------- | ----------- |
| image_generate       | prompt, size   | Image URL   |
| pdf_generate         | html, options  | PDF URL     |
| spreadsheet_generate | data, filename | Spreadsheet |
| chart_generate       | type, data     | Chart image |
| screenshot_capture   | url, viewport  | Screenshot  |
| text_to_speech       | text, voice    | Audio URL   |

---

## Story: TOOL-005 - Data Tools

**Description**: Test data extraction tools.
**Labels**: `data-tools`, `P1`
**Estimate**: 2 points

### Tasks

#### TOOL-005-01: Data Extraction

**Priority**: P1

| Test             | Tool           | Expected       |
| ---------------- | -------------- | -------------- |
| pdf_extract      | pdf_url, pages | Text, tables   |
| ocr_extract      | image_url      | Extracted text |
| audio_transcribe | audio_url      | Transcription  |

---

# Epic 8: Knowledge Bases

**Labels**: `testing`, `knowledge-bases`
**Priority**: High

---

## Story: KB-001 - Knowledge Base CRUD

**Description**: Test KB creation, reading, updating, deleting.
**Labels**: `kb-crud`, `P0`
**Estimate**: 2 points

### Tasks

#### KB-001-01: CRUD Operations

**Priority**: P0

| Test      | Operation                   | Expected           |
| --------- | --------------------------- | ------------------ |
| Create KB | POST /knowledge-bases       | KB created with ID |
| List KBs  | GET /knowledge-bases        | Array of KBs       |
| Get KB    | GET /knowledge-bases/:id    | KB details         |
| Update KB | PUT /knowledge-bases/:id    | KB updated         |
| Delete KB | DELETE /knowledge-bases/:id | KB deleted         |

#### KB-001-02: KB Categories

**Priority**: P1

| Test                  | Category                 | Expected |
| --------------------- | ------------------------ | -------- |
| Product Documentation | category: "product-docs" | Created  |
| FAQ & Help            | category: "faq"          | Created  |
| Research Papers       | category: "research"     | Created  |
| Company Wiki          | category: "wiki"         | Created  |
| Training Materials    | category: "training"     | Created  |
| Legal                 | category: "legal"        | Created  |
| Sales Enablement      | category: "sales"        | Created  |
| Engineering Docs      | category: "engineering"  | Created  |
| Blank                 | category: "blank"        | Created  |

---

## Story: KB-002 - Document Management

**Description**: Test document upload and processing.
**Labels**: `kb-docs`, `P0`
**Estimate**: 3 points

### Tasks

#### KB-002-01: Document Upload

**Priority**: P0

| Test        | File Type | Expected                         |
| ----------- | --------- | -------------------------------- |
| Upload PDF  | .pdf      | Document created, text extracted |
| Upload DOCX | .docx     | Document created                 |
| Upload TXT  | .txt      | Document created                 |
| Upload MD   | .md       | Document created                 |
| Upload HTML | .html     | Document created                 |
| Upload JSON | .json     | Document created                 |
| Upload CSV  | .csv      | Document created                 |

#### KB-002-02: Document Processing

**Priority**: P1

| Test               | Config            | Expected                        |
| ------------------ | ----------------- | ------------------------------- |
| Status: pending    | After upload      | status: "pending"               |
| Status: processing | During processing | status: "processing"            |
| Status: ready      | After completion  | status: "ready"                 |
| Status: failed     | On error          | status: "failed", error_message |
| Chunk count        | After processing  | Multiple chunks created         |

#### KB-002-03: Document CRUD

**Priority**: P1

| Test            | Operation                          | Expected         |
| --------------- | ---------------------------------- | ---------------- |
| List documents  | GET /knowledge-bases/:id/documents | Documents array  |
| Delete document | DELETE /documents/:id              | Document removed |

---

## Story: KB-003 - Semantic Search

**Description**: Test KB querying and retrieval.
**Labels**: `kb-search`, `P0`
**Estimate**: 2 points

### Tasks

#### KB-003-01: Query KB

**Priority**: P0

| Test           | Config               | Expected                |
| -------------- | -------------------- | ----------------------- |
| Basic query    | query: "search term" | Results with similarity |
| Top 5 results  | topK: 5              | Max 5 results           |
| High threshold | threshold: 0.9       | Only highly relevant    |
| Low threshold  | threshold: 0.5       | More results            |
| Empty KB       | Query empty KB       | Empty results           |
| No matches     | Query unrelated term | Low/no results          |

---

# Epic 9: Connections & OAuth

**Labels**: `testing`, `connections`, `oauth`
**Priority**: Critical

---

## Story: CONN-001 - Connection CRUD

**Description**: Test connection management.
**Labels**: `conn-crud`, `P0`
**Estimate**: 2 points

### Tasks

#### CONN-001-01: CRUD Operations

**Priority**: P0

| Test              | Operation               | Expected           |
| ----------------- | ----------------------- | ------------------ |
| Create connection | POST /connections       | Connection created |
| List connections  | GET /connections        | Connections array  |
| Get connection    | GET /connections/:id    | Connection details |
| Update connection | PUT /connections/:id    | Connection updated |
| Delete connection | DELETE /connections/:id | Connection deleted |

---

## Story: CONN-002 - OAuth 2.0 Flows

**Description**: Test OAuth 2.0 authorization.
**Labels**: `oauth2`, `P0`
**Estimate**: 3 points

### Tasks

#### CONN-002-01: OAuth Flow

**Priority**: P0

| Test            | Provider            | Expected      |
| --------------- | ------------------- | ------------- |
| Google OAuth    | provider: google    | Tokens stored |
| Microsoft OAuth | provider: microsoft | Tokens stored |
| Slack OAuth     | provider: slack     | Tokens stored |
| GitHub OAuth    | provider: github    | Tokens stored |
| HubSpot OAuth   | provider: hubspot   | Tokens stored |

#### CONN-002-02: Token Management

**Priority**: P1

| Test           | Operation                   | Expected               |
| -------------- | --------------------------- | ---------------------- |
| Token refresh  | Expired token               | New access_token       |
| Token revoke   | POST /oauth/revoke          | Connection invalidated |
| Check validity | GET /oauth/scheduler-status | Status returned        |

---

## Story: CONN-003 - API Key Connections

**Description**: Test API key-based connections.
**Labels**: `api-key`, `P1`
**Estimate**: 2 points

### Tasks

#### CONN-003-01: API Key Providers

**Priority**: P1

| Test       | Provider          | Expected         |
| ---------- | ----------------- | ---------------- |
| OpenAI     | api_key: "sk-..." | Connection works |
| Anthropic  | api_key: "..."    | Connection works |
| Notion     | api_key: "..."    | Connection works |
| Custom API | api_key + headers | Connection works |

---

## Story: CONN-004 - Database Connections

**Description**: Test database connection setup.
**Labels**: `db-conn`, `P1`
**Estimate**: 2 points

### Tasks

#### CONN-004-01: Database Providers

**Priority**: P1

| Test       | Provider                   | Config           | Expected |
| ---------- | -------------------------- | ---------------- | -------- |
| PostgreSQL | host, port, db, user, pass | Connection works |
| MySQL      | host, port, db, user, pass | Connection works |
| MongoDB    | connection_string          | Connection works |
| With SSL   | ssl: true                  | SSL connection   |

---

# Epic 10: Triggers

**Labels**: `testing`, `triggers`
**Priority**: High

---

## Story: TRIG-001 - Schedule Triggers

**Description**: Test cron-based scheduling.
**Labels**: `schedule`, `P0`
**Estimate**: 2 points

### Tasks

#### TRIG-001-01: Cron Scheduling

**Priority**: P0

| Test           | Cron Expression              | Expected              |
| -------------- | ---------------------------- | --------------------- |
| Every minute   | "\* \* \* \* \*"             | Executes every minute |
| Every hour     | "0 \* \* \* \*"              | Executes on the hour  |
| Daily at noon  | "0 12 \* \* \*"              | Executes at 12:00     |
| Weekdays only  | "0 9 \* \* 1-5"              | Mon-Fri at 9am        |
| With timezone  | timezone: "America/New_York" | Correct timezone      |
| Enable/disable | enabled: false               | Does not execute      |

---

## Story: TRIG-002 - Webhook Triggers

**Description**: Test HTTP webhook triggers.
**Labels**: `webhook`, `P0`
**Estimate**: 3 points

### Tasks

#### TRIG-002-01: Webhook Methods

**Priority**: P0

| Test         | Method         | Expected            |
| ------------ | -------------- | ------------------- |
| POST webhook | method: "POST" | Accepts POST        |
| GET webhook  | method: "GET"  | Accepts GET         |
| ANY webhook  | method: "ANY"  | Accepts all methods |

#### TRIG-002-02: Webhook Auth

**Priority**: P1

| Test           | authType            | Expected              |
| -------------- | ------------------- | --------------------- |
| No auth        | authType: "none"    | Open access           |
| API key        | authType: "api_key" | Requires header       |
| HMAC signature | authType: "hmac"    | Validates signature   |
| Bearer token   | authType: "bearer"  | Requires bearer token |

#### TRIG-002-03: Webhook Response

**Priority**: P1

| Test           | Config                 | Expected            |
| -------------- | ---------------------- | ------------------- |
| JSON response  | responseFormat: "json" | JSON returned       |
| Text response  | responseFormat: "text" | Plain text          |
| Custom headers | customHeaders: {...}   | Headers in response |

---

## Story: TRIG-003 - Manual Triggers

**Description**: Test manual workflow execution.
**Labels**: `manual`, `P0`
**Estimate**: 1 point

### Tasks

#### TRIG-003-01: Manual Execution

**Priority**: P0

| Test            | Config                 | Expected            |
| --------------- | ---------------------- | ------------------- |
| Basic manual    | trigger_type: "manual" | Execute on demand   |
| With inputs     | inputSchema: {...}     | Input form shown    |
| Required inputs | requireInputs: true    | Must provide inputs |

---

## Story: TRIG-004 - Event Triggers

**Description**: Test event-based triggers.
**Labels**: `events`, `P2`
**Estimate**: 2 points

### Tasks

#### TRIG-004-01: Event Triggers

**Priority**: P2

| Test         | Config                    | Expected             |
| ------------ | ------------------------- | -------------------- |
| Event type   | eventType: "user.created" | Triggers on event    |
| With filters | filters: {field: "value"} | Filtered events only |

---

# Epic 11: Executions & Runtime

**Labels**: `testing`, `executions`
**Priority**: High

---

## Story: EXEC-001 - Execution Lifecycle

**Description**: Test execution status flow.
**Labels**: `lifecycle`, `P0`
**Estimate**: 2 points

### Tasks

#### EXEC-001-01: Status Flow

**Priority**: P0

| Test            | Action                      | Expected Status   |
| --------------- | --------------------------- | ----------------- |
| Start execution | Execute workflow            | pending → running |
| Complete        | Workflow finishes           | completed         |
| Fail            | Node throws error           | failed            |
| Cancel          | POST /executions/:id/cancel | cancelled         |

---

## Story: EXEC-002 - Execution Streaming

**Description**: Test real-time execution updates.
**Labels**: `streaming`, `P0`
**Estimate**: 2 points

### Tasks

#### EXEC-002-01: Stream Events

**Priority**: P0

| Test           | Event                      | Expected            |
| -------------- | -------------------------- | ------------------- |
| Connect        | GET /executions/:id/stream | SSE connection      |
| Node start     | Node begins                | node_start event    |
| Node complete  | Node finishes              | node_complete event |
| Token stream   | LLM streaming              | token events        |
| Execution done | Workflow completes         | done event          |
| Error          | Workflow fails             | error event         |

---

## Story: EXEC-003 - Pause & Resume

**Description**: Test human-in-the-loop pausing.
**Labels**: `pause-resume`, `P0`
**Estimate**: 2 points

### Tasks

#### EXEC-003-01: Pause Flow

**Priority**: P0

| Test              | Action                               | Expected              |
| ----------------- | ------------------------------------ | --------------------- |
| Human review node | Execute                              | status: paused        |
| Submit response   | POST /executions/:id/submit-response | Resumes execution     |
| Timeout           | No response                          | Configurable behavior |

---

## Story: EXEC-004 - Execution Logs

**Description**: Test execution logging.
**Labels**: `logs`, `P1`
**Estimate**: 1 point

### Tasks

#### EXEC-004-01: Log Retrieval

**Priority**: P1

| Test       | Action                   | Expected           |
| ---------- | ------------------------ | ------------------ |
| Get logs   | GET /executions/:id/logs | Log entries        |
| Node logs  | Filter by node           | Node-specific logs |
| Error logs | Failed execution         | Error details      |

---

# Epic 12: Agents & Personas

**Labels**: `testing`, `agents`, `personas`
**Priority**: High

---

## Story: AGENT-001 - Agent CRUD

**Description**: Test agent management.
**Labels**: `agent-crud`, `P0`
**Estimate**: 2 points

### Tasks

#### AGENT-001-01: CRUD Operations

**Priority**: P0

| Test         | Operation          | Expected      |
| ------------ | ------------------ | ------------- |
| Create agent | POST /agents       | Agent created |
| List agents  | GET /agents        | Agents array  |
| Get agent    | GET /agents/:id    | Agent details |
| Update agent | PUT /agents/:id    | Agent updated |
| Delete agent | DELETE /agents/:id | Agent deleted |

---

## Story: AGENT-002 - Agent Configuration

**Description**: Test agent settings.
**Labels**: `agent-config`, `P0`
**Estimate**: 3 points

### Tasks

#### AGENT-002-01: LLM Providers

**Priority**: P0

| Test      | Provider              | Expected |
| --------- | --------------------- | -------- |
| OpenAI    | provider: "openai"    | Works    |
| Anthropic | provider: "anthropic" | Works    |
| Google    | provider: "google"    | Works    |
| XAI       | provider: "xai"       | Works    |
| Cohere    | provider: "cohere"    | Works    |

#### AGENT-002-02: Parameters

**Priority**: P1

| Test           | Config               | Expected |
| -------------- | -------------------- | -------- |
| Temperature    | temperature: 0.5     | Applied  |
| Max tokens     | max_tokens: 2048     | Enforced |
| Max iterations | max_iterations: 50   | Enforced |
| System prompt  | system_prompt: "..." | Applied  |

---

## Story: AGENT-003 - Agent Tools

**Description**: Test tool management on agents.
**Labels**: `agent-tools`, `P0`
**Estimate**: 2 points

### Tasks

#### AGENT-003-01: Tool Operations

**Priority**: P0

| Test        | Operation                        | Expected          |
| ----------- | -------------------------------- | ----------------- |
| Add tool    | POST /agents/:id/add-tool        | Tool added        |
| Add batch   | POST /agents/:id/add-tools-batch | Multiple added    |
| Remove tool | DELETE /agents/:id/tools/:toolId | Tool removed      |
| List tools  | GET agent details                | Tools in response |

#### AGENT-003-02: Tool Types

**Priority**: P1

| Test     | Tool Type              | Expected |
| -------- | ---------------------- | -------- |
| Builtin  | type: "builtin"        | Works    |
| Workflow | type: "workflow"       | Works    |
| KB       | type: "knowledge_base" | Works    |
| MCP      | type: "mcp"            | Works    |

---

## Story: AGENT-004 - Agent Threads

**Description**: Test conversation threads.
**Labels**: `threads`, `P0`
**Estimate**: 2 points

### Tasks

#### AGENT-004-01: Thread Operations

**Priority**: P0

| Test          | Operation                 | Expected       |
| ------------- | ------------------------- | -------------- |
| Create thread | POST /agents/:id/threads  | Thread created |
| List threads  | GET /agents/:id/threads   | Threads array  |
| Get thread    | GET /threads/:id          | Thread details |
| Delete thread | DELETE /threads/:id       | Thread deleted |
| Get messages  | GET /threads/:id/messages | Messages array |

---

## Story: AGENT-005 - Agent Execution

**Description**: Test agent message handling.
**Labels**: `agent-exec`, `P0`
**Estimate**: 3 points

### Tasks

#### AGENT-005-01: Send Messages

**Priority**: P0

| Test           | Action                        | Expected         |
| -------------- | ----------------------------- | ---------------- |
| Simple message | POST /agents/:id/send-message | Response         |
| With thread    | threadId: "..."               | Continues thread |
| Streaming      | GET /agents/:id/stream        | SSE tokens       |
| Tool call      | Message needing tool          | Tool executed    |

---

## Story: AGENT-006 - Agent Patterns

**Description**: Test pre-built agent templates.
**Labels**: `patterns`, `P1`
**Estimate**: 2 points

### Tasks

#### AGENT-006-01: Create from Pattern

**Priority**: P1

| Pattern           | Expected |
| ----------------- | -------- |
| General Assistant | Works    |
| Code Helper       | Works    |
| Customer Support  | Works    |
| Data Analyst      | Works    |
| Writing Assistant | Works    |
| Research Agent    | Works    |
| Sales Assistant   | Works    |
| DevOps Assistant  | Works    |
| SDR               | Works    |
| Code Review Bot   | Works    |

---

## Story: PERSONA-001 - Persona Instances

**Description**: Test long-running persona tasks.
**Labels**: `personas`, `P1`
**Estimate**: 3 points

### Tasks

#### PERSONA-001-01: Instance Lifecycle

**Priority**: P1

| Test            | Action                  | Expected                           |
| --------------- | ----------------------- | ---------------------------------- |
| Launch instance | POST /persona-instances | Instance created                   |
| Status flow     | Execute                 | initializing → running → completed |
| Cancel          | POST /:id/cancel        | cancelled status                   |
| Complete        | POST /:id/complete      | completed status                   |

#### PERSONA-001-02: Clarification

**Priority**: P1

| Test                | Action                       | Expected           |
| ------------------- | ---------------------------- | ------------------ |
| Clarification phase | Persona with clarify         | status: clarifying |
| Submit response     | POST /:id/message            | Continues          |
| Skip clarification  | POST /:id/skip-clarification | Starts running     |

#### PERSONA-001-03: Approvals

**Priority**: P1

| Test              | Action                                  | Expected                 |
| ----------------- | --------------------------------------- | ------------------------ |
| Approval required | High-risk action                        | status: waiting_approval |
| Approve           | POST /:id/approvals/:approvalId approve | Continues                |
| Reject            | Reject approval                         | Handles gracefully       |
| Extend time       | POST /:id/extend-approval               | Timeout extended         |

#### PERSONA-001-04: Deliverables

**Priority**: P1

| Test     | Type             | Expected   |
| -------- | ---------------- | ---------- |
| Markdown | deliverable type | MD content |
| CSV      | deliverable type | CSV file   |
| PDF      | deliverable type | PDF file   |
| Code     | deliverable type | Code file  |

---

# Epic 13: Chat & Form Interfaces

**Labels**: `testing`, `interfaces`
**Priority**: Medium

---

## Story: CHAT-001 - Chat Interfaces

**Description**: Test public chat interfaces.
**Labels**: `chat`, `P1`
**Estimate**: 2 points

### Tasks

#### CHAT-001-01: Chat CRUD

**Priority**: P1

| Test             | Operation                   | Expected        |
| ---------------- | --------------------------- | --------------- |
| Create interface | POST /chat-interfaces       | Created         |
| Get public page  | GET /:id/public/:slug       | Chat page       |
| Create session   | POST /:id/sessions          | Session created |
| Send message     | POST /sessions/:id/messages | Response        |

---

## Story: FORM-001 - Form Interfaces

**Description**: Test public form interfaces.
**Labels**: `forms`, `P1`
**Estimate**: 2 points

### Tasks

#### FORM-001-01: Form CRUD

**Priority**: P1

| Test             | Operation             | Expected           |
| ---------------- | --------------------- | ------------------ |
| Create form      | POST /form-interfaces | Created            |
| Get public page  | GET /:id/public/:slug | Form page          |
| Submit form      | POST /:id/submissions | Submission created |
| List submissions | GET /:id/submissions  | Submissions array  |

---

# Epic 14: Workspaces & Billing

**Labels**: `testing`, `workspaces`, `billing`
**Priority**: Medium

---

## Story: WS-001 - Workspace Management

**Description**: Test workspace CRUD and members.
**Labels**: `workspaces`, `P1`
**Estimate**: 2 points

### Tasks

#### WS-001-01: Workspace CRUD

**Priority**: P1

| Test             | Operation              | Expected |
| ---------------- | ---------------------- | -------- |
| Create workspace | POST /workspaces       | Created  |
| List workspaces  | GET /workspaces        | Array    |
| Update workspace | PUT /workspaces/:id    | Updated  |
| Delete workspace | DELETE /workspaces/:id | Deleted  |

#### WS-001-02: Members

**Priority**: P1

| Test          | Operation                   | Expected        |
| ------------- | --------------------------- | --------------- |
| List members  | GET /:id/members            | Members array   |
| Add member    | POST /:id/members           | Member added    |
| Remove member | DELETE /:id/members/:userId | Removed         |
| Invite member | POST /:id/invitations       | Invitation sent |

---

## Story: BILL-001 - Billing & Credits

**Description**: Test billing operations.
**Labels**: `billing`, `P2`
**Estimate**: 2 points

### Tasks

#### BILL-001-01: Billing Operations

**Priority**: P2

| Test            | Operation                          | Expected     |
| --------------- | ---------------------------------- | ------------ |
| Get plans       | GET /billing/plans                 | Plans array  |
| Start checkout  | POST /billing/checkout             | Stripe URL   |
| Customer portal | POST /billing/portal               | Portal URL   |
| Payment history | GET /billing/payment-history       | Transactions |
| Buy credits     | POST /billing/credit-pack-checkout | Checkout     |

---

# Epic 15: Authentication & Users

**Labels**: `testing`, `auth`
**Priority**: Critical

---

## Story: AUTH-001 - Local Authentication

**Description**: Test email/password auth.
**Labels**: `local-auth`, `P0`
**Estimate**: 2 points

### Tasks

#### AUTH-001-01: Registration & Login

**Priority**: P0

| Test                | Action                         | Expected       |
| ------------------- | ------------------------------ | -------------- |
| Register            | POST /auth/register            | User created   |
| Login               | POST /auth/login               | JWT token      |
| Wrong password      | Invalid password               | Error          |
| Email verification  | Click link                     | Email verified |
| Resend verification | POST /auth/resend-verification | Email sent     |

#### AUTH-001-02: Password Reset

**Priority**: P1

| Test            | Action                     | Expected         |
| --------------- | -------------------------- | ---------------- |
| Forgot password | POST /auth/forgot-password | Email sent       |
| Reset password  | POST /auth/reset-password  | Password changed |
| Invalid token   | Expired token              | Error            |

---

## Story: AUTH-002 - OAuth Authentication

**Description**: Test social login.
**Labels**: `oauth-auth`, `P0`
**Estimate**: 2 points

### Tasks

#### AUTH-002-01: OAuth Providers

**Priority**: P0

| Test            | Provider             | Expected           |
| --------------- | -------------------- | ------------------ |
| Google login    | POST /auth/google    | User authenticated |
| Microsoft login | POST /auth/microsoft | User authenticated |
| New user        | First OAuth          | Account created    |
| Existing user   | Return OAuth         | Account linked     |

---

## Story: AUTH-003 - Two-Factor Auth

**Description**: Test 2FA functionality.
**Labels**: `2fa`, `P1`
**Estimate**: 2 points

### Tasks

#### AUTH-003-01: 2FA Setup

**Priority**: P1

| Test              | Action     | Expected    |
| ----------------- | ---------- | ----------- |
| Enable 2FA        | Setup flow | 2FA enabled |
| TOTP verification | Enter code | Verified    |
| Invalid code      | Wrong code | Rejected    |
| Phone 2FA         | SMS code   | Verified    |

---

## Story: AUTH-004 - API Keys

**Description**: Test API key management.
**Labels**: `api-keys`, `P1`
**Estimate**: 1 point

### Tasks

#### AUTH-004-01: API Key CRUD

**Priority**: P1

| Test       | Operation            | Expected            |
| ---------- | -------------------- | ------------------- |
| Create key | POST /api-keys       | Key returned (once) |
| List keys  | GET /api-keys        | Keys array          |
| Delete key | DELETE /api-keys/:id | Key revoked         |
| Use key    | Authorization header | Authenticated       |

---

# Epic 16: End-to-End Scenarios

**Labels**: `testing`, `e2e`
**Priority**: High

---

## Story: E2E-001 - Complete Workflow Scenarios

**Description**: Test complete user journeys.
**Labels**: `e2e`, `P0`
**Estimate**: 5 points

### Tasks

#### E2E-001-01: RAG Workflow

**Priority**: P0

**Scenario**: Build and execute a RAG pipeline

1. Create Knowledge Base
2. Upload PDF documents
3. Wait for processing (status: ready)
4. Create workflow with:
    - Input node (user question)
    - KB Query node
    - LLM node (with KB context)
    - Output node
5. Execute workflow with question
6. Verify answer uses KB content

#### E2E-001-02: Multi-Step Agent

**Priority**: P0

**Scenario**: Agent using multiple tools

1. Create Agent with tools: web_search, code_execute, file_write
2. Send message: "Search for Python sorting algorithms, write example code, save to file"
3. Verify:
    - Web search executed
    - Code written
    - File saved
    - Response coherent

#### E2E-001-03: Scheduled Automation

**Priority**: P1

**Scenario**: Workflow with schedule trigger

1. Create workflow (simple HTTP + Slack notify)
2. Add schedule trigger (every minute for testing)
3. Wait for execution
4. Verify execution completed
5. Disable trigger

#### E2E-001-04: Webhook Integration

**Priority**: P1

**Scenario**: External system triggers workflow

1. Create workflow with input node
2. Add webhook trigger
3. Send POST to webhook URL with JSON payload
4. Verify workflow executed with payload data
5. Verify response returned

#### E2E-001-05: Human-in-the-Loop

**Priority**: P0

**Scenario**: Workflow pauses for human input

1. Create workflow with Human Review node
2. Execute workflow
3. Verify status: paused
4. Submit response via API
5. Verify workflow completes

#### E2E-001-06: Multi-Provider LLM Comparison

**Priority**: P1

**Scenario**: Same prompt across providers

1. Create workflow with parallel LLM nodes (OpenAI, Anthropic, Google)
2. Same prompt to each
3. Execute
4. Compare responses and token usage

#### E2E-001-07: File Processing Pipeline

**Priority**: P1

**Scenario**: Process uploaded files

1. Create workflow with:
    - Files node (PDF input)
    - LLM node (summarize)
    - PDF Generation node
2. Execute with PDF upload
3. Verify summary PDF generated

#### E2E-001-08: Chat Interface with Agent

**Priority**: P1

**Scenario**: Public chat using agent

1. Create Agent with KB tool
2. Create Chat Interface linked to agent
3. Access public chat page
4. Send messages
5. Verify responses use KB

---

# Appendix: Test Data Requirements

## Sample Files Needed

- PDF: 5-10 page document with text, tables, images
- DOCX: Multi-section document
- CSV: 100+ rows of data
- JSON: Nested object structure
- Image: High-res for OCR testing
- Audio: 30-60 second speech clip

## Test Connections Required

- OpenAI API key
- Anthropic API key
- Google Cloud credentials
- Slack workspace (test)
- GitHub repo (test)
- PostgreSQL database (test)

## Test Environment Setup

- Backend running locally or staging
- Frontend accessible
- All services (Redis, PostgreSQL, Temporal) healthy
- Test user accounts with appropriate permissions

---

# Priority Legend

| Priority | Description                      |
| -------- | -------------------------------- |
| P0       | Critical - Must pass for release |
| P1       | High - Important functionality   |
| P2       | Medium - Nice to have            |
| P3       | Low - Edge cases                 |

---

# Estimated Totals

| Epic                         | Stories | Test Cases (Est.) |
| ---------------------------- | ------- | ----------------- |
| Workflow Nodes - AI          | 10      | 120               |
| Workflow Nodes - Input       | 8       | 65                |
| Workflow Nodes - Output      | 8       | 55                |
| Workflow Nodes - Logic       | 8       | 75                |
| Workflow Nodes - Utility     | 2       | 30                |
| Workflow Nodes - Integration | 2       | 20                |
| Agent Tools                  | 5       | 40                |
| Knowledge Bases              | 3       | 35                |
| Connections & OAuth          | 4       | 40                |
| Triggers                     | 4       | 30                |
| Executions & Runtime         | 4       | 25                |
| Agents & Personas            | 7       | 55                |
| Chat & Form Interfaces       | 2       | 20                |
| Workspaces & Billing         | 2       | 20                |
| Authentication & Users       | 4       | 25                |
| End-to-End Scenarios         | 3       | 50                |
| **TOTAL**                    | **76**  | **~705**          |

---

# EXPANDED: Node Edge Cases & Configuration Combinations

This section provides deeper test coverage for complex node configurations and edge cases.

---

## Expanded LLM Node Testing

### WF-AI-001-07: Streaming Behavior

**Priority**: P0 | **Labels**: `streaming`

| Test                | Config                        | Expected                         |
| ------------------- | ----------------------------- | -------------------------------- |
| Stream enabled      | Enable streaming in execution | Tokens arrive incrementally      |
| Stream + thinking   | enableThinking + streaming    | Thinking streamed, then response |
| Stream cancellation | Cancel mid-stream             | Partial response saved           |
| Stream timeout      | Very long response            | No timeout during streaming      |
| Reconnect stream    | Disconnect and reconnect      | Stream resumes or restarts       |

### WF-AI-001-08: Output Variable Handling

**Priority**: P1 | **Labels**: `variables`

| Test                   | Config                      | Expected                   |
| ---------------------- | --------------------------- | -------------------------- |
| Custom output variable | outputVariable: "llmResult" | Result in {{llmResult}}    |
| No output variable     | Leave empty                 | Default variable name used |
| Overwrite existing     | Same name as prior node     | Value overwritten          |
| Special characters     | outputVariable: "result_1"  | Works correctly            |
| Reserved names         | outputVariable: "input"     | Error or works             |

### WF-AI-001-09: Connection Handling

**Priority**: P0 | **Labels**: `connections`

| Test                    | Config                         | Expected               |
| ----------------------- | ------------------------------ | ---------------------- |
| Custom connection       | connectionId: [user's API key] | Uses user's key        |
| No connection           | Leave empty                    | Uses workspace default |
| Invalid connection ID   | connectionId: "fake-uuid"      | Clear error            |
| Expired token           | OAuth connection expired       | Refresh or error       |
| Rate-limited connection | Connection at rate limit       | Circuit breaker        |

### WF-AI-001-10: Long Content Handling

**Priority**: P1 | **Labels**: `limits`

| Test               | Config                      | Expected             |
| ------------------ | --------------------------- | -------------------- |
| Very long prompt   | 50,000 character prompt     | Truncated or error   |
| Long system prompt | 10,000 char system prompt   | Works or truncates   |
| Max context window | Hit model's context limit   | Graceful error       |
| Unicode content    | Emoji, Chinese, Arabic text | Handles correctly    |
| Code in prompt     | Multiline code blocks       | Preserved formatting |

### WF-AI-001-11: JSON Mode

**Priority**: P1 | **Labels**: `json-mode`

| Test                | Config                     | Expected            |
| ------------------- | -------------------------- | ------------------- |
| Request JSON output | "Respond in JSON format"   | Valid JSON returned |
| Malformed JSON      | Model returns invalid JSON | Error handling      |
| Nested JSON         | Complex nested structure   | Parsed correctly    |

---

## Expanded Conditional Node Testing

### WF-LOG-001-04: Type Coercion

**Priority**: P1 | **Labels**: `types`

| Test                   | left  | operator | right     | Expected          |
| ---------------------- | ----- | -------- | --------- | ----------------- |
| String "5" == Number 5 | "5"   | ==       | 5         | true (coerced)    |
| Boolean true == "true" | true  | ==       | "true"    | true              |
| null == undefined      | null  | ==       | undefined | Check behavior    |
| Empty array == false   | []    | ==       | false     | Check behavior    |
| Object comparison      | {a:1} | ==       | {a:1}     | false (reference) |
| Array comparison       | [1,2] | ==       | [1,2]     | false (reference) |

### WF-LOG-001-05: Edge Cases

**Priority**: P2 | **Labels**: `edge-cases`

| Test             | left         | operator | right     | Expected            |
| ---------------- | ------------ | -------- | --------- | ------------------- |
| NaN comparison   | NaN          | ==       | NaN       | false               |
| Infinity         | Infinity     | >        | 1000000   | true                |
| Negative zero    | -0           | ==       | 0         | true                |
| Very long string | 100KB string | contains | "needle"  | Works               |
| Regex-like       | "test.\*"    | ==       | "test.\*" | true (literal)      |
| Whitespace       | " hello "    | ==       | "hello"   | false (not trimmed) |

### WF-LOG-001-06: Variable Edge Cases

**Priority**: P1 | **Labels**: `variables`

| Test               | Config                     | Expected            |
| ------------------ | -------------------------- | ------------------- |
| Undefined variable | leftValue: "{{undefined}}" | null/empty handling |
| Deeply nested      | "{{a.b.c.d.e}}"            | Works if exists     |
| Array index        | "{{items[0]}}"             | First element       |
| Negative index     | "{{items[-1]}}"            | Last or error       |
| Out of bounds      | "{{items[999]}}"           | undefined handling  |

---

## Expanded Loop Node Testing

### WF-LOG-003-05: Nested Loops

**Priority**: P1 | **Labels**: `nested`

| Test             | Config             | Expected               |
| ---------------- | ------------------ | ---------------------- |
| 2 nested loops   | Outer + inner loop | Both execute correctly |
| 3 nested loops   | 3 levels deep      | Works without issues   |
| Inner loop break | Break only inner   | Outer continues        |
| Shared variables | Both use {{item}}  | Scoped correctly       |

### WF-LOG-003-06: Performance & Limits

**Priority**: P1 | **Labels**: `performance`

| Test                 | Config                   | Expected            |
| -------------------- | ------------------------ | ------------------- |
| 1000 iterations      | count: 1000              | Completes           |
| 10000 iterations     | count: 10000             | Max limit check     |
| Large array          | 5000 element array       | Handles efficiently |
| Memory per iteration | Create objects each iter | No memory leak      |
| Time per iteration   | Log execution time       | Consistent timing   |

### WF-LOG-003-07: Data Accumulation

**Priority**: P0 | **Labels**: `accumulation`

| Test                  | Config                     | Expected            |
| --------------------- | -------------------------- | ------------------- |
| Collect results       | Append to array each iter  | All results saved   |
| Running total         | Sum values in loop         | Correct total       |
| Transform and collect | Map operation in loop      | All transformed     |
| Filter in loop        | Conditional add to results | Only matching items |

---

## Expanded Code Node Testing

### WF-LOG-008-04: Python Specifics

**Priority**: P1 | **Labels**: `python`

| Test                | Code                                 | Expected            |
| ------------------- | ------------------------------------ | ------------------- |
| Import standard lib | `import json; return json.dumps({})` | Works               |
| Import numpy        | `import numpy as np`                 | Works if allowed    |
| Async code          | `async def main(): ...`              | Works or error      |
| File operations     | `open('/tmp/test.txt', 'w')`         | Blocked or allowed  |
| Network call        | `import requests; requests.get(...)` | Blocked if disabled |
| Environment vars    | `import os; os.environ['HOME']`      | Restricted          |

### WF-LOG-008-05: JavaScript Specifics

**Priority**: P1 | **Labels**: `javascript`

| Test            | Code                                  | Expected            |
| --------------- | ------------------------------------- | ------------------- |
| ES6 features    | Arrow functions, destructuring        | Works               |
| Async/await     | `async function test() { await ... }` | Works               |
| Import modules  | `import fs from 'fs'`                 | Error (sandbox)     |
| setTimeout      | `setTimeout(() => {}, 1000)`          | May not work        |
| Fetch API       | `fetch('https://...')`                | Blocked if disabled |
| console methods | `console.log, warn, error`            | All captured        |

### WF-LOG-008-06: Shell Specifics

**Priority**: P1 | **Labels**: `shell`

| Test               | Code                       | Expected          |
| ------------------ | -------------------------- | ----------------- |
| Pipe commands      | `echo "test" \| grep test` | Works             |
| Environment vars   | `echo $HOME`               | Restricted        |
| Exit codes         | `exit 1`                   | Non-zero captured |
| Multi-line         | Multiple commands          | All execute       |
| Background job     | `sleep 10 &`               | Handled correctly |
| Dangerous commands | `rm -rf /`                 | Blocked           |

### WF-LOG-008-07: Resource Limits

**Priority**: P0 | **Labels**: `security`

| Test               | Code                | Expected         |
| ------------------ | ------------------- | ---------------- |
| Fork bomb          | `:(){:\|:&};:`      | Blocked          |
| Infinite recursion | Recursive function  | Stack limit      |
| Memory allocation  | Allocate 1GB        | OOM killed       |
| CPU spinning       | Infinite while loop | Timeout          |
| Disk write         | Write large file    | Quota or blocked |

---

## Expanded HTTP Node Testing

### WF-UTIL-001-05: Response Handling

**Priority**: P1 | **Labels**: `responses`

| Test            | Response         | Expected             |
| --------------- | ---------------- | -------------------- |
| JSON response   | application/json | Parsed to object     |
| XML response    | application/xml  | String or parsed     |
| Binary response | image/png        | Base64 or path       |
| Large response  | 10MB JSON        | Handles or truncates |
| Empty response  | 204 No Content   | Handled gracefully   |
| Redirect 301    | 301 Moved        | Follows or reports   |
| Redirect 302    | 302 Found        | Follows or reports   |

### WF-UTIL-001-06: Error Scenarios

**Priority**: P1 | **Labels**: `errors`

| Test                    | Scenario       | Expected       |
| ----------------------- | -------------- | -------------- |
| Connection refused      | Server down    | Clear error    |
| DNS failure             | Invalid domain | DNS error      |
| SSL error               | Invalid cert   | SSL error      |
| 429 Too Many Requests   | Rate limited   | Retry or error |
| 500 Internal Error      | Server error   | Error captured |
| 502 Bad Gateway         | Proxy error    | Error captured |
| 503 Service Unavailable | Maintenance    | Error captured |

### WF-UTIL-001-07: Request Configuration

**Priority**: P2 | **Labels**: `config`

| Test              | Config                   | Expected          |
| ----------------- | ------------------------ | ----------------- |
| Custom User-Agent | headers: User-Agent      | Sent correctly    |
| Accept header     | Accept: application/json | Sent correctly    |
| Cookie header     | Cookie: session=abc      | Sent correctly    |
| Multipart form    | File upload              | Boundary set      |
| URL encoding      | Special chars in params  | Encoded properly  |
| Array params      | ?ids[]=1&ids[]=2         | Handled correctly |

---

## Expanded Files Node Testing

### WF-IN-002-04: Large File Handling

**Priority**: P1 | **Labels**: `large-files`

| Test         | File           | Expected            |
| ------------ | -------------- | ------------------- |
| 1MB PDF      | Standard PDF   | Processed           |
| 10MB PDF     | Large document | Processed or limit  |
| 50MB PDF     | Very large     | Rejected with error |
| 100 page PDF | Many pages     | All pages extracted |
| Scanned PDF  | Image-based    | OCR or warning      |

### WF-IN-002-05: Malformed Files

**Priority**: P1 | **Labels**: `edge-cases`

| Test               | File                      | Expected               |
| ------------------ | ------------------------- | ---------------------- |
| Corrupted PDF      | Invalid PDF structure     | Error message          |
| Empty file         | 0 bytes                   | Error or empty content |
| Wrong extension    | .pdf that's actually .txt | Detect or error        |
| Password-protected | Encrypted DOCX            | Error message          |
| Nested ZIP         | ZIP containing files      | Not extracted          |

### WF-IN-002-06: Multi-File Processing

**Priority**: P1 | **Labels**: `multi-file`

| Test             | Config                    | Expected           |
| ---------------- | ------------------------- | ------------------ |
| 5 files          | Upload 5 PDFs             | All processed      |
| 20 files         | Upload 20 files           | All or limit       |
| Mixed types      | PDF + DOCX + TXT          | All processed      |
| Same name        | Two files named "doc.pdf" | Handled (renamed?) |
| Total size limit | 100MB combined            | Limit enforced     |

---

## Expanded Vision Node Testing

### WF-AI-002-03: Image Format Support

**Priority**: P1 | **Labels**: `formats`

| Test       | Format             | Expected              |
| ---------- | ------------------ | --------------------- |
| PNG image  | .png file          | Analyzed              |
| JPEG image | .jpg file          | Analyzed              |
| WebP image | .webp file         | Analyzed              |
| GIF image  | .gif (first frame) | Analyzed              |
| SVG image  | .svg file          | Error or converted    |
| HEIC image | iPhone photo       | Converted or error    |
| BMP image  | .bmp file          | Analyzed or converted |

### WF-AI-002-04: Image Size & Quality

**Priority**: P1 | **Labels**: `limits`

| Test         | Image              | Expected              |
| ------------ | ------------------ | --------------------- |
| 4K image     | 3840x2160          | Analyzed (may resize) |
| Tiny image   | 50x50              | Analyzed with warning |
| Very long    | 100x10000          | Handled or error      |
| Low quality  | Heavily compressed | Lower accuracy        |
| High quality | RAW/uncompressed   | Full analysis         |

### WF-AI-002-05: Analysis Prompts

**Priority**: P1 | **Labels**: `prompts`

| Test             | Prompt                   | Expected        |
| ---------------- | ------------------------ | --------------- |
| Describe image   | "Describe this image"    | Description     |
| Extract text     | "Extract all text"       | OCR-like result |
| Count objects    | "How many people?"       | Number          |
| Identify objects | "List all objects"       | Object list     |
| Compare images   | 2 images, "Differences?" | Comparison      |

---

# EXPANDED: End-to-End Scenarios

## Story: E2E-002 - Business Process Automation

**Description**: Real-world business automation scenarios.
**Labels**: `e2e`, `business`, `P0`
**Estimate**: 5 points

### Tasks

#### E2E-002-01: Lead Qualification Pipeline

**Priority**: P0

**Scenario**: Automated lead scoring and routing

1. Create workflow:
    - Webhook trigger (receives lead data from form)
    - HTTP node (enrich with Clearbit/Apollo)
    - LLM node (score lead 1-10 based on criteria)
    - Conditional node (score >= 7?)
    - Branch A: Slack notify sales + add to CRM (high score)
    - Branch B: Add to nurture campaign (low score)
    - Output node (return lead ID)
2. Send test lead via webhook
3. Verify:
    - Lead enriched correctly
    - Score calculated
    - Correct branch taken
    - Slack message sent OR nurture updated
    - Response returned

#### E2E-002-02: Customer Support Triage

**Priority**: P0

**Scenario**: Auto-categorize and route support tickets

1. Create workflow:
    - Webhook trigger (receives ticket from Zendesk)
    - LLM node (Router) - categories: billing, technical, general, urgent
    - Switch node on category
    - Per-category actions:
        - Billing: Route to billing team Slack
        - Technical: Create GitHub issue + notify engineering
        - General: Auto-reply with FAQ link
        - Urgent: Page on-call + escalate
    - Update ticket with category tag
2. Send test tickets for each category
3. Verify correct routing for each

#### E2E-002-03: Invoice Processing

**Priority**: P1

**Scenario**: Extract and process invoice data

1. Create workflow:
    - Manual trigger with file upload
    - Files node (accept PDF invoices)
    - Vision node (extract: vendor, amount, date, line items)
    - Transform node (structure data)
    - Conditional (amount > $10,000?)
    - Branch A: Human review node for approval
    - Branch B: Auto-approve
    - Google Sheets action (log to spreadsheet)
    - Email action (send confirmation)
2. Upload test invoices (various formats)
3. Verify:
    - Data extracted correctly
    - Large invoices trigger review
    - Spreadsheet updated
    - Email sent

#### E2E-002-04: Content Publishing Pipeline

**Priority**: P1

**Scenario**: Multi-platform content publishing

1. Create workflow:
    - Manual trigger (blog post content)
    - LLM node (generate social versions):
        - Twitter thread (280 char chunks)
        - LinkedIn post (professional tone)
        - Newsletter excerpt
    - Image Generation node (create header image)
    - Parallel actions:
        - Twitter: Post thread
        - LinkedIn: Post update
        - Email: Send to newsletter
    - Slack notify (publishing complete)
2. Submit blog post content
3. Verify all platforms receive appropriate content

#### E2E-002-05: Competitive Intelligence

**Priority**: P1

**Scenario**: Monitor and analyze competitors

1. Create workflow:
    - Schedule trigger (daily)
    - Loop over competitor list:
        - Web Browse node (fetch pricing page)
        - Web Search node (recent news)
        - LLM node (summarize changes)
    - Transform node (compile report)
    - Conditional (significant changes?)
    - PDF Generation (weekly report)
    - Email action (send to stakeholders)
2. Let run for test period
3. Verify report accuracy

---

## Story: E2E-003 - Data Processing Pipelines

**Description**: Complex data transformation and analysis scenarios.
**Labels**: `e2e`, `data`, `P1`
**Estimate**: 4 points

### Tasks

#### E2E-003-01: ETL Pipeline

**Priority**: P1

**Scenario**: Extract, transform, load data

1. Create workflow:
    - Schedule trigger (hourly)
    - Database node (query source PostgreSQL)
    - Transform node (clean and reshape data)
    - Loop node (process each record):
        - Conditional (valid data?)
        - LLM node (enrich with descriptions)
    - Database node (insert to destination)
    - Spreadsheet Generation (export backup)
    - Slack notify (ETL complete + stats)
2. Run with test data
3. Verify data integrity end-to-end

#### E2E-003-02: Survey Analysis

**Priority**: P1

**Scenario**: Analyze open-ended survey responses

1. Create workflow:
    - Manual trigger with CSV upload
    - Files node (parse CSV)
    - Loop over responses:
        - LLM node (sentiment analysis)
        - LLM node (theme extraction)
        - LLM node (actionable insights)
    - Transform node (aggregate results)
    - Chart Generation (sentiment distribution)
    - Chart Generation (theme frequency)
    - PDF Generation (full report)
2. Upload survey CSV (100+ responses)
3. Verify:
    - All responses analyzed
    - Charts accurate
    - Report comprehensive

#### E2E-003-03: Log Analysis & Alerting

**Priority**: P1

**Scenario**: Analyze logs and alert on anomalies

1. Create workflow:
    - Webhook trigger (receives log batches)
    - Transform node (parse log format)
    - Code node (Python - calculate error rates)
    - Conditional (error rate > 5%?)
    - LLM node (summarize errors, suggest causes)
    - Slack action (alert with summary)
    - Database node (store metrics)
2. Send test log batches (normal + anomalous)
3. Verify alerts trigger correctly

#### E2E-003-04: Document Comparison

**Priority**: P2

**Scenario**: Compare two versions of a document

1. Create workflow:
    - Manual trigger (2 file uploads)
    - Files node (extract text from both)
    - Code node (compute diff)
    - LLM node (summarize key changes)
    - LLM node (assess impact of changes)
    - PDF Generation (change report)
2. Upload two contract versions
3. Verify diff accuracy and summary quality

#### E2E-003-05: Multi-Source Research

**Priority**: P1

**Scenario**: Research a topic from multiple sources

1. Create workflow:
    - Input node (research topic)
    - Parallel:
        - Web Search (general results)
        - Web Search (news)
        - KB Query (internal docs)
    - Transform node (deduplicate sources)
    - Loop over sources:
        - Web Browse (fetch full content)
        - LLM node (extract key points)
    - LLM node (synthesize findings)
    - LLM node (identify gaps)
    - Template Output (research memo)
2. Execute with research topic
3. Verify comprehensive coverage

---

## Story: E2E-004 - Agent Workflows

**Description**: Complex agent-based scenarios.
**Labels**: `e2e`, `agents`, `P0`
**Estimate**: 5 points

### Tasks

#### E2E-004-01: Research Agent with KB

**Priority**: P0

**Scenario**: Agent researches using internal and external sources

1. Create Knowledge Base with product docs
2. Create Agent with tools:
    - knowledge_base (product KB)
    - web_search
    - web_browse
    - file_write
3. Send message: "Research how our product compares to [competitor] and write a competitive analysis"
4. Verify:
    - Agent queries KB for product info
    - Agent searches web for competitor info
    - Agent browses competitor website
    - Agent writes coherent analysis
    - File saved correctly

#### E2E-004-02: Code Assistant Agent

**Priority**: P0

**Scenario**: Agent helps with coding tasks

1. Create Agent with tools:
    - code_execute (Python, JavaScript)
    - file_read
    - file_write
    - web_search
2. Thread of messages:
    - "Write a Python function to parse CSV and calculate averages"
    - "Test it with this sample data: [data]"
    - "Now convert it to JavaScript"
    - "Add error handling for empty files"
3. Verify:
    - Code executes correctly each step
    - Tests pass
    - Conversion accurate
    - Error handling works

#### E2E-004-03: Data Analyst Agent

**Priority**: P1

**Scenario**: Agent analyzes data and creates visualizations

1. Create Agent with tools:
    - file_read
    - code_execute (Python with pandas)
    - chart_generate
    - spreadsheet_generate
2. Upload CSV data
3. Thread of messages:
    - "Analyze this sales data and identify trends"
    - "Create a chart showing monthly revenue"
    - "Find the top 10 customers by total spend"
    - "Export the analysis to a spreadsheet"
4. Verify each step produces correct output

#### E2E-004-04: Multi-Agent Collaboration

**Priority**: P2

**Scenario**: Persona spawns sub-tasks to agents

1. Create Persona: "Project Manager"
2. Create Agent: "Developer"
3. Create Agent: "Designer"
4. Give Persona task: "Create a landing page for [product]"
5. Verify Persona:
    - Breaks down task
    - Delegates to appropriate agents
    - Coordinates deliverables
    - Produces final result

#### E2E-004-05: Agent with Approval Flow

**Priority**: P1

**Scenario**: Agent requests approval for risky actions

1. Create Agent with:
    - web_search (low risk - auto)
    - file_write (medium risk - approve)
    - code_execute (high risk - approve)
2. Set autonomy: approve_high_risk
3. Send task requiring all tools
4. Verify:
    - Web search executes automatically
    - File write requests approval
    - Code execute requests approval
    - Approvals work correctly

---

## Story: E2E-005 - Error Handling & Recovery

**Description**: Test system resilience and error scenarios.
**Labels**: `e2e`, `errors`, `P1`
**Estimate**: 3 points

### Tasks

#### E2E-005-01: Node Failure Recovery

**Priority**: P1

**Scenario**: Workflow recovers from failed node

1. Create workflow:
    - Input node
    - HTTP node (to unreliable endpoint)
    - LLM node
    - Output node
2. Configure HTTP node:
    - onError: "continue" with fallback value
    - OR onError: "goto" alternative node
3. Execute with endpoint that fails
4. Verify:
    - Workflow continues
    - Fallback used
    - Final output correct

#### E2E-005-02: Timeout Handling

**Priority**: P1

**Scenario**: Long-running nodes timeout gracefully

1. Create workflow with:
    - Code node (sleep 60 seconds)
    - Timeout: 10 seconds
2. Execute
3. Verify:
    - Timeout error raised
    - Workflow marked failed
    - Error message clear

#### E2E-005-03: Partial Execution Resume

**Priority**: P2

**Scenario**: Resume workflow after pause

1. Create workflow:
    - Input → LLM → Human Review → LLM → Output
2. Execute
3. Wait for pause at Human Review
4. Verify state saved
5. Submit response
6. Verify workflow completes from where it paused

#### E2E-005-04: Rate Limit Handling

**Priority**: P1

**Scenario**: Workflow handles API rate limits

1. Create workflow with multiple parallel LLM calls
2. Execute with many concurrent requests
3. Verify:
    - Circuit breaker activates
    - Requests queued or retried
    - Eventually all complete

#### E2E-005-05: Connection Expiry During Execution

**Priority**: P2

**Scenario**: OAuth token expires mid-workflow

1. Create workflow using OAuth connection
2. Set token to expire during execution
3. Execute long workflow
4. Verify:
    - Token refreshed automatically
    - OR graceful error if refresh fails
    - Execution state preserved

---

## Story: E2E-006 - Integration Scenarios

**Description**: Test integrations with external services.
**Labels**: `e2e`, `integrations`, `P1`
**Estimate**: 4 points

### Tasks

#### E2E-006-01: CRM Sync Workflow

**Priority**: P1
**Preconditions**: HubSpot or Salesforce connection

**Scenario**: Sync data between systems

1. Create workflow:
    - Webhook trigger (new signup)
    - HTTP node (get user details)
    - Conditional (existing contact?)
    - Create or update CRM contact
    - Add to appropriate list/campaign
    - Log to spreadsheet
2. Send webhook with new user
3. Verify:
    - Contact created/updated in CRM
    - Correct list assignment
    - Spreadsheet logged

#### E2E-006-02: Slack Bot Workflow

**Priority**: P1
**Preconditions**: Slack connection

**Scenario**: Interactive Slack bot

1. Create workflow:
    - Webhook trigger (Slack event)
    - Transform (parse Slack payload)
    - KB Query (search for answer)
    - LLM (generate response using KB)
    - Slack action (reply in thread)
2. Send message to Slack channel
3. Verify bot responds correctly

#### E2E-006-03: GitHub Automation

**Priority**: P1
**Preconditions**: GitHub connection

**Scenario**: Auto-respond to issues

1. Create workflow:
    - Webhook trigger (GitHub issue created)
    - LLM (categorize issue)
    - LLM (draft initial response)
    - GitHub action (add labels)
    - GitHub action (post comment)
    - Conditional (bug vs feature)
    - Branch actions
2. Create test GitHub issue
3. Verify labels and comment added

#### E2E-006-04: Calendar Integration

**Priority**: P2
**Preconditions**: Google Calendar connection

**Scenario**: Schedule meetings from natural language

1. Create workflow:
    - Input (meeting request text)
    - LLM (extract: attendees, time, duration, topic)
    - HTTP (check attendee availability)
    - Google Calendar action (create event)
    - Email action (send invites)
2. Submit: "Schedule 30 min with john@example.com tomorrow at 2pm to discuss Q4 planning"
3. Verify event created correctly

#### E2E-006-05: E-commerce Order Processing

**Priority**: P1
**Preconditions**: Shopify/Stripe connection

**Scenario**: Process and fulfill orders

1. Create workflow:
    - Webhook (new order)
    - Transform (parse order data)
    - Conditional (inventory check)
    - HTTP (update inventory)
    - Email (send confirmation)
    - Slack (notify fulfillment team)
    - Database (log order)
2. Simulate order webhook
3. Verify full processing chain

---

## Story: E2E-007 - Persona Deep Scenarios

**Description**: Complex persona task scenarios.
**Labels**: `e2e`, `personas`, `P1`
**Estimate**: 4 points

### Tasks

#### E2E-007-01: Research Persona

**Priority**: P1

**Scenario**: Persona conducts deep research

1. Launch "Research Analyst" persona
2. Task: "Research the market for [product category] in [region]"
3. Provide:
    - KB with company data
    - Web search tool
    - Time limit: 2 hours
    - Cost limit: 500 credits
4. Verify:
    - Clarification phase works
    - Research progress updates
    - Deliverables created (report, data)
    - Stays within limits

#### E2E-007-02: Content Creator Persona

**Priority**: P1

**Scenario**: Persona creates content package

1. Launch "Content Creator" persona
2. Task: "Create a content package for [product launch]"
3. Expected deliverables:
    - Blog post (markdown)
    - Social posts (JSON)
    - Press release (PDF)
    - Image prompts (for design team)
4. Verify each deliverable quality

#### E2E-007-03: Persona with Approvals

**Priority**: P1

**Scenario**: Persona requires multiple approvals

1. Launch persona with high-risk tools
2. Set approval required for file writes
3. Task requiring multiple file saves
4. Verify:
    - Each write triggers approval
    - Approve some, reject some
    - Persona adapts to rejections
    - Final output accounts for rejections

#### E2E-007-04: Persona Continuation

**Priority**: P2

**Scenario**: Continue persona across sessions

1. Launch persona with long task
2. Let it complete phase 1
3. Mark as complete
4. Continue with new context
5. Verify:
    - State preserved
    - Continuation smooth
    - Final deliverables coherent

#### E2E-007-05: Persona Timeout Handling

**Priority**: P1

**Scenario**: Persona hits time limit

1. Launch persona
2. Set max_duration_hours: 0.1 (6 minutes)
3. Give complex task
4. Verify:
    - Warning as limit approaches
    - Graceful stop at limit
    - Partial work saved
    - Status: timeout

---

# EXPANDED: UI/Frontend Testing

## Story: UI-001 - Workflow Canvas

**Description**: Test the React Flow workflow builder.
**Labels**: `ui`, `canvas`, `P0`
**Estimate**: 3 points

### Tasks

#### UI-001-01: Canvas Interactions

**Priority**: P0

| Test            | Action                    | Expected               |
| --------------- | ------------------------- | ---------------------- |
| Add node        | Drag from palette         | Node appears on canvas |
| Move node       | Drag node                 | Position updates       |
| Delete node     | Select + delete key       | Node removed           |
| Connect nodes   | Drag from port to port    | Edge created           |
| Delete edge     | Click edge + delete       | Edge removed           |
| Select multiple | Shift+click or box select | Multiple selected      |
| Copy/paste      | Ctrl+C, Ctrl+V            | Nodes duplicated       |
| Undo/redo       | Ctrl+Z, Ctrl+Y            | Action reversed        |
| Zoom            | Scroll wheel              | Canvas zooms           |
| Pan             | Middle-click drag         | Canvas pans            |
| Fit view        | Double-click background   | All nodes visible      |

#### UI-001-02: Node Configuration

**Priority**: P0

| Test                | Action              | Expected             |
| ------------------- | ------------------- | -------------------- |
| Open config         | Click node          | Side panel opens     |
| Edit field          | Change value        | Updates in real-time |
| Validation          | Enter invalid value | Error shown          |
| Connection dropdown | Select connection   | Connection linked    |
| Variable picker     | Type {{             | Autocomplete shows   |
| Save config         | Change values       | Autosaves            |

#### UI-001-03: Canvas State

**Priority**: P1

| Test            | Action                | Expected                      |
| --------------- | --------------------- | ----------------------------- |
| Save workflow   | Ctrl+S or button      | Saved notification            |
| Load workflow   | Open existing         | Full state restored           |
| Browser refresh | F5 during edit        | Changes preserved (or warned) |
| Concurrent edit | 2 users same workflow | Conflict handling             |

---

## Story: UI-002 - Execution View

**Description**: Test execution monitoring UI.
**Labels**: `ui`, `execution`, `P0`
**Estimate**: 2 points

### Tasks

#### UI-002-01: Execution Display

**Priority**: P0

| Test      | State                 | Expected             |
| --------- | --------------------- | -------------------- |
| Running   | Execution in progress | Animated nodes       |
| Completed | Execution done        | Green checkmarks     |
| Failed    | Execution error       | Red X on failed node |
| Paused    | Human review waiting  | Yellow pause icon    |

#### UI-002-02: Real-time Updates

**Priority**: P0

| Test            | Action               | Expected              |
| --------------- | -------------------- | --------------------- |
| Token streaming | LLM generating       | Tokens appear live    |
| Progress bar    | Long operation       | Progress shown        |
| Log panel       | View logs            | Real-time log entries |
| Node timing     | Hover completed node | Duration shown        |

#### UI-002-03: Interaction

**Priority**: P1

| Test              | Action               | Expected          |
| ----------------- | -------------------- | ----------------- |
| Cancel execution  | Click cancel         | Execution stops   |
| View node output  | Click completed node | Output shown      |
| Human review form | Paused at review     | Input form shown  |
| Submit review     | Enter value + submit | Execution resumes |

---

## Story: UI-003 - Agent Chat Interface

**Description**: Test agent conversation UI.
**Labels**: `ui`, `agents`, `P0`
**Estimate**: 2 points

### Tasks

#### UI-003-01: Chat Functionality

**Priority**: P0

| Test             | Action             | Expected             |
| ---------------- | ------------------ | -------------------- |
| Send message     | Type + enter       | Message sent         |
| Receive response | Agent responds     | Response displayed   |
| Streaming        | Agent generating   | Tokens appear live   |
| Tool call        | Agent uses tool    | Tool execution shown |
| Code block       | Response with code | Syntax highlighted   |
| Markdown         | Response with MD   | Rendered correctly   |

#### UI-003-02: Thread Management

**Priority**: P1

| Test           | Action           | Expected               |
| -------------- | ---------------- | ---------------------- |
| New thread     | Click new        | Fresh conversation     |
| Switch thread  | Select from list | Conversation loads     |
| Delete thread  | Delete action    | Thread removed         |
| Thread history | Scroll up        | Previous messages load |

---

# Appendix B: Test Data & Environment

## Extended Sample Files

### PDF Test Files

- `simple.pdf` - 2 pages, plain text
- `complex.pdf` - 20 pages, tables, images, headers
- `scanned.pdf` - Image-based (for OCR testing)
- `encrypted.pdf` - Password: "test123"
- `large.pdf` - 100 pages
- `multilingual.pdf` - English, Spanish, Chinese
- `forms.pdf` - Fillable form fields

### Audio Test Files

- `english-clear.mp3` - Clear English speech, 30s
- `english-noisy.mp3` - Background noise, 30s
- `spanish.mp3` - Spanish speech
- `multilingual.mp3` - Multiple languages
- `long-audio.mp3` - 10 minute recording

### Image Test Files

- `photo.jpg` - Standard photograph
- `text-image.png` - Image with text (OCR)
- `chart.png` - Business chart
- `diagram.png` - Technical diagram
- `handwritten.jpg` - Handwritten notes
- `low-quality.jpg` - Heavily compressed
- `high-res.png` - 4K image

### Data Files

- `simple.csv` - 100 rows, 5 columns
- `complex.csv` - 10,000 rows, 50 columns
- `nested.json` - Deeply nested structure
- `array.json` - Array of objects
- `malformed.json` - Invalid JSON
- `special-chars.csv` - Unicode, quotes, newlines

## Test Accounts

| Account                     | Purpose               | Connections       |
| --------------------------- | --------------------- | ----------------- |
| `test-admin@example.com`    | Full access testing   | All providers     |
| `test-user@example.com`     | Standard user testing | Limited           |
| `test-readonly@example.com` | Permission testing    | Read-only         |
| `test-oauth@example.com`    | OAuth flow testing    | Google, Microsoft |

## Environment Checklist

- [ ] Backend API running (localhost:3001 or staging)
- [ ] Frontend accessible (localhost:5173 or staging)
- [ ] PostgreSQL connected
- [ ] Redis connected
- [ ] Temporal server running
- [ ] All test connections configured
- [ ] Test files uploaded to accessible locations
- [ ] Test user accounts created
- [ ] API rate limits increased for testing
