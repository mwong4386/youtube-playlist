import { IconProps } from "./IconProps";

const EditIcon = ({
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
    <polygon points="16 3 21 8 8 21 3 21 3 16 16 3" />
  </svg>
);

export default EditIcon;
