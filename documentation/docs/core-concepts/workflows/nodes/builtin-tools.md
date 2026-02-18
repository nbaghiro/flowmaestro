---
sidebar_position: 5
title: Built-in Tools
---

# Built-in Tools

FlowMaestro includes powerful built-in tools for common tasks like generating charts, spreadsheets, PDFs, screenshots, and more. These nodes work without external integrations.

## Chart Generation

Create visualizations from your data.

<!-- Screenshot: Chart node with preview -->

### Chart Types

| Type | Best For |
|------|----------|
| **Bar** | Comparing categories |
| **Horizontal Bar** | Long category names |
| **Line** | Trends over time |
| **Area** | Volume/cumulative data |
| **Pie** | Part-to-whole relationships |
| **Donut** | Part-to-whole with center label |
| **Scatter** | Correlations between variables |
| **Histogram** | Distribution of values |
| **Heatmap** | Two-dimensional patterns |

### Configuration

```typescript
{
  chartType: "bar",
  dataSource: "{{sales_data}}",
  dataLabels: {
    x: "month",
    y: "revenue"
  },
  title: "Monthly Revenue 2024",
  subtitle: "All Regions",
  xAxisLabel: "Month",
  yAxisLabel: "Revenue ($)",
  width: 800,
  height: 400,
  theme: "light",  // light, dark
  legend: true,
  showGrid: true,
  showValues: true,
  filename: "revenue_chart.png",
  outputVariable: "chart_output"
}
```

### Data Format

Your data source should be an array of objects:

```typescript
[
  { month: "Jan", revenue: 45000 },
  { month: "Feb", revenue: 52000 },
  { month: "Mar", revenue: 61000 }
]
```

### Multiple Series

For multi-series charts:

```typescript
{
  chartType: "line",
  dataSource: "{{sales_by_region}}",
  dataLabels: {
    x: "month",
    y: ["north", "south", "west"]
  },
  legend: true
}
```

### Output

```typescript
{
  imageUrl: "https://storage.../chart.png",
  imageBase64: "data:image/png;base64,...",
  width: 800,
  height: 400
}
```

---

## Spreadsheet Generation

Create Excel or CSV files from data.

### Formats

| Format | Description |
|--------|-------------|
| `xlsx` | Excel workbook with formatting |
| `csv` | Plain comma-separated values |

### Configuration

```typescript
{
  format: "xlsx",
  filename: "report.xlsx",
  dataSource: "{{query_results}}",
  sheetName: "Sales Data",
  headerBold: true,
  headerBackgroundColor: "#4472C4",
  headerFontColor: "#FFFFFF",
  alternateRows: true,
  freezeHeader: true,
  outputVariable: "spreadsheet_output"
}
```

### Styling Options

| Option | Description |
|--------|-------------|
| `headerBold` | Bold header row |
| `headerBackgroundColor` | Header background (hex) |
| `headerFontColor` | Header text color (hex) |
| `alternateRows` | Alternate row shading |
| `freezeHeader` | Keep header visible on scroll |

### Multiple Sheets (XLSX)

```typescript
{
  format: "xlsx",
  sheets: [
    {
      name: "Summary",
      dataSource: "{{summary_data}}"
    },
    {
      name: "Details",
      dataSource: "{{detail_data}}"
    }
  ]
}
```

### Output

```typescript
{
  fileUrl: "https://storage.../report.xlsx",
  fileBase64: "...",
  filename: "report.xlsx",
  size: 15234
}
```

---

## PDF Generation

Create PDF documents from markdown or HTML.

### Configuration

```typescript
{
  content: "{{markdown_content}}",
  format: "markdown",  // markdown, html
  filename: "document.pdf",
  pageSize: "A4",      // A4, Letter, Legal
  orientation: "portrait",  // portrait, landscape
  margins: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
  },
  headerText: "Company Report",
  footerText: "Confidential",
  includePageNumbers: true,
  outputVariable: "pdf_output"
}
```

### Page Sizes

| Size | Dimensions |
|------|------------|
| `A4` | 210 x 297 mm |
| `Letter` | 8.5 x 11 in |
| `Legal` | 8.5 x 14 in |
| `A3` | 297 x 420 mm |
| `Tabloid` | 11 x 17 in |

### Markdown Support

The PDF generator supports full markdown:

```markdown
# Main Title

## Section Heading

Regular paragraph with **bold** and *italic* text.

### Code Block
\`\`\`javascript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`

### Table
| Column A | Column B |
|----------|----------|
| Value 1  | Value 2  |

### List
- Item one
- Item two
- Item three
```

### HTML Format

For full control, use HTML:

```html
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    h1 { color: #333; }
    .highlight { background: #ffeb3b; }
  </style>
</head>
<body>
  <h1>Report Title</h1>
  <p class="highlight">Important information</p>
</body>
</html>
```

---

## Screenshot Capture

Capture web page screenshots.

### Configuration

```typescript
{
  url: "{{input.webpage_url}}",
  fullPage: true,
  width: 1920,
  height: 1080,
  deviceScale: 2,
  format: "png",     // png, jpeg, webp
  quality: 90,       // For jpeg/webp
  delay: 1000,       // Wait before capture (ms)
  selector: null,    // Capture specific element
  darkMode: false,
  timeout: 30000,
  filename: "screenshot.png",
  outputVariable: "screenshot_output"
}
```

### Options

| Option | Description |
|--------|-------------|
| `fullPage` | Capture entire page (scrolling) |
| `width` | Viewport width |
| `height` | Viewport height |
| `deviceScale` | Pixel density (1, 2, 3) |
| `delay` | Wait for page to settle |
| `selector` | CSS selector for specific element |
| `darkMode` | Emulate dark mode preference |

### Element Screenshots

Capture a specific element:

```typescript
{
  url: "https://example.com/dashboard",
  selector: "#main-chart",
  fullPage: false
}
```

### Output

```typescript
{
  imageUrl: "https://storage.../screenshot.png",
  imageBase64: "data:image/png;base64,...",
  width: 1920,
  height: 3240,
  format: "png"
}
```

---

## OCR Extraction

Extract text from images.

### Configuration

```typescript
{
  imageSource: "{{input.image_url}}",
  languages: ["en", "es"],
  psm: 3,  // Page segmentation mode
  outputFormat: "text",  // text, json, hocr
  confidenceThreshold: 0.6,
  preprocessing: {
    deskew: true,
    denoise: true,
    contrast: "auto"
  },
  outputVariable: "ocr_result"
}
```

### Page Segmentation Modes (PSM)

| Mode | Description |
|------|-------------|
| 0 | Orientation and script detection only |
| 1 | Automatic page segmentation with OSD |
| 3 | Fully automatic (default) |
| 4 | Assume single column of text |
| 6 | Assume single uniform block of text |
| 7 | Treat image as single text line |
| 8 | Treat image as single word |

### Preprocessing

| Option | Description |
|--------|-------------|
| `deskew` | Straighten rotated text |
| `denoise` | Remove image noise |
| `contrast` | Adjust contrast (auto, high, low) |
| `threshold` | Apply binary thresholding |

### Output

```typescript
{
  text: "Extracted text from image...",
  confidence: 0.94,
  blocks: [
    {
      text: "First block",
      bbox: { x: 10, y: 10, width: 200, height: 30 },
      confidence: 0.98
    },
    {
      text: "Second block",
      bbox: { x: 10, y: 50, width: 300, height: 30 },
      confidence: 0.91
    }
  ]
}
```

---

## File Operations

Read, write, and manage files.

### Read File

```typescript
{
  operation: "read",
  path: "{{file.path}}",
  encoding: "utf-8",  // utf-8, base64, binary
  maxSize: 10485760,  // 10MB limit
  outputVariable: "file_content"
}
```

### Write File

```typescript
{
  operation: "write",
  path: "output/report.json",
  content: "{{report_data}}",
  encoding: "utf-8",
  createDirectories: true,
  overwrite: true,
  outputVariable: "write_result"
}
```

### List Files

```typescript
{
  operation: "list",
  path: "uploads/",
  pattern: "*.pdf",
  recursive: false,
  outputVariable: "file_list"
}
```

### Check Existence

```typescript
{
  operation: "exists",
  path: "config/settings.json",
  outputVariable: "file_exists"
}
```

### Delete File

```typescript
{
  operation: "delete",
  path: "temp/scratch.txt",
  outputVariable: "delete_result"
}
```

---

## Template Output

Render templates with variable interpolation.

### Configuration

```typescript
{
  outputName: "email_body",
  template: `
Dear {{customer.name}},

Thank you for your order #{{order.id}}.

## Order Summary
{{#each order.items}}
- {{this.name}} x{{this.quantity}} - ${{this.price}}
{{/each}}

**Total:** ${{order.total}}

Best regards,
{{company.name}}
  `,
  outputFormat: "markdown",
  description: "Customer order confirmation email"
}
```

### Template Syntax

| Syntax | Example | Description |
|--------|---------|-------------|
| `{{var}}` | `{{user.name}}` | Variable interpolation |
| `{{#each arr}}...{{/each}}` | `{{#each items}}...{{/each}}` | Loop over array |
| `{{#if cond}}...{{/if}}` | `{{#if user.isPremium}}...{{/if}}` | Conditional |
| `{{#if cond}}...{{else}}...{{/if}}` | Full conditional | With else clause |
| `{{this}}` | In loop | Current item |
| `{{@index}}` | In loop | Current index |
| `{{@first}}` | In loop | Is first item |
| `{{@last}}` | In loop | Is last item |

### Conditional Example

```handlebars
{{#if order.isPriority}}
**PRIORITY ORDER** - Ship immediately
{{else}}
Standard shipping (3-5 business days)
{{/if}}
```

### Nested Loops

```handlebars
{{#each departments}}
## {{this.name}}
{{#each this.employees}}
- {{this.name}} ({{this.role}})
{{/each}}
{{/each}}
```

---

## Common Patterns

### Report Generation Pipeline

```
1. [Query Data] → Get raw data
2. [Transform] → Format and aggregate
3. [Chart] → Create visualizations
4. [Template] → Generate report content
5. [PDF] → Create final document
```

### Data Export

```
1. [Database Query] → Fetch records
2. [Transform] → Clean and format
3. [Spreadsheet] → Generate Excel file
4. [Email/Storage] → Send or save
```

### Document Processing

```
1. [File Upload] → Receive document
2. [OCR] → Extract text from images
3. [LLM] → Analyze and summarize
4. [Template] → Format output
```

---

## Best Practices

### Chart Design

- Choose chart type appropriate for data
- Use clear, descriptive titles
- Include legends for multi-series
- Consider accessibility (color choices)

### PDF Generation

- Test with various content lengths
- Use consistent styling
- Include page numbers for multi-page docs
- Consider print margins

### Screenshots

- Allow sufficient delay for page load
- Use appropriate viewport size
- Consider retina (2x) for quality
- Handle dynamic content

### File Operations

- Validate file sizes before processing
- Use appropriate encodings
- Clean up temporary files
- Handle errors gracefully
