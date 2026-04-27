"use client";
import { useEffect, useState } from "react";
import { UserModal } from "@/components/admin/UserModal";

interface User {
  id: string; name: string; email: string; role: "ADMIN" | "STAFF"; createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalUser, setModalUser] = useState<User | null | undefined>(undefined);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Erro ao carregar utilizadores");
      setUsers(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleDelete(user: User) {
    if (!confirm(`Eliminar ${user.name}?`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao eliminar");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao eliminar");
    }
  }

  return (
    <div>
      <div className="admin-header">
        <h1 className="admin-title">Utilizadores</h1>
        <button onClick={() => setModalUser(null)} className="btn btn-primary" style={{ fontSize: "var(--text-sm)", padding: "0 var(--s4)", minHeight: "var(--touch-sm)" }}>
          Novo Utilizador
        </button>
      </div>

      <div style={{ padding: "var(--s5)" }}>
        {error && <div className="alert-error" style={{ margin: "0 0 var(--s4)" }}>{error}</div>}
        {loading
          ? <p style={{ color: "var(--text-muted)" }}>A carregar…</p>
          : (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Perfil</th>
                      <th style={{ textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td style={{ fontWeight: 600 }}>{user.name}</td>
                        <td style={{ color: "var(--text-secondary)" }}>{user.email}</td>
                        <td>
                          <span className={user.role === "ADMIN" ? "badge badge-brand" : "badge"} style={user.role !== "ADMIN" ? { background: "var(--bg-warm)", color: "var(--text-secondary)" } : {}}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button onClick={() => setModalUser(user)} className="btn btn-ghost" style={{ minHeight: 36, fontSize: "var(--text-xs)", padding: "0 var(--s3)", marginRight: "var(--s2)" }}>
                            Editar
                          </button>
                          <button onClick={() => handleDelete(user)} className="btn btn-danger" style={{ minHeight: 36, fontSize: "var(--text-xs)", padding: "0 var(--s3)" }}>
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }
      </div>

      {modalUser !== undefined && (
        <UserModal
          user={modalUser}
          onClose={() => setModalUser(undefined)}
          onSaved={() => { setModalUser(undefined); fetchUsers(); }}
        />
      )}
    </div>
  );
}
