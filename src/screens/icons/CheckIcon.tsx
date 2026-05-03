import { IconProps } from "./IconProps";

const CheckIcon = ({
  className,
  size = 24,
  title,
}: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden={title ? undefined : "true"}
    focusable="false"
  >
    {title ? <title>{title}</title> : null}
    <path
      fill="currentColor"
      d="M9.55 16.06 5.3 11.81a1 1 0 1 1 1.4-1.42l2.85 2.84 7.75-7.74a1 1 0 1 1 1.4 1.41l-8.45 8.45a1 1 0 0 1-1.4 0Z"
    />
  </svg>
);

export default CheckIcon;
