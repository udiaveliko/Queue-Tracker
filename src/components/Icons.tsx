import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const Icon = ({ children, ...props }: IconProps) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
)

export const ArrowLeftIcon = (props: IconProps) => (
  <Icon {...props}><path d="m15 18-6-6 6-6" /></Icon>
)

export const ArrowUpRightIcon = (props: IconProps) => (
  <Icon {...props}><path d="M7 17 17 7M7 7h10v10" /></Icon>
)

export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}><path d="m9 18 6-6-6-6" /></Icon>
)

export const ClockIcon = (props: IconProps) => (
  <Icon {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
)

export const RefreshIcon = (props: IconProps) => (
  <Icon {...props}><path d="M20 11a8 8 0 1 0-2.3 5.7L20 14" /><path d="M20 8v6h-6" /></Icon>
)

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></Icon>
)

export const SparkIcon = (props: IconProps) => (
  <Icon {...props}><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" /></Icon>
)

export const SortIcon = (props: IconProps) => (
  <Icon {...props}><path d="M8 6h12M8 12h8M8 18h4" /><path d="m4 4-2 2 2 2M2 6h4" /></Icon>
)

export const TrendUpIcon = (props: IconProps) => (
  <Icon {...props}><path d="m5 15 5-5 4 4 5-6" /><path d="M14 8h5v5" /></Icon>
)

export const TrendDownIcon = (props: IconProps) => (
  <Icon {...props}><path d="m5 9 5 5 4-4 5 6" /><path d="M14 16h5v-5" /></Icon>
)

export const MinusIcon = (props: IconProps) => (
  <Icon {...props}><path d="M5 12h14" /></Icon>
)

export const ChartIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" />
    <path d="M2 19h20" />
  </Icon>
)
