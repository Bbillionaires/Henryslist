import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const providers: Provider[] = [
  Credentials({
    id: "credentials",
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw, request) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;

      const ip = clientIp(request.headers);
      const { success } = await rateLimit(`login:${email.toLowerCase()}:${ip}`, RATE_LIMITS.LOGIN.limit, RATE_LIMITS.LOGIN.windowSeconds);
      if (!success) return null;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (!user || !user.passwordHash) return null;
      if (user.status === "BANNED" || user.status === "DELETED") return null;

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET) {
  providers.push(
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/onboarding",
  },
  providers,
  callbacks: {
    async signIn({ user }) {
      if (!user.id) return true;
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (dbUser && (dbUser.status === "BANNED" || dbUser.status === "DELETED")) {
        return false;
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.uid = user.id;
      }
      // Refresh role/status on every session read (`trigger === "update"`)
      // and periodically otherwise, so a ban/suspend takes effect without
      // waiting for the token to fully expire.
      const uid = (token.uid as string | undefined) ?? undefined;
      if (uid && (trigger || !token.statusCheckedAt || Date.now() - (token.statusCheckedAt as number) > 60_000)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: uid },
          include: { adminUser: true },
        });
        if (dbUser) {
          token.status = dbUser.status;
          token.verified = !!dbUser.emailVerified;
          token.adminRole = dbUser.adminUser?.active ? dbUser.adminUser.role : null;
          token.statusCheckedAt = Date.now();
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.status = token.status as string | undefined;
        session.user.verified = token.verified as boolean | undefined;
        session.user.adminRole = token.adminRole as string | null | undefined;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      await prisma.$transaction([
        prisma.profile.upsert({
          where: { userId: user.id },
          create: { userId: user.id, displayName: user.name ?? undefined },
          update: {},
        }),
        prisma.notificationPreference.upsert({
          where: { userId: user.id },
          create: { userId: user.id },
          update: {},
        }),
      ]);
    },
  },
  trustHost: true,
});
