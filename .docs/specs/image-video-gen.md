# Image & Video Generation Nodes

This document provides a complete overview of Image and Video generation capabilities in FlowMaestro, including supported providers, configuration options, backend implementation, and UI display patterns.

---

## Overview

FlowMaestro provides two AI node types for media generation:

| Node      | Type ID           | Category | Purpose                          |
| --------- | ----------------- | -------- | -------------------------------- |
| **Image** | `imageGeneration` | AI & ML  | Generate and edit images with AI |
| **Video** | `videoGeneration` | AI & ML  | Generate videos with AI          |

Both nodes appear in the workflow editor sidebar under **AI & ML**, positioned after the Vision node.

### How It Works

1. **Workflow Design**: Users drag Image or Video nodes onto the canvas and configure them with a provider, model, and prompt
2. **Execution**: When the workflow runs, Temporal workers call the appropriate provider API
3. **Result Storage**: Generated media URLs/data are stored in the workflow execution context
4. **Display**: The frontend detects media in the output JSON and renders inline previews

### Use Cases

- **Marketing Automation**: Generate product images, social media graphics, promotional videos
- **Content Creation**: Create illustrations, thumbnails, video clips from text descriptions
- **Image Processing**: Upscale images, remove backgrounds, apply style transfers
- **Prototyping**: Quickly generate visual mockups and concept art

---

## Supported Providers

Providers are external AI services that perform the actual image/video generation. Each provider offers different models with varying capabilities, quality levels, and pricing. Users can connect to providers either through:

1. **Workspace Connections**: OAuth or API key stored in FlowMaestro (recommended for teams)
2. **Environment Variables**: API keys configured at the server level (for self-hosted deployments)

### Image Generation

| Provider         | Provider ID   | Models                                                          | Operations                                                     |
| ---------------- | ------------- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| **OpenAI**       | `openai`      | DALL-E 3, DALL-E 2                                              | Generate                                                       |
| **Replicate**    | `replicate`   | Flux Pro, Flux Dev, Flux Schnell, SDXL                          | Generate                                                       |
| **Stability AI** | `stabilityai` | SD3 Large, SD3 Medium, SDXL, Ultra, Core                        | Generate, Inpaint, Upscale, Background Removal                 |
| **FAL.ai**       | `fal`         | Flux 1.1 Pro Ultra, Flux Pro, Flux Dev, Recraft V3, Ideogram V2 | Generate, Inpaint, Upscale, Background Removal, Style Transfer |

### Video Generation

| Provider         | Provider ID   | Models                                  | Features                      |
| ---------------- | ------------- | --------------------------------------- | ----------------------------- |
| **Google**       | `google`      | Veo 3, Veo 3 Fast, Veo 2                | Text-to-video, Image-to-video |
| **Replicate**    | `replicate`   | Wan 2.5, MiniMax                        | Text-to-video, Image-to-video |
| **Runway**       | `runway`      | Gen-3 Alpha, Gen-3 Alpha Turbo          | Text-to-video, Image-to-video |
| **Luma AI**      | `luma`        | Dream Machine (Ray2)                    | Text-to-video, Image-to-video |
| **Stability AI** | `stabilityai` | Stable Video Diffusion                  | Image-to-video only           |
| **FAL.ai**       | `fal`         | Kling v2, MiniMax, Mochi, Luma, Hunyuan | Text-to-video, Image-to-video |

---

## Node Configuration

Node configuration defines what the Image or Video node will do when executed. Configuration is set in the right-hand panel when a node is selected in the workflow editor.

**Key Concepts:**

- **Provider & Model**: Which AI service and specific model to use
- **Connection**: Links to a stored API key (optional - falls back to environment variables)
- **Prompt**: The text description of what to generate (supports `{{variable}}` interpolation)
- **Output Variable**: Where to store the result in the workflow context for downstream nodes

### Image Node Configuration

```typescript
interface ImageGenerationNodeConfig {
    // Provider & Model
    provider: "openai" | "replicate" | "stabilityai" | "fal";
    model: string;
    connectionId?: string;

    // Prompt
    prompt: string;
    negativePrompt?: string;

    // Output Settings
    size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792";
    aspectRatio?: "1:1" | "16:9" | "9:16" | "21:9" | "4:3" | "3:2";
    quality?: "standard" | "hd";
    style?: "vivid" | "natural";
    n?: number; // Number of images
    outputFormat?: "url" | "base64";
    outputVariable?: string;

    // Editing Operations (optional)
    operation?:
        | "generate"
        | "inpaint"
        | "outpaint"
        | "upscale"
        | "removeBackground"
        | "styleTransfer";
    sourceImage?: string; // URL or base64 for editing
    mask?: string; // Mask for inpaint/outpaint
    styleReference?: string; // Reference for style transfer
    scaleFactor?: 2 | 4; // Upscale factor
}
```

### Video Node Configuration

```typescript
interface VideoGenerationNodeConfig {
    // Provider & Model
    provider: "google" | "replicate" | "runway" | "luma" | "stabilityai" | "fal";
    model: string;
    connectionId?: string;

    // Content
    prompt: string;
    imageInput?: string; // For image-to-video

    // Output Settings
    duration?: number; // Seconds (typically 4-10)
    aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "21:9";
    loop?: boolean;
    outputFormat?: "url" | "base64";
    outputVariable?: string;
}
```

---

## Image Editing Operations

Beyond generating new images from text prompts, the Image node supports editing existing images. This enables powerful workflows where images can be modified, enhanced, or transformed as they flow through the system.

**How Editing Works:**

1. A source image is provided (URL or base64 from a previous node, file upload, or external source)
2. The operation type determines what transformation to apply
3. Some operations require additional inputs (masks for inpainting, reference images for style transfer)
4. The result replaces or augments the original image

The Image node supports editing operations beyond generation:

| Operation          | Description                   | Required Inputs                     | Supported Providers  |
| ------------------ | ----------------------------- | ----------------------------------- | -------------------- |
| `generate`         | Create new image from prompt  | prompt                              | All                  |
| `inpaint`          | Edit specific region of image | sourceImage, mask, prompt           | FAL.ai, Stability AI |
| `outpaint`         | Extend image beyond borders   | sourceImage, mask, prompt           | FAL.ai, Stability AI |
| `upscale`          | Increase image resolution     | sourceImage, scaleFactor            | FAL.ai, Stability AI |
| `removeBackground` | Remove image background       | sourceImage                         | FAL.ai, Stability AI |
| `styleTransfer`    | Apply style from reference    | sourceImage, styleReference, prompt | FAL.ai               |

---

## Output Format

When a media generation node completes, it produces a standardized JSON output structure. This consistent format allows downstream nodes and the UI to reliably extract and display the generated media.

**Output Storage:**

- If `outputVariable` is set, the result is stored at that key in the workflow context (e.g., `context.generatedImage`)
- If not set, the raw result object is returned directly
- Downstream nodes can reference the output using variable interpolation: `{{generatedImage.images[0].url}}`

**Media Delivery:**

- **URL**: Most providers return a temporary URL (typically valid for 1-24 hours)
- **Base64**: Some providers return the image data directly encoded as base64
- The frontend's `MediaOutput` component handles both formats automatically

### Image Generation Output

```json
{
    "provider": "fal",
    "model": "fal-ai/flux-pro",
    "images": [
        {
            "url": "https://fal.media/files/...",
            "base64": null,
            "revisedPrompt": "A cat astronaut floating in space..."
        }
    ],
    "metadata": {
        "processingTime": 2340,
        "seed": 12345
    }
}
```

### Video Generation Output

```json
{
    "provider": "runway",
    "model": "gen3a_turbo",
    "video": {
        "url": "https://runway.com/...",
        "base64": null
    },
    "metadata": {
        "processingTime": 45000,
        "taskId": "task_abc123",
        "duration": 5
    }
}
```

---

## Backend Implementation

The backend handles the actual API calls to AI providers. This runs inside Temporal activity workers, which provide automatic retries, timeouts, and failure handling.

**Execution Architecture:**

1. **Workflow Orchestration**: Temporal workflows coordinate node execution order
2. **Activity Workers**: Stateless workers that execute individual node handlers
3. **Handler Pattern**: Each node type has a dedicated handler class that implements the execution logic
4. **Connection Resolution**: API keys are resolved from workspace connections first, then fall back to environment variables

**Provider API Patterns:**

- **Synchronous**: OpenAI, some FAL.ai models - request returns the result directly
- **Queue-based**: Runway, Luma, most video models - submit a job, poll for completion
- **Polling**: Workers poll async APIs with exponential backoff (5s initial, up to 30s, max 10 min total)

### File Locations

| File                                                                        | Purpose                       |
| --------------------------------------------------------------------------- | ----------------------------- |
| `backend/src/temporal/activities/execution/handlers/ai/image-generation.ts` | Image generation handler      |
| `backend/src/temporal/activities/execution/handlers/ai/video-generation.ts` | Video generation handler      |
| `backend/src/core/config/index.ts`                                          | API key configuration         |
| `shared/src/image-generation-models.ts`                                     | Image model definitions       |
| `shared/src/video-generation-models.ts`                                     | Video model definitions       |
| `shared/src/image-editing-capabilities.ts`                                  | Editing operation definitions |

### API Key Environment Variables

```bash
# Image Generation
OPENAI_API_KEY=sk-...
REPLICATE_API_KEY=r8_...
STABILITY_API_KEY=sk-...
FAL_API_KEY=...

# Video Generation (additional)
GOOGLE_API_KEY=...
RUNWAY_API_KEY=...
LUMA_API_KEY=...
```

### Execution Flow

```
1. Node receives config from workflow
2. Handler validates config and interpolates variables
3. API key retrieved from connection or environment
4. Provider-specific function called
5. For async APIs (video): Queue submitted, poll for completion
6. Result formatted as standard output JSON
7. Output stored in execution context
```

---

## Frontend Implementation

The frontend handles two aspects of media generation: **configuration** (setting up what the node should do) and **display** (showing the generated results).

**Configuration Flow:**

1. User selects an Image or Video node on the canvas
2. `NodeInspector` renders the appropriate config component (`ImageGenerationNodeConfig` or `VideoGenerationNodeConfig`)
3. Config component shows provider/model dropdowns, prompt input, and operation-specific fields
4. Changes are saved to the node's `data` property in the React Flow state

**Display Flow:**

1. After execution, the output JSON is available in the execution context
2. Various UI components (`NodeExecutionModal`, `AgentChat`, `PublicFormInterface`) receive this output
3. `MediaOutput` component scans the JSON for recognizable media patterns
4. `MediaPreview` renders each detected image/video with interactive controls

### File Locations

| File                                                               | Purpose                 |
| ------------------------------------------------------------------ | ----------------------- |
| `frontend/src/canvas/nodes/ImageGenerationNode.tsx`                | Node component          |
| `frontend/src/canvas/nodes/VideoGenerationNode.tsx`                | Node component          |
| `frontend/src/canvas/panels/configs/ImageGenerationNodeConfig.tsx` | Config panel            |
| `frontend/src/canvas/panels/configs/VideoGenerationNodeConfig.tsx` | Config panel            |
| `frontend/src/components/common/MediaPreview.tsx`                  | Media display component |
| `frontend/src/components/common/MediaOutput.tsx`                   | JSON media extraction   |

### Media Detection

The `MediaOutput` component extracts media from JSON output:

```typescript
// Detected patterns:
{
    images: [{ url: "..." }];
} // Image generation
{
    images: [{ base64: "..." }];
} // Base64 images
{
    video: {
        url: "...";
    }
} // Video generation
{
    video: {
        base64: "...";
    }
} // Base64 video
{
    url: "https://...image.png";
} // Direct media URL
```

---

## UI Display Patterns

Generated media appears in multiple places throughout FlowMaestro, depending on how the workflow was invoked. The `MediaOutput` and `MediaPreview` components ensure consistent display across all contexts.

**Display Contexts:**

| Context                  | When It's Used                                              | Component Location        |
| ------------------------ | ----------------------------------------------------------- | ------------------------- |
| **Node Execution Modal** | Clicking a completed node in the workflow editor            | `NodeExecutionModal.tsx`  |
| **Agent Chat**           | Agent uses a workflow tool that generates media             | `AgentChat.tsx`           |
| **Public Form**          | External user submits a form that triggers media generation | `PublicFormInterface.tsx` |
| **Chat Attachments**     | Bot message includes media files                            | `AssistantMessage.tsx`    |

**Common UI Elements:**

- **Inline Preview**: Scaled-down version of the media displayed in context
- **Hover Actions**: Buttons appear on hover for fullscreen, download, and external link
- **Fullscreen Modal**: Click to view media at full resolution
- **JSON Display**: Raw output shown below the preview (optional, for debugging)

Generated media is displayed across multiple execution contexts:

### 1. Node Execution Modal

When viewing execution results in the workflow editor:

```
+-----------------------------------------------------------+
|  Node Execution                                        X  |
+-----------------------------------------------------------+
|                                                           |
|  Node: Image                                              |
|  Status: * Completed (2.3s)                               |
|                                                           |
+-----------------------------------------------------------+
|  Output                                                   |
|  ------                                                   |
|                                                           |
|  +---------------------------------------------+          |
|  |                                             |          |
|  |                                             |          |
|  |            [Generated Image]                |          |
|  |               (1024x1024)                   |          |
|  |                                             |          |
|  |                                             |          |
|  |  +------+ +------+ +------+                 |          |
|  |  | Full | | Down | | Open |  (hover)        |          |
|  |  +------+ +------+ +------+                 |          |
|  +---------------------------------------------+          |
|                                                           |
|  {                                                        |
|    "provider": "fal",                                     |
|    "model": "fal-ai/flux-pro",                            |
|    "images": [                                            |
|      { "url": "https://fal.media/files/..." }             |
|    ]                                                      |
|  }                                                        |
|                                                           |
+-----------------------------------------------------------+

Legend: Full = Fullscreen, Down = Download, Open = Open External
```

### 2. Agent Chat (Tool Results)

When an agent runs a workflow that generates media:

```
+-----------------------------------------------------------+
|  Agent Chat                                               |
+-----------------------------------------------------------+
|                                                           |
|  +-----------------------------------------------------+  |
|  | [User] Generate an image of a sunset over mountains |  |
|  +-----------------------------------------------------+  |
|                                                           |
|  +-----------------------------------------------------+  |
|  | [Bot] I'll generate that image for you.             |  |
|  |                                                     |  |
|  | +------------------------------------------------+  |  |
|  | | [Tool] generate-image                          |  |  |
|  | |                                                |  |  |
|  | | +------------------------------------------+   |  |  |
|  | | |                                          |   |  |  |
|  | | |         [Sunset Mountains]               |   |  |  |
|  | | |            (max 300px)                   |   |  |  |
|  | | |  +------+ +------+ +------+              |   |  |  |
|  | | |  | Full | | Down | | Open |              |   |  |  |
|  | | |  +------+ +------+ +------+              |   |  |  |
|  | | +------------------------------------------+   |  |  |
|  | +------------------------------------------------+  |  |
|  |                                                     |  |
|  | Here's your sunset mountain image!                  |  |
|  +-----------------------------------------------------+  |
|                                                           |
+-----------------------------------------------------------+
```

### 3. Public Form Interface

When a public form workflow returns generated media:

```
+-----------------------------------------------------------+
|                                                           |
|                 AI Image Generator                        |
|                 ------------------                        |
|                                                           |
+-----------------------------------------------------------+
|                                                           |
|  Describe your image:                                     |
|  +---------------------------------------------------+    |
|  | A cyberpunk cityscape at night with neon lights   |    |
|  +---------------------------------------------------+    |
|                                                           |
|                               +----------------+          |
|                               |   > Generate   |          |
|                               +----------------+          |
|                                                           |
+-----------------------------------------------------------+
|  Output                                                   |
|  ------                                                   |
|                                                           |
|  +---------------------------------------------------+    |
|  |                                                   |    |
|  |                                                   |    |
|  |              [Cyberpunk City]                     |    |
|  |                                                   |    |
|  |                                                   |    |
|  |      +------+ +------+ +------+                   |    |
|  |      | Full | | Down | | Open |                   |    |
|  |      +------+ +------+ +------+                   |    |
|  +---------------------------------------------------+    |
|                                                           |
|  {                                                        |
|    "provider": "fal",                                     |
|    "model": "fal-ai/flux-pro",                            |
|    "images": [{ "url": "https://..." }]                   |
|  }                                                        |
|                                                           |
+-----------------------------------------------------------+
```

### 4. Chat Attachments (AssistantMessage)

When chat messages include media attachments:

```
+-----------------------------------------------------------+
|  Chat Interface                                           |
+-----------------------------------------------------------+
|                                                           |
|  +-----------------------------------------------------+  |
|  | [User] Can you show me the generated video?         |  |
|  +-----------------------------------------------------+  |
|                                                           |
|  +-----------------------------------------------------+  |
|  | [Bot] Here's the video I generated:                 |  |
|  |                                                     |  |
|  |  +-----------------------------------------------+  |  |
|  |  |                                               |  |  |
|  |  |            [Video Player]                     |  |  |
|  |  |              > / ||                           |  |  |
|  |  |          (max-height: 200px)                  |  |  |
|  |  |                                               |  |  |
|  |  |  +------+ +------+ +------+                   |  |  |
|  |  |  | Full | | Down | | Open |                   |  |  |
|  |  |  +------+ +------+ +------+                   |  |  |
|  |  +-----------------------------------------------+  |  |
|  |                                                     |  |
|  |  The video shows a smooth animation of...           |  |
|  +-----------------------------------------------------+  |
|                                                           |
+-----------------------------------------------------------+
```

### 5. Fullscreen Modal

When clicking the fullscreen button from any context:

```
+-----------------------------------------------------------------------+
|                                                                    X  |
|                                                                       |
|                                                                       |
|                                                                       |
|          +---------------------------------------------------+        |
|          |                                                   |        |
|          |                                                   |        |
|          |                                                   |        |
|          |            [Full Resolution Image]                |        |
|          |               or Video Player                     |        |
|          |                                                   |        |
|          |                                                   |        |
|          |                                                   |        |
|          +---------------------------------------------------+        |
|                                                                       |
|                        +----------+  +----------+                     |
|                        | Download |  |   Open   |                     |
|                        +----------+  +----------+                     |
|                                                                       |
+-----------------------------------------------------------------------+
```

---

## Component Architecture

The media display system uses a two-layer component architecture that separates **detection** from **rendering**:

**MediaOutput** (Detection Layer):

- Receives raw JSON output from workflow execution
- Recursively scans the object for known media patterns (`images`, `video`, `url`)
- Extracts all media items into a normalized list
- Decides whether to show JSON alongside the preview

**MediaPreview** (Rendering Layer):

- Receives a single media URL or data URI
- Auto-detects the media type (image vs video) from the URL extension or MIME type
- Handles base64 conversion for raw encoded data
- Renders the appropriate HTML element (`<img>` or `<video>`)
- Manages hover overlay state and fullscreen modal

This separation allows any component to easily display media by wrapping output in `<MediaOutput data={...} />`.

```
+-------------------------------------------------------------------+
|                        Execution Context                          |
|  (NodeExecutionModal, AgentChat, PublicForm, AssistantMessage)    |
+-------------------------------------------------------------------+
                                |
                                v
+-------------------------------------------------------------------+
|                         MediaOutput                               |
|  - Receives raw JSON output from workflow execution               |
|  - Detects media patterns (images array, video object, URLs)      |
|  - Extracts all media items                                       |
|  - Renders MediaPreview for each + optional JSON display          |
+-------------------------------------------------------------------+
                                |
                                v
+-------------------------------------------------------------------+
|                        MediaPreview                               |
|  - Auto-detects media type from URL/data URI                      |
|  - Converts raw base64 to data URLs                               |
|  - Renders <img> or <video> element                               |
|  - Shows hover overlay with action buttons                        |
|  - Manages fullscreen modal state                                 |
+-------------------------------------------------------------------+
                                |
                    +-----------+-----------+
                    v                       v
            +-------------+         +-------------+
            |   <img>     |         |  <video>    |
            |  element    |         |  element    |
            +-------------+         +-------------+
```

---

## Data Flow

This diagram shows the complete journey of a media generation request from user configuration to rendered output.

**Stage 1: Configuration (Frontend)**

- User configures node in the workflow editor
- Settings stored in React Flow node state
- Workflow saved to database

**Stage 2: Execution (Backend)**

- Workflow triggered (manual run, schedule, webhook, or agent)
- Temporal orchestrates node execution order
- Image/Video handler calls provider API
- For async providers: job queued, worker polls until complete

**Stage 3: Storage**

- Provider returns media URL or base64 data
- Result stored in workflow execution context
- Execution status updated to "completed"

**Stage 4: Display (Frontend)**

- UI component receives execution output
- MediaOutput extracts media from JSON
- MediaPreview renders inline preview
- User can view fullscreen, download, or open externally

```
+-----------------+     +------------------+     +-----------------+
|  Node Config    |---->|  Temporal Worker |---->|   Provider API  |
|  (Frontend)     |     |  (Backend)       |     |  (FAL/OpenAI)   |
+-----------------+     +------------------+     +-----------------+
                                |
                                v
                        +------------------+
                        |  Output JSON     |
                        |  { images: [...] |
                        |    video: {...}  |
                        +------------------+
                                |
        +-----------------------+-----------------------+
        v                       v                       v
+---------------+     +-----------------+     +-----------------+
| Execution     |     | Agent Chat      |     | Public Form     |
| Modal         |     |                 |     | Interface       |
+---------------+     +-----------------+     +-----------------+
        |                       |                       |
        +-----------------------+-----------------------+
                                v
                        +------------------+
                        |  MediaOutput     |
                        |  (extracts media)|
                        +------------------+
                                |
                                v
                        +------------------+
                        |  MediaPreview    |
                        |  (renders media) |
                        +------------------+
```

---

## Adding New Providers

This section documents the steps required to integrate a new AI provider for image or video generation. The process involves changes to both shared type definitions and backend implementation.

**Before You Start:**

1. Review the provider's API documentation
2. Understand whether the API is synchronous or queue-based
3. Identify the authentication method (API key, OAuth, etc.)
4. Document the available models and their capabilities

**Checklist:**

- [ ] Add provider to `shared/src/providers.ts`
- [ ] Add models to `shared/src/image-generation-models.ts` or `video-generation-models.ts`
- [ ] Add API key config to `backend/src/core/config/index.ts`
- [ ] Implement handler function in the appropriate handler file
- [ ] Add provider case to the executor switch statement
- [ ] Update TypeScript union types
- [ ] Test with actual API credentials

To add a new image/video generation provider:

### 1. Add Provider Definition

```typescript
// shared/src/providers.ts

// Add to PROVIDER_LOGO_DOMAINS
export const PROVIDER_LOGO_DOMAINS: Record<string, string> = {
    // ...
    newprovider: "newprovider.com"
};

// Add to ALL_PROVIDERS array
{
    provider: "newprovider",
    displayName: "New Provider",
    description: "Description of capabilities",
    logoUrl: getBrandLogo("newprovider.com"),
    category: "AI & ML",
    methods: ["api_key"]
}
```

### 2. Add Models

```typescript
// shared/src/image-generation-models.ts or video-generation-models.ts

export const IMAGE_GENERATION_MODELS_BY_PROVIDER = {
    // ...
    newprovider: [{ value: "model-id", label: "Model Name", description: "..." }]
};
```

### 3. Add Backend Config

```typescript
// backend/src/core/config/index.ts

ai: {
    // ...
    newprovider: {
        apiKey: process.env.NEWPROVIDER_API_KEY || "";
    }
}
```

### 4. Implement Handler

```typescript
// backend/src/temporal/activities/execution/handlers/ai/image-generation.ts

async function executeNewProviderGeneration(
    config: ImageGenerationNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const apiKey = await getProviderApiKey("newprovider", config.connectionId);
    // Implementation...
}

// Add to switch statement in executeImageGenerationNode
case "newprovider":
    result = await executeNewProviderGeneration(config, context);
    break;
```

### 5. Update Type Definitions

```typescript
// Update provider union types
provider: "openai" | "replicate" | "stabilityai" | "fal" | "newprovider";
```

---

## Related Documentation

- [Architecture Overview](../architecture.md)
- [Node Types](./node-types.md)
- [Temporal Workflows](./temporal-workflows.md)
