# Adjust Song EQ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a review-first Gemini `adjust-song-eq` capability for exactly one checkbox-selected playlist song, using user EQ profiles as taste reference.

**Architecture:** Extend the existing Gemini capability pattern with a new typed contract, a focused background request/parser module, a popup runtime normalizer, and minimal selected-actions UI. Gemini only proposes a validated EQ suggestion; existing playlist update logic writes the EQ after explicit user confirmation.

**Tech Stack:** React, TypeScript, Chrome extension runtime messaging, Node test runner, existing EQ utilities.

---

## File Structure

- Modify `src/models/GeminiActions.ts`: add `adjust-song-eq` capability, request/response/function-call types, and shared song context with `id`.
- Create `src/background/geminiSongEq.ts`: build constrained Gemini request body and parse `adjustSongEq` responses.
- Create `src/background/geminiSongEq.spec.ts`: TDD coverage for context boundary and parser behavior.
- Modify `src/background/index.ts`: add runtime handler for `MsgType.AdjustSongEqWithGemini`.
- Modify `src/constants/msgType.ts`: add `AdjustSongEqWithGemini`.
- Create `src/screens/gemini/geminiSongEqResponse.ts`: popup-side runtime normalizer.
- Create `src/screens/gemini/geminiSongEqResponse.spec.ts`: normalizer tests.
- Modify `src/screens/playlist/usePlaylistActions.ts`: add runtime request helper and confirmed apply helper.
- Modify `src/screens/playlist/SelectionActionsModal.tsx`: add minimal selected-song Gemini EQ review flow.
- Modify `src/screens/playlist/Playlist.tsx`: pass selected song/profile props and handlers into the modal.
- Modify `src/screens/playlist/playlistLayout.spec.ts`: source-level wiring tests for the selected-song UI path.

---

### Task 1: Contract Types

**Files:**
- Modify: `src/models/GeminiActions.ts`
- Test: `src/background/geminiSongEq.spec.ts`

- [ ] **Step 1: Write the failing contract test**

Create `src/background/geminiSongEq.spec.ts` with this initial test:

```ts
import test from "node:test";
import {
  ADJUST_SONG_EQ_CAPABILITY,
  type GeminiCapability,
  type GeminiCapabilityName,
  type GeminiContextScope,
  type GeminiFunctionName,
  type GeminiSongContext,
  type GeminiSongEqSuggestionFailure,
} from "../models/GeminiActions";
import { GeminiAnalyzeErrorCode } from "../models/GeminiSettings";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
};

test("ADJUST_SONG_EQ_CAPABILITY exposes the approved action contract", () => {
  const capabilityName: GeminiCapabilityName = "adjust-song-eq";
  const contextScope: GeminiContextScope = "existingEqProfiles";
  const functionName: GeminiFunctionName = "adjustSongEq";
  const songContext: GeminiSongContext = {
    id: "song-1",
    title: "Song Title",
    channelName: "Artist",
    videoId: "abc123",
    url: "https://www.youtube.com/watch?v=abc123",
    audioEq: {
      clearBass: 0,
      band400: 0,
      band1k: 0,
      band2k5: 0,
      band6k3: 3,
      band16k: 4,
    },
  };
  const capability: GeminiCapability = ADJUST_SONG_EQ_CAPABILITY;
  const failure: GeminiSongEqSuggestionFailure = {
    ok: false,
    code: GeminiAnalyzeErrorCode.InvalidResponse,
    message: "Gemini did not return a usable song EQ adjustment.",
  };

  expectEqual(capabilityName, "adjust-song-eq");
  expectEqual(contextScope, "existingEqProfiles");
  expectEqual(functionName, "adjustSongEq");
  expectEqual(songContext.id, "song-1");
  expectEqual(failure.ok, false);
  expectEqual(capability, {
    name: "adjust-song-eq",
    allowedContext: ["eqBandContract", "existingEqProfiles", "currentSong"],
    allowedFunctions: ["adjustSongEq"],
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/background/geminiSongEq.spec.ts`

Expected: FAIL because `ADJUST_SONG_EQ_CAPABILITY` and song EQ types are not exported.

- [ ] **Step 3: Implement the minimal contract**

Update `src/models/GeminiActions.ts` so the key declarations are:

```ts
type GeminiCapabilityName = "create-eq-profile" | "adjust-song-eq";
type GeminiFunctionName = "createEqProfile" | "adjustSongEq";

const CREATE_EQ_PROFILE_FUNCTION_NAME: GeminiFunctionName = "createEqProfile";
const ADJUST_SONG_EQ_FUNCTION_NAME: GeminiFunctionName = "adjustSongEq";

type GeminiSongContext = {
  id: string;
  title: string;
  channelName: string;
  videoId: string;
  url: string;
  audioEq: AudioEqSettings;
};

type GeminiSongEqUserRequest = {
  userRequest: string;
  existingProfiles: AudioEqProfile[];
  songContext: GeminiSongContext;
};

type GeminiAdjustSongEqFunctionCall = {
  functionName: GeminiFunctionName;
  arguments: {
    songId: string;
    audioEq: AudioEqSettings;
    reason?: string;
  };
};

type GeminiSongEqSuggestion = {
  songId: string;
  audioEq: AudioEqSettings;
  reason: string;
};

type GeminiSongEqSuccess = {
  ok: true;
  suggestion: GeminiSongEqSuggestion;
};

type GeminiSongEqSuggestionFailure = GeminiAnalyzeFailure;
type GeminiSongEqResponse = GeminiSongEqSuccess | GeminiSongEqSuggestionFailure;

const ADJUST_SONG_EQ_CAPABILITY: GeminiCapability = {
  name: "adjust-song-eq",
  allowedContext: ["eqBandContract", "existingEqProfiles", "currentSong"],
  allowedFunctions: [ADJUST_SONG_EQ_FUNCTION_NAME],
};
```

Export the new constant and types. Add `id: string` to `GeminiSongContext`; update any existing test fixtures that construct a `GeminiSongContext` to include `id`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/background/geminiSongEq.spec.ts`

Expected: PASS for the contract test.

- [ ] **Step 5: Commit**

```bash
git add src/models/GeminiActions.ts src/background/geminiSongEq.spec.ts
git commit -m "feat: add gemini song eq contract"
```

---

### Task 2: Background Request Builder And Parser

**Files:**
- Create: `src/background/geminiSongEq.ts`
- Modify: `src/background/geminiSongEq.spec.ts`

- [ ] **Step 1: Add failing request builder and parser tests**

Append tests that import `buildGeminiSongEqRequestBody` and `parseGeminiSongEqResponse` from `./geminiSongEq`. Cover:

```ts
test("buildGeminiSongEqRequestBody includes only approved song EQ context", () => {
  const body = buildGeminiSongEqRequestBody({
    userRequest: "Make this less harsh",
    existingProfiles: [
      {
        id: "profile-1",
        name: "Warm Vocal",
        audioEq: {
          clearBass: 4,
          band400: 2,
          band1k: 1,
          band2k5: 0,
          band6k3: -1,
          band16k: -2,
        },
      },
    ],
    songContext: {
      id: "song-1",
      title: "Bright Song",
      channelName: "Artist",
      videoId: "abc123",
      url: "https://www.youtube.com/watch?v=abc123",
      audioEq: {
        clearBass: 0,
        band400: 0,
        band1k: 0,
        band2k5: 0,
        band6k3: 12,
        band16k: -12,
      },
    },
  });

  const text = JSON.stringify(body);
  expectEqual(text.includes("adjustSongEq"), true);
  expectEqual(text.includes("createEqProfile"), false);
  expectEqual(text.includes("askUserQuestion"), false);
  expectEqual(text.includes("eqBandContract"), true);
  expectEqual(text.includes("existingEqProfiles"), true);
  expectEqual(text.includes("currentSong"), true);
  expectEqual(text.includes("Make this less harsh"), true);
  expectEqual(text.includes("Bright Song"), true);
  expectEqual(text.includes("Warm Vocal"), true);
  expectEqual(text.includes("profile-1"), false);
  expectEqual(text.includes("geminiApiKey"), false);
  expectEqual(text.includes("youtube_list"), false);
});
```

Also add parser tests for valid JSON text, markdown-fenced JSON, wrong function name, mismatched `songId`, and missing bands. Use expected failure:

```ts
{
  ok: false,
  code: GeminiAnalyzeErrorCode.InvalidResponse,
  message: "Gemini did not return a usable song EQ adjustment.",
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/background/geminiSongEq.spec.ts`

Expected: FAIL because `src/background/geminiSongEq.ts` does not exist.

- [ ] **Step 3: Implement the request builder and parser**

Create `src/background/geminiSongEq.ts` modeled after `geminiEqProfiles.ts`. Export:

```ts
const INVALID_SONG_EQ_MESSAGE =
  "Gemini did not return a usable song EQ adjustment.";

const buildGeminiSongEqRequestBody = ({
  userRequest,
  existingProfiles,
  songContext,
}: GeminiSongEqUserRequest) => {
  const approvedContext = {
    capability: ADJUST_SONG_EQ_CAPABILITY,
    eqBandContract: EQ_BAND_CONTRACT,
    existingEqProfiles: existingProfiles.map(({ name, audioEq }) => ({
      name,
      audioEq: normalizeAudioEqSettings(audioEq),
    })),
    currentSong: {
      id: songContext.id,
      title: songContext.title,
      channelName: songContext.channelName,
      videoId: songContext.videoId,
      url: songContext.url,
      audioEq: normalizeAudioEqSettings(songContext.audioEq),
    },
    userRequest,
  };

  return {
    contents: [
      {
        parts: [
          {
            text: [
              "Suggest one reviewable audio EQ adjustment for the selected song.",
              "Use only the approved EQ context below.",
              "Return JSON only as a function call object.",
              'functionName must be "adjustSongEq".',
              "arguments.songId must exactly match currentSong.id.",
              "arguments.audioEq must include clearBass, band400, band1k, band2k5, band6k3, and band16k values from -10 to 10.",
              "arguments.reason should briefly explain the EQ choice.",
              JSON.stringify(approvedContext),
            ].join("\n"),
          },
        ],
      },
    ],
    tools: [
      {
        functionDeclarations: [
          {
            name: "adjustSongEq",
            description: "Suggest audio EQ settings for one selected song.",
            parameters: {
              type: "object",
              properties: {
                songId: { type: "string" },
                audioEq: {
                  type: "object",
                  properties: Object.fromEntries(
                    AUDIO_EQ_BANDS.map((band) => [
                      band.key,
                      {
                        type: "number",
                        minimum: AUDIO_EQ_MIN,
                        maximum: AUDIO_EQ_MAX,
                      },
                    ]),
                  ),
                  required: AUDIO_EQ_BANDS.map((band) => band.key),
                },
                reason: { type: "string" },
              },
              required: ["songId", "audioEq"],
            },
          },
        ],
      },
    ],
  };
};
```

Reuse the `readCandidateText`, `readFunctionCall`, `extractJsonText`, and `hasRequiredAudioEqBands` pattern from `geminiEqProfiles.ts`. In `parseGeminiSongEqResponse(payload, expectedSongId)`, require `functionName === "adjustSongEq"`, `args.songId === expectedSongId`, and complete finite EQ bands. Return `normalizeAudioEqSettings(args.audioEq)`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/background/geminiSongEq.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/background/geminiSongEq.ts src/background/geminiSongEq.spec.ts
git commit -m "feat: parse gemini song eq suggestions"
```

---

### Task 3: Background Runtime Message

**Files:**
- Modify: `src/constants/msgType.ts`
- Modify: `src/background/index.ts`
- Modify: `src/screens/playlist/playlistLayout.spec.ts`

- [ ] **Step 1: Add failing source-level wiring test**

Append this test to `src/screens/playlist/playlistLayout.spec.ts`:

```ts
test("playlist source wires the Gemini song EQ adjustment message", () => {
  expectEqual(
    playlistActionsSource.includes("MsgType.AdjustSongEqWithGemini"),
    true,
  );
  expectEqual(
    backgroundSource.includes("case MsgType.AdjustSongEqWithGemini"),
    true,
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/screens/playlist/playlistLayout.spec.ts`

Expected: FAIL because the message enum and handler are not wired.

- [ ] **Step 3: Add the runtime message handler**

In `src/constants/msgType.ts`, add `AdjustSongEqWithGemini`.

In `src/background/index.ts`, import `buildGeminiSongEqRequestBody`, `parseGeminiSongEqResponse`, and `GeminiSongEqUserRequest`. Add helper `adjustSongEqWithGemini(request)` next to `generateEqProfileWithGemini`: check API key, trim `userRequest`, require `request.songContext.id`, build the request, fetch Gemini, parse with the expected song id, and return typed failures matching existing Gemini handlers.

Add this message case:

```ts
case MsgType.AdjustSongEqWithGemini:
  adjustSongEqWithGemini({
    userRequest: message.userRequest,
    existingProfiles: message.existingProfiles,
    songContext: message.songContext,
  }).then(sendResponse);
  return true;
```

- [ ] **Step 4: Run the wiring test**

Run: `npm test -- src/screens/playlist/playlistLayout.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/constants/msgType.ts src/background/index.ts src/screens/playlist/playlistLayout.spec.ts
git commit -m "feat: wire gemini song eq message"
```

---

### Task 4: Popup Runtime Normalizer

**Files:**
- Create: `src/screens/gemini/geminiSongEqResponse.ts`
- Create: `src/screens/gemini/geminiSongEqResponse.spec.ts`

- [ ] **Step 1: Write failing normalizer tests**

Create `src/screens/gemini/geminiSongEqResponse.spec.ts` with tests matching `geminiEqProfileResponse.spec.ts`: runtime error failure, malformed success rejection, song id mismatch rejection, valid success preservation, and valid failure preservation. The function call is:

```ts
normalizeGeminiSongEqResponse(response, "song-1", runtimeError)
```

Use fallback message:

```ts
"Couldn't adjust song EQ. Try again."
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/screens/gemini/geminiSongEqResponse.spec.ts`

Expected: FAIL because `geminiSongEqResponse.ts` does not exist.

- [ ] **Step 3: Implement the normalizer**

Create `src/screens/gemini/geminiSongEqResponse.ts` parallel to `geminiEqProfileResponse.ts`. Export `SONG_EQ_FAILURE_MESSAGE`, `createGeminiSongEqFailure`, and `normalizeGeminiSongEqResponse`. Use the same helper style as `geminiEqProfileResponse.ts`: `isObject`, `isAllowedFailureCode`, `hasCompleteFiniteAudioEq`, and `normalizeAudioEqSettings`. Require `response.suggestion.songId === expectedSongId`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/screens/gemini/geminiSongEqResponse.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/gemini/geminiSongEqResponse.ts src/screens/gemini/geminiSongEqResponse.spec.ts
git commit -m "feat: normalize gemini song eq responses"
```

---

### Task 5: Selected-Song Review UI

**Files:**
- Modify: `src/screens/playlist/usePlaylistActions.ts`
- Modify: `src/screens/playlist/SelectionActionsModal.tsx`
- Modify: `src/screens/playlist/Playlist.tsx`
- Modify: `src/screens/playlist/playlistLayout.spec.ts`

- [ ] **Step 1: Add failing selected-action source tests**

Append to `src/screens/playlist/playlistLayout.spec.ts`:

```ts
test("selection actions modal exposes review-first Gemini song EQ adjustment", () => {
  expectEqual(selectionActionsModalSource.includes("Gemini EQ"), true);
  expectEqual(selectionActionsModalSource.includes("Describe the EQ change"), true);
  expectEqual(selectionActionsModalSource.includes("Apply EQ"), true);
  expectEqual(selectionActionsModalSource.includes("select one song"), true);
  expectEqual(selectionActionsModalSource.includes("suggestion"), true);
});

test("playlist actions request and apply Gemini song EQ through existing playlist updates", () => {
  expectEqual(playlistActionsSource.includes("adjustSongEqWithGemini"), true);
  expectEqual(playlistActionsSource.includes("normalizeGeminiSongEqResponse"), true);
  expectEqual(playlistActionsSource.includes("MsgType.AdjustSongEqWithGemini"), true);
  expectEqual(playlistActionsSource.includes("onApplyGeminiSongEqSuggestion"), true);
  expectEqual(playlistActionsSource.includes("updateActiveSongListItems"), true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/screens/playlist/playlistLayout.spec.ts`

Expected: FAIL because selected-song Gemini EQ UI and handlers do not exist.

- [ ] **Step 3: Add playlist actions**

In `src/screens/playlist/usePlaylistActions.ts`, import `GeminiSongEqResponse`, `GeminiSongEqUserRequest`, `GeminiSongEqSuggestion`, and `normalizeGeminiSongEqResponse`. Add `adjustSongEqWithGemini(request)` that sends `MsgType.AdjustSongEqWithGemini` and normalizes using `request.songContext.id`. Add `onApplyGeminiSongEqSuggestion(suggestion)` that maps the active playlist and replaces only the matching item's `audioEq`. Return both functions from the hook.

- [ ] **Step 4: Add selected-actions modal review flow**

Extend `SelectionActionsModal.tsx` props with `selectedSong`, `audioEqProfiles`, `onAdjustSongEqWithGemini`, and `onApplyGeminiSongEqSuggestion`. Add a `"geminiEq"` view with request text, Generate, status, preview band list from `AUDIO_EQ_BANDS`, `Apply EQ`, and Dismiss. Block generation unless `selectedCount === 1` and `selectedSong` exists, using the message `Please select one song for Gemini EQ.`.

- [ ] **Step 5: Wire props from Playlist**

In `src/screens/playlist/Playlist.tsx`, compute:

```ts
const selectedActionSong =
  selectedItemIds.length === 1
    ? playlist.find((item) => item.id === selectedItemIds[0])
    : undefined;
```

Pass `selectedSong`, `audioEqProfiles`, `onAdjustSongEqWithGemini={adjustSongEqWithGemini}`, and `onApplyGeminiSongEqSuggestion={onApplyGeminiSongEqSuggestion}` into `SelectionActionsModal`.

- [ ] **Step 6: Run the selected-action tests**

Run: `npm test -- src/screens/playlist/playlistLayout.spec.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/screens/playlist/usePlaylistActions.ts src/screens/playlist/SelectionActionsModal.tsx src/screens/playlist/Playlist.tsx src/screens/playlist/playlistLayout.spec.ts
git commit -m "feat: review gemini song eq suggestions"
```

---

### Task 6: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Run focused Gemini tests**

Run:

```bash
npm test -- src/background/geminiSongEq.spec.ts src/screens/gemini/geminiSongEqResponse.spec.ts src/screens/playlist/playlistLayout.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run: `npm test`

Expected: PASS with all tests.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Commit any verification fixes**

If verification required code fixes, commit them:

```bash
git add src
git commit -m "fix: stabilize gemini song eq capability"
```

If no fixes were needed, do not create an empty commit.

