import { db } from "../../lib/db";
import { createPrismaTransactionRunner } from "../transactions/prisma-transaction-runner";
import type { AssignMonthlyQuotaDependencies } from "../use-cases/assign-monthly-quota";
import { createPrismaRepositorySet, type PrismaRepositorySet } from "./common";

function selectRepositories(
  repositories: PrismaRepositorySet,
): AssignMonthlyQuotaDependencies["repositories"] {
  return {
    collaboratorRepository: repositories.collaboratorRepository,
    monthlyQuotaRepository: repositories.monthlyQuotaRepository,
    expenseRepository: repositories.expenseRepository,
    monthlyBalanceRepository: repositories.monthlyBalanceRepository,
    auditLogRepository: repositories.auditLogRepository,
  };
}

export function createAssignMonthlyQuotaDependencies(): AssignMonthlyQuotaDependencies {
  const repositories = selectRepositories(createPrismaRepositorySet(db));

  return {
    repositories,
    transactionRunner: createPrismaTransactionRunner(db, (tx) =>
      selectRepositories(createPrismaRepositorySet(tx)),
    ),
  };
}
