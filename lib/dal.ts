import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

export const verifySession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login");
  }
  return session;
});

export const getOptionalSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});
