import { DefaultSession } from "next-auth";

type RoleCode = "ADMIN" | "APPROVER" | "COLLABORATOR";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: RoleCode;
      collaboratorId: string | null;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    role: RoleCode;
    collaboratorId?: string | null;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: RoleCode;
    collaboratorId?: string | null;
    mustChangePassword?: boolean;
  }
}
