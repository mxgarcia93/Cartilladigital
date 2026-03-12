import bcrypt from "bcrypt";

export class ChangePasswordBusinessError extends Error {
  constructor(
    message: string,
    readonly code:
      | "USER_NOT_FOUND"
      | "CURRENT_PASSWORD_INVALID"
      | "PASSWORD_HASH_MISSING"
      | "NEW_PASSWORD_TOO_SHORT",
  ) {
    super(message);
    this.name = "ChangePasswordBusinessError";
  }
}

export type ChangePasswordInput = {
  userId: string;
  currentPassword: string;
  newPassword: string;
};

export interface UserRepository {
  findAuthById(userId: string): Promise<{
    id: string;
    email: string;
    role: "ADMIN" | "APPROVER" | "COLLABORATOR";
    status: "ACTIVE" | "INACTIVE" | "LOCKED";
    passwordHash: string | null;
    mustChangePassword: boolean;
  } | null>;
  updatePasswordHash(input: {
    userId: string;
    passwordHash: string;
    mustChangePassword: boolean;
  }): Promise<void>;
}

export type ChangePasswordRepositories = {
  userRepository: UserRepository;
};

export interface ChangePasswordTransactionRunner {
  runInTransaction<T>(
    operation: (repositories: ChangePasswordRepositories) => Promise<T>,
  ): Promise<T>;
}

export type ChangePasswordDependencies = {
  repositories: ChangePasswordRepositories;
  transactionRunner?: ChangePasswordTransactionRunner;
};

async function executeChangePassword(
  repositories: ChangePasswordRepositories,
  input: ChangePasswordInput,
): Promise<void> {
  if (input.newPassword.length < 8) {
    throw new ChangePasswordBusinessError(
      "New password must contain at least 8 characters.",
      "NEW_PASSWORD_TOO_SHORT",
    );
  }

  const user = await repositories.userRepository.findAuthById(input.userId);

  if (!user) {
    throw new ChangePasswordBusinessError(
      "User does not exist.",
      "USER_NOT_FOUND",
    );
  }

  if (!user.passwordHash) {
    throw new ChangePasswordBusinessError(
      "User does not have a password configured.",
      "PASSWORD_HASH_MISSING",
    );
  }

  const isCurrentPasswordValid = await bcrypt.compare(
    input.currentPassword,
    user.passwordHash,
  );

  if (!isCurrentPasswordValid) {
    throw new ChangePasswordBusinessError(
      "Current password is incorrect.",
      "CURRENT_PASSWORD_INVALID",
    );
  }

  const newPasswordHash = await bcrypt.hash(input.newPassword, 10);

  await repositories.userRepository.updatePasswordHash({
    userId: input.userId,
    passwordHash: newPasswordHash,
    mustChangePassword: false,
  });
}

export async function changePassword(
  dependencies: ChangePasswordDependencies,
  input: ChangePasswordInput,
): Promise<void> {
  if (dependencies.transactionRunner) {
    return dependencies.transactionRunner.runInTransaction((repositories) =>
      executeChangePassword(repositories, input),
    );
  }

  return executeChangePassword(dependencies.repositories, input);
}
