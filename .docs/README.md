# FlowMaestro Documentation

Complete technical documentation for the FlowMaestro platform.

---

## Overview

FlowMaestro is a visual workflow and AI agent builder that enables users to create sophisticated automations without writing code. This documentation covers the complete system architecture, implementation details, and development guidelines.

---

## Documentation Structure

### Core System Documentation

These documents cover the main features of FlowMaestro:

#### [workflow-system.md](./workflow-system.md)

**Workflow System** - Complete guide to the workflow builder

**Topics covered:**

- Workflow execution system (Temporal orchestration)
- 20+ node types catalog (LLM, HTTP, Transform, Conditional, Loop, etc.)
- Workflow triggers (schedule, webhook, event, manual)
- AI workflow generation (LLM-powered workflow creation)
- Agent workflow node (executing agents within workflows)
- Variable interpolation and context management
- Workflow canvas UI usage

**When to read:** Building or understanding workflows, adding new node types, working on triggers

---

#### [agent-architecture.md](./agent-architecture.md)

**AI Agent System** - Complete agent feature set

**Topics covered:**

- Memory management (buffer, summary, vector memory with RAG)
- Streaming infrastructure (SSE-based real-time token streaming)
- LLM provider integration (OpenAI, Anthropic, Google, Cohere)
- Tool execution system (workflows, functions, knowledge bases, provider MCP tools)
- RAG system (document processing, chunking, semantic search)
- Observability & tracing (OpenTelemetry + Jaeger)
- Agent builder UI
- Provider MCP adapters (auto-exposed tools from OAuth integrations)

**When to read:** Working on agents, adding memory types, integrating LLM providers, building agent tools

---

#### [ai-sdk-architecture.md](./ai-sdk-architecture.md)

**AI SDK** - Unified multi-provider AI interface

**Topics covered:**

- Package structure and architecture layers
- AIClient, Capabilities, Providers, Core infrastructure
- Provider registry and API key resolution
- FlowMaestro backend integration
- Realtime streaming (Deepgram STT, ElevenLabs TTS)
- Error handling classes
- Testing and building
- Adding new providers/capabilities

**When to read:** Working with AI providers, adding new LLM/embedding/image providers, understanding AI infrastructure

---

#### [integrations-system.md](./integrations-system.md)

**Integration System** - Provider SDK architecture for external services

**Topics covered:**

- Provider SDK architecture (dual API + MCP interfaces)
- Core abstractions (BaseProvider, BaseAPIClient, ExecutionRouter)
- Provider implementation pattern (operations, client, MCP adapter)
- Connection pooling and performance optimization
- Authentication methods (API key, OAuth 2.0, basic auth, custom)
- Direct API execution for workflows
- Auto-wrapped MCP tools from provider operations
- Error handling and retry logic
- Adding new providers (step-by-step guide)
- Security (AES-256-GCM encryption, multi-tenancy)

**When to read:** Building integrations, adding providers, optimizing API performance, implementing OAuth

---

#### [temporal-workflows.md](./temporal-workflows.md)

**Temporal Orchestration** - Durable workflow execution

**Topics covered:**

- Worker configuration and deployment
- Workflow types (orchestrator, triggered, user-input, long-running)
- Activity patterns and node executors
- Execution methods (manual, scheduled, webhook)
- Management (Temporal UI, scripts, monitoring)
- Best practices for workflows and activities

**When to read:** Working on workflow execution, debugging Temporal issues, optimizing activity performance

---

#### [safety-module.md](./safety-module.md)

**Safety & Content Moderation** - Input/output validation for AI agents

**Topics covered:**

- PII detection and redaction (email, phone, SSN, credit card, API keys)
- Prompt injection detection (system override, role manipulation, jailbreak attempts)
- Safety pipeline architecture and processing flow
- Per-agent safety configuration
- Database logging and metrics
- Integration with agent/persona orchestrator workflows
- Custom validator extensibility

**When to read:** Working on agent security, implementing content moderation, auditing safety events

---

### Infrastructure & Operations

#### [deployment-guide.md](./deployment-guide.md)

**Infrastructure Setup** - Deployment and cloud architecture

**Topics covered:**

- Google Cloud Platform setup
- Kubernetes (GKE) cluster configuration
- Cloud SQL PostgreSQL
- Memorystore Redis
- Temporal Cloud integration
- Docker images and CI/CD
- Monitoring and observability
- Cost optimization
- Disaster recovery

**When to read:** Deploying to production, setting up infrastructure, troubleshooting cloud issues

---

#### [testing-guide.md](./testing-guide.md)

**Testing Strategy** - Integration testing approach

**Topics covered:**

- Testing philosophy (real-world scenarios)
- Progressive complexity phases
- Test workflows (from Hello World to ArXiv Researcher)
- Mock APIs and test infrastructure
- Node type coverage
- Trigger type coverage
- Agent testing strategies

**When to read:** Writing integration tests, validating new features, ensuring system reliability

---

### Real-Time & Communication

#### [voice-calls.md](./voice-calls.md)

**Voice Input/Output** - Telnyx & LiveKit integration

**Topics covered:**

- Architecture (Telnyx PSTN + LiveKit WebRTC + FlowMaestro)
- Call flow (8 phases from initiation to termination)
- Voice pipeline (VAD, STT, LLM, TTS)
- Agent integration for conversational AI
- Error handling and edge cases
- Setup and configuration

**When to read:** Working on voice features, integrating voice agents, debugging call flows

---

#### [websocket-events.md](./websocket-events.md)

**Real-time Updates** - WebSocket event system

**Topics covered:**

- Architecture overview
- Event flow diagrams
- 15 event types (execution, node, user input, KB events, agent streaming)
- Connection & authentication (JWT)
- Subscription management
- Frontend patterns (React hooks, streaming client)
- Backend patterns (EventEmitter, EventBridge, WebSocketManager)
- Error handling and debugging

**When to read:** Adding real-time features, debugging WebSocket connections, implementing event streaming

---

## Experimental Features

Located in `.docs/experimental/`:

### [experimental/mastra-agents-system.md](./experimental/mastra-agents-system.md)

Third-party framework analysis comparing custom implementation vs. integrating Mastra.ai

**Topics covered:**

- Comprehensive Mastra.ai feature comparison
- 15 integration benefits
- 8 integration opportunities
- Implementation roadmap
- Build vs. buy decision analysis

**When to read:** Evaluating framework options, planning agent system architecture

---

### [experimental/paragon-integrations.md](./experimental/paragon-integrations.md)

iPaaS platform evaluation for replacing custom OAuth implementation

**Topics covered:**

- Paragon's 130+ pre-built integrations
- Complete implementation guide
- Database schema changes
- API routes and UI integration
- Migration plan from custom OAuth

**When to read:** Evaluating iPaaS options, planning integration expansion

---

## Quick Reference

### By Feature

| Feature       | Document                                           | Section                  |
| ------------- | -------------------------------------------------- | ------------------------ |
| Node types    | [workflows.md](./workflows.md)                     | Node Types Catalog       |
| Triggers      | [workflows.md](./workflows.md)                     | Workflow Triggers        |
| AI generation | [workflows.md](./workflows.md)                     | AI Workflow Generation   |
| Memory        | [agents.md](./agents.md)                           | Memory Management        |
| Streaming     | [agents.md](./agents.md)                           | Streaming Infrastructure |
| LLM providers | [ai-sdk-architecture.md](./ai-sdk-architecture.md) | Provider implementations |
| Tools         | [agents.md](./agents.md)                           | Tool Execution System    |
| RAG           | [agents.md](./agents.md)                           | RAG (Knowledge Bases)    |
| Observability | [agents.md](./agents.md)                           | Observability & Tracing  |
| Safety        | [safety-module.md](./safety-module.md)             | All sections             |
| OAuth         | [integrations-system.md](./integrations-system.md) | Authentication Methods   |
| MCP Tools     | [integrations-system.md](./integrations-system.md) | MCP Adapter Pattern      |
| Temporal      | [temporal.md](./temporal.md)                       | All sections             |
| Deployment    | [infra.md](./infra.md)                             | All sections             |
| Voice         | [voicecalls.md](./voicecalls.md)                   | All sections             |
| Real-time     | [websocket.md](./websocket.md)                     | All sections             |

### By Role

**Frontend Developer**:

1. [workflows.md](./workflows.md) - Canvas UI, node configuration
2. [agents.md](./agents.md) - Agent builder UI, streaming client
3. [websocket.md](./websocket.md) - Real-time updates, event handling
4. [integrations-system.md](./integrations-system.md) - Connection picker, OAuth flow

**Backend Developer**:

1. [temporal.md](./temporal.md) - Workflow execution, activity patterns
2. [agents.md](./agents.md) - LLM integration, tool execution
3. [integrations-system.md](./integrations-system.md) - Provider SDK, connection pooling, security
4. [safety-module.md](./safety-module.md) - PII detection, prompt injection, content moderation
5. [websocket.md](./websocket.md) - Event emission, WebSocket management

**DevOps/Infrastructure**:

1. [infra.md](./infra.md) - GCP setup, Kubernetes, monitoring
2. [temporal.md](./temporal.md) - Worker deployment, scaling
3. [testing.md](./testing.md) - CI/CD integration, test infrastructure

**Product/Design**:

1. [workflows.md](./workflows.md) - Workflow capabilities, UI patterns
2. [agents.md](./agents.md) - Agent features, user experience
3. [integrations-system.md](./integrations-system.md) - Supported integrations, connection UX

---

## Development Workflow

### Setting Up

1. Read [infra.md](./infra.md) - Set up local development environment
2. Read [testing.md](./testing.md) - Understand testing approach
3. Browse relevant feature docs based on your work

### Adding Features

**New Workflow Node Type:**

1. Read [workflows.md](./workflows.md) → Node Types Catalog
2. Read [temporal.md](./temporal.md) → Activity Patterns
3. Implement node executor activity
4. Add frontend node configuration UI
5. Write integration tests (see [testing.md](./testing.md))

**New Agent Tool:**

1. Read [agents.md](./agents.md) → Tool Execution System
2. Implement tool executor
3. Add tool configuration UI
4. Test with agent (see [testing.md](./testing.md))

**New Integration:**

1. Read [integrations-system.md](./integrations-system.md) → Provider Implementation
2. Create provider directory with operations
3. Implement provider class extending BaseProvider
4. Create HTTP client with connection pooling
5. Implement MCP adapter for agent tools
6. Add provider to registry

**New LLM Provider:**

1. Read [ai-sdk-architecture.md](./ai-sdk-architecture.md) → Adding a New Provider
2. Create provider in `sdks/ai-sdk/src/providers/<capability>/`
3. Implement capability interface (e.g., `TextCompletionProvider`)
4. Register in `AIClient.registerProviders()`
5. Add env var mapping in `core/auth.ts`
6. Add tests and update documentation

### Debugging

**Workflow Execution Issues:**

- Check [temporal.md](./temporal.md) → Management section
- Access Temporal UI (http://localhost:8088)
- Review workflow execution history
- Check activity logs

**Agent Response Issues:**

- Check [agents.md](./agents.md) → Observability section
- Access Jaeger UI for traces
- Review LLM call logs
- Check tool execution results

**Real-time Update Issues:**

- Check [websocket.md](./websocket.md) → Error Handling
- Review WebSocket connection logs
- Verify event subscriptions
- Check JWT authentication

---

## Architecture Principles

### Core Concepts

1. **Separation of Concerns**: Workflows (deterministic) vs Activities (side-effecting)
2. **Durable Execution**: Temporal ensures workflows survive crashes
3. **Real-time Updates**: WebSocket events keep UI synchronized
4. **Security First**: AES-256 encryption, multi-tenancy, JWT auth
5. **Extensibility**: Plugin architecture for nodes, tools, providers

### Data Flow

```
User Input (Frontend)
  ↓
API Layer (Fastify)
  ↓
Temporal Workflow (Orchestration)
  ↓
Activities (Node Executors)
  ↓
External Services (LLMs, APIs, Databases)
  ↓
WebSocket Events
  ↓
Frontend Updates
```

### Key Technologies

- **Frontend**: React + Vite + Zustand + TanStack Query + React Flow
- **Backend**: Fastify + PostgreSQL + Redis + Temporal
- **AI/ML**: @flowmaestro/ai-sdk (OpenAI, Anthropic, Google, Cohere, etc.)
- **Infrastructure**: GCP + Kubernetes + Cloud SQL + Memorystore
- **Observability**: OpenTelemetry + Jaeger + Cloud Monitoring
- **Voice**: Deepgram (STT) + ElevenLabs (TTS)
- **Real-time**: Socket.IO

---

## Contributing

When contributing to FlowMaestro:

1. **Read relevant docs** before starting work
2. **Follow code standards** in CLAUDE.md
3. **Write tests** following patterns in [testing.md](./testing.md)
4. **Update docs** if adding new features
5. **Run type checks** before committing (see CLAUDE.md)

---

## Getting Help

- **Architecture Questions**: Check overview sections in each doc
- **Implementation Details**: See specific feature sections
- **Debugging**: Check management/troubleshooting sections
- **Experimental Features**: See `.docs/experimental/`

---

## Documentation Maintenance

### When to Update

- **New Feature**: Add section to relevant doc, update this README
- **Architecture Change**: Update affected docs, add migration notes
- **Deprecation**: Mark sections as deprecated, add migration guide
- **Bug Fix**: Update if fixing documented behavior

### Writing Style

- Clear, concise explanations
- Code examples for complex concepts
- Step-by-step instructions for processes
- Cross-references between related docs
- Real-world use cases

---

## Summary

This documentation provides a complete technical reference for FlowMaestro. Each document is self-contained but cross-references related topics. Start with the overview sections, then dive into specific features as needed.

For project-level coding standards and development guidelines, see [CLAUDE.md](../CLAUDE.md) in the project root.
