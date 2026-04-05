import AudioEqSettings from "./AudioEq";

interface MPlaylistItem {
  id: string;
  title: string;
  channelName: string;
  url: string;
  videoId: string;
  timestamp: number;
  endTimestamp: number | undefined;
  maxDuration: number;
  volume: number;
  audioEq: AudioEqSettings;
}

export default MPlaylistItem;
