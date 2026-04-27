"use client";
import type { ReactNode } from "react";

interface ModalShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  maxWidth?: number;
  children: ReactNode;
}

export function ModalShell({ title, subtitle, onClose, maxWidth = 460, children }: ModalShellProps) {
  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth }}
      >
        <div className="sheet-handle" />
        <p className="sheet-title" style={{ color: "var(--brand-dark)" }}>{title}</p>
        {subtitle && <p className="sheet-sub">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
