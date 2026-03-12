import { db } from "../../lib/db";
import { createPrismaTransactionRunner } from "../transactions/prisma-transaction-runner";
import type { RecalculateBalancesDependencies } from "../use-cases/recalculate-balances";
import { createPrismaRepositorySet, type PrismaRepositorySet } from "./common";

function selectRepositories(
  repositories: PrismaRepositorySet,
): RecalculateBalancesDependencies["repositories"] {
  return {
    monthlyQuotaRepository: repositories.monthlyQuotaRepository,
    expenseRepository: repositories.expenseRepository,
    monthlyBalanceRepository: repositories.monthlyBalanceRepository,
  };
}

export function createRecalculateBalancesDependencies(): RecalculateBalancesDependencies {
  const repositories = selectRepositories(createPrismaRepositorySet(db));

  return {
    repositories,
    transactionRunner: createPrismaTransactionRunner(db, (tx) =>
      selectRepositories(createPrismaRepositorySet(tx)),
    ),
  };
}
