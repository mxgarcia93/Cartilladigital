import { db } from "../../lib/db";
import { createPrismaTransactionRunner } from "../transactions/prisma-transaction-runner";
import type { RegisterExpenseDependencies } from "../use-cases/register-expense";
import { createPrismaRepositorySet, type PrismaRepositorySet } from "./common";

function selectRepositories(
  repositories: PrismaRepositorySet,
): RegisterExpenseDependencies["repositories"] {
  return {
    collaboratorRepository: repositories.collaboratorRepository,
    monthlyQuotaRepository: repositories.monthlyQuotaRepository,
    expenseRepository: repositories.expenseRepository,
    monthlyBalanceRepository: repositories.monthlyBalanceRepository,
    auditLogRepository: repositories.auditLogRepository,
  };
}

export function createRegisterExpenseDependencies(): RegisterExpenseDependencies {
  const repositories = selectRepositories(createPrismaRepositorySet(db));

  return {
    repositories,
    transactionRunner: createPrismaTransactionRunner(db, (tx) =>
      selectRepositories(createPrismaRepositorySet(tx)),
    ),
  };
}
