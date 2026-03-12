import {
  PrismaClient,
  QuotaStatus,
  type Prisma,
} from "@prisma/client";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

function toNumber(value: Prisma.Decimal): number {
  return Number(value);
}

function mapQuotaStatus(status: QuotaStatus): "ACTIVE" | "ADJUSTED" | "CANCELLED" {
  return status;
}

export class PrismaMonthlyQuotaRepository {
  constructor(private readonly db: PrismaExecutor) {}

  async findByCollaboratorAndPeriod(input: {
    collaboratorId: string;
    year: number;
    month: number;
  }): Promise<{
    id: string;
    collaboratorId: string;
    year: number;
    month: number;
    amount: number;
    currency: string;
    assignedByUserId: string;
    updatedByUserId: string | null;
    status: "ACTIVE" | "ADJUSTED" | "CANCELLED";
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const quota = await this.db.monthlyQuota.findUnique({
      where: {
        collaboratorId_year_month: {
          collaboratorId: input.collaboratorId,
          year: input.year,
          month: input.month,
        },
      },
    });

    if (!quota) {
      return null;
    }

    // Decimal values are mapped to plain numbers because the use cases operate
    // on domain-level numeric values, not Prisma Decimal instances.
    return {
      id: quota.id,
      collaboratorId: quota.collaboratorId,
      year: quota.year,
      month: quota.month,
      amount: toNumber(quota.amount),
      currency: quota.currency,
      assignedByUserId: quota.assignedByUserId,
      updatedByUserId: quota.updatedByUserId,
      status: mapQuotaStatus(quota.status),
      createdAt: quota.createdAt,
      updatedAt: quota.updatedAt,
    };
  }

  async upsertForPeriod(input: {
    collaboratorId: string;
    year: number;
    month: number;
    amount: number;
    currency: string;
    assignedByUserId: string;
    updatedByUserId?: string;
  }): Promise<{
    id: string;
    collaboratorId: string;
    year: number;
    month: number;
    amount: number;
    currency: string;
    assignedByUserId: string;
    updatedByUserId: string | null;
    status: "ACTIVE" | "ADJUSTED" | "CANCELLED";
    createdAt: Date;
    updatedAt: Date;
  }> {
    const quota = await this.db.monthlyQuota.upsert({
      where: {
        collaboratorId_year_month: {
          collaboratorId: input.collaboratorId,
          year: input.year,
          month: input.month,
        },
      },
      create: {
        collaboratorId: input.collaboratorId,
        year: input.year,
        month: input.month,
        amount: input.amount,
        currency: input.currency,
        assignedByUserId: input.assignedByUserId,
        updatedByUserId: input.updatedByUserId,
        status: QuotaStatus.ACTIVE,
      },
      update: {
        amount: input.amount,
        currency: input.currency,
        updatedByUserId: input.updatedByUserId ?? null,
        status: QuotaStatus.ADJUSTED,
      },
    });

    return {
      id: quota.id,
      collaboratorId: quota.collaboratorId,
      year: quota.year,
      month: quota.month,
      amount: toNumber(quota.amount),
      currency: quota.currency,
      assignedByUserId: quota.assignedByUserId,
      updatedByUserId: quota.updatedByUserId,
      status: mapQuotaStatus(quota.status),
      createdAt: quota.createdAt,
      updatedAt: quota.updatedAt,
    };
  }
}
