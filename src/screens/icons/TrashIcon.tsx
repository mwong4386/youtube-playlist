import { IconProps } from "./IconProps";

const TrashIcon = ({ className, size = 24, title }: IconProps) => (
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
      d="M19 6h-3.5l-1-1h-5l-1 1H5v2h14V6ZM6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9H6v10Z"
    />
  </svg>
);

export default TrashIcon;
