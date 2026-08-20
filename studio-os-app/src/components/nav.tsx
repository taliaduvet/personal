import type { ComponentType, SVGProps } from "react";
import {
  DashboardIcon,
  TodayIcon,
  JournalIcon,
  PracticeIcon,
  HabitsIcon,
  TasksIcon,
  InboxIcon,
  ProjectsIcon,
  ReviewIcon,
  ArchiveIcon,
  SettingsIcon,
} from "./icons";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

/** Full navigation — desktop sidebar. */
export const SIDEBAR_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/today", label: "Today", icon: TodayIcon },
  { href: "/journal", label: "Journal", icon: JournalIcon },
  { href: "/practice", label: "Practice", icon: PracticeIcon },
  { href: "/habits", label: "Habits", icon: HabitsIcon },
  { href: "/tasks", label: "Tasks", icon: TasksIcon },
  { href: "/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/projects", label: "Projects", icon: ProjectsIcon },
  { href: "/weekly-review", label: "Weekly Review", icon: ReviewIcon },
  { href: "/archive", label: "Archive", icon: ArchiveIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

/** Condensed mobile bottom bar (the ＋ lives in the center, added separately). */
export const BOTTOM_NAV: NavItem[] = [
  { href: "/today", label: "Today", icon: TodayIcon },
  { href: "/tasks", label: "Tasks", icon: TasksIcon },
  { href: "/projects", label: "Plan", icon: ProjectsIcon },
  { href: "/weekly-review", label: "Review", icon: ReviewIcon },
];

/** Everything else, surfaced behind the mobile bottom bar's "More" sheet. */
export const MORE_NAV: NavItem[] = SIDEBAR_NAV.filter(
  (item) => !BOTTOM_NAV.some((b) => b.href === item.href)
);

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
