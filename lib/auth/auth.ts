/** @format */

import NextAuth from "next-auth";
import authConfig from "./auth.config";

const basePath = `${process.env.NEXT_PUBLIC_BASE_PATH || "/agendamento"}/api/auth`;

export const { auth, handlers, signIn, signOut, unstable_update } = NextAuth({
  basePath,
  session: { strategy: "jwt" },
  trustHost: true,
  ...authConfig,
});
