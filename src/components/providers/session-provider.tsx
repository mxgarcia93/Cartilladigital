"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function AuthSessionProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <SessionProvider>{children}</SessionProvider>;
}
