---
sidebar_position: 3
title: Form Interfaces
---

# Form Interfaces

Form interfaces provide a structured way to collect input and run workflows or agents. They're ideal for tasks that require specific inputs and produce defined deliverables.

<!-- Screenshot: Form interface with file upload and URL input -->

## Creating a Form Interface

1. Navigate to **Interfaces** > **Form Interfaces**
2. Click **New Form Interface**
3. Enter a name and URL slug
4. Select the target type (Workflow or Agent)
5. Choose the workflow or agent to run
6. Configure inputs, outputs, and branding
7. Publish and share the URL

## Configuration

### Target Types

Form interfaces can target either workflows or agents:

#### Workflow Target

Connect to a published workflow. The form submission triggers the workflow with inputs mapped to workflow variables.

```typescript
{
  targetType: "workflow",
  workflowId: "wf_abc123"
}
```

#### Agent Target

Connect to an agent. The form submission starts a conversation with the agent, passing inputs as context.

```typescript
{
  targetType: "agent",
  agentId: "agent_xyz789"
}
```

### Branding

#### Cover Options

| Type    | Description            | Example                         |
| ------- | ---------------------- | ------------------------------- |
| `image` | Uploaded or URL image  | `https://example.com/cover.jpg` |
| `color` | Solid background color | `#1a1a2e`                       |
| `stock` | Unsplash photo ID      | `photo-abc123`                  |

#### Icon

Upload a custom avatar that appears in the form header.

#### Title & Description

Static text displayed above the form:

```typescript
{
  title: "Blog Post Generator",
  description: "Enter your topic and we'll create a complete blog post with SEO optimization."
}
```

### Input Configuration

#### Message Input

The primary text input field:

| Setting               | Description           |
| --------------------- | --------------------- |
| **Input Label**       | Label above the input |
| **Input Placeholder** | Placeholder text      |

Example:

```typescript
{
  inputLabel: "Topic or brief",
  inputPlaceholder: "Describe what you want to write about..."
}
```

#### File Upload

Allow users to upload files for processing:

| Setting               | Default        | Description    |
| --------------------- | -------------- | -------------- |
| **Allow File Upload** | false          | Enable uploads |
| **File Upload Label** | "Upload files" | Button label   |
| **Max Files**         | 5              | Maximum files  |
| **Max File Size**     | 25 MB          | Per-file limit |
| **Allowed Types**     | All            | MIME whitelist |

Example:

```typescript
{
  allowFileUpload: true,
  fileUploadLabel: "Upload reference documents",
  maxFiles: 10,
  maxFileSizeMb: 50,
  allowedFileTypes: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown"
  ]
}
```

Files are securely stored and made available to your workflow or agent.

#### URL Input

Allow users to provide URLs for content extraction:

| Setting             | Description         |
| ------------------- | ------------------- |
| **Allow URL Input** | Enable URL fields   |
| **URL Input Label** | Label for the input |

Example:

```typescript
{
  allowUrlInput: true,
  urlInputLabel: "Reference URLs (one per line)"
}
```

URLs are fetched and their content is extracted for processing.

### Output Configuration

Configure how results are displayed:

| Setting                  | Description                    |
| ------------------------ | ------------------------------ |
| **Output Label**         | Label for the output area      |
| **Show Copy Button**     | Enable copy to clipboard       |
| **Show Download Button** | Enable download (markdown/txt) |
| **Allow Output Edit**    | Let users edit results         |

Example:

```typescript
{
  outputLabel: "Generated Content",
  showCopyButton: true,
  showDownloadButton: true,
  allowOutputEdit: true
}
```

### Submit Button

Customize the submit button:

```typescript
{
  submitButtonText: "Generate Blog Post",
  submitLoadingText: "Generating..."
}
```

## File Handling

### Upload Flow

1. User selects files in the form
2. Files are uploaded to secure cloud storage
3. Each file receives a signed URL (valid 24 hours)
4. File references are passed to the workflow/agent
5. Workflow/agent processes the files

### Supported File Types

| Category  | Types                         |
| --------- | ----------------------------- |
| Documents | PDF, DOCX, DOC, TXT, MD, HTML |
| Data      | JSON, CSV, XLSX               |
| Images    | PNG, JPG, GIF, WEBP           |
| Code      | JS, TS, PY, and more          |

### Storage Details

- **Location**: Google Cloud Storage (private bucket)
- **Path**: `form-submissions/{formInterfaceId}/{sessionId}/{timestamp}_{filename}`
- **Access**: Signed URLs with 24-hour expiration
- **Security**: Files are sanitized and validated

## URL Processing

When URL input is enabled:

1. User provides one or more URLs
2. URLs are fetched and content extracted
3. HTML is converted to clean text/markdown
4. Content is chunked and embedded (for RAG)
5. Workflow/agent receives the processed content

### Extraction Modes

- **Text**: Plain text extraction
- **Markdown**: Structured markdown conversion
- **HTML**: Raw HTML content

## RAG Capabilities

Form interfaces support semantic search over uploaded content:

```bash
POST /api/public/form-interfaces/{slug}/submissions/{id}/query

{
  "query": "What are the key findings?",
  "topK": 5,
  "similarityThreshold": 0.7
}
```

This enables your workflow or agent to:

- Answer questions about uploaded documents
- Find relevant sections across multiple files
- Generate content based on source material

### How It Works

1. **Chunking**: Documents are split into chunks (configurable size/overlap)
2. **Embedding**: Each chunk is embedded using text-embedding-3-small
3. **Storage**: Embeddings stored in vector database
4. **Query**: Semantic similarity search finds relevant chunks
5. **Context**: Top chunks are provided to the LLM

## Submission Lifecycle

1. **Submitted**: User submits the form
2. **Processing**: Files/URLs being processed
3. **Running**: Workflow/agent executing
4. **Completed**: Results ready
5. **Failed**: Error occurred

### Submission Data

Each submission tracks:

```typescript
{
  id: "sub_abc123",
  interfaceId: "fi_xyz",
  message: "User's input text",
  files: [
    {
      gcsUri: "gs://bucket/path",
      downloadUrl: "https://signed-url...",
      fileName: "document.pdf",
      fileSize: 1024000,
      mimeType: "application/pdf"
    }
  ],
  urls: ["https://example.com/article"],
  output: "Generated content...",
  executionId: "exec_123",
  executionStatus: "completed",
  submittedAt: "2024-01-15T10:30:00Z"
}
```

## Rate Limiting

| Endpoint       | Limit        |
| -------------- | ------------ |
| File uploads   | 20/minute/IP |
| Submissions    | 10/minute/IP |
| Vector queries | 30/minute/IP |

## Embedding

### Direct URL

Share the form URL directly:

```
https://app.flowmaestro.com/form/{your-slug}
```

### Iframe

Embed in your website:

```html
<iframe
    src="https://app.flowmaestro.com/form/{your-slug}"
    width="100%"
    height="800"
    frameborder="0"
></iframe>
```

### Custom Domain

Point your domain to FlowMaestro for white-label forms.

## Best Practices

### Clear Instructions

Use the description field to explain:

- What inputs are expected
- What the output will be
- Any limitations or requirements

### Input Validation

Configure allowed file types to prevent unsupported uploads:

```typescript
allowedFileTypes: ["application/pdf", "text/plain"];
```

### Output Formatting

For agent targets, configure the system prompt to structure output appropriately:

```
Format your response as:
1. Executive Summary
2. Key Points
3. Detailed Analysis
4. Recommendations
```

### Error Handling

Handle potential failures gracefully:

- Set appropriate timeouts
- Configure retry logic in your workflow
- Provide helpful error messages

## API Reference

### Submit Form

```bash
POST /api/public/form-interfaces/{slug}/submissions

{
  "message": "Create a summary of these documents",
  "files": ["file-ref-1", "file-ref-2"],
  "urls": ["https://example.com/article"]
}
```

### Upload File

```bash
POST /api/public/form-interfaces/{slug}/upload
Content-Type: multipart/form-data

file: [binary data]
sessionId: "session_abc"
```

### Check Status

```bash
GET /api/public/form-interfaces/{slug}/submissions/{id}
```

### Query Documents

```bash
POST /api/public/form-interfaces/{slug}/submissions/{id}/query

{
  "query": "What are the main conclusions?",
  "topK": 5
}
```

See the [API Reference](/api/introduction) for complete documentation.
