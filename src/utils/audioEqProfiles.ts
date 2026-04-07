import AudioEqSettings, { DEFAULT_AUDIO_EQ_SETTINGS } from "../models/AudioEq";
import AudioEqProfile, {
  AUDIO_EQ_PROFILE_STORAGE_KEY,
  AUDIO_EQ_PROFILE_LIMIT,
} from "../models/AudioEqProfile";
import { normalizeAudioEqSettings } from "./audioEq";

interface NormalizeAudioEqProfilesOptions {
  hasStoredValue: boolean;
}

interface AudioEqProfileDraft {
  name: string;
  audioEq: AudioEqSettings;
}

const DEFAULT_AUDIO_EQ_PROFILE_NAME = "New profile";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const createAudioEqProfileId = () => {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  );
};

const normalizeAudioEqProfileAudioEq = (value: unknown): AudioEqSettings => {
  return normalizeAudioEqSettings(isRecord(value) ? value : undefined);
};

const cloneAudioEqProfile = (profile: AudioEqProfile): AudioEqProfile => {
  return {
    id: profile.id,
    name: profile.name,
    audioEq: cloneAudioEqProfileAudioEq(profile),
  };
};

const normalizeAudioEqProfile = (
  value: unknown,
): AudioEqProfile | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const { id, name, audioEq } = value;

  if (!isNonEmptyString(id) || !isNonEmptyString(name)) {
    return undefined;
  }

  return {
    id: id.trim(),
    name: name.trim(),
    audioEq: normalizeAudioEqProfileAudioEq(audioEq),
  };
};

const SEEDED_AUDIO_EQ_PROFILES: AudioEqProfile[] = [
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
  {
    id: "human-voice",
    name: "Human Voice",
    audioEq: {
      clearBass: -3,
      band400: 0,
      band1k: 5,
      band2k5: 4,
      band6k3: 1,
      band16k: -1,
    },
  },
];

const normalizeAudioEqProfiles = (
  value: unknown,
  options: NormalizeAudioEqProfilesOptions,
): AudioEqProfile[] => {
  if (!options.hasStoredValue) {
    return SEEDED_AUDIO_EQ_PROFILES.map(cloneAudioEqProfile);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const profiles: AudioEqProfile[] = [];

  for (const entry of value) {
    const profile = normalizeAudioEqProfile(entry);
    if (!profile) {
      continue;
    }

    profiles.push(profile);
    if (profiles.length >= AUDIO_EQ_PROFILE_LIMIT) {
      break;
    }
  }

  return profiles;
};

const readStoredAudioEqProfiles = (
  value: Record<string, unknown>,
): AudioEqProfile[] => {
  const hasStoredValue = Object.prototype.hasOwnProperty.call(
    value,
    AUDIO_EQ_PROFILE_STORAGE_KEY
  );

  return normalizeAudioEqProfiles(value[AUDIO_EQ_PROFILE_STORAGE_KEY], {
    hasStoredValue,
  });
};

const cloneAudioEqProfileAudioEq = (profile: AudioEqProfile): AudioEqSettings => {
  return normalizeAudioEqSettings(profile.audioEq);
};

const createAudioEqProfile = (
  name: string,
  audioEq: AudioEqSettings,
): AudioEqProfile => {
  const profileName = name.trim();
  return {
    id: createAudioEqProfileId(),
    name: profileName.length > 0 ? profileName : DEFAULT_AUDIO_EQ_PROFILE_NAME,
    audioEq: normalizeAudioEqSettings(audioEq),
  };
};

const createAudioEqProfileDraft = (
  profile?: AudioEqProfile | null,
): AudioEqProfileDraft => {
  return {
    name: profile?.name ?? "",
    audioEq: profile
      ? normalizeAudioEqProfileAudioEq(profile.audioEq)
      : { ...DEFAULT_AUDIO_EQ_SETTINGS },
  };
};

const updateAudioEqProfileDraftName = (
  draft: AudioEqProfileDraft,
  name: string,
): AudioEqProfileDraft => {
  return {
    ...draft,
    name,
  };
};

const updateAudioEqProfileDraftBand = (
  draft: AudioEqProfileDraft,
  bandKey: keyof AudioEqSettings,
  value: number,
): AudioEqProfileDraft => {
  return {
    ...draft,
    audioEq: {
      ...draft.audioEq,
      [bandKey]: value,
    },
  };
};

const areAudioEqSettingsEqual = (
  left: AudioEqSettings,
  right: AudioEqSettings,
) => {
  return (
    left.clearBass === right.clearBass &&
    left.band400 === right.band400 &&
    left.band1k === right.band1k &&
    left.band2k5 === right.band2k5 &&
    left.band6k3 === right.band6k3 &&
    left.band16k === right.band16k
  );
};

const isAudioEqProfileDraftDirty = (
  sourceProfile: AudioEqProfile | null,
  draft: AudioEqProfileDraft,
) => {
  if (!sourceProfile) {
    const defaultDraft = createAudioEqProfileDraft();
    return (
      draft.name !== defaultDraft.name ||
      !areAudioEqSettingsEqual(draft.audioEq, defaultDraft.audioEq)
    );
  }

  const sourceDraft = createAudioEqProfileDraft(sourceProfile);
  return (
    draft.name !== sourceDraft.name ||
    !areAudioEqSettingsEqual(draft.audioEq, sourceDraft.audioEq)
  );
};

const shouldReplaceAudioEqProfileDraft = ({
  sourceProfile,
  nextProfile,
  draft,
}: {
  sourceProfile: AudioEqProfile | null;
  nextProfile: AudioEqProfile | null;
  draft: AudioEqProfileDraft;
}) => {
  if (!nextProfile || !sourceProfile || sourceProfile.id !== nextProfile.id) {
    return true;
  }

  if (isAudioEqProfileDraftDirty(sourceProfile, draft)) {
    return false;
  }

  const sourceDraft = createAudioEqProfileDraft(sourceProfile);
  const nextDraft = createAudioEqProfileDraft(nextProfile);
  return (
    sourceDraft.name !== nextDraft.name ||
    !areAudioEqSettingsEqual(sourceDraft.audioEq, nextDraft.audioEq)
  );
};

const sanitizeAudioEqProfile = (profile: AudioEqProfile): AudioEqProfile => {
  return {
    id: isNonEmptyString(profile.id) ? profile.id.trim() : createAudioEqProfileId(),
    name:
      isNonEmptyString(profile.name)
        ? profile.name.trim()
        : DEFAULT_AUDIO_EQ_PROFILE_NAME,
    audioEq: normalizeAudioEqProfileAudioEq(profile.audioEq),
  };
};

const updateAudioEqProfileList = (
  profiles: AudioEqProfile[],
  nextProfile: AudioEqProfile,
): AudioEqProfile[] => {
  const normalizedProfiles = profiles
    .map((profile) => normalizeAudioEqProfile(profile))
    .filter((profile): profile is AudioEqProfile => !!profile);
  const normalizedProfile = sanitizeAudioEqProfile(nextProfile);
  const existingIndex = normalizedProfiles.findIndex(
    (profile) => profile.id === normalizedProfile.id
  );

  if (existingIndex >= 0) {
    return normalizedProfiles.map((profile, index) =>
      index === existingIndex ? normalizedProfile : profile
    );
  }

  const nextProfiles = [...normalizedProfiles, normalizedProfile];
  if (nextProfiles.length <= AUDIO_EQ_PROFILE_LIMIT) {
    return nextProfiles;
  }

  return nextProfiles.slice(nextProfiles.length - AUDIO_EQ_PROFILE_LIMIT);
};

const deleteAudioEqProfile = (
  profiles: AudioEqProfile[],
  id: string,
): AudioEqProfile[] => {
  return profiles.filter((profile) => profile.id !== id);
};

const selectAudioEqProfileAudioEqById = (
  profiles: AudioEqProfile[],
  id: string,
): AudioEqSettings | null => {
  const profile = profiles.find((entry) => entry.id === id);

  if (!profile) {
    return null;
  }

  return cloneAudioEqProfileAudioEq(profile);
};

const hasAudioEqProfileId = (profiles: AudioEqProfile[], id: string) => {
  return profiles.some((profile) => profile.id === id);
};

const normalizeSelectedAudioEqProfileId = (
  profiles: AudioEqProfile[],
  id: string,
) => {
  if (!id) {
    return "";
  }

  return hasAudioEqProfileId(profiles, id) ? id : "";
};

const clearSelectedAudioEqProfileId = (_id: string) => {
  return "";
};

export {
  clearSelectedAudioEqProfileId,
  SEEDED_AUDIO_EQ_PROFILES,
  cloneAudioEqProfileAudioEq,
  createAudioEqProfileDraft,
  createAudioEqProfile,
  deleteAudioEqProfile,
  hasAudioEqProfileId,
  isAudioEqProfileDraftDirty,
  normalizeSelectedAudioEqProfileId,
  normalizeAudioEqProfiles,
  readStoredAudioEqProfiles,
  selectAudioEqProfileAudioEqById,
  shouldReplaceAudioEqProfileDraft,
  updateAudioEqProfileDraftBand,
  updateAudioEqProfileDraftName,
  updateAudioEqProfileList,
};
export type { AudioEqProfileDraft };
