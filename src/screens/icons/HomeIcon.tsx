import { IconProps } from "./IconProps";

const HomeIcon = ({
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
      d="M12 3.5a1 1 0 0 1 .64.23l7 5.83a1 1 0 0 1-.64 1.77H18.5v7a1 1 0 0 1-1 1h-4.25a1 1 0 0 1-1-1V14h-1.5v4.25a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1v-7H5a1 1 0 0 1-.64-1.77l7-5.83A1 1 0 0 1 12 3.5Z"
    />
  </svg>
);

export default HomeIcon;
