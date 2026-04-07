# EQ Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable EQ profiles managed from popup settings, let songs copy a selected profile into their own EQ values, hide the song profile selector when the saved profile list is empty, and cap saved profiles at 10.

**Architecture:** Keep playlist item `audioEq` storage unchanged and add a separate sync-storage key for reusable profiles. Put profile normalization, seeding, cloning, and CRUD-limit rules in pure utilities with node-based tests, then wire those helpers into a new popup settings modal and the existing song edit modal.

**Tech Stack:** React 18, TypeScript, react-hook-form, chrome.storage.sync, uuid, node:test, Vite

---

## File Structure

- Create: `src/models/AudioEqProfile.ts`
  Holds the saved profile shape plus the shared storage-key and limit constants.
- Create: `src/utils/audioEqProfiles.ts`
  Owns seeded starter profiles, normalization, cloning, create/update/delete helpers, and the missing-key vs empty-array behavior.
- Create: `src/utils/audioEqProfiles.spec.ts`
  Covers seeding, empty-array preservation, malformed-entry filtering, EQ clamping, cloning, and the 10-profile limit.
- Create: `src/screens/settings/SettingsModal.tsx`
  Popup settings surface that contains theme controls and EQ profile CRUD.
- Create: `src/screens/settings/SettingsModal.module.css`
  Styling for the new settings modal and inline profile editor.
- Modify: `src/screens/playlist/Playlist.tsx`
  Load and persist profiles, open/close settings, pass settings/profile props to the header and song modal.
- Modify: `src/screens/playlist/PlaylistHeader.tsx`
  Replace the inline theme selector action with a `Settings` action that opens the new modal.
- Modify: `src/screens/modal/InfoModal.tsx`
  Render the profile selector only when profiles exist and copy profile EQ values into the form on selection.
- Modify: `src/screens/modal/Modal.module.css`
  Add small shared form styles only if the settings modal cannot reuse existing modal classes cleanly.

## Task 1: Add EQ Profile Model And Utilities

**Files:**
- Create: `src/models/AudioEqProfile.ts`
- Create: `src/utils/audioEqProfiles.ts`
- Test: `src/utils/audioEqProfiles.spec.ts`

- [ ] **Step 1: Write the failing utility test**

```ts
import test from "node:test";
import AudioEqProfile, {
  AUDIO_EQ_PROFILE_LIMIT,
  AUDIO_EQ_PROFILE_STORAGE_KEY,
} from "../models/AudioEqProfile";
import {
  SEEDED_AUDIO_EQ_PROFILES,
  cloneAudioEqProfileAudioEq,
  normalizeAudioEqProfiles,
} from "./audioEqProfiles";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("normalizeAudioEqProfiles returns seeded defaults when storage key is missing", () => {
  expectEqual(
    normalizeAudioEqProfiles(undefined, { hasStoredValue: false }),
    SEEDED_AUDIO_EQ_PROFILES
  );
});

test("normalizeAudioEqProfiles keeps an intentional empty profile array", () => {
  expectEqual(normalizeAudioEqProfiles([], { hasStoredValue: true }), []);
});

test("normalizeAudioEqProfiles ignores malformed entries, clamps EQ, and caps profile count", () => {
  const oversized = Array.from({ length: AUDIO_EQ_PROFILE_LIMIT + 2 }, (_, index) => ({
    id: `profile-${index}`,
    name: `Profile ${index}`,
    audioEq: {
      clearBass: 99,
      band400: 3.2,
      band1k: 0,
      band2k5: -14,
      band6k3: 2.4,
      band16k: -1.2,
    },
  }));

  const result = normalizeAudioEqProfiles(
    [{ id: "", name: "bad", audioEq: {} }, ...oversized, { nope: true }],
    { hasStoredValue: true }
  );

  expectEqual(result.length, AUDIO_EQ_PROFILE_LIMIT);
  expectEqual(result[0]?.audioEq, {
    clearBass: 10,
    band400: 3,
    band1k: 0,
    band2k5: -10,
    band6k3: 2,
    band16k: -1,
  });
});

test("cloneAudioEqProfileAudioEq returns a detached copy", () => {
  const cloned = cloneAudioEqProfileAudioEq(SEEDED_AUDIO_EQ_PROFILES[0]);
  cloned.clearBass = 9;

  expectEqual(SEEDED_AUDIO_EQ_PROFILES[0]?.audioEq.clearBass, 0);
});

test("model constants stay stable", () => {
  expectEqual(AUDIO_EQ_PROFILE_STORAGE_KEY, "audio_eq_profiles");
  expectEqual(AUDIO_EQ_PROFILE_LIMIT, 10);
});
```

- [ ] **Step 2: Run the utility test to verify it fails**

Run: `npx tsc --project tsconfig.test.json && node --test .test-dist/utils/audioEqProfiles.spec.js`

Expected: FAIL with module-not-found or missing-export errors for `AudioEqProfile` and `audioEqProfiles`.

- [ ] **Step 3: Write the minimal model and utility implementation**

```ts
// src/models/AudioEqProfile.ts
import AudioEqSettings from "./AudioEq";

interface AudioEqProfile {
  id: string;
  name: string;
  audioEq: AudioEqSettings;
}

const AUDIO_EQ_PROFILE_STORAGE_KEY = "audio_eq_profiles";
const AUDIO_EQ_PROFILE_LIMIT = 10;

export default AudioEqProfile;
export { AUDIO_EQ_PROFILE_LIMIT, AUDIO_EQ_PROFILE_STORAGE_KEY };
```

```ts
// src/utils/audioEqProfiles.ts
import { v4 as uuidv4 } from "uuid";
import AudioEqProfile, {
  AUDIO_EQ_PROFILE_LIMIT,
} from "../models/AudioEqProfile";
import AudioEqSettings, { DEFAULT_AUDIO_EQ_SETTINGS } from "../models/AudioEq";
import { cloneAudioEqSettings, normalizeAudioEqSettings } from "./audioEq";

const SEEDED_AUDIO_EQ_PROFILES: AudioEqProfile[] = [
  {
    id: "seed-flat",
    name: "Flat",
    audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
  },
  {
    id: "seed-metal",
    name: "Metal",
    audioEq: {
      clearBass: 7,
      band400: 4,
      band1k: -2,
      band2k5: 2,
      band6k3: 5,
      band16k: 6,
    },
  },
  {
    id: "seed-human-voice",
    name: "Human Voice",
    audioEq: {
      clearBass: -2,
      band400: 1,
      band1k: 4,
      band2k5: 5,
      band6k3: 2,
      band16k: -1,
    },
  },
];

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

const normalizeAudioEqProfile = (value: unknown): AudioEqProfile | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    audioEq: normalizeAudioEqSettings(
      isRecord(value.audioEq) ? value.audioEq : undefined
    ),
  };
};

const normalizeAudioEqProfiles = (
  value: unknown,
  options: { hasStoredValue: boolean }
): AudioEqProfile[] => {
  if (!options.hasStoredValue) {
    return SEEDED_AUDIO_EQ_PROFILES.map((profile) => ({
      ...profile,
      audioEq: cloneAudioEqSettings(profile.audioEq),
    }));
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeAudioEqProfile)
    .filter((profile): profile is AudioEqProfile => !!profile)
    .slice(0, AUDIO_EQ_PROFILE_LIMIT);
};

const cloneAudioEqProfileAudioEq = (profile: AudioEqProfile): AudioEqSettings => {
  return cloneAudioEqSettings(profile.audioEq);
};

const createAudioEqProfile = (
  name: string,
  audioEq: AudioEqSettings
): AudioEqProfile => {
  return {
    id: uuidv4(),
    name: name.trim(),
    audioEq: cloneAudioEqSettings(audioEq),
  };
};

const updateAudioEqProfileList = (
  profiles: AudioEqProfile[],
  nextProfile: AudioEqProfile
) => {
  const withoutCurrent = profiles.filter((profile) => profile.id !== nextProfile.id);
  return [...withoutCurrent, nextProfile].slice(0, AUDIO_EQ_PROFILE_LIMIT);
};

const deleteAudioEqProfile = (profiles: AudioEqProfile[], id: string) => {
  return profiles.filter((profile) => profile.id !== id);
};

export {
  SEEDED_AUDIO_EQ_PROFILES,
  cloneAudioEqProfileAudioEq,
  createAudioEqProfile,
  deleteAudioEqProfile,
  normalizeAudioEqProfiles,
  updateAudioEqProfileList,
};
```

- [ ] **Step 4: Run the utility test to verify it passes**

Run: `npx tsc --project tsconfig.test.json && node --test .test-dist/utils/audioEqProfiles.spec.js`

Expected: PASS for all `audioEqProfiles` utility cases.

- [ ] **Step 5: Commit**

```bash
git add src/models/AudioEqProfile.ts src/utils/audioEqProfiles.ts src/utils/audioEqProfiles.spec.ts
git commit -m "feat: add EQ profile utilities"
```

## Task 2: Wire Popup State And Settings Entry Point

**Files:**
- Create: `src/screens/settings/SettingsModal.tsx`
- Create: `src/screens/settings/SettingsModal.module.css`
- Modify: `src/screens/playlist/Playlist.tsx`
- Modify: `src/screens/playlist/PlaylistHeader.tsx`
- Modify: `src/utils/audioEqProfiles.ts`
- Test: `src/utils/audioEqProfiles.spec.ts`

- [ ] **Step 1: Extend the failing utility test with a storage-reader helper**

```ts
import { AUDIO_EQ_PROFILE_STORAGE_KEY } from "../models/AudioEqProfile";
import {
  readStoredAudioEqProfiles,
  SEEDED_AUDIO_EQ_PROFILES,
} from "./audioEqProfiles";

test("readStoredAudioEqProfiles seeds only when the storage key is missing", () => {
  expectEqual(readStoredAudioEqProfiles({}), SEEDED_AUDIO_EQ_PROFILES);
});

test("readStoredAudioEqProfiles keeps an existing empty array", () => {
  expectEqual(
    readStoredAudioEqProfiles({ [AUDIO_EQ_PROFILE_STORAGE_KEY]: [] }),
    []
  );
});

test("storage key name is the one Playlist will read and write", () => {
  expectEqual(AUDIO_EQ_PROFILE_STORAGE_KEY, "audio_eq_profiles");
});
```

- [ ] **Step 2: Run the utility test to verify the new assertions fail if helpers or constants drift**

Run: `npx tsc --project tsconfig.test.json && node --test .test-dist/utils/audioEqProfiles.spec.js`

Expected: FAIL with a missing-export error for `readStoredAudioEqProfiles`.

- [ ] **Step 3: Add popup state loading plus the settings modal shell**

```tsx
// src/screens/playlist/Playlist.tsx
import AudioEqProfile, {
  AUDIO_EQ_PROFILE_STORAGE_KEY,
} from "../../models/AudioEqProfile";
import {
  createAudioEqProfile,
  deleteAudioEqProfile,
  readStoredAudioEqProfiles,
  updateAudioEqProfileList,
} from "../../utils/audioEqProfiles";
import SettingsModal from "../settings/SettingsModal";

const [audioEqProfiles, setAudioEqProfiles] = useState<AudioEqProfile[]>([]);
const [settingsActive, setSettingsActive] = useState(false);

useEffect(() => {
  chrome.storage.sync.get([AUDIO_EQ_PROFILE_STORAGE_KEY], (result) => {
    setAudioEqProfiles(readStoredAudioEqProfiles(result));
  });
}, []);

useEffect(() => {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
    if (AUDIO_EQ_PROFILE_STORAGE_KEY in changes) {
      setAudioEqProfiles(
        readStoredAudioEqProfiles({
          [AUDIO_EQ_PROFILE_STORAGE_KEY]:
            changes[AUDIO_EQ_PROFILE_STORAGE_KEY].newValue,
        })
      );
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}, []);

const saveProfiles = (nextProfiles: AudioEqProfile[]) => {
  setAudioEqProfiles(nextProfiles);
  chrome.storage.sync.set({
    [AUDIO_EQ_PROFILE_STORAGE_KEY]: nextProfiles,
  });
};

const onCreateProfile = (name: string, audioEq: AudioEqSettings) => {
  saveProfiles(updateAudioEqProfileList(audioEqProfiles, createAudioEqProfile(name, audioEq)));
};

const onUpdateProfile = (profile: AudioEqProfile) => {
  saveProfiles(updateAudioEqProfileList(audioEqProfiles, profile));
};

const onDeleteProfile = (id: string) => {
  saveProfiles(deleteAudioEqProfile(audioEqProfiles, id));
};
```

```ts
// src/utils/audioEqProfiles.ts
import { AUDIO_EQ_PROFILE_STORAGE_KEY } from "../models/AudioEqProfile";

const readStoredAudioEqProfiles = (value: Record<string, unknown>) => {
  const hasStoredValue = Object.prototype.hasOwnProperty.call(
    value,
    AUDIO_EQ_PROFILE_STORAGE_KEY
  );

  return normalizeAudioEqProfiles(value[AUDIO_EQ_PROFILE_STORAGE_KEY], {
    hasStoredValue,
  });
};

export { readStoredAudioEqProfiles };
```

```tsx
// src/screens/playlist/PlaylistHeader.tsx
interface props {
  onDelete: () => void;
  onOpenSettings: () => void;
  playlist: MPlaylistItem[];
}

const openMenuWithTheme = () => {
  ctx.setActionSheet([
    ...(playing ? [{ id: 1, description: `${isPIP ? "Hide" : "Show"} Picture in Picture`, callback: onPlayInPicture }] : []),
    { id: 2, description: "Settings", callback: onOpenSettings },
    { id: 3, description: `${enablePin ? "Hide" : "Show"} player pin`, callback: onTogglePin },
    { id: 4, description: `${enableAdjustVideoVolume ? "Disable" : "Enable"} Volume adjust`, callback: onToggleVolumeAdjust },
    { id: 5, description: "Import Playlist", callback: onImportJson },
    { id: 6, description: "Export Playlist", callback: onExportJson },
    { id: 7, description: "Delete All", callback: onDelete },
  ]);
  ctx.open();
};
```

```tsx
// src/screens/settings/SettingsModal.tsx
import Modal from "../modal/Modal";

const SettingsModal = ({
  active,
  close,
  themePreference,
  setThemePreference,
  profiles,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
}: Props) => {
  return (
    <Modal active={active} close={close}>
      <div className={styles["settings-panel"]}>
        <div className={styles["header-row"]}>
          <button type="button" className={styles["close-button"]} onClick={close}>
            x
          </button>
          <p className={styles["title"]}>Settings</p>
          <span className={styles["spacer"]} />
        </div>
        <section className={styles["section"]}>
          <p className={styles["section-title"]}>Theme</p>
          <p className={styles["section-note"]}>Theme controls render here.</p>
        </section>
        <section className={styles["section"]}>
          <p className={styles["section-title"]}>EQ Profiles</p>
          <p className={styles["section-note"]}>{profiles.length}/10 profiles</p>
        </section>
      </div>
    </Modal>
  );
};
```

- [ ] **Step 4: Run build to verify popup wiring and the modal shell compile**

Run: `npm run build`

Expected: PASS with the popup bundle compiling and no TypeScript errors from the new settings modal props.

- [ ] **Step 5: Commit**

```bash
git add src/screens/settings/SettingsModal.tsx src/screens/settings/SettingsModal.module.css src/screens/playlist/Playlist.tsx src/screens/playlist/PlaylistHeader.tsx src/utils/audioEqProfiles.ts src/utils/audioEqProfiles.spec.ts
git commit -m "feat: add EQ profile settings entry point"
```

## Task 3: Implement Settings Theme And EQ Profile CRUD UI

**Files:**
- Modify: `src/screens/settings/SettingsModal.tsx`
- Modify: `src/screens/settings/SettingsModal.module.css`
- Modify: `src/screens/playlist/Playlist.tsx`

- [ ] **Step 1: Add the failing utility tests for create, update, and delete profile operations**

```ts
import { createAudioEqProfile, deleteAudioEqProfile, updateAudioEqProfileList } from "./audioEqProfiles";
import { DEFAULT_AUDIO_EQ_SETTINGS } from "../models/AudioEq";

test("updateAudioEqProfileList appends a new profile and keeps insertion order", () => {
  const created = createAudioEqProfile("Podcast", DEFAULT_AUDIO_EQ_SETTINGS);
  const result = updateAudioEqProfileList([], created);

  expectEqual(result.map((profile) => profile.name), ["Podcast"]);
});

test("updateAudioEqProfileList replaces an existing profile in place", () => {
  const result = updateAudioEqProfileList(
    [
      {
        id: "seed-flat",
        name: "Flat",
        audioEq: DEFAULT_AUDIO_EQ_SETTINGS,
      },
      {
        id: "seed-metal",
        name: "Metal",
        audioEq: DEFAULT_AUDIO_EQ_SETTINGS,
      },
    ],
    {
      id: "seed-flat",
      name: "Flat Edited",
      audioEq: DEFAULT_AUDIO_EQ_SETTINGS,
    }
  );

  expectEqual(result.map((profile) => profile.name), ["Flat Edited", "Metal"]);
});

test("deleteAudioEqProfile can return an intentional empty array", () => {
  expectEqual(
    deleteAudioEqProfile(
      [{ id: "only", name: "Only", audioEq: DEFAULT_AUDIO_EQ_SETTINGS }],
      "only"
    ),
    []
  );
});
```

- [ ] **Step 2: Run the utility tests to verify the CRUD cases fail before UI wiring depends on them**

Run: `npx tsc --project tsconfig.test.json && node --test .test-dist/utils/audioEqProfiles.spec.js`

Expected: FAIL until the list-update helpers preserve order, replace by `id`, and allow an empty result.

- [ ] **Step 3: Build the actual settings editor UI**

```ts
// src/utils/audioEqProfiles.ts
const updateAudioEqProfileList = (
  profiles: AudioEqProfile[],
  nextProfile: AudioEqProfile
) => {
  const existingIndex = profiles.findIndex(
    (profile) => profile.id === nextProfile.id
  );

  if (existingIndex >= 0) {
    return profiles.map((profile, index) =>
      index === existingIndex ? nextProfile : profile
    );
  }

  return [...profiles, nextProfile].slice(0, AUDIO_EQ_PROFILE_LIMIT);
};
```

```tsx
// src/screens/settings/SettingsModal.tsx
const [editingId, setEditingId] = useState<string | null>(null);
const [draftName, setDraftName] = useState("");
const [draftEq, setDraftEq] = useState(DEFAULT_AUDIO_EQ_SETTINGS);
const profileLimitReached = profiles.length >= AUDIO_EQ_PROFILE_LIMIT;

const startCreate = () => {
  setEditingId(null);
  setDraftName("");
  setDraftEq({ ...DEFAULT_AUDIO_EQ_SETTINGS });
};

const startEdit = (profile: AudioEqProfile) => {
  setEditingId(profile.id);
  setDraftName(profile.name);
  setDraftEq(cloneAudioEqProfileAudioEq(profile));
};

const saveDraft = () => {
  const trimmedName = draftName.trim();
  if (!trimmedName) return;

  if (editingId) {
    onUpdateProfile({ id: editingId, name: trimmedName, audioEq: draftEq });
  } else if (!profileLimitReached) {
    onCreateProfile(trimmedName, draftEq);
  }
};

return (
  <Modal active={active} close={close}>
    <div className={styles["settings-panel"]}>
      <section className={styles["section"]}>
        <p className={styles["section-title"]}>Theme</p>
        <div className={styles["theme-grid"]}>
          {THEME_PREFERENCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={themePreference === option.value ? styles["theme-button-active"] : styles["theme-button"]}
              onClick={() => setThemePreference(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles["section"]}>
        <div className={styles["section-header"]}>
          <p className={styles["section-title"]}>EQ Profiles</p>
          {!profileLimitReached && (
            <button type="button" className={styles["inline-button"]} onClick={startCreate}>
              New
            </button>
          )}
        </div>

        <p className={styles["section-note"]}>{profiles.length}/10 profiles</p>

        {profiles.map((profile) => (
          <div key={profile.id} className={styles["profile-card"]}>
            <div>
              <p className={styles["profile-name"]}>{profile.name}</p>
              <p className={styles["profile-summary"]}>
                {AUDIO_EQ_BANDS.map((band) => `${band.shortLabel} ${profile.audioEq[band.key]}`).join(" · ")}
              </p>
            </div>
            <div className={styles["profile-actions"]}>
              <button type="button" onClick={() => startEdit(profile)}>Edit</button>
              <button type="button" onClick={() => onDeleteProfile(profile.id)}>Delete</button>
            </div>
          </div>
        ))}

        <div className={styles["editor-card"]}>
          <input
            type="text"
            value={draftName}
            maxLength={40}
            placeholder="Profile name"
            onChange={(event) => setDraftName(event.currentTarget.value)}
          />
          {AUDIO_EQ_BANDS.map((band) => (
            <label key={band.key} className={styles["slider-row"]}>
              <span>{band.label}</span>
              <input
                type="range"
                min={AUDIO_EQ_MIN}
                max={AUDIO_EQ_MAX}
                value={draftEq[band.key]}
                onChange={(event) =>
                  setDraftEq({
                    ...draftEq,
                    [band.key]: clampAudioEqValue(Number(event.currentTarget.value)),
                  })
                }
              />
            </label>
          ))}
          <button type="button" className={styles["save-profile-button"]} onClick={saveDraft}>
            {editingId ? "Save Profile" : "Create Profile"}
          </button>
        </div>
      </section>
    </div>
  </Modal>
);
```

```css
/* src/screens/settings/SettingsModal.module.css */
.settings-panel {
  max-height: min(90vh, 760px);
  overflow-y: auto;
  padding: 0 12px 16px;
}

.section {
  margin-top: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.profile-card,
.editor-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  background: var(--surface-primary);
  margin-top: 8px;
}
```

- [ ] **Step 4: Run the helper tests and build**

Run: `npx tsc --project tsconfig.test.json && node --test .test-dist/utils/audioEqProfiles.spec.js && npm run build`

Expected: PASS for profile list behavior and popup compile.

- [ ] **Step 5: Commit**

```bash
git add src/screens/settings/SettingsModal.tsx src/screens/settings/SettingsModal.module.css src/screens/playlist/Playlist.tsx src/utils/audioEqProfiles.ts src/utils/audioEqProfiles.spec.ts
git commit -m "feat: add EQ profile settings management"
```

## Task 4: Apply Profiles In The Song Edit Modal

**Files:**
- Modify: `src/screens/modal/InfoModal.tsx`
- Modify: `src/screens/modal/Modal.module.css`
- Modify: `src/screens/playlist/Playlist.tsx`

- [ ] **Step 1: Extend the utility test with copy-not-link coverage for song usage**

```ts
import {
  getAudioEqForProfileSelection,
  SEEDED_AUDIO_EQ_PROFILES,
} from "./audioEqProfiles";

test("getAudioEqForProfileSelection returns a copied EQ payload for a known profile id", () => {
  const songEq = getAudioEqForProfileSelection(
    SEEDED_AUDIO_EQ_PROFILES,
    SEEDED_AUDIO_EQ_PROFILES[1].id
  );
  if (!songEq) {
    throw new Error("Expected selected profile EQ values");
  }
  songEq.band1k = -8;

  expectEqual(SEEDED_AUDIO_EQ_PROFILES[1]?.audioEq.band1k, -2);
});

test("getAudioEqForProfileSelection returns null for an unknown profile id", () => {
  expectEqual(getAudioEqForProfileSelection(SEEDED_AUDIO_EQ_PROFILES, "missing"), null);
});
```

- [ ] **Step 2: Run the utility test to verify it fails if song/profile data would share references**

Run: `npx tsc --project tsconfig.test.json && node --test .test-dist/utils/audioEqProfiles.spec.js`

Expected: FAIL with a missing-export error for `getAudioEqForProfileSelection`.

- [ ] **Step 3: Add the profile selector to the song modal**

```tsx
// src/screens/playlist/Playlist.tsx
<InfoModal
  active={!!selectItemId}
  close={() => setSelectItemId(undefined)}
  onvolumechange={onvolumechange}
  onAudioEqChange={onAudioEqChange}
  save={onSave}
  item={playlist.find((x) => x.id === selectItemId)}
  profiles={audioEqProfiles}
/>
```

```tsx
// src/screens/modal/InfoModal.tsx
import AudioEqProfile from "../../models/AudioEqProfile";
import { getAudioEqForProfileSelection } from "../../utils/audioEqProfiles";

interface props {
  profiles: AudioEqProfile[];
}

const {
  register,
  handleSubmit,
  watch,
  getValues,
  setValue,
  formState: { errors },
  reset,
} = useForm<infoModels>({
  defaultValues: {
    hours: 0,
    minutes: 0,
    seconds: 0,
    endHours: 0,
    endMinutes: 0,
    endSeconds: 0,
    untilEnd: false,
    volume: 0,
    ...DEFAULT_AUDIO_EQ_SETTINGS,
  },
});

const onProfileChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
  const nextEq = getAudioEqForProfileSelection(
    profiles,
    event.currentTarget.value
  );
  if (!nextEq) return;

  AUDIO_EQ_BANDS.forEach((band) => {
    setValue(band.key, nextEq[band.key]);
  });
};

return (
  <Modal active={active} close={close}>
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className={styles["content"]}>
        {profiles.length > 0 && (
          <div className={styles["profile-section"]}>
            <label className={styles["profile-label"]} htmlFor="audio-eq-profile">
              EQ Profile
            </label>
            <select
              id="audio-eq-profile"
              className={styles["profile-select"]}
              defaultValue=""
              onChange={onProfileChange}
            >
              <option value="" disabled>
                Select a profile
              </option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles["eq-section"]}>
          <p className={styles["eq-title"]}>Song EQ</p>
        </div>
      </div>
    </form>
  </Modal>
);
```

```ts
// src/utils/audioEqProfiles.ts
const getAudioEqForProfileSelection = (
  profiles: AudioEqProfile[],
  profileId: string
) => {
  const selectedProfile = profiles.find((profile) => profile.id === profileId);
  return selectedProfile ? cloneAudioEqProfileAudioEq(selectedProfile) : null;
};

export { getAudioEqForProfileSelection };
```

```css
/* src/screens/modal/Modal.module.css */
.profile-section {
  margin: 0 0 12px;
}

.profile-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: bold;
}

.profile-select {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-primary);
  color: var(--text-primary);
  padding: 10px 12px;
}
```

- [ ] **Step 4: Run tests, build, and manual verification**

Run: `npx tsc --project tsconfig.test.json && node --test .test-dist/utils/audioEqProfiles.spec.js && npm run build`

Expected: PASS for the profile utility suite and extension build.

Manual verification:

```text
1. Open the popup menu and tap "Settings".
2. Confirm seeded profiles appear on first load, then create, edit, and delete profiles.
3. Delete all profiles and confirm the settings list becomes empty.
4. Open a song edit modal and confirm the EQ Profile selector is hidden when the saved array is empty.
5. Recreate a profile, reopen the song modal, select it, and confirm all six song EQ sliders update.
6. Change one of the song sliders, save, reopen settings, and confirm the saved profile values did not change.
```

- [ ] **Step 5: Commit**

```bash
git add src/screens/modal/InfoModal.tsx src/screens/modal/Modal.module.css src/screens/playlist/Playlist.tsx
git commit -m "feat: apply EQ profiles to song editor"
```

## Task 5: Final Regression Pass

**Files:**
- Modify: `src/utils/audioEqProfiles.spec.ts` (only if final assertions are needed)
- Modify: `docs/superpowers/specs/2026-04-06-eq-profiles-design.md` (only if implementation requires a spec note)

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: PASS for all node-based utility specs.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: PASS for popup, background, and content-script bundles.

- [ ] **Step 3: Review the final diff for scope drift**

Run: `git diff --stat HEAD~4..HEAD`

Expected: only EQ profile utilities, settings modal files, popup wiring, and song modal files are touched.

- [ ] **Step 4: Commit any final follow-up adjustment**

```bash
git add src/utils/audioEqProfiles.spec.ts src/screens/settings/SettingsModal.tsx src/screens/modal/InfoModal.tsx
git commit -m "test: finalize EQ profile regression coverage"
```
