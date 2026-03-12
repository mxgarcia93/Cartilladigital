"use client";

import { useState } from "react";

type ApproverBalanceResponse = {
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

export function ApproverBalanceSearch() {
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [result, setResult] = useState<ApproverBalanceResponse | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const query = new URLSearchParams({
        employeeId: employeeId.trim(),
      });

      // Data flow:
      // the component only captures the employeeId, calls the existing API,
      // and renders the persisted balance snapshot returned by the backend.
      const response = await fetch(`/api/approvals/balance?${query.toString()}`);
      const payload = (await response.json()) as
        | ApproverBalanceResponse
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in payload && payload.message
            ? payload.message
            : "No se pudo consultar el saldo del colaborador.",
        );
      }

      setResult(payload as ApproverBalanceResponse);
    } catch (fetchError) {
      setResult(null);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Ocurrio un error al consultar el saldo.",
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
            <h1>Consulta Aprobador</h1>
            <p className="subtle">
              Busca el saldo mensual actual de un colaborador usando su
              employeeId.
            </p>
          </div>
        </header>

        <section className="card">
          <form className="approver-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Employee ID</span>
              <input
                type="text"
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                placeholder="Ejemplo: EMP-1001"
                required
              />
            </label>

            <button
              className="primary-button"
              type="submit"
              disabled={loading || employeeId.trim().length === 0}
            >
              {loading ? "Consultando..." : "Buscar saldo"}
            </button>
          </form>

          {error ? <p className="error-text">{error}</p> : null}
          {!loading && !error && hasSearched && !result ? (
            <p className="subtle">No se encontraron resultados.</p>
          ) : null}
        </section>

        {result ? (
          <section className="card">
            <div className="card-header">
              <h2>Resultado</h2>
            </div>

            <div className="balance-grid">
              <div className="metric">
                <span>Colaborador</span>
                <strong>{result.collaborator.fullName}</strong>
              </div>
              <div className="metric">
                <span>Employee ID</span>
                <strong>{result.collaborator.employeeId}</strong>
              </div>
              <div className="metric">
                <span>Periodo</span>
                <strong>
                  {result.period.month}/{result.period.year}
                </strong>
              </div>
              <div className="metric">
                <span>Estado</span>
                <strong>{result.collaborator.status}</strong>
              </div>
              <div className="metric">
                <span>Saldo inicial</span>
                <strong>
                  {formatMoney(
                    result.balance.openingBalance,
                    result.balance.currency,
                  )}
                </strong>
              </div>
              <div className="metric">
                <span>Cupo</span>
                <strong>
                  {formatMoney(
                    result.balance.quotaAmount,
                    result.balance.currency,
                  )}
                </strong>
              </div>
              <div className="metric">
                <span>Ejecutado</span>
                <strong>
                  {formatMoney(
                    result.balance.executedAmount,
                    result.balance.currency,
                  )}
                </strong>
              </div>
              <div className="metric highlight">
                <span>Saldo final</span>
                <strong>
                  {formatMoney(
                    result.balance.closingBalance,
                    result.balance.currency,
                  )}
                </strong>
              </div>
              <div className="metric">
                <span>Ultimo gasto</span>
                <strong>{formatDateTime(result.balance.lastExpenseDate)}</strong>
              </div>
              <div className="metric">
                <span>Recalculado</span>
                <strong>{formatDateTime(result.balance.recalculatedAt)}</strong>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
