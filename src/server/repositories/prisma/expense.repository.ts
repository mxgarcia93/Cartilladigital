import {
  ExpenseCategory,
  ExpenseStatus,
  PrismaClient,
  type Prisma,
} from "@prisma/client";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

function toNumber(value: Prisma.Decimal): number {
  return Number(value);
}

function mapCategory(
  category: ExpenseCategory,
): "FUEL" | "MAINTENANCE" {
  return category;
}

function mapStatus(status: ExpenseStatus): "ACTIVE" | "VOIDED" {
  return status;
}

export class PrismaExpenseRepository {
  constructor(private readonly db: PrismaExecutor) {}

  async findById(id: string): Promise<{
    id: string;
    collaboratorId: string;
    amount: number;
    category: "FUEL" | "MAINTENANCE";
    description: string | null;
    expenseDate: Date;
    year: number;
    month: number;
    currency: string;
    status: "ACTIVE" | "VOIDED";
    registeredByUserId: string;
    updatedByUserId: string | null;
    voidedByUserId: string | null;
    voidedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const expense = await this.db.expense.findUnique({ where: { id } });

    if (!expense) {
      return null;
    }

    return {
      id: expense.id,
      collaboratorId: expense.collaboratorId,
      amount: toNumber(expense.amount),
      category: mapCategory(expense.category),
      description: expense.description,
      expenseDate: expense.expenseDate,
      year: expense.year,
      month: expense.month,
      currency: expense.currency,
      status: mapStatus(expense.status),
      registeredByUserId: expense.registeredByUserId,
      updatedByUserId: expense.updatedByUserId,
      voidedByUserId: expense.voidedByUserId,
      voidedAt: expense.voidedAt,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }

  async findByCollaboratorAndPeriod(input: {
    collaboratorId: string;
    year: number;
    month: number;
  }): Promise<Array<{
    id: string;
    collaboratorId: string;
    year: number;
    month: number;
    amount: number;
    category: "FUEL" | "MAINTENANCE";
    currency: string;
    description: string | null;
    expenseDate: Date;
    status: "ACTIVE" | "VOIDED";
  }>> {
    const expenses = await this.db.expense.findMany({
      where: {
        collaboratorId: input.collaboratorId,
        year: input.year,
        month: input.month,
      },
      orderBy: [{ expenseDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        collaboratorId: true,
        year: true,
        month: true,
        amount: true,
        category: true,
        currency: true,
        description: true,
        expenseDate: true,
        status: true,
      },
    });

    return expenses.map((expense) => ({
      id: expense.id,
      collaboratorId: expense.collaboratorId,
      year: expense.year,
      month: expense.month,
      amount: toNumber(expense.amount),
      category: mapCategory(expense.category),
      currency: expense.currency,
      description: expense.description,
      expenseDate: expense.expenseDate,
      status: mapStatus(expense.status),
    }));
  }

  async findActiveByCollaboratorAndPeriod(input: {
    collaboratorId: string;
    year: number;
    month: number;
  }): Promise<Array<{
    id: string;
    collaboratorId: string;
    year: number;
    month: number;
    amount: number;
    status: "ACTIVE" | "VOIDED";
    expenseDate: Date;
  }>> {
    const expenses = await this.db.expense.findMany({
      where: {
        collaboratorId: input.collaboratorId,
        year: input.year,
        month: input.month,
        status: ExpenseStatus.ACTIVE,
      },
      orderBy: [{ expenseDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        collaboratorId: true,
        year: true,
        month: true,
        amount: true,
        status: true,
        expenseDate: true,
      },
    });

    return expenses.map((expense) => ({
      id: expense.id,
      collaboratorId: expense.collaboratorId,
      year: expense.year,
      month: expense.month,
      amount: toNumber(expense.amount),
      status: mapStatus(expense.status),
      expenseDate: expense.expenseDate,
    }));
  }

  async create(input: {
    collaboratorId: string;
    registeredByUserId: string;
    expenseDate: Date;
    year: number;
    month: number;
    amount: number;
    category: "FUEL" | "MAINTENANCE";
    description?: string | null;
    currency?: string;
  }): Promise<{
    id: string;
    collaboratorId: string;
    year: number;
    month: number;
    amount: number;
    category: "FUEL" | "MAINTENANCE";
    description?: string | null;
    currency: string;
    registeredByUserId: string;
    status: "ACTIVE";
    expenseDate: Date;
    createdAt: Date;
  }> {
    const expense = await this.db.expense.create({
      data: {
        collaboratorId: input.collaboratorId,
        registeredByUserId: input.registeredByUserId,
        expenseDate: input.expenseDate,
        year: input.year,
        month: input.month,
        amount: input.amount,
        category: input.category,
        description: input.description,
        currency: input.currency ?? "USD",
        status: ExpenseStatus.ACTIVE,
      },
    });

    return {
      id: expense.id,
      collaboratorId: expense.collaboratorId,
      year: expense.year,
      month: expense.month,
      amount: toNumber(expense.amount),
      category: mapCategory(expense.category),
      description: expense.description,
      currency: expense.currency,
      registeredByUserId: expense.registeredByUserId,
      status: "ACTIVE",
      expenseDate: expense.expenseDate,
      createdAt: expense.createdAt,
    };
  }

  async update(input: {
    expenseId: string;
    amount: number;
    category: "FUEL" | "MAINTENANCE";
    description?: string | null;
    expenseDate: Date;
    year: number;
    month: number;
    currency: string;
    updatedByUserId: string;
  }): Promise<{
    id: string;
    collaboratorId: string;
    amount: number;
    category: "FUEL" | "MAINTENANCE";
    description: string | null;
    expenseDate: Date;
    year: number;
    month: number;
    currency: string;
    status: "ACTIVE" | "VOIDED";
    registeredByUserId: string;
    updatedByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const expense = await this.db.expense.update({
      where: { id: input.expenseId },
      data: {
        amount: input.amount,
        category: input.category,
        description: input.description,
        expenseDate: input.expenseDate,
        year: input.year,
        month: input.month,
        currency: input.currency,
        updatedByUserId: input.updatedByUserId,
      },
    });

    return {
      id: expense.id,
      collaboratorId: expense.collaboratorId,
      amount: toNumber(expense.amount),
      category: mapCategory(expense.category),
      description: expense.description,
      expenseDate: expense.expenseDate,
      year: expense.year,
      month: expense.month,
      currency: expense.currency,
      status: mapStatus(expense.status),
      registeredByUserId: expense.registeredByUserId,
      updatedByUserId: expense.updatedByUserId,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }

  async voidExpense(input: {
    expenseId: string;
    voidedByUserId: string;
    voidedAt: Date;
  }): Promise<{
    id: string;
    collaboratorId: string;
    amount: number;
    category: "FUEL" | "MAINTENANCE";
    description: string | null;
    expenseDate: Date;
    year: number;
    month: number;
    currency: string;
    status: "ACTIVE" | "VOIDED";
    registeredByUserId: string;
    updatedByUserId: string | null;
    voidedByUserId: string | null;
    voidedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const expense = await this.db.expense.update({
      where: { id: input.expenseId },
      data: {
        status: ExpenseStatus.VOIDED,
        voidedByUserId: input.voidedByUserId,
        voidedAt: input.voidedAt,
        updatedByUserId: input.voidedByUserId,
      },
    });

    return {
      id: expense.id,
      collaboratorId: expense.collaboratorId,
      amount: toNumber(expense.amount),
      category: mapCategory(expense.category),
      description: expense.description,
      expenseDate: expense.expenseDate,
      year: expense.year,
      month: expense.month,
      currency: expense.currency,
      status: mapStatus(expense.status),
      registeredByUserId: expense.registeredByUserId,
      updatedByUserId: expense.updatedByUserId,
      voidedByUserId: expense.voidedByUserId,
      voidedAt: expense.voidedAt,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }
}
