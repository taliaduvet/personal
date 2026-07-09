import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio OS — design lab",
};

/**
 * Standalone design-lab surface: no app shell, no data providers, no auth
 * plumbing. Wireframes render at true proportions on a clean canvas.
 */
export default function DesignLabLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-canvas">{children}</div>;
}
