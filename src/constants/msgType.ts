const enum MsgType {
  PlayVideo,
  PauseVideo,
  PlayAll,
  PlayAllRandom,
  PauseAll,
  VideoPlayEvent,
  VideoPauseEvent,
  VideoEnd,
  DeleteVideo,
  OpenPictureInWindow,
  TogglePin,
  ToggleVolumeAdjust,
  VolumeChange,
  AudioEqChange,
  EnterPip,
  ExitPip,
}

export default MsgType;
