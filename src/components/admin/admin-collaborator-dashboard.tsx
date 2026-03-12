"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type CollaboratorItem = {
  id: string;
  employeeId: string;
  fullName: string;
  status: "ACTIVE" | "INACTIVE";
  costCenter: string | null;
  department: string | null;
  vehicleReference: string | null;
};

type CollaboratorListResponse = {
  items: CollaboratorItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type BalanceResponse = {
  collaborator: {
    id: string;
    employeeId: string;
    fullName: string;
    status: "ACTIVE" | "INACTIVE";
  };
  period: {
    year: number;
    month: number;
  };
  balance: {
    openingBalance: number;
    quotaAmount: number;
    executedAmount: number;
    closingBalance: number;
    currency: string;
    lastExpenseDate: string | null;
    recalculatedAt: string | null;
  };
};

type CollaboratorAccessResponse = {
  collaborator: {
    id: string;
    employeeId: string;
    fullName: string;
    status: "ACTIVE" | "INACTIVE";
  };
  access: {
    email: string;
    role: "ADMIN" | "APPROVER" | "COLLABORATOR";
    status: "ACTIVE" | "INACTIVE" | "LOCKED";
  } | null;
};

type LedgerExpense = {
  id: string;
  expenseDate: string;
  year: number;
  month: number;
  category: "FUEL" | "MAINTENANCE";
  amount: number;
  currency: string;
  description: string | null;
  status: "ACTIVE" | "VOIDED";
};

type LedgerResponse = {
  collaborator: {
    id: string;
    employeeId: string;
    fullName: string;
    status: "ACTIVE" | "INACTIVE";
  };
  period: {
    year: number;
    month: number;
  };
  quota: {
    amount: number;
    currency: string;
    status: "ACTIVE" | "ADJUSTED" | "CANCELLED";
  } | null;
  balance: {
    openingBalance: number;
    quotaAmount: number;
    executedAmount: number;
    closingBalance: number;
    currency: string;
    lastExpenseDate: string | null;
    recalculatedAt: string | null;
  } | null;
  expenses: LedgerExpense[];
};

type AssignQuotaResponse = {
  quota: {
    id: string;
    collaboratorId: string;
    year: number;
    month: number;
    amount: number;
    currency: string;
    status: "ACTIVE" | "ADJUSTED" | "CANCELLED";
  };
};

type CreateCollaboratorResponse = {
  collaborator: CollaboratorItem & {
    documentNumber?: string | null;
  };
  userAccess: {
    userId: string;
    email: string;
    temporaryPassword: string;
  } | null;
};

type RegisterExpenseResponse = {
  expense: {
    id: string;
  };
};

type UpdateExpenseResponse = {
  expense: {
    id: string;
  };
};

type VoidExpenseResponse = {
  expense: {
    id: string;
  };
};

type ResetCollaboratorPasswordResponse = {
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

type ExpenseEditForm = {
  expenseDate: string;
  year: string;
  month: string;
  amount: string;
  category: "FUEL" | "MAINTENANCE";
  description: string;
  currency: string;
};

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("es-EC");
}

function toDateInputValue(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function buildExpenseEditForm(expense: LedgerExpense): ExpenseEditForm {
  return {
    expenseDate: toDateInputValue(expense.expenseDate),
    year: String(expense.year),
    month: String(expense.month),
    amount: String(expense.amount),
    category: expense.category,
    description: expense.description ?? "",
    currency: expense.currency,
  };
}

export function AdminCollaboratorDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const currentDay = now.getUTCDate();

  const [search, setSearch] = useState("");
  const [collaborators, setCollaborators] = useState<CollaboratorItem[]>([]);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<
    string | null
  >(null);
  const [balanceData, setBalanceData] = useState<BalanceResponse | null>(null);
  const [ledgerData, setLedgerData] = useState<LedgerResponse | null>(null);
  const [accessData, setAccessData] = useState<CollaboratorAccessResponse | null>(
    null,
  );
  const [listLoading, setListLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);
  const [createCollaboratorSubmitting, setCreateCollaboratorSubmitting] =
    useState(false);
  const [quotaSubmitting, setQuotaSubmitting] = useState(false);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [resetPasswordSubmitting, setResetPasswordSubmitting] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [updatingExpenseId, setUpdatingExpenseId] = useState<string | null>(null);
  const [voidingExpenseId, setVoidingExpenseId] = useState<string | null>(null);
  const [expenseEditForm, setExpenseEditForm] = useState<ExpenseEditForm | null>(
    null,
  );
  const [listError, setListError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [createCollaboratorError, setCreateCollaboratorError] = useState<
    string | null
  >(null);
  const [createCollaboratorSuccess, setCreateCollaboratorSuccess] = useState<
    string | null
  >(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [quotaSuccess, setQuotaSuccess] = useState<string | null>(null);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [expenseSuccess, setExpenseSuccess] = useState<string | null>(null);
  const [ledgerActionError, setLedgerActionError] = useState<string | null>(null);
  const [ledgerActionSuccess, setLedgerActionSuccess] = useState<string | null>(
    null,
  );
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(
    null,
  );
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [pendingSelectionEmployeeId, setPendingSelectionEmployeeId] = useState<
    string | null
  >(null);
  const [detailsRefreshKey, setDetailsRefreshKey] = useState(0);
  const [createCollaboratorForm, setCreateCollaboratorForm] = useState({
    employeeId: "",
    fullName: "",
    documentNumber: "",
    costCenter: "",
    department: "",
    vehicleReference: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
    createUserAccess: false,
    email: "",
  });
  const [quotaForm, setQuotaForm] = useState({
    year: String(currentYear),
    month: String(currentMonth),
    amount: "",
    currency: "USD",
  });
  const [expenseForm, setExpenseForm] = useState({
    expenseDate: `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(
      currentDay,
    ).padStart(2, "0")}`,
    year: String(currentYear),
    month: String(currentMonth),
    amount: "",
    category: "FUEL" as "FUEL" | "MAINTENANCE",
    description: "",
    currency: "USD",
  });
  const actorUserId = session?.user?.id ?? null;
  const actorRole = session?.user?.role ?? null;
  const canPerformAdminActions =
    sessionStatus === "authenticated" &&
    !!actorUserId &&
    actorRole === "ADMIN";
  const adminActionMessage =
    sessionStatus === "loading"
      ? "Validando sesion para habilitar acciones operativas..."
      : "Debes iniciar sesion como ADMIN para asignar cupos y administrar gastos.";

  useEffect(() => {
    const controller = new AbortController();

    async function loadCollaborators() {
      setListLoading(true);
      setListError(null);

      try {
        const query = new URLSearchParams({
          page: "1",
          pageSize: "20",
        });

        if (search.trim()) {
          query.set("search", search.trim());
        }

        const response = await fetch(`/api/collaborators?${query.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("No se pudo cargar la lista de colaboradores.");
        }

        const data = (await response.json()) as CollaboratorListResponse;
        setCollaborators(data.items);

        setSelectedCollaboratorId((currentId) => {
          if (pendingSelectionEmployeeId) {
            const pendingCollaborator = data.items.find(
              (item) => item.employeeId === pendingSelectionEmployeeId,
            );

            if (pendingCollaborator) {
              setPendingSelectionEmployeeId(null);
              return pendingCollaborator.id;
            }
          }

          if (currentId && data.items.some((item) => item.id === currentId)) {
            return currentId;
          }

          return data.items[0]?.id ?? null;
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setCollaborators([]);
        setSelectedCollaboratorId(null);
        setListError(
          error instanceof Error
            ? error.message
            : "Ocurrio un error al cargar colaboradores.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setListLoading(false);
        }
      }
    }

    void loadCollaborators();

    return () => controller.abort();
  }, [search, listRefreshKey, pendingSelectionEmployeeId]);

  useEffect(() => {
    if (!selectedCollaboratorId) {
      setBalanceData(null);
      setLedgerData(null);
      setAccessData(null);
      setDetailsError(null);
      setAccessError(null);
      return;
    }

    const controller = new AbortController();

    async function loadDetails() {
      setDetailsLoading(true);
      setDetailsError(null);

      try {
        const query = new URLSearchParams({
          year: quotaForm.year,
          month: quotaForm.month,
        }).toString();

        const [balanceResponse, ledgerResponse] = await Promise.all([
          fetch(
            `/api/collaborators/${selectedCollaboratorId}/balance?${query}`,
            { signal: controller.signal },
          ),
          fetch(`/api/collaborators/${selectedCollaboratorId}/ledger?${query}`, {
            signal: controller.signal,
          }),
        ]);

        if (!balanceResponse.ok || !ledgerResponse.ok) {
          throw new Error("No se pudieron cargar los detalles del colaborador.");
        }

        const [balance, ledger] = (await Promise.all([
          balanceResponse.json(),
          ledgerResponse.json(),
        ])) as [BalanceResponse, LedgerResponse];

        setBalanceData(balance);
        setLedgerData(ledger);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setBalanceData(null);
        setLedgerData(null);
        setDetailsError(
          error instanceof Error
            ? error.message
            : "Ocurrio un error al cargar el detalle del colaborador.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setDetailsLoading(false);
        }
      }
    }

    // Data flow:
    // whenever the selected collaborator, target period, or refresh key changes,
    // the dashboard reloads both balance and ledger from the backend APIs.
    void loadDetails();

    return () => controller.abort();
  }, [
    selectedCollaboratorId,
    quotaForm.year,
    quotaForm.month,
    detailsRefreshKey,
  ]);

  useEffect(() => {
    if (!selectedCollaboratorId) {
      setAccessData(null);
      setAccessError(null);
      return;
    }

    const controller = new AbortController();

    async function loadAccess() {
      setAccessLoading(true);
      setAccessError(null);

      try {
        const response = await fetch(
          `/api/collaborators/${selectedCollaboratorId}/access`,
          { signal: controller.signal },
        );

        const payload = (await response.json()) as
          | CollaboratorAccessResponse
          | { message?: string };

        if (!response.ok) {
          throw new Error(
            "message" in payload && payload.message
              ? payload.message
              : "No se pudo cargar la informacion de acceso.",
          );
        }

        setAccessData(payload as CollaboratorAccessResponse);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setAccessData(null);
        setAccessError(
          error instanceof Error
            ? error.message
            : "Ocurrio un error al cargar el acceso del colaborador.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setAccessLoading(false);
        }
      }
    }

    void loadAccess();

    return () => controller.abort();
  }, [selectedCollaboratorId, detailsRefreshKey]);

  async function handleQuotaSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canPerformAdminActions || !actorUserId || actorRole !== "ADMIN") {
      setQuotaError(adminActionMessage);
      return;
    }

    if (!selectedCollaboratorId) {
      setQuotaError("Selecciona un colaborador antes de asignar un cupo.");
      return;
    }

    setQuotaSubmitting(true);
    setQuotaError(null);
    setQuotaSuccess(null);

    try {
      const response = await fetch("/api/quotas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collaboratorId: selectedCollaboratorId,
          year: Number(quotaForm.year),
          month: Number(quotaForm.month),
          amount: Number(quotaForm.amount),
          currency: quotaForm.currency || "USD",
        }),
      });

      const payload = (await response.json()) as
        | AssignQuotaResponse
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in payload && payload.message
            ? payload.message
            : "No se pudo asignar el cupo mensual.",
        );
      }

      const successPayload = payload as AssignQuotaResponse;

      setQuotaSuccess(
        `Cupo ${
          successPayload.quota.status === "ADJUSTED" ? "actualizado" : "asignado"
        } correctamente para ${quotaForm.month}/${quotaForm.year}.`,
      );
      setQuotaForm((current) => ({
        ...current,
        amount: "",
      }));
      setDetailsRefreshKey((current) => current + 1);
    } catch (error) {
      setQuotaError(
        error instanceof Error
          ? error.message
          : "Ocurrio un error al asignar el cupo.",
      );
    } finally {
      setQuotaSubmitting(false);
    }
  }

  async function handleCreateCollaboratorSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canPerformAdminActions) {
      setCreateCollaboratorError(adminActionMessage);
      return;
    }

    setCreateCollaboratorSubmitting(true);
    setCreateCollaboratorError(null);
    setCreateCollaboratorSuccess(null);

    try {
      const response = await fetch("/api/collaborators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: createCollaboratorForm.employeeId.trim(),
          fullName: createCollaboratorForm.fullName.trim(),
          documentNumber: createCollaboratorForm.documentNumber.trim() || null,
          costCenter: createCollaboratorForm.costCenter.trim() || null,
          department: createCollaboratorForm.department.trim() || null,
          vehicleReference: createCollaboratorForm.vehicleReference.trim() || null,
          status: createCollaboratorForm.status,
          createUserAccess: createCollaboratorForm.createUserAccess,
          email: createCollaboratorForm.createUserAccess
            ? createCollaboratorForm.email.trim() || null
            : null,
        }),
      });

      const payload = (await response.json()) as
        | CreateCollaboratorResponse
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in payload && payload.message
            ? payload.message
            : "No se pudo crear el colaborador.",
        );
      }

      const successPayload = payload as CreateCollaboratorResponse;

      setCreateCollaboratorSuccess(
        successPayload.userAccess
          ? `Colaborador ${successPayload.collaborator.fullName} creado con acceso. Password temporal: ${successPayload.userAccess.temporaryPassword}`
          : `Colaborador ${successPayload.collaborator.fullName} creado correctamente.`,
      );
      setPendingSelectionEmployeeId(successPayload.collaborator.employeeId);
      setSearch("");
      setListRefreshKey((current) => current + 1);
      setCreateCollaboratorForm({
        employeeId: "",
        fullName: "",
        documentNumber: "",
        costCenter: "",
        department: "",
        vehicleReference: "",
        status: "ACTIVE",
        createUserAccess: false,
        email: "",
      });
    } catch (error) {
      setCreateCollaboratorError(
        error instanceof Error
          ? error.message
          : "Ocurrio un error al crear el colaborador.",
      );
    } finally {
      setCreateCollaboratorSubmitting(false);
    }
  }

  async function handleExpenseSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canPerformAdminActions || !actorUserId || actorRole !== "ADMIN") {
      setExpenseError(adminActionMessage);
      return;
    }

    if (!selectedCollaboratorId) {
      setExpenseError("Selecciona un colaborador antes de registrar un gasto.");
      return;
    }

    setExpenseSubmitting(true);
    setExpenseError(null);
    setExpenseSuccess(null);

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collaboratorId: selectedCollaboratorId,
          expenseDate: new Date(expenseForm.expenseDate).toISOString(),
          year: Number(expenseForm.year),
          month: Number(expenseForm.month),
          amount: Number(expenseForm.amount),
          category: expenseForm.category,
          description: expenseForm.description || null,
          currency: expenseForm.currency || "USD",
        }),
      });

      const payload = (await response.json()) as
        | RegisterExpenseResponse
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in payload && payload.message
            ? payload.message
            : "No se pudo registrar el gasto.",
        );
      }

      const successPayload = payload as RegisterExpenseResponse;

      setExpenseSuccess(
        `Gasto ${successPayload.expense.id} registrado correctamente para ${expenseForm.month}/${expenseForm.year}.`,
      );
      setExpenseForm((current) => ({
        ...current,
        amount: "",
        description: "",
      }));
      setDetailsRefreshKey((current) => current + 1);
    } catch (error) {
      setExpenseError(
        error instanceof Error
          ? error.message
          : "Ocurrio un error al registrar el gasto.",
      );
    } finally {
      setExpenseSubmitting(false);
    }
  }

  function startEditingExpense(expense: LedgerExpense) {
    setEditingExpenseId(expense.id);
    setExpenseEditForm(buildExpenseEditForm(expense));
    setLedgerActionError(null);
    setLedgerActionSuccess(null);
  }

  function cancelEditingExpense() {
    setEditingExpenseId(null);
    setExpenseEditForm(null);
  }

  async function handleExpenseUpdate(expenseId: string) {
    if (!expenseEditForm) {
      return;
    }

    if (!canPerformAdminActions || !actorUserId || actorRole !== "ADMIN") {
      setLedgerActionError(adminActionMessage);
      return;
    }

    setUpdatingExpenseId(expenseId);
    setLedgerActionError(null);
    setLedgerActionSuccess(null);

    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number(expenseEditForm.amount),
          category: expenseEditForm.category,
          description: expenseEditForm.description || null,
          expenseDate: new Date(expenseEditForm.expenseDate).toISOString(),
          year: Number(expenseEditForm.year),
          month: Number(expenseEditForm.month),
          currency: expenseEditForm.currency || "USD",
        }),
      });

      const payload = (await response.json()) as
        | UpdateExpenseResponse
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in payload && payload.message
            ? payload.message
            : "No se pudo actualizar el gasto.",
        );
      }

      const successPayload = payload as UpdateExpenseResponse;

      setLedgerActionSuccess(`Gasto ${successPayload.expense.id} actualizado correctamente.`);
      cancelEditingExpense();
      setDetailsRefreshKey((current) => current + 1);
    } catch (error) {
      setLedgerActionError(
        error instanceof Error
          ? error.message
          : "Ocurrio un error al actualizar el gasto.",
      );
    } finally {
      setUpdatingExpenseId(null);
    }
  }

  async function handleExpenseVoid(expense: LedgerExpense) {
    if (!canPerformAdminActions || !actorUserId || actorRole !== "ADMIN") {
      setLedgerActionError(adminActionMessage);
      return;
    }

    if (
      !window.confirm(
        `Se anulara el gasto ${expense.id} por ${formatMoney(
          expense.amount,
          expense.currency,
        )}. Deseas continuar?`,
      )
    ) {
      return;
    }

    const reason = window.prompt(
      "Motivo de anulacion (opcional):",
      "Anulacion manual desde dashboard admin",
    );

    setVoidingExpenseId(expense.id);
    setLedgerActionError(null);
    setLedgerActionSuccess(null);

    try {
      const response = await fetch(`/api/expenses/${expense.id}/void`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: reason || undefined,
        }),
      });

      const payload = (await response.json()) as
        | VoidExpenseResponse
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in payload && payload.message
            ? payload.message
            : "No se pudo anular el gasto.",
        );
      }

      const successPayload = payload as VoidExpenseResponse;

      setLedgerActionSuccess(`Gasto ${successPayload.expense.id} anulado correctamente.`);
      setDetailsRefreshKey((current) => current + 1);
    } catch (error) {
      setLedgerActionError(
        error instanceof Error
          ? error.message
          : "Ocurrio un error al anular el gasto.",
      );
    } finally {
      setVoidingExpenseId(null);
    }
  }

  async function handleResetCollaboratorPassword() {
    if (!canPerformAdminActions || !selectedCollaboratorId) {
      setAccessError(adminActionMessage);
      return;
    }

    if (
      !window.confirm(
        "Se generara una nueva contrasena temporal para el acceso del colaborador. Deseas continuar?",
      )
    ) {
      return;
    }

    setResetPasswordSubmitting(true);
    setAccessError(null);
    setResetPasswordSuccess(null);

    try {
      const response = await fetch(
        `/api/collaborators/${selectedCollaboratorId}/access/reset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const payload = (await response.json()) as
        | ResetCollaboratorPasswordResponse
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in payload && payload.message
            ? payload.message
            : "No se pudo resetear la contrasena.",
        );
      }

      const successPayload = payload as ResetCollaboratorPasswordResponse;

      setResetPasswordSuccess(
        `Acceso ${successPayload.userAccess.email}. Nueva contrasena temporal: ${successPayload.userAccess.temporaryPassword}. Esta contrasena es temporal y debe cambiarse posteriormente.`,
      );
      setDetailsRefreshKey((current) => current + 1);
    } catch (error) {
      setAccessError(
        error instanceof Error
          ? error.message
          : "Ocurrio un error al resetear la contrasena.",
      );
    } finally {
      setResetPasswordSubmitting(false);
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Cartilla Digital</p>
            <h1>Panel Administrador</h1>
            <p className="subtle">
              Consulta colaboradores, asigna cupos mensuales, registra gastos y
              administra el ledger del periodo seleccionado.
            </p>
            <p className="subtle small-text">
              {canPerformAdminActions
                ? `Sesion activa: ${session?.user.email} (${session.user.role})`
                : adminActionMessage}
            </p>
          </div>
        </header>

        <section className="admin-grid">
          <div className="card">
            <div className="card-header">
              <h2>Colaboradores</h2>
              <input
                className="search-input"
                type="search"
                placeholder="Buscar por employeeId o nombre"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {listLoading ? (
              <p className="subtle">Cargando colaboradores...</p>
            ) : null}
            {listError ? <p className="error-text">{listError}</p> : null}
            {!listLoading && !listError && collaborators.length === 0 ? (
              <p className="subtle">No se encontraron colaboradores.</p>
            ) : null}

            {collaborators.length > 0 ? (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Nombre</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collaborators.map((collaborator) => (
                      <tr
                        key={collaborator.id}
                        className={
                          collaborator.id === selectedCollaboratorId
                            ? "is-selected"
                            : ""
                        }
                        onClick={() => {
                          setSelectedCollaboratorId(collaborator.id);
                          setQuotaError(null);
                          setQuotaSuccess(null);
                          setExpenseError(null);
                          setExpenseSuccess(null);
                          setLedgerActionError(null);
                          setLedgerActionSuccess(null);
                          setAccessError(null);
                          setResetPasswordSuccess(null);
                          cancelEditingExpense();
                        }}
                      >
                        <td>{collaborator.employeeId}</td>
                        <td>{collaborator.fullName}</td>
                        <td>{collaborator.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          <div className="details-column">
            <section className="card">
              <div className="card-header">
                <h2>Crear colaborador</h2>
              </div>

              <form
                className="quota-form"
                onSubmit={handleCreateCollaboratorSubmit}
              >
                <div className="quota-form-grid">
                  <label className="field">
                    <span>Employee ID</span>
                    <input
                      type="text"
                      value={createCollaboratorForm.employeeId}
                      onChange={(event) =>
                        setCreateCollaboratorForm((current) => ({
                          ...current,
                          employeeId: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Estado</span>
                    <select
                      value={createCollaboratorForm.status}
                      onChange={(event) =>
                        setCreateCollaboratorForm((current) => ({
                          ...current,
                          status: event.target.value as "ACTIVE" | "INACTIVE",
                        }))
                      }
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </label>
                  <label className="field field-span-2">
                    <span>Nombre completo</span>
                    <input
                      type="text"
                      value={createCollaboratorForm.fullName}
                      onChange={(event) =>
                        setCreateCollaboratorForm((current) => ({
                          ...current,
                          fullName: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Documento</span>
                    <input
                      type="text"
                      value={createCollaboratorForm.documentNumber}
                      onChange={(event) =>
                        setCreateCollaboratorForm((current) => ({
                          ...current,
                          documentNumber: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Centro de costo</span>
                    <input
                      type="text"
                      value={createCollaboratorForm.costCenter}
                      onChange={(event) =>
                        setCreateCollaboratorForm((current) => ({
                          ...current,
                          costCenter: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Departamento</span>
                    <input
                      type="text"
                      value={createCollaboratorForm.department}
                      onChange={(event) =>
                        setCreateCollaboratorForm((current) => ({
                          ...current,
                          department: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Referencia vehicular</span>
                    <input
                      type="text"
                      value={createCollaboratorForm.vehicleReference}
                      onChange={(event) =>
                        setCreateCollaboratorForm((current) => ({
                          ...current,
                          vehicleReference: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field field-span-2">
                    <span>
                      <input
                        type="checkbox"
                        checked={createCollaboratorForm.createUserAccess}
                        onChange={(event) =>
                          setCreateCollaboratorForm((current) => ({
                            ...current,
                            createUserAccess: event.target.checked,
                            email: event.target.checked ? current.email : "",
                          }))
                        }
                        style={{ marginRight: "0.55rem" }}
                      />
                      Crear acceso de usuario COLLABORATOR
                    </span>
                  </label>
                  {createCollaboratorForm.createUserAccess ? (
                    <label className="field field-span-2">
                      <span>Email de acceso</span>
                      <input
                        type="email"
                        value={createCollaboratorForm.email}
                        onChange={(event) =>
                          setCreateCollaboratorForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                  ) : null}
                </div>

                <div className="quota-actions">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={
                      createCollaboratorSubmitting || !canPerformAdminActions
                    }
                  >
                    {createCollaboratorSubmitting
                      ? "Creando..."
                      : "Crear colaborador"}
                  </button>
                  <span className="subtle small-text">
                    {canPerformAdminActions
                      ? `Actor autenticado: ${session?.user.email} / ${actorRole}`
                      : adminActionMessage}
                  </span>
                </div>

                {createCollaboratorSuccess ? (
                  <p className="success-text">{createCollaboratorSuccess}</p>
                ) : null}
                {createCollaboratorError ? (
                  <p className="error-text">{createCollaboratorError}</p>
                ) : null}
              </form>
            </section>

            <section className="card">
              <div className="card-header">
                <h2>Acceso del colaborador</h2>
              </div>

              {!selectedCollaboratorId ? (
                <p className="subtle">
                  Selecciona un colaborador para consultar su acceso.
                </p>
              ) : accessLoading ? (
                <p className="subtle">Cargando acceso...</p>
              ) : accessError ? (
                <p className="error-text">{accessError}</p>
              ) : accessData?.access ? (
                <>
                  <div className="balance-grid">
                    <div className="metric">
                      <span>Email vinculado</span>
                      <strong>{accessData.access.email}</strong>
                    </div>
                    <div className="metric">
                      <span>Estado acceso</span>
                      <strong>{accessData.access.status}</strong>
                    </div>
                    <div className="metric">
                      <span>Rol vinculado</span>
                      <strong>{accessData.access.role}</strong>
                    </div>
                  </div>

                  <div className="quota-actions" style={{ marginTop: "1rem" }}>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => void handleResetCollaboratorPassword()}
                      disabled={
                        resetPasswordSubmitting || !canPerformAdminActions
                      }
                    >
                      {resetPasswordSubmitting
                        ? "Reseteando..."
                        : "Resetear contrasena"}
                    </button>
                    <span className="subtle small-text">
                      Se generara una contrasena temporal nueva para este acceso.
                    </span>
                  </div>

                  {resetPasswordSuccess ? (
                    <p className="success-text">{resetPasswordSuccess}</p>
                  ) : null}
                </>
              ) : (
                <p className="subtle">
                  Este colaborador no tiene acceso creado.
                </p>
              )}
            </section>

            <section className="card">
              <div className="card-header">
                <h2>Asignar cupo mensual</h2>
              </div>

              {selectedCollaboratorId ? (
                <form className="quota-form" onSubmit={handleQuotaSubmit}>
                  <div className="quota-form-grid">
                    <label className="field">
                      <span>Anio</span>
                      <input
                        type="number"
                        value={quotaForm.year}
                        onChange={(event) =>
                          setQuotaForm((current) => ({
                            ...current,
                            year: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Mes</span>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={quotaForm.month}
                        onChange={(event) =>
                          setQuotaForm((current) => ({
                            ...current,
                            month: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Monto</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={quotaForm.amount}
                        onChange={(event) =>
                          setQuotaForm((current) => ({
                            ...current,
                            amount: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Moneda</span>
                      <input
                        type="text"
                        value={quotaForm.currency}
                        onChange={(event) =>
                          setQuotaForm((current) => ({
                            ...current,
                            currency: event.target.value.toUpperCase(),
                          }))
                        }
                        required
                      />
                    </label>
                  </div>

                  <div className="quota-actions">
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={quotaSubmitting || !canPerformAdminActions}
                    >
                      {quotaSubmitting ? "Guardando..." : "Guardar cupo"}
                    </button>
                    <span className="subtle small-text">
                      {canPerformAdminActions
                        ? `Actor autenticado: ${session?.user.email} / ${actorRole}`
                        : adminActionMessage}
                    </span>
                  </div>

                  {quotaSuccess ? (
                    <p className="success-text">{quotaSuccess}</p>
                  ) : null}
                  {quotaError ? <p className="error-text">{quotaError}</p> : null}
                </form>
              ) : (
                <p className="subtle">
                  Selecciona un colaborador para asignar o actualizar su cupo.
                </p>
              )}
            </section>

            <section className="card">
              <div className="card-header">
                <h2>Registrar gasto</h2>
              </div>

              {selectedCollaboratorId ? (
                <form className="quota-form" onSubmit={handleExpenseSubmit}>
                  <div className="quota-form-grid">
                    <label className="field">
                      <span>Fecha gasto</span>
                      <input
                        type="date"
                        value={expenseForm.expenseDate}
                        onChange={(event) =>
                          setExpenseForm((current) => ({
                            ...current,
                            expenseDate: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Anio</span>
                      <input
                        type="number"
                        value={expenseForm.year}
                        onChange={(event) =>
                          setExpenseForm((current) => ({
                            ...current,
                            year: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Mes</span>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={expenseForm.month}
                        onChange={(event) =>
                          setExpenseForm((current) => ({
                            ...current,
                            month: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Monto</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={expenseForm.amount}
                        onChange={(event) =>
                          setExpenseForm((current) => ({
                            ...current,
                            amount: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Categoria</span>
                      <select
                        value={expenseForm.category}
                        onChange={(event) =>
                          setExpenseForm((current) => ({
                            ...current,
                            category: event.target.value as
                              | "FUEL"
                              | "MAINTENANCE",
                          }))
                        }
                      >
                        <option value="FUEL">FUEL</option>
                        <option value="MAINTENANCE">MAINTENANCE</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Moneda</span>
                      <input
                        type="text"
                        value={expenseForm.currency}
                        onChange={(event) =>
                          setExpenseForm((current) => ({
                            ...current,
                            currency: event.target.value.toUpperCase(),
                          }))
                        }
                        required
                      />
                    </label>
                    <label className="field field-span-2">
                      <span>Descripcion</span>
                      <input
                        type="text"
                        value={expenseForm.description}
                        onChange={(event) =>
                          setExpenseForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Detalle opcional del gasto"
                      />
                    </label>
                  </div>

                  <div className="quota-actions">
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={expenseSubmitting || !canPerformAdminActions}
                    >
                      {expenseSubmitting ? "Guardando..." : "Registrar gasto"}
                    </button>
                    <span className="subtle small-text">
                      {canPerformAdminActions
                        ? `Actor autenticado: ${session?.user.email} / ${actorRole}`
                        : adminActionMessage}
                    </span>
                  </div>

                  {expenseSuccess ? (
                    <p className="success-text">{expenseSuccess}</p>
                  ) : null}
                  {expenseError ? (
                    <p className="error-text">{expenseError}</p>
                  ) : null}
                </form>
              ) : (
                <p className="subtle">
                  Selecciona un colaborador para registrar un gasto.
                </p>
              )}
            </section>

            <section className="card">
              <div className="card-header">
                <h2>Balance actual</h2>
              </div>

              {detailsLoading ? (
                <p className="subtle">Cargando balance...</p>
              ) : null}
              {detailsError ? <p className="error-text">{detailsError}</p> : null}
              {!detailsLoading && !detailsError && balanceData ? (
                <div className="balance-grid">
                  <div className="metric">
                    <span>Colaborador</span>
                    <strong>{balanceData.collaborator.fullName}</strong>
                  </div>
                  <div className="metric">
                    <span>Employee ID</span>
                    <strong>{balanceData.collaborator.employeeId}</strong>
                  </div>
                  <div className="metric">
                    <span>Saldo inicial</span>
                    <strong>
                      {formatMoney(
                        balanceData.balance.openingBalance,
                        balanceData.balance.currency,
                      )}
                    </strong>
                  </div>
                  <div className="metric">
                    <span>Cupo</span>
                    <strong>
                      {formatMoney(
                        balanceData.balance.quotaAmount,
                        balanceData.balance.currency,
                      )}
                    </strong>
                  </div>
                  <div className="metric">
                    <span>Ejecutado</span>
                    <strong>
                      {formatMoney(
                        balanceData.balance.executedAmount,
                        balanceData.balance.currency,
                      )}
                    </strong>
                  </div>
                  <div className="metric highlight">
                    <span>Saldo final</span>
                    <strong>
                      {formatMoney(
                        balanceData.balance.closingBalance,
                        balanceData.balance.currency,
                      )}
                    </strong>
                  </div>
                  <div className="metric">
                    <span>Ultimo gasto</span>
                    <strong>
                      {formatDateTime(balanceData.balance.lastExpenseDate)}
                    </strong>
                  </div>
                  <div className="metric">
                    <span>Recalculado</span>
                    <strong>
                      {formatDateTime(balanceData.balance.recalculatedAt)}
                    </strong>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="card">
              <div className="card-header">
                <h2>Ledger mensual</h2>
              </div>

              {ledgerActionSuccess ? (
                <p className="success-text">{ledgerActionSuccess}</p>
              ) : null}
              {ledgerActionError ? (
                <p className="error-text">{ledgerActionError}</p>
              ) : null}

              {!detailsLoading && !detailsError && ledgerData ? (
                <>
                  <div className="ledger-summary">
                    <span>
                      Cupo:{" "}
                      {ledgerData.quota
                        ? formatMoney(
                            ledgerData.quota.amount,
                            ledgerData.quota.currency,
                          )
                        : "-"}
                    </span>
                    <span>
                      Estado cupo: {ledgerData.quota?.status ?? "SIN_CUPO"}
                    </span>
                  </div>

                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Categoria</th>
                          <th>Monto</th>
                          <th>Estado</th>
                          <th>Descripcion</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerData.expenses.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="empty-cell">
                              No hay gastos registrados para este periodo.
                            </td>
                          </tr>
                        ) : (
                          ledgerData.expenses.map((expense) => {
                            const isEditing = editingExpenseId === expense.id;
                            const isUpdating = updatingExpenseId === expense.id;
                            const isVoiding = voidingExpenseId === expense.id;

                            return (
                              <tr
                                key={expense.id}
                                className={
                                  expense.status === "VOIDED"
                                    ? "ledger-row-voided"
                                    : undefined
                                }
                              >
                                <td>
                                  {isEditing && expenseEditForm ? (
                                    <input
                                      className="inline-input"
                                      type="date"
                                      value={expenseEditForm.expenseDate}
                                      onChange={(event) =>
                                        setExpenseEditForm((current) =>
                                          current
                                            ? {
                                                ...current,
                                                expenseDate: event.target.value,
                                              }
                                            : current,
                                        )
                                      }
                                    />
                                  ) : (
                                    formatDateTime(expense.expenseDate)
                                  )}
                                </td>
                                <td>
                                  {isEditing && expenseEditForm ? (
                                    <select
                                      className="inline-input"
                                      value={expenseEditForm.category}
                                      onChange={(event) =>
                                        setExpenseEditForm((current) =>
                                          current
                                            ? {
                                                ...current,
                                                category: event.target.value as
                                                  | "FUEL"
                                                  | "MAINTENANCE",
                                              }
                                            : current,
                                        )
                                      }
                                    >
                                      <option value="FUEL">FUEL</option>
                                      <option value="MAINTENANCE">
                                        MAINTENANCE
                                      </option>
                                    </select>
                                  ) : (
                                    expense.category
                                  )}
                                </td>
                                <td>
                                  {isEditing && expenseEditForm ? (
                                    <input
                                      className="inline-input"
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={expenseEditForm.amount}
                                      onChange={(event) =>
                                        setExpenseEditForm((current) =>
                                          current
                                            ? {
                                                ...current,
                                                amount: event.target.value,
                                              }
                                            : current,
                                        )
                                      }
                                    />
                                  ) : (
                                    formatMoney(expense.amount, expense.currency)
                                  )}
                                </td>
                                <td>{expense.status}</td>
                                <td>
                                  {isEditing && expenseEditForm ? (
                                    <div className="inline-edit-stack">
                                      <input
                                        className="inline-input"
                                        type="text"
                                        value={expenseEditForm.description}
                                        onChange={(event) =>
                                          setExpenseEditForm((current) =>
                                            current
                                              ? {
                                                  ...current,
                                                  description:
                                                    event.target.value,
                                                }
                                              : current,
                                          )
                                        }
                                        placeholder="Descripcion"
                                      />
                                      <div className="inline-edit-grid">
                                        <input
                                          className="inline-input"
                                          type="number"
                                          value={expenseEditForm.year}
                                          onChange={(event) =>
                                            setExpenseEditForm((current) =>
                                              current
                                                ? {
                                                    ...current,
                                                    year: event.target.value,
                                                  }
                                                : current,
                                            )
                                          }
                                          placeholder="Anio"
                                        />
                                        <input
                                          className="inline-input"
                                          type="number"
                                          min="1"
                                          max="12"
                                          value={expenseEditForm.month}
                                          onChange={(event) =>
                                            setExpenseEditForm((current) =>
                                              current
                                                ? {
                                                    ...current,
                                                    month: event.target.value,
                                                  }
                                                : current,
                                            )
                                          }
                                          placeholder="Mes"
                                        />
                                        <input
                                          className="inline-input"
                                          type="text"
                                          value={expenseEditForm.currency}
                                          onChange={(event) =>
                                            setExpenseEditForm((current) =>
                                              current
                                                ? {
                                                    ...current,
                                                    currency:
                                                      event.target.value.toUpperCase(),
                                                  }
                                                : current,
                                            )
                                          }
                                          placeholder="Moneda"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    expense.description ?? "-"
                                  )}
                                </td>
                                <td>
                                  <div className="row-actions">
                                    {isEditing ? (
                                      <>
                                        <button
                                          className="secondary-button"
                                          type="button"
                                          disabled={isUpdating || !canPerformAdminActions}
                                          onClick={() =>
                                            void handleExpenseUpdate(expense.id)
                                          }
                                        >
                                          {isUpdating ? "Guardando..." : "Guardar"}
                                        </button>
                                        <button
                                          className="ghost-button"
                                          type="button"
                                          disabled={isUpdating}
                                          onClick={cancelEditingExpense}
                                        >
                                          Cancelar
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          className="secondary-button"
                                          type="button"
                                          disabled={
                                            expense.status === "VOIDED" ||
                                            !canPerformAdminActions
                                          }
                                          onClick={() => startEditingExpense(expense)}
                                        >
                                          Editar
                                        </button>
                                        <button
                                          className="danger-button"
                                          type="button"
                                          disabled={
                                            expense.status === "VOIDED" ||
                                            isVoiding ||
                                            !canPerformAdminActions
                                          }
                                          onClick={() =>
                                            void handleExpenseVoid(expense)
                                          }
                                        >
                                          {isVoiding ? "Anulando..." : "Anular"}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
