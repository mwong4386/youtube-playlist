# Gemini EQ Profile Builder POC Design

## Purpose

Add a proof-of-concept Gemini-assisted EQ profile builder. The first version lets a user describe the sound they want, sends Gemini only the app-approved EQ/profile context, receives a contracted `createEqProfile` function response, validates it, previews it, and creates the profile only after the user confirms.

This POC deliberately excludes multi-turn Gemini questions, direct edits, and song-specific EQ mutation. The design should still leave clean extension points for those later capabilities.

## Goals

- Let users create an EQ profile from a natural-language request.
- Keep Gemini in a review-first flow: it suggests, the user applies.
- Define an app-owned capability contract: what Gemini may know and which function it may return.
- Build reusable UI and request logic so later Gemini features can plug in new capabilities and preview renderers.
- Reuse the existing EQ profile storage/update behavior instead of creating a parallel write path.

## Non-Goals

- No autonomous data mutation by Gemini.
- No multi-turn `askUserQuestion` flow in the POC.
- No song-specific EQ adjustment in the POC.
- No playlist-wide recommendations in the POC.
- No arbitrary chat interface.

## User Experience

The popup gets a reusable Gemini EQ builder surface rendered like a component-level screen. It has a compact header with:

- Back action
- Title: `Gemini EQ`
- Settings action for the Gemini API key modal

The body contains:

- A request field for the desired sound.
- A generate action.
- Loading and error states.
- A preview card for Gemini's proposed profile.
- A create action that writes the profile after review.

Example user request:

```text
Make a warm vocal profile for acoustic live performances.
```

Example preview:

- Name: `Warm Live Vocal`
- EQ bands: normalized/clamped values for the six existing bands.
- Reason: short explanation from Gemini, displayed as supporting text only.

The profile is not saved until the user clicks create.

## Capability Contract

Introduce a small Gemini capability model. A capability defines the bounded task Gemini is allowed to perform.

```ts
type GeminiCapabilityName = "create-eq-profile";

type GeminiContextScope =
  | "eqBandContract"
  | "existingEqProfiles"
  | "currentSong";

type GeminiFunctionName = "createEqProfile";

type GeminiCapability = {
  name: GeminiCapabilityName;
  allowedContext: GeminiContextScope[];
  allowedFunctions: GeminiFunctionName[];
};
```

For the POC:

```ts
const createEqProfileCapability = {
  name: "create-eq-profile",
  allowedContext: ["eqBandContract", "existingEqProfiles", "currentSong"],
  allowedFunctions: ["createEqProfile"],
};
```

`currentSong` is optional. If the builder is opened from a song context later, the app may include song title, channel, video ID, YouTube URL, and current EQ. If it is opened from settings or the main menu, the request works without song context.

The prompt should tell Gemini that only the listed function is allowed and that it must return JSON only.

## Function Contract

Gemini must return this shape:

```ts
type GeminiCreateEqProfileFunctionCall = {
  functionName: "createEqProfile";
  arguments: {
    name: string;
    audioEq: {
      clearBass: number;
      band400: number;
      band1k: number;
      band2k5: number;
      band6k3: number;
      band16k: number;
    };
    reason?: string;
  };
};
```

Validation rules:

- `functionName` must be exactly `createEqProfile`.
- `name` must be a non-empty string after trimming.
- Every EQ band must be present.
- Every EQ band must be finite and clamped to the existing app range, `-10` through `10`.
- Unknown fields are ignored.
- Invalid or missing JSON returns a handled failure instead of creating anything.

The validated result becomes a suggestion model:

```ts
type GeminiEqProfileSuggestion = {
  name: string;
  audioEq: AudioEqSettings;
  reason: string;
};
```

## Context Access

Gemini does not receive raw storage or broad app state. The app assembles a context packet from the capability's allowed scopes.

For `eqBandContract`:

- Band names: `clearBass`, `band400`, `band1k`, `band2k5`, `band6k3`, `band16k`
- Min/max: `-10` to `10`
- Brief human meaning of each band where useful

For `existingEqProfiles`:

- Profile names
- Existing EQ settings
- Limit: current app profile limit, so Gemini can avoid proposing names that conflict with existing profiles

For optional `currentSong`:

- Title
- Channel name
- Video ID
- URL
- Current song EQ

The API key is never sent as context text. It is used only by the background request wrapper.

## Architecture

Add shared Gemini action modules near the existing Gemini parsing/request code:

- `src/models/GeminiActions.ts`
  Defines capability names, function names, request/response types, and suggestion types.
- `src/background/geminiEqProfiles.ts`
  Builds the `createEqProfile` request body and parses/validates Gemini responses.
- `src/screens/gemini/GeminiEqProfileBuilder.tsx`
  Reusable component for the POC UI.
- `src/screens/gemini/geminiEqProfileResponse.ts`
  Popup-side runtime response normalization, matching the existing `geminiAnalyzeResponse` pattern.

Reuse:

- `src/background/geminiRequest.ts` for the Gemini HTTP call and retry behavior.
- `src/utils/audioEq.ts` for normalization/clamping.
- `src/utils/audioEqProfiles.ts` for creating and saving profiles through existing callbacks.
- Existing Gemini API key settings modal for missing-key recovery.

Add one new message type:

```ts
MsgType.GenerateEqProfileWithGemini
```

The background owns Gemini calls, as it already does for song boundary analysis. The popup sends a request, receives a normalized success/failure, previews the result, and calls the existing profile-create callback when the user confirms.

## Component Boundary

`GeminiEqProfileBuilder` should be reusable and not directly read/write storage.

Proposed props:

```ts
type GeminiEqProfileBuilderProps = {
  existingProfiles: AudioEqProfile[];
  songContext?: GeminiSongContext;
  onBack: () => void;
  onOpenSettings: () => void;
  onCreateProfile: (name: string, audioEq: AudioEqSettings) => void;
  requestGeminiEqProfile: (
    request: GeminiEqProfileUserRequest,
  ) => Promise<GeminiEqProfileSuggestionResponse>;
};
```

This keeps the component portable. The current popup can render it as a screen, and a later modal/settings/song-editor surface can reuse it by providing the same props.

## Data Flow

1. User opens Gemini EQ builder.
2. User enters a sound requirement.
3. Popup sends `MsgType.GenerateEqProfileWithGemini` with requirement and optional song context.
4. Background reads the Gemini API key from local storage.
5. Background builds a request body using the `create-eq-profile` capability contract.
6. Background calls Gemini through `fetchGeminiGenerateContentWithRetries`.
7. Background extracts JSON, validates the `createEqProfile` function call, and returns a suggestion or failure.
8. Popup normalizes the response and renders the preview.
9. User clicks create.
10. Popup calls `onCreateProfile(name, audioEq)`, which reuses existing EQ profile persistence.

## Error Handling

Handled failures should include:

- Missing Gemini API key: show an inline message and provide the settings action.
- Gemini request failure: show the provider message when available.
- Invalid response: show a concise message that Gemini did not return a usable EQ profile.
- Empty user request: keep it client-side and do not call Gemini.
- Profile limit reached: rely on existing profile-list update behavior, but surface a note if the app would drop the oldest profile.

No failure should create or mutate a profile.

## Testing

Unit tests:

- Request body includes only allowed context.
- Parser accepts valid `createEqProfile` JSON.
- Parser rejects wrong function names.
- Parser rejects missing required bands.
- Parser clamps out-of-range EQ values using existing audio EQ rules.
- Popup response normalizer handles runtime errors and malformed payloads.

Layout/source tests:

- Builder exposes back and settings actions.
- Builder does not call `onCreateProfile` until the user confirms a valid suggestion.
- Builder can be rendered with or without `songContext`.

Build verification:

- Run `npm run build`.

## Future Extensions

Later capabilities can reuse the same shell:

- `adjust-song-eq`: allowed functions such as `suggestSongEqAdjustment`.
- `suggest-songs`: allowed functions such as `suggestSongs`.
- `askUserQuestion`: a non-mutating function that lets Gemini request clarification before proposing an action.
- Agentic mode: the same validated function calls can execute after a user grants explicit permission.

The POC should not implement these, but the types and component boundaries should avoid baking in assumptions that only EQ profile creation will exist.
