"use client";

import { ClerkProvider, useAuth, useUser, SignIn } from "@clerk/nextjs";
import { ReactNode, ReactElement } from "react";

export function ClerkAuthProvider({ children }: { children: ReactNode }): ReactElement {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const afterSignInUrl = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL;
  const afterSignUpUrl = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL;

  if (!publishableKey) {
    throw new Error("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set");
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      afterSignOutUrl={afterSignInUrl}
    >
      {children}
    </ClerkProvider>
  );
}

export { useAuth, useUser, SignIn };
