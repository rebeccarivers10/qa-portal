"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-blue-200 hover:text-red-300 transition-colors font-medium"
    >
      Sign out
    </button>
  );
}
