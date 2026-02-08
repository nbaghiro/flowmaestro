# FlowMaestro

> Build, Deploy, and Scale AI Workflows with Visual Orchestration

FlowMaestro is a TypeScript-based platform for orchestrating AI agent workflows and building autonomous agents. Design multi-step AI processes through a visual canvas, create conversational agents with tools and memory, and deploy production-ready AI systems with built-in durability and monitoring.

![FlowMaestro Workflow Builder](preview.png)

## Why FlowMaestro?

Built for TypeScript developers who need both visual workflow orchestration and programmatic AI agents, FlowMaestro provides everything you need to build production AI applications.

### Visual Workflows

- **[Workflow Canvas](./.docs/workflow-system.md)** - Drag-and-drop builder with 20+ node types (LLM, HTTP, Transform, Conditional, Loop, etc.)
- **[Durable Execution](./.docs/temporal-workflows.md)** - Powered by Temporal for retry logic, timeouts, and failure recovery
- **[Workflow Triggers](./.docs/workflow-system.md#triggers)** - Schedule, webhook, event-based, and manual execution
- **Real-time Monitoring** - WebSocket-based live execution updates

### AI Agents

- **[Agent System](./.docs/agent-architecture.md)** - Autonomous agents with LLM reasoning, tool use, and iterative problem-solving
- **[Memory Management](./.docs/agent-architecture.md#memory-system)** - Buffer, summary, working memory, and vector memory with RAG
- **[Streaming](./.docs/agent-architecture.md#streaming)** - Real-time SSE token streaming for responsive UIs
- **[MCP Tools](./.docs/mcp-tools.md)** - Auto-wrapped integration provider operations as MCP-compatible tools

### Integrations & Context

- **[Integration System](./.docs/integrations-system.md)** - Provider SDK architecture with OAuth 2.0, API keys, and MCP support
- **[Knowledge Bases](./.docs/workflow-system.md#knowledge-base)** - RAG with document processing, chunking, and vector search
- **Multi-LLM Support** - OpenAI, Anthropic, Google Gemini, Cohere through unified interface

### Public API & SDKs

- **[Public API](./.docs/public-api.md)** - RESTful API for programmatic access to workflows, agents, and knowledge bases
- **[CLI](./.docs/cli.md)** - Command-line interface with OAuth device flow, interactive agent chat, and execution monitoring
- **[JavaScript SDK](/sdks/javascript)** - Official TypeScript/JavaScript SDK with streaming support
- **[Python SDK](/sdks/python)** - Official Python SDK with sync and async clients

### Browser Extension

- **[Chrome Extension](./.docs/browser-extension.md)** - Use FlowMaestro directly from any web page
- **Page Context** - Extract text, tables, forms, metadata, and screenshots from any page
- **Agent Chat** - Chat with your agents using the current page as context
- **Workflow Execution** - Run workflows with auto-mapped page content as inputs
- **Knowledge Base** - Quick-add page content to your knowledge bases
- **Permission Control** - Granular per-site permissions following Claude's trust model

### Production Ready

- **[Deployment Guide](./.docs/deployment-guide.md)** - Google Kubernetes Engine with Pulumi infrastructure-as-code
- **[Testing](./.docs/testing-guide.md)** - Integration test suite with real-world scenarios
- **[Observability](./.docs/agent-architecture.md#observability)** - Execution spans, logging, and telemetry
- **Security** - AES-256-GCM encryption, multi-tenancy, Workload Identity

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL 15+ (with pgvector extension)
- Redis 7+
- Temporal Server 1.23+

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/flowmaestro.git
cd flowmaestro

# Install dependencies
npm install

# Setup secrets (pulls from GCP Secret Manager)
./infra/scripts/sync-secrets-local.sh

# Start infrastructure (Docker Compose)
npm run docker:up

# Run database migrations
npm run db:migrate

# Start backend API server (in separate terminal)
npm run dev:backend

# Start Temporal worker (in separate terminal)
npm run dev:worker

# Start frontend (in separate terminal)
npm run dev:frontend
```

Access the application:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Temporal UI**: http://localhost:8088

See [Deployment Guide](./.docs/deployment-guide.md) for production setup.

## Documentation

Comprehensive documentation is available in the `.docs/` directory:

### Core Documentation

- **[Workflow System](./.docs/workflow-system.md)** - Complete workflow builder guide
- **[Agent Architecture](./.docs/agent-architecture.md)** - AI agent system and memory
- **[Temporal Workflows](./.docs/temporal-workflows.md)** - Durable workflow execution
- **[Integration System](./.docs/integrations-system.md)** - Provider SDK and external connections
- **[Public API & SDKs](./.docs/public-api.md)** - REST API reference and SDK documentation
- **[CLI](./.docs/cli.md)** - Command-line interface guide

### Infrastructure & Operations

- **[Deployment Guide](./.docs/deployment-guide.md)** - GKE deployment and infrastructure
- **[Testing Guide](./.docs/testing-guide.md)** - Integration testing strategy
- **[Linting Setup](./.docs/linting-setup.md)** - Code quality and formatting

### Real-Time Features

- **[WebSocket Events](./.docs/websocket-events.md)** - Bidirectional real-time communication (Socket.IO)
- **[SSE Streaming](./.docs/sse-streaming.md)** - Server-Sent Events for execution monitoring

## Architecture

FlowMaestro is a full-stack TypeScript monorepo:

```
flowmaestro/
├── frontend/         # React + Vite SPA (workflow canvas, agent builder)
├── backend/          # Fastify API + Temporal workers
├── shared/           # Shared TypeScript types and utilities
├── cli/              # Command-line interface (@flowmaestro/cli)
├── extensions/       # Browser extensions
│   └── chrome/       # Chrome extension with sidebar UI
├── sdks/             # Official client SDKs
│   ├── javascript/   # TypeScript/JavaScript SDK (@flowmaestro/sdk)
│   └── python/       # Python SDK (flowmaestro)
├── examples/         # SDK usage examples and mini-apps
├── marketing/        # Marketing website
├── documentation/    # Docusaurus documentation site
└── infra/            # Kubernetes manifests and Pulumi IaC
    ├── local/         # Docker Compose for local development
    ├── k8s/           # Kubernetes deployments
    └── pulumi/        # Infrastructure as Code
```

**Tech Stack:**

- Frontend: React 18, Vite, TailwindCSS, React Flow
- Backend: Fastify, Temporal, PostgreSQL, Redis
- AI/ML: OpenAI SDK, Anthropic SDK, Google AI, Embeddings
- Infrastructure: GKE, Cloud SQL, Memorystore, GCS
- Deployment: Kubernetes, Pulumi, Docker

## Development

```bash
# Start local infrastructure
npm run docker:up

# Run migrations
npm run db:migrate

# Start dev servers (backend API + frontend)
npm run dev

# Start Temporal worker (in separate terminal)
npm run dev:worker

# Run type checking
npm run typecheck

# Run linting
npm run lint:fix

# Run tests
npm run test
```

See [CLAUDE.md](./CLAUDE.md) for detailed coding standards and development guidelines.

## Contributing

Contributions are welcome! Please read our development guidelines in [CLAUDE.md](./CLAUDE.md) before submitting pull requests.

### Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Setup secrets: `./infra/scripts/sync-secrets-local.sh`
4. Start infrastructure: `npm run docker:up`
5. Run migrations: `npm run db:migrate`
6. Start dev servers: `npm run dev`
7. Create a feature branch
8. Make your changes and add tests
9. Run `npm run typecheck` and `npm run lint:fix`
10. Submit a pull request

## Support

- **Documentation**: [.docs/](./.docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/flowmaestro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/flowmaestro/discussions)

## License

MIT

---

Built with ❤️ by the FlowMaestro Team
