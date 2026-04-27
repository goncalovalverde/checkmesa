import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/admin/users",     label: "Utilizadores", emoji: "👤" },
  { href: "/admin/tables",    label: "Mesas",        emoji: "🪑" },
  { href: "/admin/products",  label: "Produtos",     emoji: "🍽️" },
  { href: "/admin/historico", label: "Histórico",    emoji: "📋" },
  { href: "/sala",            label: "← Sala",       emoji: "" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!session || role !== "ADMIN") redirect("/sala");

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-logo">CheckMesa</div>
        <nav className="admin-nav">
          {NAV_LINKS.map(({ href, label, emoji }) => (
            <Link key={href} href={href} className="admin-nav-item">
              {emoji && <span>{emoji}</span>}
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="admin-content">{children}</div>
    </div>
  );
}
