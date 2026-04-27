"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Credenciais inválidas. Verifique email e palavra-passe.");
      } else {
        router.push("/sala");
      }
    } catch {
      setError("Erro de ligação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">CheckMesa</div>
        <p className="login-tagline">Gestão de sala · Restaurante</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="input-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
              placeholder="admin@checkmesa.pt"
            />
          </div>
          <div className="field">
            <label className="input-label">Palavra-passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="alert-error" style={{ margin: `0 0 var(--s4)` }}>{error}</div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary btn-w100 btn-lg">
            {loading ? "A entrar…" : "Entrar"}
          </button>
        </form>

        <div style={{
          marginTop: "var(--s5)",
          padding: "var(--s3) var(--s4)",
          background: "var(--bg-warm)",
          borderRadius: "var(--r-md)",
          fontSize: "var(--text-xs)",
          color: "var(--text-secondary)",
        }}>
          <strong>Dev:</strong> admin@checkmesa.pt / admin123
        </div>
      </div>
    </div>
  );
}
