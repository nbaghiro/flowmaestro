---
sidebar_position: 5
title: Customization
---

# Interface Customization

FlowMaestro interfaces support extensive customization to match your brand and user experience requirements.

## Visual Branding

### Cover Options

Both chat and form interfaces support three cover types:

#### Image Cover

Upload a custom header image or provide a URL:

```typescript
{
  coverType: "image",
  coverValue: "https://your-domain.com/header.jpg"
}
```

**Recommendations:**

- Dimensions: 1200x400px minimum
- Format: JPG, PNG, or WebP
- File size: Under 500KB for fast loading

<!-- Screenshot: Interface with image cover -->

#### Color Cover

Use a solid background color:

```typescript
{
  coverType: "color",
  coverValue: "#1a1a2e"
}
```

**Tips:**

- Use your brand's primary color
- Ensure contrast with white text
- Consider dark colors for professional look

#### Gradient Cover

Create dynamic backgrounds with CSS gradients:

```typescript
{
  coverType: "gradient",
  coverValue: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
}
```

**Example gradients:**

| Style          | Value                                               |
| -------------- | --------------------------------------------------- |
| Blue to Purple | `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` |
| Sunset         | `linear-gradient(90deg, #f093fb 0%, #f5576c 100%)`  |
| Ocean          | `linear-gradient(180deg, #2193b0 0%, #6dd5ed 100%)` |
| Forest         | `linear-gradient(120deg, #11998e 0%, #38ef7d 100%)` |
| Dark           | `linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)` |

### Icon/Avatar

Upload a custom icon that appears:

- In the chat header
- On the widget button (chat interfaces)
- In the form header (form interfaces)

**Specifications:**

- Dimensions: 128x128px minimum (square)
- Format: PNG with transparency recommended
- File size: Under 100KB

<!-- Screenshot: Custom icon in chat header -->

### Theme Colors

#### Primary Color

The accent color used for:

- Buttons and CTAs
- Links
- Active states
- User message bubbles (chat)

```typescript
{
    primaryColor: "#6366f1"; // Indigo
}
```

**Color suggestions by industry:**

| Industry     | Recommended Colors              |
| ------------ | ------------------------------- |
| Tech/SaaS    | `#6366f1`, `#3b82f6`, `#8b5cf6` |
| Finance      | `#059669`, `#0d9488`, `#0284c7` |
| Healthcare   | `#0ea5e9`, `#06b6d4`, `#10b981` |
| E-commerce   | `#f59e0b`, `#ef4444`, `#ec4899` |
| Professional | `#475569`, `#334155`, `#1e293b` |

#### Font Family

Customize the font for all interface text:

```typescript
{
    fontFamily: "Inter, system-ui, sans-serif";
}
```

**Popular options:**

- `Inter` - Modern, clean
- `Roboto` - Google's readable font
- `SF Pro` - Apple-style
- `Source Sans Pro` - Open source classic
- `system-ui` - Native system font

#### Border Radius

Control the roundedness of elements:

```typescript
{
    borderRadius: 12; // pixels
}
```

| Value | Style               |
| ----- | ------------------- |
| 0     | Sharp corners       |
| 4-8   | Subtle rounding     |
| 12-16 | Modern rounded      |
| 24+   | Pill-shaped buttons |

## Content Customization

### Welcome Message

The first message users see (chat interfaces):

```markdown
# Welcome to Acme Support!

I'm here to help you with:

- Product questions
- Order tracking
- Returns and refunds

What can I help you with today?
```

**Best practices:**

- Keep it concise (2-4 lines)
- List capabilities clearly
- End with an open question
- Use markdown for formatting

### Placeholder Text

Input field placeholder:

```typescript
// Chat interface
{
    inputPlaceholder: "Type your message...";
}

// Form interface
{
    inputPlaceholder: "Describe what you need...";
}
```

### Suggested Prompts

Pre-defined prompts shown as clickable buttons (chat interfaces):

```typescript
{
    suggestedPrompts: [
        {
            text: "Track my order",
            emoji: "package"
        },
        {
            text: "Return policy",
            emoji: "refresh"
        },
        {
            text: "Pricing plans",
            emoji: "credit-card"
        },
        {
            text: "Talk to human",
            emoji: "headphones"
        }
    ];
}
```

**Tips:**

- Use 3-4 prompts maximum
- Cover common use cases
- Keep text short (2-4 words)
- Choose relevant emojis

<!-- Screenshot: Suggested prompts display -->

### Form Labels

Customize form interface labels:

```typescript
{
  // Input area
  inputLabel: "Your request",
  inputPlaceholder: "Describe what you need...",

  // File upload
  fileUploadLabel: "Attach reference files",

  // URL input
  urlInputLabel: "Reference URLs",

  // Output area
  outputLabel: "Generated content",

  // Submit button
  submitButtonText: "Generate",
  submitLoadingText: "Working on it..."
}
```

### Title and Description

Static header content for form interfaces:

```typescript
{
  title: "Blog Post Generator",
  description: "Enter your topic and key points. We'll create a complete, SEO-optimized blog post ready for publishing."
}
```

## Widget Customization (Chat Only)

### Position

Where the floating button appears:

```typescript
{
    widgetPosition: "bottom-right"; // or "bottom-left"
}
```

### Button Icon

The icon on the widget button:

```typescript
{
    widgetButtonIcon: "message-circle"; // or emoji like "speech-balloon"
}
```

### Button Text

Optional text next to the icon:

```typescript
{
    widgetButtonText: "Chat with us";
}
```

### Initial State

Whether the chat starts open or closed:

```typescript
{
    widgetInitialState: "collapsed"; // or "expanded"
}
```

## Output Customization (Forms Only)

### Display Options

```typescript
{
  outputLabel: "Your generated content",
  showCopyButton: true,      // Copy to clipboard
  showDownloadButton: true,  // Download as file
  allowOutputEdit: true      // User can edit output
}
```

### Download Format

When download is enabled, users can save output as:

- Markdown (.md)
- Plain text (.txt)

## Advanced Customization

### CSS Variables

For custom domain deployments, override CSS variables:

```css
:root {
    --fm-primary: #6366f1;
    --fm-primary-hover: #4f46e5;
    --fm-text: #1f2937;
    --fm-text-muted: #6b7280;
    --fm-bg: #ffffff;
    --fm-bg-muted: #f3f4f6;
    --fm-border: #e5e7eb;
    --fm-radius: 12px;
    --fm-font: "Inter", system-ui, sans-serif;
}
```

### Dark Mode

FlowMaestro interfaces automatically respect user's system preference. For custom styling:

```css
@media (prefers-color-scheme: dark) {
    :root {
        --fm-text: #f9fafb;
        --fm-bg: #111827;
        --fm-bg-muted: #1f2937;
        --fm-border: #374151;
    }
}
```

## Preview and Testing

Before publishing:

1. **Preview mode** - Test all customizations in the editor
2. **Mobile preview** - Check responsive behavior
3. **Dark mode** - Verify colors in both themes
4. **Load testing** - Ensure assets load quickly

## Best Practices

### Brand Consistency

- Use your exact brand colors
- Match fonts with your website
- Upload high-quality logos
- Maintain consistent tone in copy

### Accessibility

- Ensure sufficient color contrast (4.5:1 minimum)
- Use readable font sizes (14px minimum)
- Don't rely solely on color for information
- Keep animations subtle

### Performance

- Optimize images before uploading
- Use WebP format when possible
- Keep custom fonts to 1-2 weights
- Test load times on slow connections

### User Experience

- Keep welcome messages short
- Make suggested prompts actionable
- Use clear, descriptive labels
- Test the full user journey
