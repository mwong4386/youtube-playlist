import { IconProps } from "./IconProps";

const ExportIcon = ({
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
    <path d="M12 3v11" />
    <path d="m7 9 5 5 5-5" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export default ExportIcon;
