"use client";
import { signOut } from "next-auth/react";

export function LogoutButton({ userName }: { userName?: string | null }) {
  return (
    <div style={{
      borderTop: "1px solid rgba(255,255,255,.12)",
      padding: "var(--s4) var(--s5)",
      marginTop: "auto",
    }}>
      {userName && (
        <p style={{
          fontSize: "var(--text-xs)",
          color: "rgba(255,255,255,.5)",
          marginBottom: "var(--s2)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {userName}
        </p>
      )}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="admin-nav-item"
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.7)" }}
      >
        <span>🚪</span>
        Sair
      </button>
    </div>
  );
}
