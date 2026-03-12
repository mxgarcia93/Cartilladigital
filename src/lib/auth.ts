import bcrypt from "bcrypt";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";

type RoleCode = "ADMIN" | "APPROVER" | "COLLABORATOR";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";

        if (!email || !password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
            passwordHash: true,
            mustChangePassword: true,
            collaborator: {
              select: {
                id: true,
              },
            },
          },
        });

        // Credentials auth is backed by the existing users table.
        // Only active users with a stored password hash can sign in.
        if (!user || user.status !== "ACTIVE" || !user.passwordHash) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role as RoleCode,
          collaboratorId: user.collaborator?.id ?? null,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = (user as { role: RoleCode }).role;
        token.collaboratorId = (user as { collaboratorId?: string | null })
          .collaboratorId ?? null;
        token.mustChangePassword = (
          user as { mustChangePassword?: boolean | null }
        ).mustChangePassword === true;
      }

      if (typeof token.id === "string") {
        const currentUser = await db.user.findUnique({
          where: { id: token.id },
          select: {
            email: true,
            role: true,
            mustChangePassword: true,
            collaborator: {
              select: {
                id: true,
              },
            },
          },
        });

        if (currentUser) {
          token.email = currentUser.email;
          token.role = currentUser.role;
          token.collaboratorId = currentUser.collaborator?.id ?? null;
          token.mustChangePassword = currentUser.mustChangePassword;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.email = typeof token.email === "string" ? token.email : "";
        session.user.role =
          typeof token.role === "string"
            ? (token.role as RoleCode)
            : "COLLABORATOR";
        session.user.collaboratorId =
          typeof token.collaboratorId === "string"
            ? token.collaboratorId
            : null;
        session.user.mustChangePassword = token.mustChangePassword === true;
      }

      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
