import { db } from "../../lib/db";
import { createPrismaRepositorySet } from "./common";

export function createGetCollaboratorAccessDependencies() {
  const repositories = createPrismaRepositorySet(db);

  return {
    collaboratorRepository: repositories.collaboratorRepository,
  };
}
