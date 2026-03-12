import { RoleCode, UserStatus, PrismaClient, type Prisma } from "@prisma/client";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaUserRepository {
  constructor(private readonly db: PrismaExecutor) {}

  async findByEmail(email: string): Promise<{
    id: string;
    email: string;
  } | null> {
    const user = await this.db.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return null;
    }

    return user;
  }

  async createCollaboratorAccess(input: {
    email: string;
    fullName: string;
    passwordHash: string;
    mustChangePassword: boolean;
  }): Promise<{
    id: string;
    email: string;
    role: "COLLABORATOR";
    status: "ACTIVE";
  }> {
    const user = await this.db.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        role: RoleCode.COLLABORATOR,
        status: UserStatus.ACTIVE,
        passwordHash: input.passwordHash,
        mustChangePassword: input.mustChangePassword,
      },
      select: {
        id: true,
        email: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      role: "COLLABORATOR",
      status: "ACTIVE",
    };
  }

  async updatePasswordHash(input: {
    userId: string;
    passwordHash: string;
    mustChangePassword: boolean;
  }): Promise<void> {
    await this.db.user.update({
      where: {
        id: input.userId,
      },
      data: {
        passwordHash: input.passwordHash,
        mustChangePassword: input.mustChangePassword,
      },
    });
  }

  async findAuthById(userId: string): Promise<{
    id: string;
    email: string;
    role: "ADMIN" | "APPROVER" | "COLLABORATOR";
    status: "ACTIVE" | "INACTIVE" | "LOCKED";
    passwordHash: string | null;
    mustChangePassword: boolean;
  } | null> {
    const user = await this.db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        passwordHash: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      return null;
    }

    return user;
  }
}
