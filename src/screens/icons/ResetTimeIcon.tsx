import { IconProps } from "./IconProps";

const ResetTimeIcon = ({ className, size = 24, strokeWidth = 2, title }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden={title ? undefined : "true"}
    focusable="false"
  >
    {title ? <title>{title}</title> : null}
    <g
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    >
      <path d="M10 2h4m-2 12v-4m-8 3a8 8 0 0 1 8-7a8 8 0 1 1-5.3 14L4 17.6" />
      <path d="M9 17H4v5" />
    </g>
  </svg>
);

export default ResetTimeIcon;
