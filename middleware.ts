import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth is enforced client-side in app/admin/layout.tsx via AuthContext.
// The token cookie lives on the Railway API domain so cannot be read here.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = { matcher: [] };
