# FlowMaestro System Context

Based on a read of the code at commit `7a063de7` on 2026-09-20. This is a starter document. It is
expected to be corrected and extended as the code changes.

## Purpose and method

This document describes how FlowMaestro works end to end. It is based on the code and not on the
existing documents in `.docs`, several of which have drifted from the code (see "Documentation
drift" below).

We split the repository into seven areas (workflow engine, variable system, agent framework,
integrations, product surfaces, frontend, platform), traced each one in the code, and combined the
results here. Most statements come from reading code. A small number were confirmed by running the
real functions in a throwaway script, and those are marked as such. Nothing was tested against live
external services, so claims about provider behavior are inferences from the code and the
provider's documented API.

## What the product is

FlowMaestro runs two kinds of automation on Temporal. Deterministic workflows are graphs of nodes
built on a canvas. Agents are LLM loops that call tools. Both share the integration providers (156
at the time of writing) and the knowledge bases, and both are exposed through chat and form
interfaces, a public API with SDKs and a CLI, an embeddable widget, and a Chrome extension. All of
it sits on a workspace-based platform with credit billing.

## Runtime shape

The Fastify API and the Temporal worker are built from the same image and started with different
commands. One worker polls a single task queue, `flowmaestro-orchestrator`. Storage is PostgreSQL
15 with pgvector, Redis, and four GCS buckets. Temporal is self-hosted on GKE Autopilot.

Live updates follow one path: a Temporal activity publishes to Redis pub/sub, an SSE route
subscribes and filters, and the browser reads it with `EventSource`. Socket.IO is no longer used,
and the only WebSocket is `/ws/voice`. Because `EventSource` cannot set headers, the JWT and the
workspace id are sent in the query string on SSE routes.

The frontend is React 18 with React Flow. Most server state is held in Zustand stores or in
page-local state, and TanStack Query appears in about 12 files. `frontend/src/lib/api.ts` is 7,604
lines, most of it repeated per-call boilerplate.

The backend is about 825k lines of TypeScript, of which about 402k is `backend/src/integrations`.
The frontend is about 158k lines and the shared package about 24k. There are 271 API route files,
45 repositories, 41 node handler files and 62 migrations.

## Deterministic workflows

### Definition and storage

A workflow definition has the shape
`{ name, nodes: Record<id, { type, name, config, position, onError? }>, edges, entryPoint, settings? }`
(`shared/src/types.ts:77-115`). Node `type` is a free string with no shared enum. The definition is
stored as JSONB in `workflows.definition`. There is no versions table, and the integer `version`
column is never incremented. `workflow_checkpoints` holds editor snapshots (gzip and base64, at
most 50 per workflow) and has nothing to do with execution state.

### Canvas

On the canvas, node data is a flat object (`{ label, ...config, onError }`). It is split into
`name`, `config` and `onError` only when saving, in `frontend/src/lib/workflowTransformers.ts`.
Saving is manual, and there is no autosave. The canvas uses `ConnectionMode.Loose` with no
`isValidConnection`, so any handle can connect to any handle, and structural problems are reported
afterwards by the shared validation engine. Node configuration panels are 39 hand-written
components. The integration panel is the one exception, since it renders fields from operation
metadata returned by the backend.

### Starting an execution

Every entry point (the Run button, triggers, API v1, form interfaces, agent tools, the browser
extension) starts `orchestratorWorkflow` with the full definition and a plain `inputs` object. The
Temporal workflow id is `execution-<uuid>`. Schedules and webhooks start `triggeredWorkflow`, which
calls the orchestrator as a plain function inside the same Temporal run.

The Run button on the canvas finds or creates a hidden manual trigger named `__run_button__` and
executes it. The backend loads the saved definition, so Run always executes the last saved version.

### The engine

`buildWorkflow` runs inside the workflow sandbox as pure code
(`backend/src/temporal/activities/execution/builder.ts`). Scheduling is a ready-queue, not a
topological sort. Each wave takes up to `maxConcurrentNodes` (default 10) ready nodes and runs them
with `Promise.all`, so the successors of a fast node wait for the slowest node in the same wave.

The orchestrator evaluates `input` and `conditional` nodes inline, which means their registered
handlers are never used. Every other node goes through one `executeNode` activity with a 10 minute
timeout and 3 attempts. The activity looks the handler up in a priority-ordered registry where the
first match wins. The last entry, `GenericNodeHandler`, accepts any node type and reports success.

A failed node does not stop the run. Other branches continue, and the result is `success: false`
if any node failed. The orchestrator does not read `onError`, `settings.timeout` or
`settings.enableCache`, and there are no error edges, no child workflows and no continue-as-new in
this workflow.

### State and events

Only the `executions` row is persisted (status, inputs, outputs, error, pause context). Per-node
status, outputs and logs exist only in Redis events and in Temporal history. Events are published
to global channels named `workflow:events:<type>`, and the SSE route filters them by execution id.

### AI generation

There are three paths. A one-shot prompt produces a JSON definition that replaces the canvas. A
separate chat flow outside the builder streams a `workflowPlan` and creates a new workflow from it.
An in-canvas chat proposes node additions, changes and removals that the user applies or rejects.

## Variable system

### Context

The orchestrator keeps a copy-on-write snapshot with node outputs, workflow variables and inputs
(`backend/src/temporal/core/services/context.ts`). The snapshot never crosses the activity
boundary. Before each activity call, `getExecutionContext` flattens it into one plain object: it
spreads the inputs, overlays the workflow variables, and then adds each node's output under its
node id. Each top-level key of an output is also copied to the root, and the first node to write a
key keeps it.

### Output naming

A handler returns `{ [outputVariable]: result }` when `outputVariable` is set and the raw result
otherwise. Given a node `n1` with `outputVariable: "summary"`, the value is reachable as
`{{summary.text}}` or `{{n1.summary.text}}`, but not as `{{n1.text}}`. Keys are node ids, never
node names.

### Interpolation

Production code uses `interpolateVariables` in `backend/src/temporal/core/utils.ts`. It resolves
`{{path}}` with dot and bracket access and always returns a string. A missing value leaves the
literal `{{...}}` in the text. There are no expressions and no fallback operator. Only the `output`
and `templateOutput` nodes preserve objects, through `interpolateWithObjectSupport`. Each handler
interpolates specific string fields by hand, and there is no generic pass over node config.

A second engine exists in `context.ts` (`resolveVariable`, `interpolateString`). It supports
expressions and the `loop.`, `parallel.` and `shared.` namespaces, it is documented in
`.docs/variable-interpolation.md`, and it is well tested. Nothing in production calls it.

The `conditional` node uses a third, inline interpolator with no bracket support, and the transform
node uses a `${path}` syntax. There are four separate condition evaluators with different
semantics.

### Data handoff

There is no input or output mapping layer. Trigger payloads, form submissions and agent tool
arguments become `inputs` directly, and `result.outputs` is returned as is. The final output is
assembled from all `output` nodes plus every node with no dependents.

## Agent framework

### Data model

An agent row holds `model`, `provider`, `connection_id`, `system_prompt`, `available_tools`,
`memory_config` and `safety_config`. Each tool has one of six types: `workflow`, `function`,
`knowledge_base`, `agent`, `mcp` or `builtin`. One thread has many executions, and one execution is
one Temporal run for one user message.

### Run loop

`agentOrchestratorWorkflow` (`backend/src/temporal/workflows/agent-orchestrator.ts`) reserves 120
credits, builds the message list from the system prompt, the working memory and the user message,
and then iterates `callLLM`. Tool calls run one at a time, even when the model returns several. A
tool that fails is withheld from the model for the rest of the run. Continue-as-new happens every
50 iterations, and the default cap is 100 iterations.

### LLM layer

Agents do not use `backend/src/core/ai.ts`. They use hand-written streaming `fetch` clients for
OpenAI, Anthropic, Google, Cohere and HuggingFace in
`backend/src/temporal/activities/agents/core.ts`. The internal `@flowmaestro/ai-sdk` has no `tools`
field on its request type, so only workflow nodes and builtin tools use it. xAI can be selected for
an agent but has no client.

### Tools

A workflow used as a tool starts `orchestratorWorkflow` with the model's arguments as inputs. The
builder saves workflow tools with an empty schema, so the model is told nothing about the inputs.
"MCP" tools are in-process adapters over provider operations, named `<provider>_<operationId>`, and
they do not use the MCP wire protocol. There are 15 builtin tools, including web search and code
execution.

### Memory

Working memory is one free-text blob per agent and user, injected into the system prompt at the
start of a run. Semantic recall over earlier threads happens only when the model decides to call
`search_thread_memory`. Nothing is retrieved automatically.

### Personas

A persona is a fork of the agent loop for background tasks. It adds a clarification phase, tool
approvals based on an autonomy level, deliverables, and credit and duration limits. The model
controls the run through fenced `workflow-signal` JSON blocks in its output.

### Relation to workflows

Workflows have no agent node. The relation runs one way, with agents calling workflows as tools.

## Integrations

### Providers

Each provider has a provider class, a client, operations defined with Zod schemas, and a
`fixtures.ts`. Of the 156 providers, 95 use OAuth2, 60 use an API key and 1 uses OAuth1. JSON
Schema is derived from the Zod schemas on demand and is not stored. Providers load lazily, but the
provider list endpoints import all 156 modules on the first call.

### Execution paths

Workflow nodes go through `ExecutionRouter.execute()`, which runs a sandbox check and then
`provider.executeOperation()` with Zod validation. Agents call `executeMCPTool()` directly, which
skips the sandbox check. The MCP branch inside `execute()` is never reached.

### Connections

The whole credential object is encrypted with AES-256-GCM. Connection methods are `oauth2`,
`oauth1`, `api_key`, `basic_auth` and `custom`. OAuth configuration lives in `OAUTH_PROVIDERS`
(`backend/src/services/oauth/OAuthProviderRegistry.ts`). Each provider's own `getAuthConfig()` is
never read, so scopes and URLs are defined twice. Deleting a connection is a hard delete.

### Triggers

Schedules are Temporal schedules named `trigger-<triggerId>` that start `triggeredWorkflow`.
Generic webhooks and provider webhooks pass their payload in as workflow inputs. There is no
automatic webhook registration with providers and no polling worker.

### Sandbox

A test connection is an `api_key` connection with a fake key and `metadata.isTestConnection: true`.
For such connections the router answers from fixtures and does not call the provider.

## Product surfaces

### Knowledge bases

An upload is written to GCS, and `processDocumentWorkflow` then extracts, chunks and embeds the
text. Chunks are 1,000 characters with 200 characters of overlap, packed by sentence. Embeddings
use `text-embedding-3-small` and are stored in `vector(1536)` columns with HNSW indexes. Search is
cosine similarity. The workflow node hardcodes the top 5 results at a 0.7 threshold, while the
agent tool uses the top 10 at 0.3.

### Chat interfaces

A public slug binds to one agent. Visitors get anonymous sessions with Redis-based rate limits,
and replies stream over the thread channel. The widget is an iframe that points at `/embed/:slug`.

### Form interfaces

A form has a fixed shape of message, files and URLs, and it has no field schema. A submission
starts a workflow or an agent, and the result is returned to the submitter over SSE.

### Public API v1

The API uses `fm_live_` keys with 14 scopes and Redis rate limits. It covers workflows,
executions, agents, threads, triggers, knowledge bases and webhooks. There are JavaScript and
Python SDKs and a CLI.

### Code sandbox

Code runs in Docker containers that are read-only, have no network by default, and have all
capabilities dropped. The workflow code node and the agent `code_execute` tool both use it.

## Platform

### Tenancy

Resources are scoped by `workspace_id`, with `user_id` kept as the creator. `CLAUDE.md` still
describes `user_id` scoping. Tenancy is enforced only in application code, since `workspace_id` is
nullable with no foreign key on twelve tables. Several paths still check `user_id`, including the
workflow, knowledge base and MCP tools used by agents and most knowledge base routes, so those
paths fail for other members of the same workspace.

### Schema

There are 62 migrations under `backend/migrations`, run by node-pg-migrate, and about 56 live
tables. Enumerations are `VARCHAR` columns with `CHECK` constraints. The two files under
`backend/src/storage/migrations` are never run, so `workflow_snapshots` and the extra
`execution_logs` columns that some code writes to do not exist.

### Credits

A workflow run estimates its cost, reserves that amount, accumulates per-node and LLM costs during
the run, and finalizes at the end. Plans are free (250 credits), pro (5,000) and team (25,000).

### Configuration

Configuration is a plain `process.env.X || default` object with no schema validation. The variable
names in use are `BACKEND_PORT`, `POSTGRES_*` and `REDIS_HOST`/`REDIS_PORT`, not the `PORT`,
`DATABASE_URL` and `REDIS_URL` that `CLAUDE.md` lists. `DATABASE_URL` is used only by the migration
CLI.

## Known gaps between design and behavior

These are functional gaps. Security findings are handled separately (see the next section).

### Confirmed by running the code

- A loop with a body ends in "Execution deadlock". The orchestrator never increments the loop
  index or calls `resetNodesForIteration`, and the builder wiring forms a cycle from loop start,
  through the body, to loop end and back.
- A join can deadlock. For a node that depends on two others, if one completes and the other then
  fails or is skipped, the join stays pending. The outcome depends on the order in which results
  arrive.
- Pre-run validation rejects `{{nodeId.field}}` as undefined, although that is what the variable
  picker inserts when no `outputVariable` is set and it resolves at runtime.

### Checked in the code, not run

- Earlier turns in a thread never reach the model. On a first run the workflow starts with an
  empty message list (`agent-orchestrator.ts:321-343`), and nothing reads
  `agent_executions.thread_history`.
- The Anthropic stream parser reads `delta.text` for `input_json_delta` events (`core.ts:1405-1409`).
  The Anthropic API sends that content in `partial_json`, so tool call input would stay empty and
  the call would be discarded. We have not run this against the live API.

### From reading only

Workflows:

- The switch node returns only `selectedRoute`, which the orchestrator ignores, so every case
  branch runs. The router sends route values as `branchesToSkip`, and the orchestrator treats them
  as node ids, so nothing is skipped.
- Human review cannot resume through the API. `executions/cancel.ts` and `submit-response.ts` look
  the workflow up by the bare execution id, while workflows are started as `execution-<id>`.
- The `integration`, `action`, `database` and `knowledgeBaseQuery` handlers never interpolate their
  parameters, so a templated value is sent as the literal string.
- Shared memory does not persist between nodes. Each activity gets a fresh, empty shared memory,
  and `_sharedMemoryUpdates` is never merged.
- `imageGeneration` and `videoGeneration` handlers are not registered, so those nodes fall through
  to `GenericNodeHandler` and report success without doing anything.
- The Run button always sends `{ userInput: "Hello" }`. There is no inputs dialog, it does not save
  first, and it does not warn about unsaved changes.
- The human-review UI is unreachable on the frontend. The pause context from the SSE event is
  dropped, and the stream closes when the status becomes `paused`.
- The in-canvas AI chat writes a nested `config` object, while the rest of the canvas expects flat
  node data.
- `wait` sleeps inside the activity, so a wait longer than 10 minutes times out and retries.

Integrations:

- Integration and action nodes never fail. Provider errors are returned as a successful node that
  carries `success: false`, so Temporal retries and workflow failure never apply.
- Token refresh runs only in a scheduler inside the API process. Providers cache a client per
  connection with the access token from construction time, and `clearClient` has no callers, so a
  long-lived worker keeps a stale token.
- `loadAllFixtures()` is called only from the sandbox API routes, so a workflow node on a test
  connection in the worker returns "No sandbox data found".
- Eleven providers advertised as OAuth2 have no OAuth configuration, so connecting them returns
  400: asana, azure-devops, bill-com, cal-com, google-cloud, intercom, mailchimp, monday, ramp,
  sap-successfactors and zoho-crm.
- OAuth state and PKCE verifiers are kept in an in-process `Map`, so a callback fails with more
  than one API replica or after a restart mid-flow.

Agents:

- The builder chat's SSE route subscribes to channel names that the backend never publishes, so
  tool-call events do not reach it.
- `agent_executions.status` is never set to `failed`, so failed runs stay `running`.
- `safety_config` is never written by application code, so every agent runs on the column default.

Product surfaces:

- The outgoing webhook dispatch helpers have no callers, so no events are sent.
- The v1 execution events endpoint subscribes to a channel that nothing publishes. Both SDKs stream
  from a thread events route that does not exist, and `stream: true` is rejected.
- CLI authentication does not match v1. Device-flow JWTs are ignored by the API key middleware, and
  API keys are sent without the `Bearer` prefix.
- Nothing schedules `syncSchedulerWorkflow`, so periodic knowledge base sync does not run.
- The knowledge base settings UI offers embedding models whose dimensions do not fit the
  `vector(1536)` columns.
- Per-session retrieval over chat attachments has no consumer. Chunks are stored, but the agent
  only receives a text list of file names and URLs.

Platform:

- `NODE_COSTS` is keyed in snake_case while node types are camelCase, so most nodes are charged the
  default of 5 credits, including nodes priced at 0.
- The 10% shortfall allowance in `shouldAllowExecution` can never succeed, because `reserveCredits`
  then requires the full amount.
- Free plans never refill, and nothing acts on subscription expiry.
- The extension execute route and the knowledge base reprocess route use task queue names that no
  worker polls.

## Security findings

The review also found security issues in several areas. This repository is public, so the details
are kept out of version control until they are fixed. On the machine where the review was done
they are in `.docs/audits/private/security-findings.md`, in a folder that is excluded from
git locally.

## Documentation drift

- `CLAUDE.md` describes `user_id` tenancy, references `frontend/src/lib/websocket.ts` (which does
  not exist), lists env var names that are not used, and points tests at `backend/tests`.
- `.docs/variable-interpolation.md` describes the interpolation engine that production does not
  call.
- `.docs/websocket-events.md` and `.docs/workflow-system.md` describe Socket.IO updates.
- `.docs/temporal-workflows.md` cites files that do not exist and describes a topological sort.
- `.docs/agent-architecture.md` describes memory strategies and an `agent_memory_summaries` table
  that do not exist.
- `.docs/integrations-system.md` lists core files that do not exist and sizes the system at about
  50 providers.
- `.docs/public-api.md` documents streaming as available.

## Detailed reports

Seven per-area reports with file and line references back this document: workflow engine,
variable system, agent framework, integrations, product surfaces, frontend and platform. They
include the security details, so they are kept with the security findings under
`.docs/audits/private/reports/` and are not checked in.

## Plans

Follow-up studies written from this review are kept under `.docs/audits/private/plans/`.
They are not checked in either, because they name unpatched gaps with file and line references.

- `08-infra-migration.md` is the hosting cost study and the plan for moving off GKE to a single
  small host.
- `09-execution-engine-plan.md` is the phased plan for closing the workflow engine gaps.
  `engine-scripts/` next to it holds the throwaway scripts that reproduced the loop and join
  deadlocks, which the plan's first phase turns into tests.
- `10-integrations-plan.md` is the phased plan for the integration layer: one connection access
  path, token refresh, webhook verification, trigger lifecycle and the provider manifest.
  `integration-scripts/` holds the scripts that produced its measurements, including the drift
  check the plan's first item ports into CI.
- `11-local-setup.md` is the verified guide for running the api, the worker and the frontend
  locally, the test baseline, and the plan for running the whole stack in Docker. `local-setup/`
  holds the proposed compose files, the smoke test and the script that creates a local login. Local
  ports moved to the 84xx block afterwards; `infra/local/README.md` has the current numbers.
- `12-gcp-cheaper-options.md` is the GCP-only cost study, based on a live read-only inspection of
  the production project, with the revised cost attribution and the tuned-Autopilot, GKE Standard,
  Compute Engine, Cloud Run and startup-credit options. `gcp-scripts/` holds the Cloud Monitoring
  query scripts it used.
