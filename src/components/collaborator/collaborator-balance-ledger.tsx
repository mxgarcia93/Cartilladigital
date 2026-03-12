"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

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
  expenses: Array<{
    id: string;
    expenseDate: string;
    year: number;
    month: number;
    category: "FUEL" | "MAINTENANCE";
    amount: number;
    currency: string;
    description: string | null;
    status: "ACTIVE" | "VOIDED";
  }>;
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

export function CollaboratorBalanceLedger() {
  const { data: session, status: sessionStatus } = useSession();
  const now = new Date();
  const [year, setYear] = useState(String(now.getUTCFullYear()));
  const [month, setMonth] = useState(String(now.getUTCMonth() + 1));
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceResponse | null>(null);
  const [ledgerData, setLedgerData] = useState<LedgerResponse | null>(null);
  const collaboratorId = session?.user?.collaboratorId ?? null;
  const canQueryCollaboratorData =
    sessionStatus === "authenticated" && !!collaboratorId;

  async function handleApply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canQueryCollaboratorData || !collaboratorId) {
      setHasLoaded(true);
      setBalanceData(null);
      setLedgerData(null);
      setError(
        sessionStatus === "loading"
          ? "La sesion aun se esta cargando."
          : "Tu usuario autenticado no esta vinculado a un colaborador.",
      );
      return;
    }

    setLoading(true);
    setError(null);
    setHasLoaded(true);

    try {
      const query = new URLSearchParams({
        year,
        month,
      }).toString();

      // Data flow:
      // the component only manages collaboratorId/period UI state,
      // then reads the persisted balance and ledger snapshots from the API.
      const [balanceResponse, ledgerResponse] = await Promise.all([
        fetch(`/api/collaborators/${collaboratorId}/balance?${query}`),
        fetch(`/api/collaborators/${collaboratorId}/ledger?${query}`),
      ]);

      const [balancePayload, ledgerPayload] = (await Promise.all([
        balanceResponse.json(),
        ledgerResponse.json(),
      ])) as [
        BalanceResponse | { message?: string },
        LedgerResponse | { message?: string },
      ];

      if (!balanceResponse.ok || !ledgerResponse.ok) {
        const message =
          ("message" in balancePayload && balancePayload.message) ||
          ("message" in ledgerPayload && ledgerPayload.message) ||
          "No se pudo cargar la informacion del colaborador.";
        throw new Error(message);
      }

      setBalanceData(balancePayload as BalanceResponse);
      setLedgerData(ledgerPayload as LedgerResponse);
    } catch (fetchError) {
      setBalanceData(null);
      setLedgerData(null);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Ocurrio un error al consultar el periodo.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-page">
      <div className="approver-shell">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Cartilla Digital</p>
            <h1>Vista Colaborador</h1>
            <p className="subtle">
              Consulta tu balance mensual y el ledger del periodo seleccionado.
            </p>
          </div>
        </header>

        <section className="card">
          <form className="quota-form" onSubmit={handleApply}>
            <div className="quota-form-grid">
              <div className="field field-span-2">
                <span>Colaborador autenticado</span>
                <strong>{collaboratorId ?? "Sin colaborador vinculado"}</strong>
              </div>
              <label className="field">
                <span>Anio</span>
                <input
                  type="number"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Mes</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="quota-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={loading || !canQueryCollaboratorData}
              >
                {loading ? "Consultando..." : "Aplicar periodo"}
              </button>
              <span className="subtle small-text">
                {sessionStatus === "loading"
                  ? "Cargando sesion..."
                  : collaboratorId
                    ? `Sesion activa: ${session?.user.email}`
                    : "Tu usuario no tiene un collaboratorId asociado."}
              </span>
            </div>
          </form>

          {error ? <p className="error-text">{error}</p> : null}
          {!error && sessionStatus !== "loading" && !collaboratorId ? (
            <p className="error-text">
              Tu usuario autenticado no esta vinculado a un colaborador.
            </p>
          ) : null}
          {!loading && !error && !hasLoaded ? (
            <p className="subtle">
              Selecciona el periodo y aplica para consultar balance y ledger.
            </p>
          ) : null}
        </section>

        {balanceData ? (
          <section className="card">
            <div className="card-header">
              <h2>Balance mensual</h2>
            </div>

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
                <span>Periodo</span>
                <strong>
                  {balanceData.period.month}/{balanceData.period.year}
                </strong>
              </div>
              <div className="metric">
                <span>Estado</span>
                <strong>{balanceData.collaborator.status}</strong>
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
                <strong>{formatDateTime(balanceData.balance.lastExpenseDate)}</strong>
              </div>
              <div className="metric">
                <span>Recalculado</span>
                <strong>{formatDateTime(balanceData.balance.recalculatedAt)}</strong>
              </div>
            </div>
          </section>
        ) : null}

        {ledgerData ? (
          <section className="card">
            <div className="card-header">
              <h2>Ledger mensual</h2>
            </div>

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
              <span>Estado cupo: {ledgerData.quota?.status ?? "SIN_CUPO"}</span>
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
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-cell">
                        No hay gastos registrados para este periodo.
                      </td>
                    </tr>
                  ) : (
                    ledgerData.expenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className={
                          expense.status === "VOIDED"
                            ? "ledger-row-voided"
                            : undefined
                        }
                      >
                        <td>{formatDateTime(expense.expenseDate)}</td>
                        <td>{expense.category}</td>
                        <td>{formatMoney(expense.amount, expense.currency)}</td>
                        <td>{expense.status}</td>
                        <td>{expense.description ?? "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
