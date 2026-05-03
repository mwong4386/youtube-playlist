import { IconProps } from "./IconProps";

const BackIcon = ({ className, size = 24, strokeWidth = 2, title }: IconProps) => (
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
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export default BackIcon;
