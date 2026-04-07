import test from "node:test";
import { DEFAULT_AUDIO_EQ_SETTINGS } from "../models/AudioEq";
import {
  AUDIO_EQ_PROFILE_LIMIT,
  AUDIO_EQ_PROFILE_STORAGE_KEY,
} from "../models/AudioEqProfile";
import {
  createAudioEqProfileDraft,
  createAudioEqProfile,
  deleteAudioEqProfile,
  isAudioEqProfileDraftDirty,
  SEEDED_AUDIO_EQ_PROFILES,
  shouldReplaceAudioEqProfileDraft,
  cloneAudioEqProfileAudioEq,
  normalizeAudioEqProfiles,
  readStoredAudioEqProfiles,
  updateAudioEqProfileList,
} from "./audioEqProfiles";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("normalizeAudioEqProfiles returns seeded defaults when storage key is missing", () => {
  const result = normalizeAudioEqProfiles(undefined, { hasStoredValue: false });

  expectEqual(result, SEEDED_AUDIO_EQ_PROFILES);
});

test("normalizeAudioEqProfiles keeps an intentional empty profile array", () => {
  const result = normalizeAudioEqProfiles([], { hasStoredValue: true });

  expectEqual(result, []);
});

test("readStoredAudioEqProfiles seeds only when the storage key is missing", () => {
  const result = readStoredAudioEqProfiles({});

  expectEqual(result, SEEDED_AUDIO_EQ_PROFILES);
});

test("readStoredAudioEqProfiles keeps an existing empty array", () => {
  const result = readStoredAudioEqProfiles({
    [AUDIO_EQ_PROFILE_STORAGE_KEY]: [],
  });

  expectEqual(result, []);
});

test("normalizeAudioEqProfiles ignores malformed entries, clamps EQ, and caps profile count", () => {
  const result = normalizeAudioEqProfiles(
    [
      null,
      { id: "missing-name", audioEq: { clearBass: 99 } },
      {
        id: "flat-1",
        name: " Flat One ",
        audioEq: {
          clearBass: -11,
          band400: 2.2,
          band1k: 0,
          band2k5: 1,
          band6k3: 9.9,
          band16k: 10.4,
        },
      },
      {
        id: "flat-2",
        name: "Flat Two",
        audioEq: {
          clearBass: 0,
          band400: 1,
          band1k: 2,
          band2k5: 3,
          band6k3: 4,
          band16k: 5,
        },
      },
      {
        id: "flat-3",
        name: "Flat Three",
        audioEq: {
          clearBass: 0,
          band400: 1,
          band1k: 2,
          band2k5: 3,
          band6k3: 4,
          band16k: 5,
        },
      },
      {
        id: "flat-4",
        name: "Flat Four",
        audioEq: {
          clearBass: 0,
          band400: 1,
          band1k: 2,
          band2k5: 3,
          band6k3: 4,
          band16k: 5,
        },
      },
      {
        id: "flat-5",
        name: "Flat Five",
        audioEq: {
          clearBass: 0,
          band400: 1,
          band1k: 2,
          band2k5: 3,
          band6k3: 4,
          band16k: 5,
        },
      },
      {
        id: "flat-6",
        name: "Flat Six",
        audioEq: {
          clearBass: 0,
          band400: 1,
          band1k: 2,
          band2k5: 3,
          band6k3: 4,
          band16k: 5,
        },
      },
      {
        id: "flat-7",
        name: "Flat Seven",
        audioEq: {
          clearBass: 0,
          band400: 1,
          band1k: 2,
          band2k5: 3,
          band6k3: 4,
          band16k: 5,
        },
      },
      {
        id: "flat-8",
        name: "Flat Eight",
        audioEq: {
          clearBass: 0,
          band400: 1,
          band1k: 2,
          band2k5: 3,
          band6k3: 4,
          band16k: 5,
        },
      },
      {
        id: "flat-9",
        name: "Flat Nine",
        audioEq: {
          clearBass: 0,
          band400: 1,
          band1k: 2,
          band2k5: 3,
          band6k3: 4,
          band16k: 5,
        },
      },
      {
        id: "flat-10",
        name: "Flat Ten",
        audioEq: {
          clearBass: 0,
          band400: 1,
          band1k: 2,
          band2k5: 3,
          band6k3: 4,
          band16k: 5,
        },
      },
      {
        id: "flat-11",
        name: "Flat Eleven",
        audioEq: {
          clearBass: 0,
          band400: 1,
          band1k: 2,
          band2k5: 3,
          band6k3: 4,
          band16k: 5,
        },
      },
    ],
    { hasStoredValue: true }
  );

  expectEqual(result.length, AUDIO_EQ_PROFILE_LIMIT);
  expectEqual(result[0], {
    id: "flat-1",
    name: "Flat One",
    audioEq: {
      clearBass: -10,
      band400: 2,
      band1k: 0,
      band2k5: 1,
      band6k3: 10,
      band16k: 10,
    },
  });
  expectEqual(result[result.length - 1], {
    id: "flat-10",
    name: "Flat Ten",
    audioEq: {
      clearBass: 0,
      band400: 1,
      band1k: 2,
      band2k5: 3,
      band6k3: 4,
      band16k: 5,
    },
  });
});

test("normalizeAudioEqProfiles salvages valid profile metadata when audioEq is malformed", () => {
  const result = normalizeAudioEqProfiles(
    [
      {
        id: "profile-1",
        name: " Voice ",
        audioEq: null,
      },
    ],
    { hasStoredValue: true }
  );

  expectEqual(result, [
    {
      id: "profile-1",
      name: "Voice",
      audioEq: DEFAULT_AUDIO_EQ_SETTINGS,
    },
  ]);
});

test("cloneAudioEqProfileAudioEq returns a detached copy", () => {
  const profile = {
    id: "profile-1",
    name: "Profile 1",
    audioEq: {
      clearBass: 1,
      band400: 2,
      band1k: 3,
      band2k5: 4,
      band6k3: 5,
      band16k: 6,
    },
  };

  const cloned = cloneAudioEqProfileAudioEq(profile);
  cloned.clearBass = 10;

  expectEqual(profile.audioEq, {
    clearBass: 1,
    band400: 2,
    band1k: 3,
    band2k5: 4,
    band6k3: 5,
    band16k: 6,
  });
  expectEqual(cloned, {
    clearBass: 10,
    band400: 2,
    band1k: 3,
    band2k5: 4,
    band6k3: 5,
    band16k: 6,
  });
});

test("createAudioEqProfile trims the name and falls back for blanks", () => {
  const result = createAudioEqProfile("   ", {
    clearBass: 12,
    band400: 1.2,
    band1k: 0,
    band2k5: -1.2,
    band6k3: 8.8,
    band16k: -12,
  });

  expectEqual(result.name, "New profile");
  expectEqual(result.audioEq, {
    clearBass: 10,
    band400: 1,
    band1k: 0,
    band2k5: -1,
    band6k3: 9,
    band16k: -10,
  });
});

test("createAudioEqProfileDraft builds a normalized editable draft", () => {
  const result = createAudioEqProfileDraft({
    id: "profile-1",
    name: "Voice",
    audioEq: {
      clearBass: 12,
      band400: 1.2,
      band1k: 0,
      band2k5: -1.2,
      band6k3: 8.8,
      band16k: -12,
    },
  });

  expectEqual(result, {
    name: "Voice",
    audioEq: {
      clearBass: 10,
      band400: 1,
      band1k: 0,
      band2k5: -1,
      band6k3: 9,
      band16k: -10,
    },
  });
});

test("shouldReplaceAudioEqProfileDraft keeps dirty edits when another profile is removed", () => {
  const sourceProfile = {
    id: "profile-a",
    name: "Profile A",
    audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
  };

  const result = shouldReplaceAudioEqProfileDraft({
    sourceProfile,
    nextProfile: {
      id: "profile-a",
      name: "Profile A",
      audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
    },
    draft: {
      name: "Profile A",
      audioEq: {
        ...DEFAULT_AUDIO_EQ_SETTINGS,
        clearBass: 6,
      },
    },
  });

  expectEqual(result, false);
});

test("shouldReplaceAudioEqProfileDraft refreshes a clean editor when the edited profile changes externally", () => {
  const sourceProfile = {
    id: "profile-a",
    name: "Profile A",
    audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
  };

  const result = shouldReplaceAudioEqProfileDraft({
    sourceProfile,
    nextProfile: {
      id: "profile-a",
      name: "Profile A Updated",
      audioEq: {
        ...DEFAULT_AUDIO_EQ_SETTINGS,
        band1k: 4,
      },
    },
    draft: createAudioEqProfileDraft(sourceProfile),
  });

  expectEqual(result, true);
});

test("isAudioEqProfileDraftDirty compares a draft against its source profile", () => {
  const sourceProfile = {
    id: "profile-a",
    name: "Profile A",
    audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
  };

  expectEqual(
    isAudioEqProfileDraftDirty(sourceProfile, createAudioEqProfileDraft(sourceProfile)),
    false
  );
  expectEqual(
    isAudioEqProfileDraftDirty(sourceProfile, {
      name: "Profile A Edited",
      audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
    }),
    true
  );
});

test("updateAudioEqProfileList normalizes existing entries and repairs blank next profiles", () => {
  const result = updateAudioEqProfileList(
    [
      {
        id: "keep",
        name: " Keep ",
        audioEq: {
          clearBass: 12,
          band400: 0,
          band1k: 0,
          band2k5: 0,
          band6k3: 0,
          band16k: 0,
        },
      },
      {
        id: "drop-me",
        name: "   ",
        audioEq: {
          clearBass: 1,
          band400: 1,
          band1k: 1,
          band2k5: 1,
          band6k3: 1,
          band16k: 1,
        },
      } as never,
    ],
    {
      id: "keep",
      name: " Updated ",
      audioEq: {
        clearBass: -12,
        band400: 2.4,
        band1k: 0,
        band2k5: 1,
        band6k3: 11,
        band16k: 3,
      },
    }
  );

  expectEqual(result, [
    {
      id: "keep",
      name: "Updated",
      audioEq: {
        clearBass: -10,
        band400: 2,
        band1k: 0,
        band2k5: 1,
        band6k3: 10,
        band16k: 3,
      },
    },
  ]);
});

test("updateAudioEqProfileList keeps a saved profile valid when next name is blank", () => {
  const result = updateAudioEqProfileList([], {
    id: "draft",
    name: "   ",
    audioEq: {
      clearBass: 0,
      band400: 0,
      band1k: 0,
      band2k5: 0,
      band6k3: 0,
      band16k: 0,
    },
  });

  expectEqual(result, [
    {
      id: "draft",
      name: "New profile",
      audioEq: {
        clearBass: 0,
        band400: 0,
        band1k: 0,
        band2k5: 0,
        band6k3: 0,
        band16k: 0,
      },
    },
  ]);
});

test("updateAudioEqProfileList appends a new profile and keeps insertion order", () => {
  const result = updateAudioEqProfileList(
    [
      {
        id: "first",
        name: "First",
        audioEq: {
          clearBass: 1,
          band400: 0,
          band1k: 0,
          band2k5: 0,
          band6k3: 0,
          band16k: 0,
        },
      },
      {
        id: "second",
        name: "Second",
        audioEq: {
          clearBass: 2,
          band400: 0,
          band1k: 0,
          band2k5: 0,
          band6k3: 0,
          band16k: 0,
        },
      },
    ],
    {
      id: "third",
      name: "Third",
      audioEq: {
        clearBass: 3,
        band400: 0,
        band1k: 0,
        band2k5: 0,
        band6k3: 0,
        band16k: 0,
      },
    }
  );

  expectEqual(
    result.map((profile) => profile.id),
    ["first", "second", "third"]
  );
});

test("updateAudioEqProfileList replaces an existing profile in place", () => {
  const result = updateAudioEqProfileList(
    [
      {
        id: "first",
        name: "First",
        audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
      },
      {
        id: "second",
        name: "Second",
        audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
      },
      {
        id: "third",
        name: "Third",
        audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
      },
    ],
    {
      id: "second",
      name: "Second Updated",
      audioEq: {
        clearBass: 4,
        band400: 3,
        band1k: 2,
        band2k5: 1,
        band6k3: 0,
        band16k: -1,
      },
    }
  );

  expectEqual(
    result.map((profile) => profile.id),
    ["first", "second", "third"]
  );
  expectEqual(result[1], {
    id: "second",
    name: "Second Updated",
    audioEq: {
      clearBass: 4,
      band400: 3,
      band1k: 2,
      band2k5: 1,
      band6k3: 0,
      band16k: -1,
    },
  });
});

test("deleteAudioEqProfile removes the matching id without mutating the input list", () => {
  const profiles = [
    {
      id: "one",
      name: "One",
      audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
    },
    {
      id: "two",
      name: "Two",
      audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
    },
  ];

  const result = deleteAudioEqProfile(profiles, "one");

  expectEqual(result, [
    {
      id: "two",
      name: "Two",
      audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
    },
  ]);
  expectEqual(profiles, [
    {
      id: "one",
      name: "One",
      audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
    },
    {
      id: "two",
      name: "Two",
      audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
    },
  ]);
});

test("deleteAudioEqProfile can return an intentional empty array", () => {
  const result = deleteAudioEqProfile(
    [
      {
        id: "only",
        name: "Only",
        audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
      },
    ],
    "only"
  );

  expectEqual(result, []);
});

test("model constants stay stable", () => {
  expectEqual(AUDIO_EQ_PROFILE_STORAGE_KEY, "audio_eq_profiles");
  expectEqual(AUDIO_EQ_PROFILE_LIMIT, 10);
});
