"use client";
import { useState, useEffect } from "react";
import { ModalShell } from "@/components/ModalShell";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  createdAt: string;
}

interface Props {
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}

export function UserModal({ user, onClose, onSaved }: Props) {
  const isEdit = !!user;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF">(user?.role ?? "STAFF");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setRole(user?.role ?? "STAFF");
    setPassword("");
    setError("");
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body: Record<string, string> = { name, email, role };
      if (password) body.password = password;
      if (!isEdit && !password) throw new Error("Palavra-passe obrigatória para novo utilizador");

      const url = isEdit ? `/api/users/${user.id}` : "/api/users";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao guardar");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell title={isEdit ? "Editar Utilizador" : "Novo Utilizador"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="input-label" style={{ textTransform: "uppercase", letterSpacing: ".05em" }}>Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="input" />
        </div>
        <div className="field">
          <label className="input-label" style={{ textTransform: "uppercase", letterSpacing: ".05em" }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" />
        </div>
        <div className="field">
          <label className="input-label" style={{ textTransform: "uppercase", letterSpacing: ".05em" }}>
            Palavra-passe{isEdit && <span style={{ fontWeight: 400, textTransform: "none", color: "var(--text-muted)" }}> — deixar em branco para manter</span>}
          </label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!isEdit} className="input" />
        </div>
        <div className="field">
          <label className="input-label" style={{ textTransform: "uppercase", letterSpacing: ".05em" }}>Perfil</label>
          <select value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "STAFF")} className="input" style={{ cursor: "pointer" }}>
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {error && <div className="alert-error" style={{ margin: "0 0 var(--s4)" }}>{error}</div>}

        <div style={{ display: "flex", gap: "var(--s3)" }}>
          <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>
            {loading ? "A guardar…" : "Guardar"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

