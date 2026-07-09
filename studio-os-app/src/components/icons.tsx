import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const S = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function DashboardIcon(p: IconProps) {
  return (
    <svg {...S} {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function TodayIcon(p: IconProps) {
  return (
    <svg {...S} {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" />
    </svg>
  );
}

export function TasksIcon(p: IconProps) {
  return (
    <svg {...S} {...p}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

export function InboxIcon(p: IconProps) {
  return (
    <svg {...S} {...p}>
      <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M3 13h5l2 3h4l2-3h5" />
    </svg>
  );
}

export function ProjectsIcon(p: IconProps) {
  return (
    <svg {...S} {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  );
}

export function ReviewIcon(p: IconProps) {
  return (
    <svg {...S} {...p}>
      <rect x="3" y="4" width="18" height="17" rx="2.5" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}

export function ArchiveIcon(p: IconProps) {
  return (
    <svg {...S} {...p}>
      <path d="M4 7h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M9 12h6M9 16h4" />
    </svg>
  );
}

export function SettingsIcon(p: IconProps) {
  return (
    <svg {...S} {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.81 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 7.6 19.3l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 13.6H4.5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6.3 7.6l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 5.09V5a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.81 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9h.1a2 2 0 0 1 0 4Z" />
    </svg>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <svg {...S} {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** The Studio OS equalizer wordmark glyph. */
export function BrandMark(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <rect x="5" y="8" width="3" height="8" rx="1.5" />
      <rect x="10.5" y="5" width="3" height="14" rx="1.5" />
      <rect x="16" y="10" width="3" height="6" rx="1.5" />
    </svg>
  );
}

export function FolderIcon(p: IconProps) {
  return (
    <svg {...S} {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  );
}

export function DocIcon(p: IconProps) {
  return (
    <svg {...S} {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M10 13H8M16 13h-4M10 17H8M16 17h-4" />
    </svg>
  );
}
