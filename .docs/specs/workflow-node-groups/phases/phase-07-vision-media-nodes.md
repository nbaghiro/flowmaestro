# Phase 07: Vision & Media Nodes

## Overview

Implement 3 vision/media AI nodes: Generate Image, Analyze Image, and Analyze Video.

---

## Prerequisites

- **Phase 05**: Core AI nodes (provider patterns)

---

## Existing Infrastructure

### Vision Executor Already Exists

**File**: `backend/src/temporal/activities/node-executors/vision-executor.ts`

```typescript
// Vision executor exists - extend it for new nodes
export async function executeVisionNode(
    config: VisionNodeConfig,
    context: JsonObject
): Promise<VisionNodeResult>;
```

### Audio/Media Executor

**File**: `backend/src/temporal/activities/node-executors/audio-executor.ts`

```typescript
// Audio executor exists - similar pattern for video
export async function executeAudioNode(
    config: AudioNodeConfig,
    context: JsonObject
): Promise<AudioNodeResult>;
```

### Image Generation with OpenAI

```typescript
import OpenAI from "openai";

// DALL-E 3 image generation
const openai = new OpenAI({ apiKey });
const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: config.prompt,
    size: config.size,
    quality: config.quality,
    n: 1
});
```

### Vision Analysis with GPT-4V

```typescript
// GPT-4 Vision for image analysis
const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
        {
            role: "user",
            content: [
                { type: "text", text: config.analysisPrompt },
                { type: "image_url", image_url: { url: imageUrl } }
            ]
        }
    ]
});
```

---

## Nodes (3)

| Node               | Description                 | Category        |
| ------------------ | --------------------------- | --------------- |
| **Generate Image** | Create images from text     | ai/vision-media |
| **Analyze Image**  | Describe image content      | ai/vision-media |
| **Analyze Video**  | Extract frames and describe | ai/vision-media |

---

## Node Specifications

### Generate Image Node

**Purpose**: Create images from text prompts

**Config**:

- Provider: DALL-E / Midjourney / Stable Diffusion
- Size: 256x256 / 512x512 / 1024x1024
- Style: natural / vivid / artistic
- Number of images
- Negative prompt (optional)

**Inputs**: `prompt` (string), `style` (optional)
**Outputs**: `images` (array of URLs), `revisedPrompt` (string)

### Analyze Image Node

**Purpose**: Describe and analyze image content

**Config**:

- Analysis type: description / OCR / objects / faces / custom
- Detail level: low / high
- Custom prompt (for specific analysis)
- Output format: text / JSON

**Inputs**: `image` (URL/base64/file)
**Outputs**: `description` (string), `objects` (array), `text` (string if OCR)

### Analyze Video Node

**Purpose**: Process video content with AI

**Config**:

- Extraction mode: key frames / interval / all frames
- Frame interval (seconds)
- Analysis per frame: description / objects / action
- Aggregate summary

**Inputs**: `video` (URL/file)
**Outputs**: `frames` (array), `summary` (string), `transcript` (string if audio)

---

## Unit Tests

### Test Pattern

**Pattern B (Mock LLM)**: Mock vision/image generation APIs with canned responses.

### Files to Create

| Executor      | Test File                                                              | Pattern |
| ------------- | ---------------------------------------------------------------------- | ------- |
| GenerateImage | `backend/tests/unit/node-executors/ai/generate-image-executor.test.ts` | B       |
| AnalyzeImage  | `backend/tests/unit/node-executors/ai/analyze-image-executor.test.ts`  | B       |
| AnalyzeVideo  | `backend/tests/unit/node-executors/ai/analyze-video-executor.test.ts`  | B       |

### Test Fixtures Required

```
backend/tests/fixtures/data/
├── sample-image.png
├── sample-photo.jpg
└── sample-video.mp4
```

### Required Test Cases

#### generate-image-executor.test.ts

- `should generate image from text prompt`
- `should respect size configuration`
- `should return image URL or base64`
- `should handle style/quality settings`
- `should validate prompt length`

#### analyze-image-executor.test.ts

- `should describe image contents`
- `should extract objects and labels`
- `should detect text in image (OCR)`
- `should analyze image from URL`
- `should analyze image from base64`
- `should return confidence scores`

#### analyze-video-executor.test.ts

- `should extract frames at interval`
- `should generate frame descriptions`
- `should create aggregate summary`
- `should extract audio transcript`
- `should handle various video formats`

---

## Test Workflow: Content Moderation

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   Input     │───▶│   Analyze    │───▶│   Scorer    │───▶│   Router    │
│ (image)     │    │   Image      │    │ (safety)    │    │ (approve?)  │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
```

**Test**: Upload user-generated image
**Expected**: Image analyzed for safety, scored, routed appropriately

---

## Files to Create

### Frontend Components

```
frontend/src/canvas/nodes/ai/vision-media/
├── GenerateImageNode.tsx
├── AnalyzeImageNode.tsx
├── AnalyzeVideoNode.tsx
├── config/
│   ├── GenerateImageNodeConfig.tsx
│   ├── AnalyzeImageNodeConfig.tsx
│   └── AnalyzeVideoNodeConfig.tsx
└── index.ts
```

### Backend Executors

```
backend/src/temporal/activities/node-executors/ai/
├── generate-image-executor.ts
├── analyze-image-executor.ts
└── analyze-video-executor.ts
```

---

## How to Deliver

1. Register all 3 nodes in `node-registry.ts`
2. Create frontend node components
3. Create config forms with image/video preview
4. Integrate DALL-E API for image generation
5. Integrate GPT-4V / Claude Vision for analysis
6. Implement video frame extraction (ffmpeg)
7. Test with various media types

---

## How to Test

| Test                 | Expected Result           |
| -------------------- | ------------------------- |
| Generate with DALL-E | Image URL returned        |
| Analyze photo        | Description generated     |
| Analyze with OCR     | Text extracted from image |
| Analyze video 10s    | Key frames extracted      |
| Invalid image format | Clear error message       |

### Integration Tests

```typescript
describe("Generate Image Node", () => {
    it("generates image from prompt", async () => {
        const result = await executeGenerateImage({
            prompt: "A sunset over mountains",
            size: "512x512"
        });
        expect(result.images).toHaveLength(1);
        expect(result.images[0]).toMatch(/^https?:\/\//);
    });
});

describe("Analyze Image Node", () => {
    it("describes image content", async () => {
        const result = await executeAnalyzeImage({
            image: testImageUrl,
            analysisType: "description"
        });
        expect(result.description.length).toBeGreaterThan(50);
    });
});
```

---

## Acceptance Criteria

- [ ] Generate Image creates images from prompts
- [ ] Generate Image supports DALL-E 3
- [ ] Generate Image returns multiple images if requested
- [ ] Generate Image shows revised prompt
- [ ] Analyze Image describes image content
- [ ] Analyze Image extracts text via OCR
- [ ] Analyze Image detects objects with bounding boxes
- [ ] Analyze Video extracts key frames
- [ ] Analyze Video provides per-frame analysis
- [ ] Analyze Video generates aggregate summary
- [ ] All nodes accept URL, base64, or file upload
- [ ] All nodes display with AI category styling

---

## Dependencies

These nodes enable media processing workflows like content moderation, asset generation, and visual search.
