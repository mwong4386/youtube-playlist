import { IconProps } from "./IconProps";

const PreviousIcon = ({ className, size = 24, title }: IconProps) => (
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
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M8 6v12"
    />
    <path d="m18 6-8 6 8 6V6Z" fill="currentColor" stroke="none" />
  </svg>
);

export default PreviousIcon;
