import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Returns the signed-in user or sends the visitor to the login page.
export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session.user;
}

// Non-redirecting variant for places that render differently when
// signed out (e.g. the site header).
export async function getOptionalUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}
