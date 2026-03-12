import { db } from "../../lib/db";
import { createPrismaRepositorySet } from "./common";

export function createGetCollaboratorBalanceDependencies() {
  const repositories = createPrismaRepositorySet(db);

  return {
    collaboratorRepository: repositories.collaboratorRepository,
    monthlyBalanceRepository: repositories.monthlyBalanceRepository,
  };
}
