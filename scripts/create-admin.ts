import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma, RoleCode, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";

type ParsedArgs = {
  email: string;
  password: string;
  name: string;
};

function printUsage(): void {
  console.log(
    "Usage: npm run create-admin -- --email admin@example.com --password secret123 --name \"Admin Name\"",
  );
}

function parseArgs(argv: string[]): ParsedArgs | null {
  let email = "";
  let password = "";
  let name = "";

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (!next) {
      continue;
    }

    if (current === "--email") {
      email = next.trim().toLowerCase();
      index += 1;
      continue;
    }

    if (current === "--password") {
      password = next;
      index += 1;
      continue;
    }

    if (current === "--name") {
      name = next.trim();
      index += 1;
    }
  }

  if (!email || !password || !name) {
    return null;
  }

  return {
    email,
    password,
    name,
  };
}

function validateArgs(args: ParsedArgs): string | null {
  if (!args.email.includes("@")) {
    return "Email must be a valid email address.";
  }

  if (args.password.length < 6) {
    return "Password must contain at least 6 characters.";
  }

  if (args.name.length < 2) {
    return "Name must contain at least 2 characters.";
  }

  return null;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL is required.");
    process.exitCode = 1;
    return;
  }

  const parsedArgs = parseArgs(process.argv.slice(2));

  if (!parsedArgs) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const validationError = validateArgs(parsedArgs);

  if (validationError) {
    console.error(`Error: ${validationError}`);
    process.exitCode = 1;
    return;
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

  try {
    const passwordHash = await bcrypt.hash(parsedArgs.password, 10);

    const user = await prisma.user.create({
      data: {
        email: parsedArgs.email,
        fullName: parsedArgs.name,
        role: RoleCode.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
      },
    });

    console.log("Admin user created successfully.");
    console.log(
      `id=${user.id} email=${user.email} name=${user.fullName} role=${user.role} status=${user.status}`,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      console.error(
        `Error: a user with email "${parsedArgs.email}" already exists.`,
      );
      process.exitCode = 1;
      return;
    }

    console.error("Error: failed to create admin user.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
