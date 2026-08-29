import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      status?: string;
      verified?: boolean;
      adminRole?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    status?: string;
    verified?: boolean;
    adminRole?: string | null;
    statusCheckedAt?: number;
  }
}
