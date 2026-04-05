import {
  DEFAULT_AUDIO_EQ_SETTINGS,
  normalizeAudioEqSettings,
} from "./audioEq";
import MPlaylistItem from "../models/MPlaylistItem";

interface ParsePlaylistImportResult {
  playlist?: MPlaylistItem[];
  error?: string;
}

interface ParsePlaylistItemResult {
  item?: MPlaylistItem;
  error?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const getItemError = (index: number, key: string, message: string) => {
  return `Item ${index + 1} has an invalid "${key}" field: ${message}`;
};

const parsePlaylistItem = (
  value: unknown,
  index: number,
  usedIds: Set<string>
): ParsePlaylistItemResult => {
  if (!isRecord(value)) {
    return {
      error: `Item ${index + 1} must be a JSON object.`,
    };
  }

  const {
    id,
    title,
    channelName,
    url,
    videoId,
    timestamp,
    endTimestamp,
    maxDuration,
    volume,
    audioEq,
  } = value;

  if (
    !isNonEmptyString(title)
  ) {
    return {
      error: getItemError(index, "title", "expected a non-empty string"),
    };
  }

  if (!isNonEmptyString(channelName)) {
    return {
      error: getItemError(index, "channelName", "expected a non-empty string"),
    };
  }

  if (!isNonEmptyString(url)) {
    return {
      error: getItemError(index, "url", "expected a non-empty string"),
    };
  }

  if (!isNonEmptyString(videoId)) {
    return {
      error: getItemError(index, "videoId", "expected a non-empty string"),
    };
  }

  if (!isFiniteNumber(timestamp)) {
    return {
      error: getItemError(index, "timestamp", "expected a finite number"),
    };
  }

  if (!isFiniteNumber(maxDuration)) {
    return {
      error: getItemError(index, "maxDuration", "expected a finite number"),
    };
  }

  if (!isFiniteNumber(volume)) {
    return {
      error: getItemError(index, "volume", "expected a finite number"),
    };
  }

  if (timestamp < 0 || maxDuration < 0) {
    return {
      error: getItemError(
        index,
        timestamp < 0 ? "timestamp" : "maxDuration",
        "expected a non-negative number"
      ),
    };
  }

  if (
    endTimestamp !== undefined &&
    !isFiniteNumber(endTimestamp)
  ) {
    return {
      error: getItemError(index, "endTimestamp", "expected a finite number"),
    };
  }

  if (isFiniteNumber(endTimestamp) && endTimestamp < 0) {
    return {
      error: getItemError(index, "endTimestamp", "expected a non-negative number"),
    };
  }

  if (isFiniteNumber(endTimestamp) && endTimestamp <= timestamp) {
    return {
      error: getItemError(
        index,
        "endTimestamp",
        "expected a value greater than timestamp"
      ),
    };
  }

  const normalizedId =
    isNonEmptyString(id) && !usedIds.has(id) ? id : `${videoId}-${index}`;

  usedIds.add(normalizedId);

  return {
    item: {
      id: normalizedId,
      title: title.trim(),
      channelName: channelName.trim(),
      url: url.trim(),
      videoId: videoId.trim(),
      timestamp: Math.floor(timestamp),
      endTimestamp:
        endTimestamp === undefined
          ? undefined
          : Math.min(Math.floor(endTimestamp), Math.floor(maxDuration)),
      maxDuration: Math.floor(maxDuration),
      volume: clamp(Math.round(volume), 0, 100),
      audioEq: normalizeAudioEqSettings(
        isRecord(audioEq) ? audioEq : DEFAULT_AUDIO_EQ_SETTINGS
      ),
    },
  };
};

export const parseImportedPlaylist = (
  content: string
): ParsePlaylistImportResult => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    return { error: "The selected file is not valid JSON." };
  }

  if (!Array.isArray(parsed)) {
    return { error: "The playlist file must contain a JSON array." };
  }

  if (parsed.length === 0) {
    return { error: "The playlist file is empty." };
  }

  const usedIds = new Set<string>();
  const playlist: MPlaylistItem[] = [];

  for (let index = 0; index < parsed.length; index++) {
    const result = parsePlaylistItem(parsed[index], index, usedIds);
    if (result.error) {
      return { error: result.error };
    }

    if (result.item) {
      playlist.push(result.item);
    }
  }

  return { playlist };
};
