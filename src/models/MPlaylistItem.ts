interface MPlaylistItem {
  id: string;
  title: string;
  channelName: string;
  url: string;
  videoId: string;
  timestamp: number;
  endTimestamp: number | undefined;
}

export default MPlaylistItem;
