import type { Season } from "@/lib/season";

/** Soft full-bleed seasonal illustration behind trip content. */
export function SeasonMotif({ season }: { season: Season }) {
  const opacity =
    season === "winter"
      ? "opacity-[0.42] md:opacity-[0.5]"
      : "opacity-[0.22] md:opacity-[0.28]";

  return (
    <div
      className={`season-motif pointer-events-none absolute inset-x-0 top-0 z-0 h-[420px] overflow-hidden ${opacity}`}
      aria-hidden
    >
      {season === "summer" && <SummerBeach />}
      {season === "spring" && <SpringMeadow />}
      {season === "autumn" && <AutumnTrees />}
      {season === "winter" && <WinterMountains />}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--sand)]" />
    </div>
  );
}

function SummerBeach() {
  return (
    <svg
      viewBox="0 0 1200 420"
      className="h-full w-full"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <linearGradient id="sky-summer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7ec8e3" />
          <stop offset="55%" stopColor="#c8eef0" />
          <stop offset="100%" stopColor="#f6e7b8" />
        </linearGradient>
      </defs>
      <rect width="1200" height="420" fill="url(#sky-summer)" />
      <circle cx="980" cy="70" r="48" fill="#ffd36b" opacity="0.9" />
      <circle cx="980" cy="70" r="70" fill="#ffe9a8" opacity="0.35" />
      {/* ocean */}
      <path
        d="M0 250 C 180 220, 320 280, 500 250 S 820 220, 1200 255 L 1200 420 L 0 420 Z"
        fill="#3aa8b5"
        opacity="0.55"
      />
      <path
        d="M0 285 C 220 265, 400 310, 620 290 S 980 270, 1200 300 L 1200 420 L 0 420 Z"
        fill="#2f93a0"
        opacity="0.45"
      />
      {/* sand */}
      <path
        d="M0 330 C 250 310, 450 350, 700 335 S 1000 320, 1200 345 L 1200 420 L 0 420 Z"
        fill="#efd7a4"
      />
      {/* palm */}
      <g transform="translate(160 210)">
        <path d="M18 20 C 22 90, 20 150, 18 190" stroke="#5c4030" strokeWidth="6" fill="none" />
        <path d="M18 40 C -20 10, -50 30, -30 55" fill="#2f8f4e" />
        <path d="M18 40 C 0 0, 40 -10, 55 25" fill="#3fa25c" />
        <path d="M18 45 C 50 20, 80 40, 55 65" fill="#2f8f4e" />
        <path d="M18 48 C -5 55, -35 80, 5 85" fill="#3fa25c" />
      </g>
      {/* umbrella */}
      <g transform="translate(860 300)">
        <path d="M0 40 L 0 95" stroke="#6b4a2e" strokeWidth="3" />
        <path d="M-55 45 Q 0 0 55 45 Z" fill="#e07a2f" opacity="0.85" />
        <path d="M-55 45 Q 0 25 55 45" fill="#ffd36b" opacity="0.5" />
      </g>
    </svg>
  );
}

function SpringMeadow() {
  return (
    <svg
      viewBox="0 0 1200 420"
      className="h-full w-full"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <linearGradient id="sky-spring" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9e4f5" />
          <stop offset="60%" stopColor="#eaf6dc" />
          <stop offset="100%" stopColor="#d8efb8" />
        </linearGradient>
      </defs>
      <rect width="1200" height="420" fill="url(#sky-spring)" />
      <path
        d="M0 260 C 200 230, 380 280, 600 250 S 950 230, 1200 270 L 1200 420 L 0 420 Z"
        fill="#8fbf6a"
        opacity="0.55"
      />
      <path
        d="M0 310 C 250 290, 480 340, 720 315 S 1020 300, 1200 330 L 1200 420 L 0 420 Z"
        fill="#6aa86a"
        opacity="0.5"
      />
      {/* flowers */}
      {[
        [120, 340, "#d48aa8"],
        [180, 360, "#f0a8c0"],
        [260, 345, "#e8c45a"],
        [340, 355, "#d48aa8"],
        [520, 335, "#c9a0e8"],
        [610, 350, "#f0a8c0"],
        [740, 340, "#e8c45a"],
        [860, 355, "#d48aa8"],
        [980, 345, "#c9a0e8"],
        [1080, 360, "#f0a8c0"],
      ].map(([x, y, color], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <line x1="0" y1="0" x2="0" y2="28" stroke="#4f7a45" strokeWidth="2" />
          <circle cx="0" cy="0" r="7" fill={String(color)} />
          <circle cx="0" cy="0" r="2.5" fill="#ffe9a8" />
        </g>
      ))}
      {/* soft distant trees */}
      <ellipse cx="200" cy="275" rx="40" ry="55" fill="#7aaf6a" opacity="0.45" />
      <ellipse cx="900" cy="265" rx="50" ry="65" fill="#6aa86a" opacity="0.4" />
    </svg>
  );
}

function AutumnTrees() {
  return (
    <svg
      viewBox="0 0 1200 420"
      className="h-full w-full"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <linearGradient id="sky-autumn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0d2a8" />
          <stop offset="55%" stopColor="#f6e4c8" />
          <stop offset="100%" stopColor="#e8c49a" />
        </linearGradient>
      </defs>
      <rect width="1200" height="420" fill="url(#sky-autumn)" />
      <path
        d="M0 300 C 220 280, 420 320, 650 295 S 980 285, 1200 310 L 1200 420 L 0 420 Z"
        fill="#c4a06a"
        opacity="0.45"
      />
      {/* trees */}
      {[
        [140, 250, "#c45c26", "#a65b2e"],
        [280, 235, "#d4782e", "#b85a20"],
        [450, 245, "#c9a035", "#a67c20"],
        [720, 230, "#c45c26", "#8f451c"],
        [900, 240, "#d4782e", "#a65b2e"],
        [1040, 250, "#c9a035", "#8f6a20"],
      ].map(([x, y, canopy, trunk], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect x="-5" y="70" width="10" height="70" fill={String(trunk)} rx="2" />
          <circle cx="0" cy="55" r="42" fill={String(canopy)} opacity="0.85" />
          <circle cx="-22" cy="70" r="28" fill={String(canopy)} opacity="0.7" />
          <circle cx="24" cy="68" r="26" fill={String(canopy)} opacity="0.75" />
        </g>
      ))}
      {/* falling leaves */}
      {[
        [200, 180],
        [360, 150],
        [580, 170],
        [760, 140],
        [950, 175],
      ].map(([x, y], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx="7"
          ry="4"
          fill="#c45c26"
          opacity="0.55"
          transform={`rotate(${20 * i} ${x} ${y})`}
        />
      ))}
    </svg>
  );
}

function WinterMountains() {
  return (
    <svg
      viewBox="0 0 1200 420"
      className="h-full w-full"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <linearGradient id="sky-winter" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9eb6d4" />
          <stop offset="45%" stopColor="#c5d5e8" />
          <stop offset="100%" stopColor="#e8eef6" />
        </linearGradient>
        <linearGradient id="peak-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5f7594" />
          <stop offset="100%" stopColor="#3d516c" />
        </linearGradient>
        <linearGradient id="peak-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2f425c" />
          <stop offset="100%" stopColor="#4a607c" />
        </linearGradient>
        <linearGradient id="snow-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dce8f5" />
        </linearGradient>
      </defs>
      <rect width="1200" height="420" fill="url(#sky-winter)" />

      {/* soft clouds */}
      <ellipse cx="180" cy="70" rx="90" ry="28" fill="#fff" opacity="0.35" />
      <ellipse cx="250" cy="70" rx="55" ry="22" fill="#fff" opacity="0.28" />
      <ellipse cx="820" cy="55" rx="100" ry="30" fill="#fff" opacity="0.3" />

      {/* distant range */}
      <path
        d="M0 310 L 140 210 L 240 275 L 380 175 L 520 260 L 680 165 L 820 255 L 960 190 L 1100 250 L 1200 220 L 1200 420 L 0 420 Z"
        fill="#7d93b0"
        opacity="0.55"
      />

      {/* main mountain left */}
      <path d="M40 420 L 260 155 L 480 420 Z" fill="url(#peak-face)" />
      <path d="M260 155 L 480 420 L 340 420 Z" fill="url(#peak-shade)" opacity="0.85" />
      <path
        d="M260 155 L 210 245 L 235 240 L 250 270 L 268 235 L 295 255 L 280 230 L 260 155 Z"
        fill="url(#snow-cap)"
      />

      {/* main mountain center */}
      <path d="M360 420 L 620 110 L 900 420 Z" fill="url(#peak-face)" />
      <path d="M620 110 L 900 420 L 720 420 Z" fill="url(#peak-shade)" opacity="0.9" />
      <path
        d="M620 110 L 560 220 L 590 215 L 610 255 L 630 205 L 670 240 L 645 200 L 620 110 Z"
        fill="url(#snow-cap)"
      />
      {/* snow streak on face */}
      <path
        d="M620 180 L 580 300 L 600 295 L 620 240 L 645 310 L 665 305 L 620 180 Z"
        fill="#eef5fc"
        opacity="0.45"
      />

      {/* main mountain right */}
      <path d="M760 420 L 980 150 L 1200 420 Z" fill="url(#peak-face)" />
      <path d="M980 150 L 1200 420 L 1080 420 Z" fill="url(#peak-shade)" opacity="0.88" />
      <path
        d="M980 150 L 935 235 L 955 230 L 972 265 L 990 225 L 1025 250 L 1000 220 L 980 150 Z"
        fill="url(#snow-cap)"
      />

      {/* pine trees in foreground */}
      {[160, 320, 430, 780, 1050].map((x, i) => (
        <g key={i} transform={`translate(${x} 330)`} opacity="0.75">
          <rect x="-3" y="42" width="6" height="22" fill="#3a2f28" />
          <path d="M0 0 L 18 28 L -18 28 Z" fill="#2f4a3c" />
          <path d="M0 12 L 22 40 L -22 40 Z" fill="#3a5c4a" />
          <path d="M0 24 L 26 52 L -26 52 Z" fill="#2f4a3c" />
          <path d="M0 2 L 8 14 L -8 14 Z" fill="#f4f8fc" opacity="0.55" />
        </g>
      ))}

      {/* snow ground with soft drifts */}
      <path
        d="M0 375 C 180 355, 360 390, 560 370 S 900 360, 1200 380 L 1200 420 L 0 420 Z"
        fill="#f7fbff"
        opacity="0.92"
      />
      <path
        d="M0 395 C 220 385, 480 405, 720 392 S 1000 400, 1200 405 L 1200 420 L 0 420 Z"
        fill="#e4eef8"
        opacity="0.7"
      />

      {/* snowflakes */}
      {[
        [90, 60],
        [210, 100],
        [340, 45],
        [500, 80],
        [640, 40],
        [790, 95],
        [930, 55],
        [1080, 85],
        [1160, 120],
      ].map(([x, y], i) => (
        <g key={i} opacity="0.7" transform={`translate(${x} ${y})`}>
          <line x1="-7" y1="0" x2="7" y2="0" stroke="#fff" strokeWidth="1.8" />
          <line x1="0" y1="-7" x2="0" y2="7" stroke="#fff" strokeWidth="1.8" />
          <line x1="-5" y1="-5" x2="5" y2="5" stroke="#fff" strokeWidth="1.4" />
          <line x1="5" y1="-5" x2="-5" y2="5" stroke="#fff" strokeWidth="1.4" />
          <circle cx="0" cy="0" r="1.6" fill="#fff" />
        </g>
      ))}
    </svg>
  );
}
