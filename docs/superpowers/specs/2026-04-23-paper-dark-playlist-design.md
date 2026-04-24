# Paper Dark Playlist Design

## Goal

Refresh the popup playlist screen so it keeps the current feature set and layout structure, but shifts from a rounded glass-card aesthetic to a more editorial, typography-led "Paper Dark" interface.

## Scope

This design applies only to the playlist popup screen and its immediately visible playlist controls.

Included:
- Restyling the top playlist control bar
- Restyling playlist rows while preserving current interactions
- Updating visual states for playing, selected, hover, and empty states
- Preserving current modals, storage behavior, playlist actions, and feature set

Not included:
- Changing playlist data shape or persistence
- Changing runtime message behavior
- Adding new buttons, settings, or playlist features
- Redesigning modal screens beyond any small token alignment needed for consistency

## Current Problem

The current playlist screen uses large rounded cards, visible borders, and glass-like surfaces for both the top controls and every song row. That makes the popup feel soft and bubbly, but the user wants the same functionality to feel more focused, deliberate, and distinct from the existing glass language.

The redesign should therefore keep the current mental model intact while changing the visual tone:

- less floating-card UI
- less reliance on visible outlines
- more confidence from typography, spacing, and separators
- tighter controls that feel more like a music manager than a mobile widget

## Design Direction

The new direction is "Paper Dark":

- dark, mostly solid surfaces instead of translucent glass
- cleaner list rhythm with flatter row treatments
- typography as the primary hierarchy tool
- subtle dividers and row tinting instead of obvious card boundaries
- smaller, tighter controls with reduced visual softness

This should feel editorial and calm rather than glossy.

## Layout Structure

The structural layout remains unchanged:

1. Top playlist control bar
2. Scrollable playlist content
3. Song rows with:
   - selection checkbox
   - title and channel metadata
   - play/pause action

The user should not need to relearn where any action lives.

## Top Control Bar

The top control bar becomes a flatter utility rail rather than a floating pill.

Visual rules:
- use a darker solid or nearly solid surface
- reduce corner radius compared with the current bubble shape
- remove heavy glow and glass blur treatment
- rely on a bottom divider or subtle inset separation rather than a prominent border

Control treatment:
- left play button becomes smaller and tighter
- right menu button becomes simpler and more tool-like
- playlist selector remains centered and visually dominant, but through type weight rather than decorative chrome

The bar should feel stable and architectural, not buoyant.

## Playlist Rows

Playlist rows shift from self-contained rounded cards to flatter list entries.

Visual rules:
- rows should be separated by thin dividers, soft background bands, or both
- large capsule outlines should be removed
- row radii should be smaller and more restrained if any row container remains
- spacing should be consistent and slightly tighter than the current card layout

Content hierarchy:
- title stays bold and prominent
- channel name becomes a quieter secondary line
- secondary text can use uppercase or light letter spacing if it supports the editorial feel without harming readability

Action treatment:
- play buttons should be smaller than the current circular buttons
- preferred shape is a rounded rectangle or tight soft square
- inactive buttons should blend into the row more than they do now

## State Styling

State changes must remain clear without returning to the old glass-card language.

### Playing Row

The playing row should stand out through a restrained cue such as:
- a faint row tint
- a narrow accent marker
- a slightly stronger play button treatment

Avoid a full glowing card effect.

### Selected Row

Selection should remain easy to scan when multiple rows are checked.

Recommended cues:
- slightly darker or lighter row background
- clearer checkbox fill
- optional subtle leading marker if needed for quick scanning

### Hover / Pressed States

Hover and press feedback should be crisp and low-noise:
- small background shifts
- mild button darkening/lightening
- no large glow or animated bloom

## Empty State

The empty playlist view should follow the same quieter tone:
- centered message remains acceptable
- typography and spacing should match the new screen language
- avoid decorative glass cards unless needed for consistency with the rest of the page shell

## Relationship To Existing Features

This is a visual redesign, not a workflow redesign.

The following must remain behaviorally unchanged:
- selecting songs
- opening item details
- playing and pausing items
- drag-and-drop reordering outside selection mode
- import/analyze banners and selection actions behavior
- current playlist header actions and menus

If any component needs minor structural markup changes to support styling, those changes should preserve existing callbacks and semantics.

## Implementation Strategy

1. Update playlist CSS tokens and row styling in `src/screens/playlist/Playlist.module.css`.
2. Adjust `PlaylistItem.tsx` markup only where needed to support the flatter row structure and tighter control styling.
3. Keep `PlaylistContent.tsx` behavior unchanged unless a small wrapper or class change is needed for spacing rhythm.
4. Preserve existing responsive behavior while tightening radii, spacing, and button geometry for smaller popup widths.

## Testing Strategy

Verification should focus on preserving behavior while confirming the new visual language.

Manual checks:
- top control bar still aligns correctly on small popup widths
- checkbox, info tap area, and play button remain easy to interact with
- playing and selected states are still distinguishable
- drag-and-drop still works in non-selection mode
- long titles still clamp cleanly without breaking row rhythm

Automated checks:
- keep existing playlist behavior tests passing
- add or update tests only if markup changes affect accessible labels or interaction structure

## Success Criteria

The redesign is successful if:

- the playlist screen feels clearly different from the current glass-card UI
- the popup retains the same feature set and interaction model
- the screen feels cleaner, more editorial, and more deliberate
- state clarity remains strong even with subtler styling
- the popup still reads well on narrow extension widths
