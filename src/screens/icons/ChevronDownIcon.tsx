import { IconProps } from "./IconProps";

const ChevronDownIcon = ({
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
      d="M6.72 8.97a1 1 0 0 1 1.41 0L12 12.84l3.87-3.87a1 1 0 1 1 1.41 1.41l-4.58 4.59a1 1 0 0 1-1.41 0L6.72 10.38a1 1 0 0 1 0-1.41Z"
    />
  </svg>
);

export default ChevronDownIcon;
