interface ParkHeroArtProps {
  parkId: string
  compact?: boolean
  className?: string
}

export function ParkHeroArt({ parkId, compact = false, className }: ParkHeroArtProps) {
  return (
    <div
      className={`park-art park-art-${parkId} ${compact ? 'is-compact' : ''} ${className ?? ''}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 360 230" fill="none">
        <defs>
          <linearGradient id={`art-fade-${parkId}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="currentColor" stopOpacity=".5" />
            <stop offset="1" stopColor="currentColor" stopOpacity=".04" />
          </linearGradient>
          <radialGradient id={`art-glow-${parkId}`}>
            <stop stopColor="currentColor" stopOpacity=".42" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle className="park-art-glow" cx="250" cy="80" r="100" fill={`url(#art-glow-${parkId})`} />
        <g className="park-art-lines" stroke="currentColor" strokeWidth="1.2">
          {parkId === 'magic-kingdom' && (
            <>
              <path d="M120 210h210M162 210v-60h35v-45h48v45h35v60" />
              <path d="m177 105 44-78 43 78M208 210v-35h25v35M168 150l-18-30 47 10M274 150l18-30-47 10" />
              <path d="M221 27V8m0 0 22 9-22 9" />
            </>
          )}
          {parkId === 'epcot' && (
            <>
              <circle cx="240" cy="120" r="90" />
              <path d="m240 30 40 28-40 25-40-25 40-28ZM200 58l-17 48 57-23 57 23-17-48M183 106l29 47 28-70 29 70 28-47M212 153l28 57 29-57h-57Z" />
            </>
          )}
          {parkId === 'hollywood-studios' && (
            <>
              <path d="M94 170 275 88M130 210 300 132" />
              <path d="M223 55h102v82H223zM223 55l15-32h102l-15 32" />
              <path d="m247 23-15 32m45-32-15 32m45-32-15 32" />
              <path d="m272 73 8 16 18 2-13 12 3 18-16-9-16 9 3-18-13-12 18-2 8-16Z" />
            </>
          )}
          {parkId === 'animal-kingdom' && (
            <>
              <circle cx="278" cy="66" r="46" fill={`url(#art-fade-${parkId})`} stroke="none" />
              <path d="M210 211v-91m0 22c-34-39-76-27-83 6 32 12 59 8 83-6Zm0-12c20-52 67-52 83-24-20 28-49 35-83 24Zm0 42c32-28 67-12 76 16-28 12-52 5-76-16Z" />
              <path d="M168 211c12-26 26-39 42-43 19 7 34 21 47 43M95 211h235" />
            </>
          )}
          {parkId === 'universal-studios-florida' && (
            <>
              <circle cx="245" cy="117" r="88" />
              <path d="M157 117h176M245 29c31 28 47 57 47 88s-16 60-47 88c-31-28-47-57-47-88s16-60 47-88Z" />
              <path d="M177 70c33 17 103 17 136 0M177 164c33-17 103-17 136 0" />
              <path d="m298 174 40 40m-18-60v42h-42" />
            </>
          )}
          {parkId === 'islands-of-adventure' && (
            <>
              <circle cx="245" cy="112" r="92" />
              <path d="m265 91-20 62-21-41 21-62 20 41Z" />
              <path d="M245 20v24m0 136v24M153 112h25m134 0h25" />
              <path d="M144 171c27-21 51-25 73-11 23 15 50 10 82-17M139 194c38-15 68-12 91 2 25 13 53 8 86-14" />
            </>
          )}
          {parkId === 'epic-universe' && (
            <>
              <ellipse cx="242" cy="116" rx="58" ry="95" />
              <ellipse cx="242" cy="116" rx="98" ry="55" transform="rotate(35 242 116)" />
              <circle cx="242" cy="116" r="22" fill={`url(#art-fade-${parkId})`} />
              <path d="m320 27 6 18 18 6-18 6-6 18-6-18-18-6 18-6 6-18ZM145 58l3 10 10 3-10 3-3 10-3-10-10-3 10-3 3-10Z" />
            </>
          )}
          {parkId === 'seaworld-orlando' && (
            <>
              <path d="M70 143c38-40 75-40 112 0s74 40 111 0 37-40 58-22" />
              <path d="M60 183c38-40 75-40 112 0s74 40 111 0" />
              <path d="M155 107c25-56 75-76 125-49-30 5-46 22-49 46-25-13-50-12-76 3Z" />
              <path d="M231 104c18 15 38 19 59 12-12 24-32 33-60 24" />
            </>
          )}
          {parkId === 'busch-gardens-tampa' && (
            <>
              <path d="M44 170c35-94 72-125 110-93 30 26 53 17 69-25 14-39 42-44 75-14" />
              <path d="M43 210h286M69 210l-10-57m56 57-6-89m62 89 9-112m61 112 16-153" />
              <path d="M48 128c49 9 94 3 134-21 39-24 76-47 116-69" />
            </>
          )}
        </g>
        <path className="park-art-horizon" d="M0 211c70-22 120-18 173 0 54 18 111 17 187-5v24H0v-19Z" fill={`url(#art-fade-${parkId})`} />
      </svg>
    </div>
  )
}
