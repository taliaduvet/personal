import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match everything except static assets and PWA files so the service
     * worker, manifest, and icons are always reachable.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icon.svg|icon-maskable.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
