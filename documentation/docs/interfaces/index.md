---
sidebar_position: 1
title: Public Interfaces
---

# Public Interfaces

FlowMaestro allows you to deploy your workflows and agents as public-facing interfaces that anyone can use. These interfaces provide a way to expose your automations to end users without requiring them to have a FlowMaestro account.

## Interface Types

### Chat Interfaces

Chat interfaces turn your AI agents into conversational widgets that can be embedded on any website. Users can have natural conversations with your agents, which can access their tools and knowledge bases.

**Use cases:**

- Customer support chatbots
- Sales assistants
- Product guides
- FAQ bots
- Internal help desks

[Learn more about Chat Interfaces](./chat-interfaces)

### Form Interfaces

Form interfaces provide a structured way to collect input and run workflows or agents. They're ideal for tasks that require specific inputs and produce defined outputs.

**Use cases:**

- Content generation (blog posts, social media)
- Document processing
- Data transformation
- Report generation
- Multi-step forms with AI processing

[Learn more about Form Interfaces](./form-interfaces)

## Key Features

### Branding & Customization

Both interface types support extensive customization:

- Custom colors, fonts, and border radius
- Logo and icon uploads
- Cover images (uploaded, colors, or gradients)
- Welcome messages and placeholder text
- Suggested prompts

[Learn more about Customization](./customization)

### Embedding Options

Deploy your interfaces anywhere:

- **Script tag** — Simple JavaScript embed
- **Iframe** — Full-page or inline embedding
- **React component** — Native React integration
- **Custom domains** — Host on your own domain

[Learn more about Embedding](./embedding)

### Session Management

Interfaces automatically manage user sessions:

- Session persistence (per-session or local storage)
- Configurable timeouts
- Visitor tracking (IP, user agent, referrer)
- Thread continuity for chat interfaces

### Rate Limiting

Protect your interfaces from abuse:

- Configurable message rate limits
- Per-IP request throttling
- File upload limits

## Getting Started

1. **Create an interface** — Go to **Interfaces** in the dashboard
2. **Choose the type** — Select Chat or Form based on your use case
3. **Configure the target** — Connect to an agent or workflow
4. **Customize branding** — Add your colors, logo, and messaging
5. **Publish** — Get your embed code and deploy

## Comparison

| Feature      | Chat Interface          | Form Interface          |
| ------------ | ----------------------- | ----------------------- |
| Target       | Agents only             | Workflows or Agents     |
| Interaction  | Conversational          | Single submission       |
| Real-time    | Streaming responses     | Polling for results     |
| File uploads | Attachments per message | Batch uploads           |
| Output       | Chat messages           | Structured deliverables |
| Best for     | Ongoing dialogue        | Task completion         |

## API Access

Both interface types have public APIs for programmatic access:

```bash
# Chat interface - create session
curl -X POST https://api.flowmaestro.ai/public/chat-interfaces/{slug}/sessions

# Form interface - submit
curl -X POST https://api.flowmaestro.ai/public/form-interfaces/{slug}/submissions \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate a blog post about..."}'
```

See the [API Reference](/api/introduction) for complete documentation.
