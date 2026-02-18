---
sidebar_position: 3
title: Data Nodes
---

# Data Nodes

Data nodes handle input, output, and data manipulation in your workflows. Use them to accept files and URLs, produce outputs, and manage HTTP requests and database operations.

## Input Nodes

### Input Node

Basic input/constants for workflow initialization.

```typescript
{
  inputType: "text",  // or "json"
  value: "Default value"
}
```

### Files Node

Accept file uploads in your workflow.

<!-- Screenshot: Files node configuration -->

### Configuration

```typescript
{
  inputName: "documents",
  required: true,
  allowedFileTypes: [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ],
  maxFiles: 10,
  maxFileSizeMb: 25,
  chunkSize: 1000,
  chunkOverlap: 200,
  outputVariable: "uploaded_files",
  label: "Upload Documents",
  description: "Upload PDF, TXT, MD, or DOCX files"
}
```

### Supported File Types

| Category | Extensions | MIME Types |
|----------|------------|------------|
| Documents | PDF, DOCX, DOC, TXT, MD, HTML | application/pdf, etc. |
| Data | JSON, CSV, XLSX | application/json, text/csv |
| Code | JS, TS, PY, etc. | text/javascript, etc. |
| Images | PNG, JPG, GIF, WEBP | image/* |

### Output

```typescript
{
  files: [
    {
      name: "report.pdf",
      size: 1024000,
      mimeType: "application/pdf",
      content: "Extracted text content...",
      chunks: [
        { text: "Chunk 1...", index: 0 },
        { text: "Chunk 2...", index: 1 }
      ]
    }
  ]
}
```

### Chunking

Files are automatically chunked for RAG applications:
- `chunkSize`: Characters per chunk (default: 1000)
- `chunkOverlap`: Overlap between chunks (default: 200)

---

### URL Node

Accept and process URLs.

```typescript
{
  inputName: "urls",
  scrapingMode: "markdown",  // html, text, markdown
  scrapeSubpages: false,
  timeout: 30,
  followRedirects: true,
  includeMetadata: true,
  chunkingAlgorithm: "semantic",
  chunkSize: 1000,
  chunkOverlap: 200,
  advancedExtraction: false,
  ocrEnabled: false,
  outputVariable: "url_content",
  label: "Reference URLs",
  description: "Enter URLs to include as context"
}
```

### Scraping Modes

| Mode | Output |
|------|--------|
| `html` | Raw HTML content |
| `text` | Plain text only |
| `markdown` | Structured markdown |

### Output

```typescript
{
  urls: [
    {
      url: "https://example.com/article",
      title: "Article Title",
      content: "Extracted content...",
      metadata: {
        description: "...",
        author: "...",
        publishedDate: "..."
      },
      chunks: [...]
    }
  ]
}
```

---

### Web Search Node

Search the web and return results.

```typescript
{
  query: "{{user.search_term}}",
  maxResults: 10,
  searchType: "general",  // general, news, images
  outputVariable: "search_results"
}
```

### Output

```typescript
{
  results: [
    {
      title: "Result Title",
      url: "https://...",
      snippet: "Preview text...",
      publishedDate: "2024-01-15"
    }
  ]
}
```

---

### Web Browse Node

Fetch and read web page content.

```typescript
{
  url: "{{input.url}}",
  extractText: true,
  maxLength: 50000,
  outputVariable: "page_content"
}
```

---

### PDF Extract Node

Extract content from PDF files.

```typescript
{
  path: "{{files_node.output.files[0].url}}",
  extractText: true,
  extractMetadata: true,
  pageStart: 1,
  pageEnd: null,  // All pages
  specificPages: null,  // Or [1, 3, 5]
  outputFormat: "text",
  password: null,  // For encrypted PDFs
  outputVariable: "pdf_content"
}
```

---

### File Download Node

Download files from URLs.

```typescript
{
  url: "{{api_response.file_url}}",
  filename: "downloaded_file.pdf",
  maxSize: 52428800,  // 50MB
  timeout: 60,
  followRedirects: true,
  allowedContentTypes: ["application/pdf", "image/*"],
  outputVariable: "downloaded_file"
}
```

---

### File Read Node

Read files from storage.

```typescript
{
  path: "{{file.path}}",
  encoding: "utf-8",  // utf-8, base64, binary
  maxSize: 10485760,  // 10MB
  outputVariable: "file_content"
}
```

---

## Output Nodes

### Output Node

Collect and return workflow outputs.

```typescript
{
  outputName: "result",
  value: "{{llm_node.output.response}}",
  format: "json",  // json, string, number, boolean
  description: "The main workflow output"
}
```

Multiple output nodes create a combined output object:

```typescript
{
  result: "...",
  summary: "...",
  metadata: {...}
}
```

---

### Template Output Node

Render templates with variable interpolation.

```typescript
{
  outputName: "report",
  template: `
# Report for {{company.name}}

Generated on: {{current_date}}

## Summary
{{analysis.summary}}

## Key Findings
{{#each findings}}
- **{{this.title}}**: {{this.description}}
{{/each}}

## Recommendations
{{recommendations}}
  `,
  outputFormat: "markdown",  // markdown, html
  description: "Formatted report"
}
```

### Template Syntax

| Syntax | Description |
|--------|-------------|
| `{{variable}}` | Insert variable value |
| `{{#each items}}...{{/each}}` | Loop over array |
| `{{#if condition}}...{{/if}}` | Conditional content |
| `{{this}}` | Current item in loop |
| `{{@index}}` | Current loop index |

---

### Action Node

Perform external actions (send, create, update, delete).

```typescript
{
  provider: "slack",
  operation: "send_message",
  connectionId: "conn_abc123",
  parameters: {
    channel: "#general",
    message: "{{notification.text}}"
  },
  outputVariable: "action_result"
}
```

Used for:
- Sending notifications
- Creating records
- Updating external systems
- Triggering integrations

---

### Chart Generation Node

Create charts and visualizations.

```typescript
{
  chartType: "bar",
  dataSource: "{{analytics.monthly_data}}",
  dataLabels: {
    x: "month",
    y: "revenue"
  },
  title: "Monthly Revenue",
  subtitle: "2024",
  xAxisLabel: "Month",
  yAxisLabel: "Revenue ($)",
  width: 800,
  height: 400,
  theme: "light",
  legend: true,
  showGrid: true,
  showValues: true,
  filename: "revenue_chart.png",
  outputVariable: "chart_output"
}
```

### Chart Types

| Type | Description |
|------|-------------|
| `bar` | Vertical bar chart |
| `horizontal_bar` | Horizontal bar chart |
| `line` | Line chart |
| `area` | Area chart |
| `pie` | Pie chart |
| `donut` | Donut chart |
| `scatter` | Scatter plot |
| `histogram` | Histogram |
| `heatmap` | Heat map |

---

### Spreadsheet Generation Node

Create spreadsheets from data.

```typescript
{
  format: "xlsx",  // xlsx, csv
  filename: "export.xlsx",
  dataSource: "{{query_results}}",
  sheetName: "Data",
  headerBold: true,
  headerBackgroundColor: "#4472C4",
  headerFontColor: "#FFFFFF",
  alternateRows: true,
  freezeHeader: true,
  outputVariable: "spreadsheet_output"
}
```

---

### PDF Generation Node

Create PDF documents.

```typescript
{
  content: "{{template_output.rendered}}",
  format: "markdown",  // markdown, html
  filename: "document.pdf",
  pageSize: "A4",
  orientation: "portrait",
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  headerText: "Company Name",
  footerText: "Confidential",
  includePageNumbers: true,
  outputVariable: "pdf_output"
}
```

---

### Screenshot Capture Node

Capture screenshots of web pages.

```typescript
{
  url: "{{input.url}}",
  fullPage: true,
  width: 1920,
  height: 1080,
  deviceScale: 2,
  format: "png",  // png, jpeg, webp
  quality: 90,
  delay: 1000,
  selector: null,  // Specific element
  darkMode: false,
  timeout: 30000,
  filename: "screenshot.png",
  outputVariable: "screenshot_output"
}
```

---

### File Write Node

Write content to files.

```typescript
{
  path: "output/report.txt",
  content: "{{generated_content}}",
  encoding: "utf-8",
  createDirectories: true,
  overwrite: true,
  outputVariable: "file_write_result"
}
```

---

## HTTP Node

Make HTTP requests to external APIs.

<!-- Screenshot: HTTP node configuration -->

### Configuration

```typescript
{
  method: "POST",
  url: "https://api.example.com/endpoint",
  headers: {
    "Content-Type": "application/json",
    "X-Custom-Header": "{{custom_value}}"
  },
  queryParams: {
    "filter": "active",
    "limit": "100"
  },
  authType: "bearer",
  authCredentials: {
    token: "{{env.API_TOKEN}}"
  },
  bodyType: "json",
  body: {
    "name": "{{user.name}}",
    "email": "{{user.email}}"
  },
  timeout: 30000,
  retryCount: 3,
  outputVariable: "api_response"
}
```

### Methods

| Method | Use Case |
|--------|----------|
| `GET` | Retrieve data |
| `POST` | Create resources |
| `PUT` | Replace resources |
| `PATCH` | Partial updates |
| `DELETE` | Remove resources |

### Authentication Types

| Type | Configuration |
|------|---------------|
| `none` | No authentication |
| `basic` | `{ username, password }` |
| `bearer` | `{ token }` |
| `apiKey` | `{ key, value, location }` |

### Body Types

| Type | Content-Type |
|------|--------------|
| `json` | application/json |
| `form` | application/x-www-form-urlencoded |
| `raw` | Custom (set in headers) |

### Output

```typescript
{
  status: 200,
  statusText: "OK",
  headers: {...},
  body: {...},
  responseTime: 245
}
```

---

## Database Node

Query and manipulate databases.

### Supported Databases

| Type | Description |
|------|-------------|
| `postgresql` | PostgreSQL |
| `mysql` | MySQL / MariaDB |
| `mongodb` | MongoDB |

### Operations

| Operation | Description |
|-----------|-------------|
| `query` | Execute SELECT query |
| `insert` | Insert records |
| `update` | Update records |
| `delete` | Delete records |

### Configuration

```typescript
{
  databaseType: "postgresql",
  connectionId: "conn_database",
  operation: "query",
  query: "SELECT * FROM users WHERE status = $1 AND created_at > $2",
  parameters: ["active", "2024-01-01"],
  outputVariable: "query_results"
}
```

### Insert Example

```typescript
{
  operation: "insert",
  query: "INSERT INTO logs (event, data, timestamp) VALUES ($1, $2, NOW())",
  parameters: ["user_action", "{{event_data}}"]
}
```

### MongoDB Example

```typescript
{
  databaseType: "mongodb",
  operation: "query",
  query: {
    collection: "users",
    filter: { status: "active" },
    projection: { name: 1, email: 1 },
    sort: { createdAt: -1 },
    limit: 100
  }
}
```

---

## Best Practices

### Input Handling

- Validate file types and sizes
- Set appropriate chunk sizes for RAG
- Use descriptive labels and descriptions
- Handle empty inputs gracefully

### Output Formatting

- Use template outputs for structured documents
- Choose appropriate chart types for data
- Compress large outputs when possible
- Include metadata for traceability

### HTTP Requests

- Always set timeouts
- Use retry for transient failures
- Secure credentials in environment variables
- Validate responses before use

### Database Operations

- Use parameterized queries (prevent SQL injection)
- Limit result sets for large tables
- Handle connection errors
- Log operations for debugging
