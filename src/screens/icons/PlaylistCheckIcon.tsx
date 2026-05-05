import { IconProps } from "./IconProps";

const PlaylistCheckIcon = ({
  className,
  size = 24,
  strokeWidth = 2,
  title,
}: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={title ? undefined : "true"}
    focusable="false"
  >
    {title ? <title>{title}</title> : null}
    <path d="M20 11a8 8 0 0 0-14.4-4.8L4 8" />
    <path d="M4 4v4h4" />
    <path d="M4 13a8 8 0 0 0 14.4 4.8L20 16" />
    <path d="M20 20v-4h-4" />
  </svg>
);

export default PlaylistCheckIcon;
