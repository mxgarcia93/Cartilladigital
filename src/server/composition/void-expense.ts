import { db } from "../../lib/db";
import { createPrismaTransactionRunner } from "../transactions/prisma-transaction-runner";
import type { VoidExpenseDependencies } from "../use-cases/void-expense";
import { createPrismaRepositorySet, type PrismaRepositorySet } from "./common";

function selectRepositories(
  repositories: PrismaRepositorySet,
): VoidExpenseDependencies["repositories"] {
  return {
    expenseRepository: repositories.expenseRepository,
    monthlyQuotaRepository: repositories.monthlyQuotaRepository,
    monthlyBalanceRepository: repositories.monthlyBalanceRepository,
    auditLogRepository: repositories.auditLogRepository,
  };
}

export function createVoidExpenseDependencies(): VoidExpenseDependencies {
  const repositories = selectRepositories(createPrismaRepositorySet(db));

  return {
    repositories,
    transactionRunner: createPrismaTransactionRunner(db, (tx) =>
      selectRepositories(createPrismaRepositorySet(tx)),
    ),
  };
}
