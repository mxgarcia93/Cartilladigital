import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";

export class ResetCollaboratorPasswordBusinessError extends Error {
  constructor(
    message: string,
    readonly code:
      | "COLLABORATOR_NOT_FOUND"
      | "COLLABORATOR_ACCESS_NOT_FOUND"
      | "INVALID_LINKED_USER_ROLE",
  ) {
    super(message);
    this.name = "ResetCollaboratorPasswordBusinessError";
  }
}

export type ResetCollaboratorPasswordInput = {
  collaboratorId: string;
};

export type ResetCollaboratorPasswordOutput = {
  collaborator: {
    id: string;
    employeeId: string;
    fullName: string;
  };
  userAccess: {
    userId: string;
    email: string;
    temporaryPassword: string;
    status: "ACTIVE" | "INACTIVE" | "LOCKED";
  };
};

export interface CollaboratorRepository {
  findAccessById(id: string): Promise<{
    id: string;
    employeeId: string;
    fullName: string;
    status: "ACTIVE" | "INACTIVE";
    linkedUser: {
      id: string;
      email: string;
      role: "ADMIN" | "APPROVER" | "COLLABORATOR";
      status: "ACTIVE" | "INACTIVE" | "LOCKED";
    } | null;
  } | null>;
}

export interface UserRepository {
  updatePasswordHash(input: {
    userId: string;
    passwordHash: string;
    mustChangePassword: boolean;
  }): Promise<void>;
}

export type ResetCollaboratorPasswordRepositories = {
  collaboratorRepository: CollaboratorRepository;
  userRepository: UserRepository;
};

export interface ResetCollaboratorPasswordTransactionRunner {
  runInTransaction<T>(
    operation: (
      repositories: ResetCollaboratorPasswordRepositories,
    ) => Promise<T>,
  ): Promise<T>;
}

export type ResetCollaboratorPasswordDependencies = {
  repositories: ResetCollaboratorPasswordRepositories;
  transactionRunner?: ResetCollaboratorPasswordTransactionRunner;
};

function generateTemporaryPassword(): string {
  return randomBytes(9).toString("base64url");
}

async function executeResetCollaboratorPassword(
  repositories: ResetCollaboratorPasswordRepositories,
  input: ResetCollaboratorPasswordInput,
): Promise<ResetCollaboratorPasswordOutput> {
  const collaborator = await repositories.collaboratorRepository.findAccessById(
    input.collaboratorId,
  );

  if (!collaborator) {
    throw new ResetCollaboratorPasswordBusinessError(
      "Collaborator does not exist.",
      "COLLABORATOR_NOT_FOUND",
    );
  }

  if (!collaborator.linkedUser) {
    throw new ResetCollaboratorPasswordBusinessError(
      "Collaborator does not have a linked user account.",
      "COLLABORATOR_ACCESS_NOT_FOUND",
    );
  }

  if (collaborator.linkedUser.role !== "COLLABORATOR") {
    throw new ResetCollaboratorPasswordBusinessError(
      "The linked user is not a collaborator account.",
      "INVALID_LINKED_USER_ROLE",
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  await repositories.userRepository.updatePasswordHash({
    userId: collaborator.linkedUser.id,
    passwordHash,
    mustChangePassword: true,
  });

  return {
    collaborator: {
      id: collaborator.id,
      employeeId: collaborator.employeeId,
      fullName: collaborator.fullName,
    },
    userAccess: {
      userId: collaborator.linkedUser.id,
      email: collaborator.linkedUser.email,
      temporaryPassword,
      status: collaborator.linkedUser.status,
    },
  };
}

export async function resetCollaboratorPassword(
  dependencies: ResetCollaboratorPasswordDependencies,
  input: ResetCollaboratorPasswordInput,
): Promise<ResetCollaboratorPasswordOutput> {
  if (dependencies.transactionRunner) {
    return dependencies.transactionRunner.runInTransaction((repositories) =>
      executeResetCollaboratorPassword(repositories, input),
    );
  }

  return executeResetCollaboratorPassword(dependencies.repositories, input);
}
