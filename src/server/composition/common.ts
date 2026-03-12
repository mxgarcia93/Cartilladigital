import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaAuditLogRepository } from "../repositories/prisma/audit-log.repository";
import { PrismaCollaboratorRepository } from "../repositories/prisma/collaborator.repository";
import { PrismaExpenseRepository } from "../repositories/prisma/expense.repository";
import { PrismaMonthlyBalanceRepository } from "../repositories/prisma/monthly-balance.repository";
import { PrismaMonthlyQuotaRepository } from "../repositories/prisma/monthly-quota.repository";
import { PrismaUserRepository } from "../repositories/prisma/user.repository";

export type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export type PrismaRepositorySet = {
  collaboratorRepository: PrismaCollaboratorRepository;
  userRepository: PrismaUserRepository;
  monthlyQuotaRepository: PrismaMonthlyQuotaRepository;
  expenseRepository: PrismaExpenseRepository;
  monthlyBalanceRepository: PrismaMonthlyBalanceRepository;
  auditLogRepository: PrismaAuditLogRepository;
};

export function createPrismaRepositorySet(db: PrismaExecutor): PrismaRepositorySet {
  return {
    collaboratorRepository: new PrismaCollaboratorRepository(db),
    userRepository: new PrismaUserRepository(db),
    monthlyQuotaRepository: new PrismaMonthlyQuotaRepository(db),
    expenseRepository: new PrismaExpenseRepository(db),
    monthlyBalanceRepository: new PrismaMonthlyBalanceRepository(db),
    auditLogRepository: new PrismaAuditLogRepository(db),
  };
}
