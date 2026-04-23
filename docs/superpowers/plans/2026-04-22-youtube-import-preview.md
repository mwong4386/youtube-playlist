# YouTube Import Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a checkbox preview step before YouTube playlist URL imports write songs into the active song list.

**Architecture:** Split YouTube URL import into background preview resolution and popup-side commit. Add small pure helpers for preview candidate derivation and selected-item commit so behavior is covered without depending on React rendering internals.

**Tech Stack:** React 18, TypeScript, Chrome extension runtime messaging, Node test runner.

---

### Task 1: Preview Helpers

**Files:**
- Create: `src/screens/playlist/playlistImportPreview.ts`
- Test: `src/screens/playlist/playlistImportPreview.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
test("createPlaylistImportPreview filters duplicates in append mode and selects all candidates", () => {
  const existing = [createPlaylistItem("saved")];
  const imported = [
    createPlaylistItem("saved", { id: "duplicate" }),
    createPlaylistItem("new-a"),
    createPlaylistItem("new-b"),
  ];

  expectDeepEqual(createPlaylistImportPreview(existing, imported, "append"), {
    items: [imported[1], imported[2]],
    selectedItemIds: ["new-a", "new-b"],
    skippedDuplicates: 1,
  });
});

test("commitPlaylistImportPreview replaces with only selected preview items", () => {
  const existing = [createPlaylistItem("saved")];
  const imported = [createPlaylistItem("new-a"), createPlaylistItem("new-b")];

  expectDeepEqual(
    commitPlaylistImportPreview(existing, imported, ["new-b"], "replace"),
    [imported[1]],
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/screens/playlist/playlistImportPreview.spec.ts`

Expected: FAIL because `playlistImportPreview.ts` does not exist.

- [ ] **Step 3: Implement helpers**

Add `createPlaylistImportPreview(existing, imported, mode)` and `commitPlaylistImportPreview(existing, previewItems, selectedItemIds, mode)`. Append mode skips duplicates by `videoId`; replace mode uses the preview items as the replacement source. Both functions preserve imported item order.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/screens/playlist/playlistImportPreview.spec.ts`

Expected: PASS.

### Task 2: Background Preview Message

**Files:**
- Modify: `src/constants/msgType.ts`
- Modify: `src/models/PlaylistImport.ts`
- Modify: `src/background/youtubePlaylistImport.ts`
- Modify: `src/background/index.ts`
- Test: `src/background/youtubePlaylistImport.spec.ts`

- [ ] **Step 1: Write failing test**

Add a test proving preview resolves items without calling `writePlaylist`:

```ts
test("previewYoutubePlaylistImport returns resolved items without writing storage", async () => {
  const imported = [createPlaylistItem("imported-video")];
  let wrote = false;

  const response = await previewYoutubePlaylistImport(
    { playlistUrl: "https://www.youtube.com/playlist?list=PLabc" },
    {
      resolvePlaylist: async () => imported,
      writePlaylist: async () => {
        wrote = true;
      },
    },
  );

  expectEqual(response.ok, true);
  if (response.ok) {
    expectDeepEqual(response.items, imported);
  }
  expectEqual(wrote, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/background/youtubePlaylistImport.spec.ts`

Expected: FAIL because `previewYoutubePlaylistImport` is not implemented.

- [ ] **Step 3: Implement message and types**

Add `MsgType.PreviewYoutubePlaylistImport`, `PlaylistImportPreviewRequest`, and `PlaylistImportPreviewResponse`. Implement `previewYoutubePlaylistImport` using URL validation and `resolveYoutubePlaylist`, returning `{ ok: true, items }` or the existing failure shape. Register the new message in `background/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/background/youtubePlaylistImport.spec.ts`

Expected: PASS.

### Task 3: Modal Preview UI

**Files:**
- Modify: `src/screens/playlist/PlaylistImportModal.tsx`
- Modify: `src/screens/playlist/PlaylistImportModal.module.css`
- Modify: `src/screens/playlist/usePlaylistActions.ts`
- Modify: `src/screens/playlist/Playlist.tsx`

- [ ] **Step 1: Wire preview submit**

Change the modal `onSubmit` prop to request preview items. Store preview state with `source`, `mode`, `items`, and `selectedItemIds`. Keep JSON import unchanged.

- [ ] **Step 2: Render checkbox preview**

When preview state exists, show title, summary, select-all control, song rows, Back, Cancel, and Insert selected. Every item starts checked. Disable Insert selected when none are checked.

- [ ] **Step 3: Commit selected items**

On Insert selected, call a popup action that applies `commitPlaylistImportPreview` to the active list, closes the modal, and clears preview state.

- [ ] **Step 4: Run full tests and build**

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: PASS.
