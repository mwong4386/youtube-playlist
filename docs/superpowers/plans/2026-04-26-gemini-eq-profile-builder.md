# Gemini EQ Profile Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a review-first Gemini EQ profile builder POC that returns a validated `createEqProfile` suggestion and saves it only after user confirmation.

**Architecture:** Add a typed Gemini action contract, a background parser/request module for `createEqProfile`, popup response normalization, and a reusable `GeminiEqProfileBuilder` component. The popup renders the builder as a portable screen and reuses the existing EQ profile creation callback for persistence.

**Tech Stack:** React 18, TypeScript, Manifest V3 Chrome extension messaging, Vite, Node test runner.

---

## File Structure

- Create `src/models/GeminiActions.ts`
  Defines the POC capability/function contracts, request/response models, and `GeminiEqProfileSuggestion`.
- Create `src/background/geminiEqProfiles.ts`
  Builds the Gemini request body and parses/validates Gemini `createEqProfile` responses.
- Create `src/background/geminiEqProfiles.spec.ts`
  Unit coverage for request context and parser behavior.
- Modify `src/models/GeminiSettings.ts`
  Add EQ-profile generation error code typing alongside existing Gemini failures.
- Modify `src/background/index.ts`
  Handle `MsgType.GenerateEqProfileWithGemini` in the background using the existing Gemini request wrapper.
- Modify `src/constants/msgType.ts`
  Add the new runtime message enum value.
- Create `src/screens/gemini/geminiEqProfileResponse.ts`
  Normalize background responses for popup UI, mirroring `geminiAnalyzeResponse.ts`.
- Create `src/screens/gemini/geminiEqProfileResponse.spec.ts`
  Unit coverage for malformed runtime responses.
- Create `src/screens/gemini/GeminiEqProfileBuilder.tsx`
  Reusable builder component with input, loading/error states, preview, and create button.
- Create `src/screens/gemini/GeminiEqProfileBuilder.module.css`
  Builder styles matching the restrained popup sheet language.
- Modify `src/screens/playlist/usePlaylistScreenState.ts`
  Track whether the Gemini EQ builder screen is active.
- Modify `src/screens/playlist/usePlaylistActions.ts`
  Add open/close builder actions and `requestGeminiEqProfile`.
- Modify `src/screens/playlist/PlaylistHeader.tsx`
  Add a menu row to open the builder.
- Modify `src/screens/playlist/Playlist.tsx`
  Render the builder screen and pass existing profile/create/settings props.
- Modify or add layout/source tests under `src/screens/playlist/*spec.ts`
  Confirm the menu entry and builder integration are wired.

---

### Task 1: Gemini Action Types And Parser

**Files:**
- Create: `src/models/GeminiActions.ts`
- Create: `src/background/geminiEqProfiles.ts`
- Create: `src/background/geminiEqProfiles.spec.ts`
- Modify: `src/models/GeminiSettings.ts`

- [ ] **Step 1: Write failing parser and request-body tests**

Create `src/background/geminiEqProfiles.spec.ts`:

```ts
import test from "node:test";
import { GeminiAnalyzeErrorCode } from "../models/GeminiSettings";
import {
  buildGeminiEqProfileRequestBody,
  parseGeminiEqProfileResponse,
} from "./geminiEqProfiles";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

const validPayload = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify({
              functionName: "createEqProfile",
              arguments: {
                name: "Warm Vocal",
                audioEq: {
                  clearBass: 2,
                  band400: 1,
                  band1k: 3,
                  band2k5: 2,
                  band6k3: 1,
                  band16k: -1,
                },
                reason: "Adds body and presence without harsh air.",
              },
            }),
          },
        ],
      },
    },
  ],
};

test("buildGeminiEqProfileRequestBody includes only approved EQ context", () => {
  const body = buildGeminiEqProfileRequestBody({
    userRequest: "Make vocals warmer",
    existingProfiles: [
      {
        id: "metal",
        name: "Metal",
        audioEq: {
          clearBass: 6,
          band400: 3,
          band1k: -1,
          band2k5: -2,
          band6k3: 4,
          band16k: 6,
        },
      },
    ],
  });

  const text = JSON.stringify(body);
  expectEqual(text.includes("createEqProfile"), true);
  expectEqual(text.includes("askUserQuestion"), false);
  expectEqual(text.includes("Make vocals warmer"), true);
  expectEqual(text.includes("Metal"), true);
  expectEqual(text.includes("geminiApiKey"), false);
  expectEqual(text.includes("youtube_list"), false);
});

test("buildGeminiEqProfileRequestBody includes optional current song context", () => {
  const body = buildGeminiEqProfileRequestBody({
    userRequest: "Tune this for softer treble",
    existingProfiles: [],
    songContext: {
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
    },
  });

  const text = JSON.stringify(body);
  expectEqual(text.includes("Song Title"), true);
  expectEqual(text.includes("abc123"), true);
  expectEqual(text.includes("band16k"), true);
});

test("parseGeminiEqProfileResponse accepts a valid createEqProfile call", () => {
  expectEqual(parseGeminiEqProfileResponse(validPayload), {
    ok: true,
    suggestion: {
      name: "Warm Vocal",
      audioEq: {
        clearBass: 2,
        band400: 1,
        band1k: 3,
        band2k5: 2,
        band6k3: 1,
        band16k: -1,
      },
      reason: "Adds body and presence without harsh air.",
    },
  });
});

test("parseGeminiEqProfileResponse reads JSON wrapped in markdown fences", () => {
  expectEqual(
    parseGeminiEqProfileResponse({
      candidates: [
        {
          content: {
            parts: [
              {
                text: `\`\`\`json\n${JSON.stringify({
                  functionName: "createEqProfile",
                  arguments: {
                    name: "Warm Vocal",
                    audioEq: {
                      clearBass: 2,
                      band400: 1,
                      band1k: 3,
                      band2k5: 2,
                      band6k3: 1,
                      band16k: -1,
                    },
                  },
                })}\n\`\`\``,
              },
            ],
          },
        },
      ],
    }),
    {
      ok: true,
      suggestion: {
        name: "Warm Vocal",
        audioEq: {
          clearBass: 2,
          band400: 1,
          band1k: 3,
          band2k5: 2,
          band6k3: 1,
          band16k: -1,
        },
        reason: "",
      },
    }
  );
});

test("parseGeminiEqProfileResponse rejects wrong function names", () => {
  expectEqual(
    parseGeminiEqProfileResponse({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  functionName: "askUserQuestion",
                  arguments: { question: "More bass?" },
                }),
              },
            ],
          },
        },
      ],
    }),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.InvalidResponse,
      message: "Gemini did not return a usable EQ profile.",
    }
  );
});

test("parseGeminiEqProfileResponse rejects missing required bands", () => {
  expectEqual(
    parseGeminiEqProfileResponse({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  functionName: "createEqProfile",
                  arguments: {
                    name: "Incomplete",
                    audioEq: {
                      clearBass: 2,
                      band400: 1,
                      band1k: 3,
                      band2k5: 2,
                      band6k3: 1,
                    },
                  },
                }),
              },
            ],
          },
        },
      ],
    }),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.InvalidResponse,
      message: "Gemini did not return a usable EQ profile.",
    }
  );
});

test("parseGeminiEqProfileResponse clamps out-of-range bands", () => {
  expectEqual(
    parseGeminiEqProfileResponse({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  functionName: "createEqProfile",
                  arguments: {
                    name: "Extreme",
                    audioEq: {
                      clearBass: 20,
                      band400: -20,
                      band1k: 3.4,
                      band2k5: 2,
                      band6k3: 1,
                      band16k: -1,
                    },
                  },
                }),
              },
            ],
          },
        },
      ],
    }),
    {
      ok: true,
      suggestion: {
        name: "Extreme",
        audioEq: {
          clearBass: 10,
          band400: -10,
          band1k: 3,
          band2k5: 2,
          band6k3: 1,
          band16k: -1,
        },
        reason: "",
      },
    }
  );
});
```

- [ ] **Step 2: Run the failing tests**

Run: `npm test -- --test-name-pattern=GeminiEqProfile`

Expected: TypeScript compile fails because `src/background/geminiEqProfiles.ts` does not exist.

- [ ] **Step 3: Add shared Gemini action types**

Create `src/models/GeminiActions.ts`:

```ts
import type AudioEqSettings from "./AudioEq";
import type AudioEqProfile from "./AudioEqProfile";

type GeminiCapabilityName = "create-eq-profile";
type GeminiContextScope = "eqBandContract" | "existingEqProfiles" | "currentSong";
type GeminiFunctionName = "createEqProfile";

type GeminiCapability = {
  name: GeminiCapabilityName;
  allowedContext: GeminiContextScope[];
  allowedFunctions: GeminiFunctionName[];
};

type GeminiSongContext = {
  title: string;
  channelName: string;
  videoId: string;
  url: string;
  audioEq: AudioEqSettings;
};

type GeminiEqProfileUserRequest = {
  userRequest: string;
  existingProfiles: AudioEqProfile[];
  songContext?: GeminiSongContext;
};

type GeminiCreateEqProfileFunctionCall = {
  functionName: "createEqProfile";
  arguments: {
    name: string;
    audioEq: AudioEqSettings;
    reason?: string;
  };
};

type GeminiEqProfileSuggestion = {
  name: string;
  audioEq: AudioEqSettings;
  reason: string;
};

type GeminiEqProfileSuggestionSuccess = {
  ok: true;
  suggestion: GeminiEqProfileSuggestion;
};

type GeminiEqProfileSuggestionFailure = {
  ok: false;
  code: string;
  message: string;
};

type GeminiEqProfileSuggestionResponse =
  | GeminiEqProfileSuggestionSuccess
  | GeminiEqProfileSuggestionFailure;

const CREATE_EQ_PROFILE_CAPABILITY: GeminiCapability = {
  name: "create-eq-profile",
  allowedContext: ["eqBandContract", "existingEqProfiles", "currentSong"],
  allowedFunctions: ["createEqProfile"],
};

export { CREATE_EQ_PROFILE_CAPABILITY };
export type {
  GeminiCapability,
  GeminiCapabilityName,
  GeminiContextScope,
  GeminiCreateEqProfileFunctionCall,
  GeminiEqProfileSuggestion,
  GeminiEqProfileSuggestionFailure,
  GeminiEqProfileSuggestionResponse,
  GeminiEqProfileSuggestionSuccess,
  GeminiEqProfileUserRequest,
  GeminiFunctionName,
  GeminiSongContext,
};
```

- [ ] **Step 4: Add an EQ profile generation error code**

Modify `src/models/GeminiSettings.ts` so `GeminiAnalyzeErrorCode` includes:

```ts
  InvalidResponse = "invalid-response",
```

This value already exists. Do not add a duplicate. Reuse `MissingApiKey`, `RequestFailed`, and `InvalidResponse` for the POC instead of creating a second enum.

- [ ] **Step 5: Implement request building and parsing**

Create `src/background/geminiEqProfiles.ts`:

```ts
import { AUDIO_EQ_BANDS, AUDIO_EQ_MAX, AUDIO_EQ_MIN, normalizeAudioEqSettings } from "../utils/audioEq";
import { GeminiAnalyzeErrorCode } from "../models/GeminiSettings";
import {
  CREATE_EQ_PROFILE_CAPABILITY,
  type GeminiEqProfileSuggestionResponse,
  type GeminiEqProfileUserRequest,
} from "../models/GeminiActions";

const INVALID_EQ_PROFILE_MESSAGE = "Gemini did not return a usable EQ profile.";

const createResponseExcerpt = (text: string) => {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > 500 ? `${normalized.slice(0, 500)}...` : normalized;
};

const readCandidateText = (payload: unknown) => {
  if (
    typeof payload !== "object" ||
    !payload ||
    !Array.isArray((payload as any).candidates)
  ) {
    return "";
  }

  const parts = (payload as any).candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
};

const extractJsonText = (text: string) => {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const normalized = fencedMatch ? fencedMatch[1].trim() : text.trim();

  if (normalized.startsWith("{") && normalized.endsWith("}")) {
    return normalized;
  }

  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return "";
  }

  return normalized.slice(firstBrace, lastBrace + 1).trim();
};

const invalidEqProfile = (): GeminiEqProfileSuggestionResponse => ({
  ok: false,
  code: GeminiAnalyzeErrorCode.InvalidResponse,
  message: INVALID_EQ_PROFILE_MESSAGE,
});

const hasAllEqBands = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return AUDIO_EQ_BANDS.every((band) => {
    const rawValue = (value as Record<string, unknown>)[band.key];
    return typeof rawValue === "number" && Number.isFinite(rawValue);
  });
};

const buildGeminiEqProfileRequestBody = ({
  userRequest,
  existingProfiles,
  songContext,
}: GeminiEqProfileUserRequest) => {
  const context = {
    capability: CREATE_EQ_PROFILE_CAPABILITY,
    eqBandContract: {
      min: AUDIO_EQ_MIN,
      max: AUDIO_EQ_MAX,
      bands: AUDIO_EQ_BANDS.map((band) => ({
        key: band.key,
        label: band.label,
        frequency: band.frequency,
      })),
    },
    existingProfiles: existingProfiles.map((profile) => ({
      name: profile.name,
      audioEq: normalizeAudioEqSettings(profile.audioEq),
    })),
    ...(songContext
      ? {
          currentSong: {
            title: songContext.title,
            channelName: songContext.channelName,
            videoId: songContext.videoId,
            url: songContext.url,
            audioEq: normalizeAudioEqSettings(songContext.audioEq),
          },
        }
      : {}),
  };

  return {
    contents: [
      {
        parts: [
          {
            text: [
              "Create one EQ profile for this YouTube playlist extension.",
              "Return JSON only. Do not use markdown unless unavoidable.",
              "You may only return functionName createEqProfile.",
              "The audioEq object must include every allowed band.",
              `User requirement: ${userRequest}`,
              `Approved app context: ${JSON.stringify(context)}`,
              "Return shape: {\"functionName\":\"createEqProfile\",\"arguments\":{\"name\":\"Profile name\",\"audioEq\":{\"clearBass\":0,\"band400\":0,\"band1k\":0,\"band2k5\":0,\"band6k3\":0,\"band16k\":0},\"reason\":\"Short explanation\"}}",
            ].join("\n"),
          },
        ],
      },
    ],
  };
};

const parseGeminiEqProfileResponse = (
  payload: unknown,
): GeminiEqProfileSuggestionResponse => {
  const candidateText = readCandidateText(payload);
  const text = extractJsonText(candidateText);

  if (!text) {
    return invalidEqProfile();
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return invalidEqProfile();
  }

  if (parsed.functionName !== "createEqProfile") {
    return invalidEqProfile();
  }

  const args = parsed.arguments;
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return invalidEqProfile();
  }

  const name = typeof (args as any).name === "string" ? (args as any).name.trim() : "";
  if (!name || !hasAllEqBands((args as any).audioEq)) {
    return invalidEqProfile();
  }

  const responseExcerpt = createResponseExcerpt(candidateText);
  const reason =
    typeof (args as any).reason === "string" ? (args as any).reason.trim() : "";

  return {
    ok: true,
    suggestion: {
      name,
      audioEq: normalizeAudioEqSettings((args as any).audioEq),
      reason: reason || (responseExcerpt.startsWith("{") ? "" : responseExcerpt),
    },
  };
};

export {
  INVALID_EQ_PROFILE_MESSAGE,
  buildGeminiEqProfileRequestBody,
  parseGeminiEqProfileResponse,
};
```

- [ ] **Step 6: Run tests for the new parser**

Run: `npm test -- --test-name-pattern=GeminiEqProfile`

Expected: PASS for the new parser tests.

- [ ] **Step 7: Commit**

```bash
git add src/models/GeminiActions.ts src/background/geminiEqProfiles.ts src/background/geminiEqProfiles.spec.ts src/models/GeminiSettings.ts
git commit -m "feat: add gemini eq profile contract"
```

---

### Task 2: Background Message Handler

**Files:**
- Modify: `src/constants/msgType.ts`
- Modify: `src/background/index.ts`
- Modify: `src/background/geminiRequest.spec.ts` only if existing request tests fail from type drift

- [ ] **Step 1: Write the expected message enum source test**

Add this assertion to the existing message/layout source test file that already checks message names, `src/screens/playlist/playlistLayout.spec.ts`:

```ts
test("playlist source wires the Gemini EQ profile generation message", () => {
  expectEqual(
    playlistActionsSource.includes("MsgType.GenerateEqProfileWithGemini"),
    true,
  );
  expectEqual(
    backgroundSource.includes("case MsgType.GenerateEqProfileWithGemini"),
    true,
  );
});
```

If `backgroundSource` is not already defined in that file, add:

```ts
const backgroundSource = readFileSync(
  join(process.cwd(), "src/background/index.ts"),
  "utf8",
);
```

- [ ] **Step 2: Run the failing source test**

Run: `npm test -- --test-name-pattern="Gemini EQ profile generation message"`

Expected: FAIL because the enum and message handler are not wired.

- [ ] **Step 3: Add the message enum value**

Modify `src/constants/msgType.ts`:

```ts
  AnalyzeImportedPlaylist,
  StopAnalyzeImportedPlaylist,
  GenerateEqProfileWithGemini,
```

- [ ] **Step 4: Add the background generation function**

Modify imports in `src/background/index.ts`:

```ts
import {
  buildGeminiEqProfileRequestBody,
  parseGeminiEqProfileResponse,
} from "./geminiEqProfiles";
import type { GeminiEqProfileUserRequest } from "../models/GeminiActions";
```

Add this function near `analyzeSongBoundaries`:

```ts
const generateEqProfileWithGemini = async (
  request: GeminiEqProfileUserRequest,
) => {
  const apiKey = readStoredGeminiApiKey(
    await chrome.storage.local.get([GEMINI_API_KEY_STORAGE_KEY]),
  );

  if (!apiKey) {
    return {
      ok: false,
      code: GeminiAnalyzeErrorCode.MissingApiKey,
      message: "Add a Gemini API key in settings before generating EQ profiles.",
    };
  }

  const userRequest =
    typeof request.userRequest === "string" ? request.userRequest.trim() : "";

  if (!userRequest) {
    return {
      ok: false,
      code: GeminiAnalyzeErrorCode.InvalidResponse,
      message: "Describe the EQ profile you want before asking Gemini.",
    };
  }

  try {
    const requestBody = buildGeminiEqProfileRequestBody({
      userRequest,
      existingProfiles: Array.isArray(request.existingProfiles)
        ? request.existingProfiles
        : [],
      songContext: request.songContext,
    });

    const { response } = await fetchGeminiGenerateContentWithRetries({
      apiKey,
      requestBody,
    });

    if (!response.ok) {
      const errorResponse = await readGeminiErrorResponse(response);
      return {
        ok: false,
        code: GeminiAnalyzeErrorCode.RequestFailed,
        message: errorResponse.message,
      };
    }

    return parseGeminiEqProfileResponse(await response.json());
  } catch {
    return {
      ok: false,
      code: GeminiAnalyzeErrorCode.RequestFailed,
      message: GEMINI_GENERIC_FAILURE_MESSAGE,
    };
  }
};
```

- [ ] **Step 5: Wire the message case**

Modify `onMessageHandler` in `src/background/index.ts`:

```ts
    case MsgType.GenerateEqProfileWithGemini:
      return generateEqProfileWithGemini({
        userRequest: message.userRequest,
        existingProfiles: message.existingProfiles,
        songContext: message.songContext,
      });
```

- [ ] **Step 6: Run the message test**

Run: `npm test -- --test-name-pattern="Gemini EQ profile generation message"`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/constants/msgType.ts src/background/index.ts src/screens/playlist/playlistLayout.spec.ts
git commit -m "feat: wire gemini eq profile background message"
```

---

### Task 3: Popup Response Normalizer And Action Hook

**Files:**
- Create: `src/screens/gemini/geminiEqProfileResponse.ts`
- Create: `src/screens/gemini/geminiEqProfileResponse.spec.ts`
- Modify: `src/screens/playlist/usePlaylistActions.ts`

- [ ] **Step 1: Write failing response normalizer tests**

Create `src/screens/gemini/geminiEqProfileResponse.spec.ts`:

```ts
import test from "node:test";
import { GeminiAnalyzeErrorCode } from "../../models/GeminiSettings";
import { normalizeGeminiEqProfileResponse } from "./geminiEqProfileResponse";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("normalizeGeminiEqProfileResponse returns handled failure for runtime errors", () => {
  expectEqual(
    normalizeGeminiEqProfileResponse(undefined, {
      message: "The message port closed before a response was received.",
    }),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.RequestFailed,
      message: "The message port closed before a response was received.",
    }
  );
});

test("normalizeGeminiEqProfileResponse rejects malformed successes", () => {
  const expected = {
    ok: false,
    code: GeminiAnalyzeErrorCode.RequestFailed,
    message: "Couldn't generate an EQ profile. Try again.",
  };

  expectEqual(normalizeGeminiEqProfileResponse({ ok: true }), expected);
  expectEqual(
    normalizeGeminiEqProfileResponse({
      ok: true,
      suggestion: {
        name: "Warm",
        audioEq: { clearBass: 1 },
      },
    }),
    expected
  );
});

test("normalizeGeminiEqProfileResponse preserves valid successes", () => {
  expectEqual(
    normalizeGeminiEqProfileResponse({
      ok: true,
      suggestion: {
        name: "Warm",
        audioEq: {
          clearBass: 1,
          band400: 1,
          band1k: 2,
          band2k5: 2,
          band6k3: 0,
          band16k: -1,
        },
        reason: "Warmer vocal profile.",
      },
    }),
    {
      ok: true,
      suggestion: {
        name: "Warm",
        audioEq: {
          clearBass: 1,
          band400: 1,
          band1k: 2,
          band2k5: 2,
          band6k3: 0,
          band16k: -1,
        },
        reason: "Warmer vocal profile.",
      },
    }
  );
});

test("normalizeGeminiEqProfileResponse preserves valid failures", () => {
  expectEqual(
    normalizeGeminiEqProfileResponse({
      ok: false,
      code: GeminiAnalyzeErrorCode.MissingApiKey,
      message: "Add a key.",
    }),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.MissingApiKey,
      message: "Add a key.",
    }
  );
});
```

- [ ] **Step 2: Run the failing response tests**

Run: `npm test -- --test-name-pattern=normalizeGeminiEqProfileResponse`

Expected: TypeScript compile fails because the normalizer file does not exist.

- [ ] **Step 3: Implement popup response normalization**

Create `src/screens/gemini/geminiEqProfileResponse.ts`:

```ts
import { AUDIO_EQ_BANDS, normalizeAudioEqSettings } from "../../utils/audioEq";
import { GeminiAnalyzeErrorCode } from "../../models/GeminiSettings";
import type {
  GeminiEqProfileSuggestionFailure,
  GeminiEqProfileSuggestionResponse,
} from "../../models/GeminiActions";

type RuntimeErrorLike = {
  message?: string;
} | null | undefined;

const FALLBACK_MESSAGE = "Couldn't generate an EQ profile. Try again.";
const ALLOWED_FAILURE_CODES = [
  GeminiAnalyzeErrorCode.MissingApiKey,
  GeminiAnalyzeErrorCode.RequestFailed,
  GeminiAnalyzeErrorCode.InvalidResponse,
];

const createFailure = (
  message = FALLBACK_MESSAGE,
): GeminiEqProfileSuggestionFailure => ({
  ok: false,
  code: GeminiAnalyzeErrorCode.RequestFailed,
  message,
});

const isAllowedFailureCode = (value: unknown) => {
  return ALLOWED_FAILURE_CODES.includes(value as GeminiAnalyzeErrorCode);
};

const hasValidAudioEqShape = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return AUDIO_EQ_BANDS.every((band) => {
    const rawValue = (value as Record<string, unknown>)[band.key];
    return typeof rawValue === "number" && Number.isFinite(rawValue);
  });
};

const normalizeGeminiEqProfileResponse = (
  response: unknown,
  runtimeError?: RuntimeErrorLike,
): GeminiEqProfileSuggestionResponse => {
  if (runtimeError?.message) {
    return createFailure(runtimeError.message);
  }

  if (!response || typeof response !== "object") {
    return createFailure();
  }

  if ((response as any).ok === true) {
    const suggestion = (response as any).suggestion;
    if (
      !suggestion ||
      typeof suggestion.name !== "string" ||
      !suggestion.name.trim() ||
      !hasValidAudioEqShape(suggestion.audioEq)
    ) {
      return createFailure();
    }

    return {
      ok: true,
      suggestion: {
        name: suggestion.name.trim(),
        audioEq: normalizeAudioEqSettings(suggestion.audioEq),
        reason: typeof suggestion.reason === "string" ? suggestion.reason : "",
      },
    };
  }

  if (
    (response as any).ok === false &&
    isAllowedFailureCode((response as any).code) &&
    typeof (response as any).message === "string"
  ) {
    return {
      ok: false,
      code: (response as any).code,
      message: (response as any).message,
    };
  }

  return createFailure();
};

export { normalizeGeminiEqProfileResponse };
```

- [ ] **Step 4: Add the action hook request function**

Modify imports in `src/screens/playlist/usePlaylistActions.ts`:

```ts
import type {
  GeminiEqProfileSuggestionFailure,
  GeminiEqProfileSuggestionResponse,
  GeminiEqProfileUserRequest,
} from "../../models/GeminiActions";
import { normalizeGeminiEqProfileResponse } from "../gemini/geminiEqProfileResponse";
```

Add this function near `analyzeSongBoundaries`:

```ts
  const requestGeminiEqProfile = (
    request: GeminiEqProfileUserRequest,
  ): Promise<GeminiEqProfileSuggestionResponse> => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          name: MsgType.GenerateEqProfileWithGemini,
          userRequest: request.userRequest,
          existingProfiles: request.existingProfiles,
          songContext: request.songContext,
        },
        (response) => {
          resolve(
            normalizeGeminiEqProfileResponse(
              response,
              chrome.runtime.lastError,
            ),
          );
        },
      );
    });
  };
```

Include `requestGeminiEqProfile` in the returned object.

Remove `GeminiEqProfileSuggestionFailure` from the import if TypeScript reports it unused.

- [ ] **Step 5: Run response tests**

Run: `npm test -- --test-name-pattern=normalizeGeminiEqProfileResponse`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/gemini/geminiEqProfileResponse.ts src/screens/gemini/geminiEqProfileResponse.spec.ts src/screens/playlist/usePlaylistActions.ts
git commit -m "feat: normalize gemini eq profile responses"
```

---

### Task 4: Reusable Builder Component

**Files:**
- Create: `src/screens/gemini/GeminiEqProfileBuilder.tsx`
- Create: `src/screens/gemini/GeminiEqProfileBuilder.module.css`
- Create: `src/screens/gemini/GeminiEqProfileBuilder.spec.ts`

- [ ] **Step 1: Write source-level component behavior tests**

Create `src/screens/gemini/GeminiEqProfileBuilder.spec.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(
  join(process.cwd(), "src/screens/gemini/GeminiEqProfileBuilder.tsx"),
  "utf8",
);

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("GeminiEqProfileBuilder exposes back and settings actions", () => {
  expectEqual(source.includes("onBack"), true);
  expectEqual(source.includes("onOpenSettings"), true);
  expectEqual(source.includes("aria-label=\"Back to playlist\""), true);
  expectEqual(source.includes("aria-label=\"Open Gemini settings\""), true);
});

test("GeminiEqProfileBuilder requests Gemini before creating a profile", () => {
  expectEqual(source.includes("requestGeminiEqProfile"), true);
  expectEqual(source.includes("onCreateProfile(suggestion.name, suggestion.audioEq)"), true);
  expectEqual(source.includes("if (!suggestion)"), true);
});

test("GeminiEqProfileBuilder supports optional song context", () => {
  expectEqual(source.includes("songContext?"), true);
  expectEqual(source.includes("songContext,"), true);
});
```

- [ ] **Step 2: Run the failing component source tests**

Run: `npm test -- --test-name-pattern=GeminiEqProfileBuilder`

Expected: FAIL because `GeminiEqProfileBuilder.tsx` does not exist.

- [ ] **Step 3: Implement builder styles**

Create `src/screens/gemini/GeminiEqProfileBuilder.module.css`:

```css
.panel {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 14px 14px 18px;
  box-sizing: border-box;
  color: var(--text-primary);
  background: var(--surface-primary);
}

.header {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  border-bottom: 1px solid var(--border-color);
}

.title {
  flex: 1 1 auto;
  margin: 0;
  font-size: 17px;
  line-height: 1.2;
}

.iconButton {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 999px;
  color: var(--text-primary);
  background: transparent;
  font-size: 18px;
  line-height: 1;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 14px;
  min-height: 0;
  overflow-y: auto;
}

.label {
  display: grid;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
}

.textarea {
  min-height: 96px;
  resize: vertical;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-secondary);
  color: var(--text-primary);
  box-sizing: border-box;
  padding: 10px 11px;
  font: inherit;
  line-height: 1.4;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.primaryButton,
.secondaryButton {
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 700;
}

.primaryButton {
  border: 0;
  background: var(--accent-color);
  color: var(--surface-primary);
}

.secondaryButton {
  border: 1px solid var(--border-color);
  background: var(--surface-secondary);
  color: var(--text-primary);
}

.primaryButton:disabled,
.secondaryButton:disabled {
  opacity: 0.55;
}

.message {
  min-height: 20px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.preview {
  display: grid;
  gap: 10px;
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
}

.previewTitle {
  margin: 0;
  font-size: 15px;
}

.reason {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.bandList {
  display: grid;
  gap: 6px;
  margin: 0;
}

.bandRow {
  display: grid;
  grid-template-columns: minmax(72px, 1fr) auto;
  gap: 10px;
  align-items: center;
  font-size: 13px;
}
```

- [ ] **Step 4: Implement the reusable builder component**

Create `src/screens/gemini/GeminiEqProfileBuilder.tsx`:

```tsx
import { useState } from "react";
import type AudioEqSettings from "../../models/AudioEq";
import type AudioEqProfile from "../../models/AudioEqProfile";
import type {
  GeminiEqProfileSuggestion,
  GeminiEqProfileSuggestionResponse,
  GeminiEqProfileUserRequest,
  GeminiSongContext,
} from "../../models/GeminiActions";
import { AUDIO_EQ_BANDS } from "../../utils/audioEq";
import styles from "./GeminiEqProfileBuilder.module.css";

interface Props {
  existingProfiles: AudioEqProfile[];
  songContext?: GeminiSongContext;
  onBack: () => void;
  onOpenSettings: () => void;
  onCreateProfile: (name: string, audioEq: AudioEqSettings) => void;
  requestGeminiEqProfile: (
    request: GeminiEqProfileUserRequest,
  ) => Promise<GeminiEqProfileSuggestionResponse>;
}

const GeminiEqProfileBuilder = ({
  existingProfiles,
  songContext,
  onBack,
  onOpenSettings,
  onCreateProfile,
  requestGeminiEqProfile,
}: Props) => {
  const [userRequest, setUserRequest] = useState("");
  const [isGenerating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [suggestion, setSuggestion] = useState<GeminiEqProfileSuggestion | null>(
    null,
  );

  const onGenerate = async () => {
    const normalizedRequest = userRequest.trim();
    if (!normalizedRequest || isGenerating) {
      setMessage("Describe the EQ profile you want first.");
      return;
    }

    setGenerating(true);
    setMessage("");
    setSuggestion(null);

    try {
      const response = await requestGeminiEqProfile({
        userRequest: normalizedRequest,
        existingProfiles,
        songContext,
      });

      if (!response.ok) {
        setMessage(response.message);
        return;
      }

      setSuggestion(response.suggestion);
      setMessage("Review the EQ profile before creating it.");
    } catch {
      setMessage("Couldn't generate an EQ profile. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const onCreate = () => {
    if (!suggestion) {
      return;
    }

    onCreateProfile(suggestion.name, suggestion.audioEq);
    setMessage("EQ profile created.");
    setSuggestion(null);
    setUserRequest("");
  };

  return (
    <section className={styles.panel} aria-label="Gemini EQ profile builder">
      <header className={styles.header}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onBack}
          aria-label="Back to playlist"
        >
          {"<"}
        </button>
        <h2 className={styles.title}>Gemini EQ</h2>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onOpenSettings}
          aria-label="Open Gemini settings"
        >
          Settings
        </button>
      </header>
      <div className={styles.body}>
        <label className={styles.label}>
          Desired sound
          <textarea
            className={styles.textarea}
            value={userRequest}
            onChange={(event) => {
              setUserRequest(event.currentTarget.value);
              setMessage("");
            }}
            placeholder="Make a warm vocal profile for acoustic live performances."
          />
        </label>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={isGenerating}
            onClick={onGenerate}
          >
            {isGenerating ? "Generating..." : "Generate"}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onOpenSettings}
          >
            Gemini settings
          </button>
        </div>
        <p className={styles.message}>{message}</p>
        {suggestion ? (
          <section className={styles.preview} aria-label="Gemini EQ preview">
            <h3 className={styles.previewTitle}>{suggestion.name}</h3>
            {suggestion.reason ? (
              <p className={styles.reason}>{suggestion.reason}</p>
            ) : null}
            <dl className={styles.bandList}>
              {AUDIO_EQ_BANDS.map((band) => (
                <div key={band.key} className={styles.bandRow}>
                  <dt>{band.label}</dt>
                  <dd>{suggestion.audioEq[band.key]}</dd>
                </div>
              ))}
            </dl>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={onCreate}
              >
                Create profile
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setSuggestion(null);
                  setMessage("");
                }}
              >
                Dismiss
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
};

export default GeminiEqProfileBuilder;
```

The settings control uses text to stay consistent with this codebase's simple popup controls and to keep the new file ASCII-only.

- [ ] **Step 5: Run component tests**

Run: `npm test -- --test-name-pattern=GeminiEqProfileBuilder`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/gemini/GeminiEqProfileBuilder.tsx src/screens/gemini/GeminiEqProfileBuilder.module.css src/screens/gemini/GeminiEqProfileBuilder.spec.ts
git commit -m "feat: add gemini eq profile builder component"
```

---

### Task 5: Popup Integration

**Files:**
- Modify: `src/screens/playlist/usePlaylistScreenState.ts`
- Modify: `src/screens/playlist/usePlaylistActions.ts`
- Modify: `src/screens/playlist/PlaylistHeader.tsx`
- Modify: `src/screens/playlist/Playlist.tsx`
- Modify: `src/screens/playlist/playlistLayout.spec.ts`

- [ ] **Step 1: Write failing integration source tests**

Add to `src/screens/playlist/playlistLayout.spec.ts`:

```ts
test("playlist menu exposes the Gemini EQ builder separately from Gemini settings", () => {
  expectEqual(playlistHeaderSource.includes("Gemini EQ"), true);
  expectEqual(playlistHeaderSource.includes("onOpenGeminiEqBuilder"), true);
});

test("playlist renders the reusable Gemini EQ builder screen", () => {
  expectEqual(playlistSource.includes("GeminiEqProfileBuilder"), true);
  expectEqual(playlistSource.includes("requestGeminiEqProfile"), true);
  expectEqual(playlistSource.includes("onCreateProfile={onCreateProfile}"), true);
});
```

- [ ] **Step 2: Run the failing integration tests**

Run: `npm test -- --test-name-pattern="Gemini EQ builder"`

Expected: FAIL because the menu and builder are not integrated.

- [ ] **Step 3: Add screen state**

Modify `src/screens/playlist/usePlaylistScreenState.ts`:

```ts
  const [isGeminiEqBuilderOpen, setIsGeminiEqBuilderOpen] = useState(false);
```

Include these in the returned object:

```ts
    isGeminiEqBuilderOpen,
    setIsGeminiEqBuilderOpen,
```

- [ ] **Step 4: Add open/close actions**

Modify `UsePlaylistActionsArgs` in `src/screens/playlist/usePlaylistActions.ts`:

```ts
  setIsGeminiEqBuilderOpen: Dispatch<SetStateAction<boolean>>;
```

Add to destructuring:

```ts
  setIsGeminiEqBuilderOpen,
```

Add functions near Gemini settings open/close:

```ts
  const openGeminiEqBuilder = () => {
    setIsGeminiEqBuilderOpen(true);
  };

  const closeGeminiEqBuilder = () => {
    setIsGeminiEqBuilderOpen(false);
  };
```

Include both in the returned object:

```ts
    closeGeminiEqBuilder,
    openGeminiEqBuilder,
```

- [ ] **Step 5: Add header prop and menu row**

Modify `src/screens/playlist/PlaylistHeader.tsx` props:

```ts
  onOpenGeminiEqBuilder: () => void;
```

Add it to destructuring:

```ts
  onOpenGeminiEqBuilder,
```

Insert a menu item after `EQ Profiles`:

```ts
      {
        id: 4,
        description: "Gemini EQ",
        callback: onOpenGeminiEqBuilder,
      },
      {
        id: 5,
        description: "Gemini",
        callback: onOpenGeminiSettings,
      },
```

Renumber later hard-coded `id` values in the same array so each row remains unique.

- [ ] **Step 6: Render the builder in Playlist**

Modify imports in `src/screens/playlist/Playlist.tsx`:

```ts
import GeminiEqProfileBuilder from "../gemini/GeminiEqProfileBuilder";
```

Destructure state:

```ts
    isGeminiEqBuilderOpen,
    setIsGeminiEqBuilderOpen,
```

Destructure actions:

```ts
    closeGeminiEqBuilder,
    openGeminiEqBuilder,
    requestGeminiEqProfile,
```

Pass setter into `usePlaylistActions`:

```ts
    setIsGeminiEqBuilderOpen,
```

Pass header prop:

```tsx
            onOpenGeminiEqBuilder={openGeminiEqBuilder}
```

Render the builder before the normal playlist page content so it acts like a component-level screen:

```tsx
  if (isGeminiEqBuilderOpen) {
    return (
      <>
        <GeminiEqProfileBuilder
          existingProfiles={audioEqProfiles}
          onBack={closeGeminiEqBuilder}
          onOpenSettings={openGeminiSettings}
          onCreateProfile={onCreateProfile}
          requestGeminiEqProfile={requestGeminiEqProfile}
        />
        <GeminiSettingsModal
          active={isGeminiSettingsOpen}
          close={closeGeminiSettings}
          geminiApiKey={geminiApiKey}
          onSaveGeminiApiKey={onSaveGeminiApiKey}
          onRemoveGeminiApiKey={onRemoveGeminiApiKey}
        />
      </>
    );
  }
```

Place this `if` after all hooks and derived values, before the existing `return`.

- [ ] **Step 7: Run integration tests**

Run: `npm test -- --test-name-pattern="Gemini EQ builder"`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/screens/playlist/usePlaylistScreenState.ts src/screens/playlist/usePlaylistActions.ts src/screens/playlist/PlaylistHeader.tsx src/screens/playlist/Playlist.tsx src/screens/playlist/playlistLayout.spec.ts
git commit -m "feat: integrate gemini eq builder screen"
```

---

### Task 6: Full Verification And Polish

**Files:**
- Modify only files needed to fix test/build failures found in this task.

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: PASS and build artifacts emitted to `build/`.

- [ ] **Step 3: Inspect git diff**

Run: `git status --short`

Expected: only intentional files are modified or clean if all task commits were made.

Run: `git log --oneline -6`

Expected: recent commits include the task commits from this plan.

- [ ] **Step 4: Final commit for verification fixes if needed**

If Step 1 or Step 2 required fixes, commit only those fixes:

```bash
git add <fixed-files>
git commit -m "fix: polish gemini eq profile builder"
```

If no fixes were needed, do not create an empty commit.
