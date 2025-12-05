# Agent Chat Voice Input/Output Specification

## Overview

Add browser-based voice input/output capabilities to agent chat conversations, allowing users to speak to agents and hear responses spoken back in real-time. This implementation uses the Web Speech API for both speech recognition (STT) and speech synthesis (TTS), with no backend changes required.

## User Requirements

- **Voice Stack**: Browser Web Speech API (SpeechRecognition + SpeechSynthesis)
- **Input Mode**: Tap-to-start/stop recording (tap mic button to start, tap again to stop)
- **Output Mode**: Auto-play responses as they arrive (speak tokens as they stream)
- **Settings**: Simple defaults only (no voice configuration UI initially)

## Architecture Overview

### Voice Input Flow

```
User taps mic button
  ↓
Start SpeechRecognition
  ↓
Show recording indicator (pulsing red button)
  ↓
User speaks, then taps button again
  ↓
Stop recognition, transcribe final result
  ↓
Send transcribed text to handleSend()
  ↓
Continue with normal message flow
```

### Voice Output Flow

```
Agent responds via SSE stream
  ↓
onToken() callback receives tokens
  ↓
Buffer tokens into complete sentences
  ↓
Add sentences to speech queue
  ↓
SpeechSynthesis speaks queued sentences
  ↓
Show speaking indicator during playback
  ↓
Auto-stop on errors or user interruption
```

## Implementation Structure

### New Files (4 files, ~640 lines)

#### 1. `frontend/src/hooks/useVoiceRecognition.ts` (~150 lines)

Custom React hook encapsulating Web Speech API's SpeechRecognition.

**Responsibilities**:

- Initialize and manage SpeechRecognition instance
- Handle recording state lifecycle (idle → recording → processing → complete)
- Browser compatibility detection
- Microphone permission handling
- Emit transcript on completion
- Error handling (no microphone, unsupported browser, network issues)

**Key Types**:

```typescript
type RecordingState = "idle" | "recording" | "processing" | "error";

interface VoiceRecognitionHook {
    isRecording: boolean;
    recordingState: RecordingState;
    transcript: string;
    error: string | null;
    isSupported: boolean;
    startRecording: () => void;
    stopRecording: () => void;
    cancelRecording: () => void;
}
```

**API Integration**:

- Use `webkitSpeechRecognition` (Chrome/Edge) or `SpeechRecognition` (standard)
- Set `continuous: false` for single utterance
- Set `interimResults: false` for final transcript only
- Set `lang: "en-US"` as default
- Handle `onresult`, `onerror`, `onend` events

#### 2. `frontend/src/hooks/useVoiceSynthesis.ts` (~200 lines)

Custom React hook encapsulating Web Speech API's SpeechSynthesis with intelligent queue management.

**Responsibilities**:

- Manage speech synthesis queue
- Buffer streaming tokens into complete sentences
- Speak sentences in order without overlap
- Handle interruptions (new user input, errors)
- Track speaking state
- Cleanup on unmount

**Key Types**:

```typescript
interface VoiceSynthesisHook {
    isSpeaking: boolean;
    currentSentence: string | null;
    queuedSentences: number;
    isSupported: boolean;
    addToken: (token: string) => void;
    flush: () => void; // Speak remaining buffered content
    stop: () => void; // Stop current speech and clear queue
    cancel: () => void; // Cancel without cleanup (for unmount)
}
```

**Sentence Buffering Logic**:

- Accumulate tokens in internal buffer
- Detect sentence boundaries: `.`, `!`, `?`, `\n\n`
- Extract complete sentences and add to speech queue
- Leave incomplete sentences in buffer
- On completion (flush), speak remaining buffer

**Queue Management**:

- Use array of sentences as queue
- Speak one sentence at a time
- On `onend` event, speak next sentence from queue
- Clear queue on user interruption or errors

#### 3. `frontend/src/components/agents/VoiceInputButton.tsx` (~100 lines)

Reusable microphone button component with visual states.

**Responsibilities**:

- Render microphone button with dynamic styling
- Show visual feedback for each state
- Handle click events (start/stop recording)
- Display tooltip with state information

**Props**:

```typescript
interface VoiceInputButtonProps {
    onTranscript: (text: string) => void;
    disabled?: boolean;
    className?: string;
}
```

**Visual States**:

- **Idle**: Gray mic icon, hover effect
- **Recording**: Red pulsing mic icon with animation
- **Processing**: Spinner icon (transcribing)
- **Error**: Red mic with error indicator
- **Unsupported**: Disabled with tooltip

**Icon Usage** (lucide-react):

- `Mic` for idle state
- `MicOff` for recording state
- `Loader2` for processing
- `AlertCircle` for errors

#### 4. `frontend/src/lib/voice/sentenceExtractor.ts` (~40 lines)

Utility for detecting sentence boundaries in streaming text.

**Responsibilities**:

- Extract complete sentences from text buffer
- Detect sentence boundaries (`.`, `!`, `?`, `\n\n`)
- Return extracted sentences and remaining buffer
- Handle edge cases (abbreviations, ellipsis)

**API**:

```typescript
export function extractCompleteSentences(text: string): {
    sentences: string[];
    remaining: string;
};
```

**Logic**:

- Split on sentence terminators
- Check if last segment is complete (ends with terminator)
- Return complete sentences + incomplete remainder

### Modified Files (2 files, ~100 lines changes)

#### 5. `frontend/src/components/agents/AgentChat.tsx` (~50 lines changes)

Primary integration point for voice features.

**Changes Required**:

**A. Import new components and hooks** (line 1-10 area):

```typescript
import { Mic } from "lucide-react"; // Add to existing icon imports
import { VoiceInputButton } from "./VoiceInputButton";
import { useVoiceSynthesis } from "../../hooks/useVoiceSynthesis";
```

**B. Add voice synthesis hook** (line 35-50 area, after state declarations):

```typescript
const { isSpeaking, addToken, flush, stop: stopSpeaking } = useVoiceSynthesis();
```

**C. Integrate voice output with token streaming** (line 138-174, modify onToken callback):

```typescript
onToken: (token: string) => {
    // Existing token accumulation logic...
    streamingContentRef.current += token;

    // NEW: Add token to voice synthesis
    addToken(token);

    // Existing message update logic...
    setMessages((prev) => {
        /* ... */
    });
};
```

**D. Stop speech on completion/error** (lines 216-256):

```typescript
onCompleted: (data) => {
    // Existing completion logic...

    // NEW: Flush remaining speech buffer
    flush();

    // Existing state updates...
};

onError: (error: string) => {
    // NEW: Stop speech immediately on error
    stopSpeaking();

    // Existing error handling...
};
```

**E. Stop speech when user starts speaking** (new helper function):

```typescript
const handleVoiceTranscript = (transcript: string) => {
    // Stop agent's speech when user starts talking
    stopSpeaking();

    // Set input and send
    setInput(transcript);
    handleSend();
};
```

**F. Modify input section** (lines 536-555, add voice button):

```typescript
<div className="border-t border-border p-4 flex-shrink-0 bg-card">
    <div className="flex gap-2">
        {/* NEW: Voice input button */}
        <VoiceInputButton
            onTranscript={handleVoiceTranscript}
            disabled={isSending}
        />

        <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="What can your Agent do for you today?"
            disabled={isSending}
            className={cn("flex-1 px-4 py-3", "bg-muted")}
        />
        <Button
            variant="primary"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="px-4 py-3"
        >
            <Send className="w-5 h-5" />
        </Button>
    </div>

    {/* Optional: Speaking indicator */}
    {isSpeaking && (
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Agent is speaking...</span>
        </div>
    )}

    <p className="text-xs text-muted-foreground mt-2 text-center">
        Having trouble? Report your issue to our team
    </p>
</div>
```

**G. Cleanup on unmount** (modify existing cleanup effect at line 261-267):

```typescript
return () => {
    if (sseCleanupRef.current) {
        console.log(`[AgentChat] Cleaning up SSE stream for execution ${executionId}`);
        sseCleanupRef.current();
        sseCleanupRef.current = null;
    }
    // NEW: Stop speech synthesis on unmount
    stopSpeaking();
};
```

#### 6. `frontend/src/components/agents/ThreadChat.tsx` (~50 lines changes)

Mirror the exact same changes from AgentChat.tsx:

- Import voice components/hooks
- Add useVoiceSynthesis hook
- Integrate with onToken callback (lines 103-139)
- Add voice button to input section (lines 477-497)
- Stop speech on completion/error (lines 180-219)
- Add handleVoiceTranscript function
- Cleanup on unmount

## Technical Implementation Details

### Browser Compatibility

**SpeechRecognition Support**:

- Chrome 25+: `webkitSpeechRecognition`
- Edge 79+: `webkitSpeechRecognition`
- Safari 14.1+: `webkitSpeechRecognition`
- Firefox: Not supported
- Opera: `webkitSpeechRecognition`

**SpeechSynthesis Support**:

- Chrome 33+: Full support
- Edge 14+: Full support
- Safari 7+: Full support
- Firefox 49+: Full support
- Opera 21+: Full support

**Detection Pattern**:

```typescript
const isRecognitionSupported = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;

const isSynthesisSupported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
```

### Error Handling

**Common Errors and Solutions**:

1. **Microphone Permission Denied**:
    - Show clear error message: "Microphone access denied. Please allow microphone access in browser settings."
    - Provide link to browser permission settings

2. **No Speech Detected**:
    - Show message: "No speech detected. Please try again."
    - Auto-reset to idle state

3. **Network Error** (recognition requires internet):
    - Show message: "Network error. Please check your connection."
    - Allow retry

4. **Browser Not Supported**:
    - Hide voice button entirely OR show disabled button with tooltip
    - Message: "Voice input not supported in this browser. Try Chrome, Edge, or Safari."

5. **Speech Synthesis Queue Full**:
    - Limit queue size to 10 sentences
    - Drop oldest sentences if queue exceeds limit

### Performance Considerations

1. **Token Buffering**:
    - Batch small tokens (< 5 chars) before checking for sentences
    - Prevents excessive sentence boundary checks
    - Improves performance on fast token streams

2. **Speech Queue Management**:
    - Limit queue to 10 sentences max
    - Clear queue on interruption to prevent stale speech
    - Use single SpeechSynthesisUtterance per sentence

3. **Memory Cleanup**:
    - Cancel ongoing speech on unmount
    - Clear all event listeners
    - Reset state to prevent memory leaks

4. **Debouncing**:
    - Debounce transcript updates during recognition
    - Prevents UI flicker on interim results (if enabled later)

### Accessibility

1. **ARIA Labels**:
    - Voice button: `aria-label="Start voice input"` / `"Stop recording"`
    - Speaking indicator: `aria-live="polite"`

2. **Keyboard Support**:
    - Voice button focusable with Tab
    - Space/Enter to start/stop recording

3. **Screen Reader Announcements**:
    - Announce recording state changes
    - Announce when agent starts speaking
    - Announce errors clearly

### State Management

**Component State** (AgentChat.tsx):

- No new state needed - hooks manage their own state
- Only add `isSpeaking` from hook for UI indicator

**Hook State** (useVoiceRecognition):

- `recognition`: SpeechRecognition instance
- `isRecording`: boolean
- `recordingState`: RecordingState enum
- `transcript`: string
- `error`: string | null
- `isSupported`: boolean

**Hook State** (useVoiceSynthesis):

- `isSpeaking`: boolean
- `currentSentence`: string | null
- `sentenceQueue`: string[]
- `tokenBuffer`: string
- `currentUtterance`: SpeechSynthesisUtterance | null
- `isSupported`: boolean

## Edge Cases and Solutions

### 1. User Interruption

**Scenario**: User starts speaking while agent is still talking.

**Solution**:

- In `handleVoiceTranscript`, call `stopSpeaking()` immediately
- Clears speech queue and cancels current utterance
- User's new message takes priority

### 2. Rapid Messages

**Scenario**: User sends multiple messages quickly.

**Solution**:

- Each new execution triggers SSE cleanup (existing behavior)
- Cleanup now includes `stopSpeaking()` call
- Speech from previous message stops automatically

### 3. Long Agent Responses

**Scenario**: Agent response is very long (many sentences).

**Solution**:

- Queue management limits queue to 10 sentences
- If more sentences arrive, drop oldest unspoken ones
- Prevents memory buildup and stale speech

### 4. Network Interruption During Recording

**Scenario**: Network drops while user is recording.

**Solution**:

- SpeechRecognition requires network (uses cloud API)
- `onerror` event fires with `error.error === 'network'`
- Show error message, reset to idle state
- User can retry when connection restored

### 5. Token Stream Stops Mid-Sentence

**Scenario**: SSE stream ends but buffer contains incomplete sentence.

**Solution**:

- `onCompleted` callback calls `flush()`
- `flush()` speaks whatever is in buffer, even if incomplete
- Ensures user hears all content

### 6. Browser Tab Backgrounded

**Scenario**: User switches to another tab while agent is speaking.

**Solution**:

- SpeechSynthesis continues in background (browser behavior)
- No code changes needed
- Consider adding "pause on blur" as future enhancement

### 7. Multiple Browser Windows

**Scenario**: User has multiple agent chat windows open.

**Solution**:

- Each window has independent SpeechRecognition instance
- Only active window can record (browser enforces single active mic)
- SpeechSynthesis can play from multiple windows (might be confusing)
- Consider adding detection for this in future

### 8. Very Fast Token Streaming

**Scenario**: Tokens arrive faster than speech can synthesize.

**Solution**:

- Queue buffers sentences naturally
- Speech plays at human pace
- Queue limit (10 sentences) prevents unbounded growth
- User experiences smooth continuous speech

## Code Style Compliance

All code must follow FlowMaestro standards:

- **Indentation**: 4 spaces (no tabs)
- **Quotes**: Double quotes
- **Semicolons**: Required
- **Line Length**: 100 characters max
- **No `any` types**: All types explicitly defined
- **Imports**: Properly organized
- **Error handling**: Comprehensive try-catch blocks
- **TypeScript strict mode**: Full compliance

## Dependencies

**No new dependencies required**. Uses browser built-in APIs:

- `SpeechRecognition` (window.SpeechRecognition or window.webkitSpeechRecognition)
- `SpeechSynthesis` (window.speechSynthesis)
- `SpeechSynthesisUtterance` (window.SpeechSynthesisUtterance)

Existing dependencies used:

- `lucide-react`: Mic, MicOff icons
- `react`: useState, useEffect, useRef hooks
- `tailwindcss`: Styling

## Summary

This implementation provides a solid foundation for voice interaction in agent chats using browser-native APIs. The architecture is clean, maintainable, and follows FlowMaestro patterns. The modular design (custom hooks, reusable components) allows for easy future enhancements while keeping the initial scope focused and achievable.

---

## Related Documentation

- Agent Chat Architecture: `.docs/architecture.md`
- Existing Voice Infrastructure: `backend/src/voice-agent/`
- Frontend Component Patterns: `CLAUDE.md`
