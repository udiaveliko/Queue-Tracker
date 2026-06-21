interface ParkIconProps {
  parkId: string
  className?: string
}

const sharedProps = {
  viewBox: '0 0 64 64',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function ParkIcon({ parkId, className }: ParkIconProps) {
  const icon = (() => {
    switch (parkId) {
      case 'magic-kingdom':
        return (
          <>
            <path d="M13 53h38M18 53V35h8V24h12v11h8v18" />
            <path d="M23 24 32 9l9 15M28 53V41h8v12M20 35l-5-8 11 2M44 35l5-8-11 2" />
            <path d="M32 9V4M32 4l7 3-7 3" />
          </>
        )
      case 'epcot':
        return (
          <>
            <circle cx="32" cy="32" r="23" />
            <path d="m32 9 10 7-10 6-10-6 10-7ZM22 16l-4 12 14-6 14 6-4-12M18 28l7 12 7-18 7 18 7-12M25 40l7 15 7-15H25Z" />
          </>
        )
      case 'hollywood-studios':
        return (
          <>
            <path d="M12 23h40v30H12zM12 23l6-12h40l-6 12" />
            <path d="m21 11-6 12M33 11l-6 12M45 11l-6 12" />
            <path d="m32 31 3 6 7 .9-5 4.8 1.2 6.8L32 46l-6.2 3.5 1.2-6.8-5-4.8 7-.9 3-6Z" />
          </>
        )
      case 'animal-kingdom':
        return (
          <>
            <path d="M32 52V25M32 30c-8-10-18-7-20 1 8 3 15 2 20-1ZM32 27c5-13 17-13 21-6-5 7-12 9-21 6ZM32 36c8-7 17-3 19 4-7 3-13 1-19-4ZM32 39c-7-6-15-3-18 3 7 3 12 1 18-3Z" />
            <path d="M22 53c3-6 6-9 10-10 5 2 8 5 11 10M10 53h44" />
          </>
        )
      case 'universal-studios-florida':
        return (
          <>
            <circle cx="31" cy="31" r="22" />
            <path d="M9 31h44M31 9c8 7 12 14 12 22S39 46 31 53c-8-7-12-14-12-22S23 16 31 9Z" />
            <path d="M14 19c8 4 26 4 34 0M14 43c8-4 26-4 34 0" />
            <path d="m48 48 8 8M52 43v9h-9" />
          </>
        )
      case 'islands-of-adventure':
        return (
          <>
            <circle cx="32" cy="32" r="23" />
            <path d="m37 27-5 15-5-10 5-15 5 10Z" />
            <path d="M32 5v6M32 53v6M5 32h6M53 32h6" />
            <path d="M15 46c5-5 10-6 15-3 5 3 11 2 18-4" />
            <path d="M12 50c8-3 14-2 19 1 5 2 11 1 18-3" />
          </>
        )
      case 'epic-universe':
        return (
          <>
            <ellipse cx="32" cy="32" rx="15" ry="25" />
            <ellipse cx="32" cy="32" rx="25" ry="15" transform="rotate(35 32 32)" />
            <circle cx="32" cy="32" r="6" />
            <path d="m49 10 1.5 4.5L55 16l-4.5 1.5L49 22l-1.5-4.5L43 16l4.5-1.5L49 10Z" />
          </>
        )
      case 'seaworld-orlando':
        return (
          <>
            <path d="M7 39c7-8 14-8 21 0s14 8 21 0 7-8 10-5" />
            <path d="M7 48c7-8 14-8 21 0s14 8 21 0" />
            <path d="M21 30c5-13 17-18 28-12-7 1-10 5-11 10-5-3-11-2-17 2Z" />
            <path d="M38 28c4 3 8 4 13 3-3 5-8 7-14 5" />
          </>
        )
      case 'busch-gardens-tampa':
        return (
          <>
            <path d="M7 48c7-22 15-30 24-23 7 6 10 4 13-6 3-9 8-10 13-3" />
            <path d="M7 54h50M13 54l-2-13M24 54l-1-20M36 54l2-25M49 54l3-35" />
            <path d="M8 37c10 2 19 1 27-4 7-5 14-10 22-14" />
          </>
        )
      default:
        return <><circle cx="32" cy="32" r="22" /><path d="M20 40 32 17l12 23-12-6-12 6Z" /></>
    }
  })()

  return (
    <svg className={className} {...sharedProps}>
      {icon}
    </svg>
  )
}
