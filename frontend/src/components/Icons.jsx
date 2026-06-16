/**
 * Icon library — inline SVG components
 * Usage: <IconHome size={20} />
 * All icons use stroke="currentColor" for CSS color control
 */

const iconProps = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

export const IconHome = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

export const IconMap = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

export const IconTarget = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const IconUsers = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

export const IconTrendingUp = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

export const IconClock = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const IconUser = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const IconSword = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
    <line x1="13" y1="19" x2="19" y2="13" />
    <line x1="16" y1="16" x2="20" y2="20" />
    <line x1="19" y1="21" x2="21" y2="19" />
  </svg>
);

export const IconZap = ({ size = 20 }) => (
  <svg {...iconProps(size)} fill="currentColor" stroke="none">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const IconShield = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const IconTrophy = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <polyline points="8 21 12 21 16 21" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <path d="M7 4H4a2 2 0 00-2 2v1c0 3.3 2.2 6.1 5.2 7" />
    <path d="M17 4h3a2 2 0 012 2v1c0 3.3-2.2 6.1-5.2 7" />
    <path d="M7 4a5 5 0 005 8 5 5 0 005-8H7z" />
  </svg>
);

export const IconMapPin = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const IconAlertTriangle = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const IconPlay = ({ size = 20 }) => (
  <svg {...iconProps(size)} fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const IconX = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const IconArrowRight = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export const IconGamepad = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 12h4M8 10v4" />
    <circle cx="16" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconChevronRight = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const IconStar = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const IconCheck = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const IconMessageCircle = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

export const IconTrash = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);

export const IconLock = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

export const IconPackage = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

export const IconRotateCcw = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
  </svg>
);

export const IconBarChart = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);

export const IconMoon = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
);

export const IconMenu = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export const IconSearch = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const IconCrown = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <path d="M2 20h20M5 20V10l7-7 7 7v10" />
    <path d="M5 10l7 4 7-4" />
  </svg>
);

export const IconList = ({ size = 20 }) => (
  <svg {...iconProps(size)}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

/* ── DNA terrain icons ───────────────────────────────────────── */
const DNA_PATHS = {
  ABYSSE: <path d="M2 12c2-3 4-5 6-3s4 5 6 3 4-5 6-3" strokeWidth={2} />,
  OLYMPE: <>
    <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    {[0,60,120,180,240,300].map(a => {
      const r = a * Math.PI / 180;
      return <line key={a} x1={12 + 5*Math.cos(r)} y1={12 + 5*Math.sin(r)} x2={12 + 9*Math.cos(r)} y2={12 + 9*Math.sin(r)} strokeWidth={2} />;
    })}
  </>,
  EDEN: <path d="M12 22V12M12 12C11 7 7 5 4 7c3 0 6 2 8 5M12 12c1-5 5-7 8-5-3 0-6 2-8 5" strokeWidth={1.75} />,
  NEXUS: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" stroke="none" />,
  NEUTRE: <circle cx="12" cy="12" r="6" strokeWidth={2} />,
};

export const DnaIcon = ({ type, size = 18, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={style}>
    {DNA_PATHS[type] || DNA_PATHS.NEUTRE}
  </svg>
);
