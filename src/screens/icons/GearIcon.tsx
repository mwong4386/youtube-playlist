import { IconProps } from "./IconProps";

const GearIcon = ({
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
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06a2.2 2.2 0 1 1-3.1 3.1l-.06-.06a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.08 1.64v.18a2.2 2.2 0 1 1-4.4 0v-.1a1.8 1.8 0 0 0-1.18-1.68 1.8 1.8 0 0 0-1.98.36l-.06.06a2.2 2.2 0 1 1-3.1-3.1l.06-.06a1.8 1.8 0 0 0 .36-1.98 1.8 1.8 0 0 0-1.64-1.08h-.18a2.2 2.2 0 1 1 0-4.4h.1a1.8 1.8 0 0 0 1.68-1.18 1.8 1.8 0 0 0-.36-1.98l-.06-.06a2.2 2.2 0 1 1 3.1-3.1l.06.06a1.8 1.8 0 0 0 1.98.36h.08A1.8 1.8 0 0 0 9.2 2v-.18a2.2 2.2 0 1 1 4.4 0v.1a1.8 1.8 0 0 0 1.08 1.64 1.8 1.8 0 0 0 1.98-.36l.06-.06a2.2 2.2 0 1 1 3.1 3.1l-.06.06a1.8 1.8 0 0 0-.36 1.98v.08A1.8 1.8 0 0 0 21 9.44h.18a2.2 2.2 0 1 1 0 4.4h-.1A1.8 1.8 0 0 0 19.4 15Z" />
  </svg>
);

export default GearIcon;
