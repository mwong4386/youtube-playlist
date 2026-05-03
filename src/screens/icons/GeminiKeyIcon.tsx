import { IconProps } from "./IconProps";

const GeminiKeyIcon = ({
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
    <circle cx="8" cy="12" r="4" />
    <path d="M12 12h10" />
    <path d="M16 12v3" />
    <path d="M19 12v3" />
  </svg>
);

export default GeminiKeyIcon;
