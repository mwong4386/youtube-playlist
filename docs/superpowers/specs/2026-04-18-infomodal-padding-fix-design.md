# InfoModal Padding and Volume Alignment Design

## Summary
Fix the visual issues where the song editor modal feels cramped (minimal padding) and the volume bar touches the modal boundary. This is achieved by increasing internal padding for the expanded state, removing negative margins, and ensuring the "mini player" (collapsed state) remains flush with the modal edges to preserve its existing layout.

## Goals
- Increase breathing room in the expanded editor modal.
- Fix the volume bar touching the boundary.
- Align editor labels (Start Time, End Time, Volume) for a clean vertical flow.
- Ensure the mini player (collapsed transport) remains visually unchanged and flush with the modal container.

## UX Design

### Expanded Modal
- Side padding for content increased to `24px`.
- Header row padding increased to `20px` to maintain a balanced look.
- Vertical spacing between the metadata (title/channel) and the editor section increased.

### Volume Control
- The volume row is restructured as a flex container.
- The volume label is aligned with the time grid labels (80px width).
- The slider fills the remaining space between the label and the value text.

### Collapsed Mini Player
- The outer content container's padding is removed (`0px`) when collapsed.
- This allows the `InfoModalTransport` component's internal padding (`18px`) to define the visual boundary, keeping it flush with the modal container as originally designed.

## Technical Implementation

### CSS Changes (`Modal.module.css`)

- **`.header-row`**: Update padding to `12px 20px 8px`.
- **`.content`**: Update padding to `12px 24px 4px`. (Added top padding for better separation from header).
- **`.content-collapsed`**: Explicitly set `padding: 0 !important` and `margin-bottom: 0`.
- **`.volume-row`**: (New) `display: flex; align-items: center; gap: 12px; margin-top: 16px;`.
- **`.volume-label`**: Remove `margin-left: -36px`, set `width: 80px`.
- **`.volume-slider`**: Add `flex: 1`.
- **`.time-label`**: Ensure width is `80px` (matching volume).

### Component Changes (`InfoModal.tsx`)

- Replace `<div className="cs-time-container">` for the volume section with `<div className={styles["volume-row"]}>`.
- Ensure all relevant style classes from `Modal.module.css` are correctly applied.

## Testing Plan

### Automated Tests
- Update `playlistLayout.spec.ts` (if applicable) to reflect new padding values.
- Verify `InfoModal` renders with `content-collapsed` class when presentation is `collapsed`.

### Manual Verification
1.  **Expanded View:** Open any song and verify the side padding feels spacious and the volume bar no longer touches the edge.
2.  **Label Alignment:** Check that "Start Time", "End Time", and "Volume" labels start at the same horizontal position.
3.  **Collapsed View:** Open the currently playing song. Verify the mini player sits flush against the modal boundaries (no double padding).
4.  **Transitions:** Expand the mini player and verify the layout shifts smoothly to the padded expanded state.
