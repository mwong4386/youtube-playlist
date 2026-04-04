# Playback State Machine

This document describes the proposed explicit playback state machine for the extension background worker.

## State Model

- `status`: `idle | loading | playing | paused`
- `queueMode`: `off | sequential | random`
- context:
  - `currentItemId`
  - `currentTabId`
  - `isPip`
  - `enablePin`
  - `enableAdjustVideoVolume`

## Mermaid Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> Loading: PLAY_ITEM(item)
    Idle --> Loading: PLAY_ALL / choose first item
    Idle --> Loading: PLAY_ALL_RANDOM / choose random item

    Loading --> Playing: PAGE_READY + VIDEO_PLAY_EVENT
    Loading --> Paused: PAGE_READY + VIDEO_PAUSE_EVENT
    Loading --> Idle: LOAD_FAILED / TAB_REMOVED / NO_ITEM

    Playing --> Paused: PAUSE_VIDEO / VIDEO_PAUSE_EVENT
    Playing --> Loading: PLAY_ITEM(other item)
    Playing --> Playing: PLAY_ITEM(current item resume)
    Playing --> Loading: VIDEO_ENDED [queueMode=sequential] / choose next
    Playing --> Loading: VIDEO_ENDED [queueMode=random] / choose random
    Playing --> Idle: VIDEO_ENDED [queueMode=off]
    Playing --> Idle: TAB_REMOVED

    Paused --> Playing: PLAY_ITEM(current item resume)
    Paused --> Loading: PLAY_ITEM(other item)
    Paused --> Loading: PLAY_ALL / keep current or choose first
    Paused --> Loading: PLAY_ALL_RANDOM / choose random
    Paused --> Idle: STOP_ALL / TAB_REMOVED

    Idle --> Idle: TOGGLE_PIN / TOGGLE_VOLUME_ADJUST
    Loading --> Loading: TOGGLE_PIN / TOGGLE_VOLUME_ADJUST
    Playing --> Playing: TOGGLE_PIN / TOGGLE_VOLUME_ADJUST / ENTER_PIP / EXIT_PIP / VOLUME_CHANGE
    Paused --> Paused: TOGGLE_PIN / TOGGLE_VOLUME_ADJUST / ENTER_PIP / EXIT_PIP / VOLUME_CHANGE
```

## Proposed State Shape

```ts
type PlaybackStatus = "idle" | "loading" | "playing" | "paused";
type QueueMode = "off" | "sequential" | "random";

interface PlaybackState {
  status: PlaybackStatus;
  queueMode: QueueMode;
  currentItemId: string | null;
  currentTabId: number | null;
  isPip: boolean;
  enablePin: boolean;
  enableAdjustVideoVolume: boolean;
}
```
