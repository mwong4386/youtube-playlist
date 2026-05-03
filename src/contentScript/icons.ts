/**
 * SVG string templates for use in the content script's imperative DOM injection.
 * These are kept separate from React-based screen icons to avoid mixing
 * component systems.
 */

export const MUSIC_NOTE_ICON = `
  <svg class="bookmark-button__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M16.5 3.75a.75.75 0 0 0-.93-.73l-6.5 1.63a.75.75 0 0 0-.57.73v9.39a3.26 3.26 0 1 0 1.5 2.73V9.97l5-1.25v4.55a3.25 3.25 0 1 0 1.5 2.73V3.75Z" />
  </svg>
`;

export const PLUS_ICON = `
  <svg class="bookmark-button__plus" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M10.25 4a1.5 1.5 0 1 1 3 0v6.25H19.5a1.5 1.5 0 1 1 0 3h-6.25v6.25a1.5 1.5 0 1 1-3 0v-6.25H4a1.5 1.5 0 1 1 0-3h6.25V4Z" />
  </svg>
`;

export const RESET_TIME_ICON = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    preserveAspectRatio="xMidYMid meet"
    viewBox="0 0 24 24"
  >
    <g
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
    >
      <path d="M10 2h4m-2 12v-4m-8 3a8 8 0 0 1 8-7a8 8 0 1 1-5.3 14L4 17.6" />
      <path d="M9 17H4v5" />
    </g>
  </svg>
`;
