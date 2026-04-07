# EQ Profiles Design

## Summary

Add reusable EQ profiles that are managed from popup settings and can be applied to an individual song from the edit modal. The app ships with a few seeded starter profiles such as Flat, Metal, and Human Voice. After seeding, all profiles behave the same way: users can create, edit, and delete them in settings.

Applying a profile to a song copies the profile's EQ band values into that song's `audioEq` settings. The song does not keep a reference to the profile, and later edits to the song do not change the saved profile.

## Goals

- Let users manage reusable EQ profiles in popup settings.
- Seed a few starter profiles for first-time use.
- Limit saved EQ profiles to a maximum of 10.
- Let the song edit modal apply a selected profile with one action.
- Preserve the current per-song EQ editing workflow after a profile is applied.

## Non-Goals

- Live-linking songs to profiles.
- Protecting seeded profiles from edits or deletion.
- Applying one profile change to many songs automatically.
- Changing the YouTube in-player EQ popup into a profile manager.

## UX Design

### Settings Entry Point

The existing popup menu gets a new `Settings` action. Selecting it opens a dedicated settings modal instead of expanding the action sheet with more controls.

The settings modal contains:

- The existing theme preference control.
- An `EQ Profiles` section.
- A list of existing profiles with name and a compact EQ summary.
- Actions to create a profile, edit a profile, and delete a profile.

### EQ Profiles In Settings

Users can:

- View all saved profiles.
- Create a new profile with a name and six EQ band values.
- Edit any existing profile, including the seeded starter profiles.
- Delete any existing profile.

Profile editing happens in the settings modal flow and uses the same EQ band sliders already used for songs so the experience stays familiar.
The settings UI prevents creating more than 10 total profiles. Once the limit is reached, the create action is disabled or hidden until a profile is deleted.

### EQ Profiles In Song Edit Modal

The song edit modal gets a profile picker above the song EQ sliders.

Behavior:

- Selecting a profile immediately copies that profile's six band values into the form state for the current song.
- The user can then fine-tune the sliders for that song.
- Saving the song stores only the song's own `audioEq` band values.
- The modal does not save or track a `profileId` on the song.

## Data Model

Add a new sync-storage key for EQ profiles.

```ts
type AudioEqProfile = {
  id: string;
  name: string;
  audioEq: AudioEqSettings;
};
```

Storage keys:

- `youtube_list`: unchanged playlist item storage.
- `audio_eq_profiles`: reusable EQ profiles for the popup.

Seeded defaults are defined in code and normalized on load. If storage does not contain profiles yet, the app uses the seeded defaults and can persist them on first profile change.

## Normalization And Compatibility

Add utilities that:

- normalize stored profile arrays
- clamp EQ values using existing EQ rules
- fill in seeded defaults when no profile storage exists yet
- return cloned profile EQ values when applying a profile to a song

Backward compatibility requirements:

- Existing playlists without profile support continue to load unchanged.
- Existing songs keep using their saved `audioEq`.
- Import and export of playlists remain unchanged because profiles are app settings, not playlist item data.

## Component Changes

### New Settings UI

Add a settings modal component to the popup flow. It is opened from `PlaylistHeader` and receives:

- `themePreference`
- `setThemePreference`
- profile list
- create/update/delete handlers

### Playlist Screen

`Playlist` becomes responsible for:

- loading EQ profiles from sync storage
- listening for storage changes to keep profiles in sync
- passing profile data and profile CRUD handlers to the settings modal
- passing profiles to `InfoModal`

### Song Edit Modal

`InfoModal` receives the profile list and:

- renders a profile selector
- updates the form EQ values when a profile is chosen
- keeps manual slider changes local to the song form

### Utilities

Extend audio EQ utilities with:

- seeded profile definitions
- profile normalization helpers
- profile cloning helpers

## Error Handling

- If profile storage is missing, load the seeded defaults.
- If stored profiles are malformed, normalize valid entries and ignore invalid data instead of reseeding starter profiles.
- If storage contains more than 10 profiles, keep the first 10 normalized entries and ignore the rest.
- If the selected profile is missing while editing a song, do nothing and keep current song EQ values.
- If deleting the last profile, allow it; the create action remains available and seeded defaults are still available on a fresh or reset store only.

## Testing

Add focused tests for:

- profile normalization and seeded fallback behavior
- malformed profile data is ignored without reseeding starter profiles
- profile lists are capped at 10 entries
- clamping invalid stored EQ values inside profiles
- applying a selected profile copies EQ values instead of linking by reference

Manual verification targets:

- open settings from the popup menu
- create, edit, and delete profiles
- edit a seeded profile
- choose a profile in the song modal and confirm sliders update
- save a song after adjusting copied EQ values
- reopen settings and confirm the saved profile did not change from song-level edits

## Implementation Notes

- Follow existing popup modal styling rather than introducing a separate settings page.
- Reuse the existing EQ slider labels, min/max values, and normalization helpers where possible.
- Keep the action sheet lightweight by making it a launcher, not the full settings surface.
