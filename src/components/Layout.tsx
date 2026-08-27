import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Landmark,
  Users,
  Contact,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import clsx from "clsx";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { usePin } from "../context/PinContext";

const NAV_ITEMS = [
  { to: "/", label: "الرئيسية", icon: Home, end: true },
  { to: "/usdt", label: "USDT", icon: Landmark, end: false },
  { to: "/persons", label: "الأشخاص", icon: Users, end: false },
  { to: "/customers", label: "العملاء", icon: Contact, end: false },
  { to: "/reports", label: "التقارير", icon: BarChart3, end: false },
  { to: "/settings", label: "الإعدادات", icon: SettingsIcon, end: false },
];

export function Layout({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { lock } = usePin();
  const navigate = useNavigate();

  const handleLogout = async () => {
    lock();
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-svh flex flex-col md:flex-row-reverse">
      <aside className="hidden md:flex md:w-60 md:flex-col md:sticky md:top-0 md:h-svh border-s border-slate-200/70 dark:border-white/5 bg-white dark:bg-surface px-4 py-6">
        <div className="flex items-center gap-2 px-2 mb-8">
          <span className="text-gold text-2xl font-extrabold">₮</span>
          <span className="font-extrabold text-lg">الذهبي للصرافة</span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition",
                  isActive
                    ? "bg-gold/15 text-gold-dark dark:text-gold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                )
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col gap-1">
          <button onClick={toggleTheme} className="btn-ghost justify-start">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
          </button>
          <button onClick={handleLogout} className="btn-ghost justify-start text-sell">
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-surface border-b border-slate-200/70 dark:border-white/5 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-gold text-xl font-extrabold">₮</span>
            <span className="font-bold">الذهبي للصرافة</span>
          </div>
          <button onClick={toggleTheme} aria-label="تبديل المظهر">
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        <main className="flex-1 px-4 py-5 md:px-8 md:py-8 pb-24 md:pb-8 max-w-6xl w-full mx-auto">
          {children}
        </main>

        <FloatingAddButton onClick={() => navigate("/transactions/new")} />

        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-surface border-t border-slate-200/70 dark:border-white/5 flex items-center justify-around py-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  "flex flex-col items-center gap-0.5 px-2 py-1 text-xs font-medium rounded-lg transition",
                  isActive ? "text-gold-dark dark:text-gold" : "text-slate-500 dark:text-slate-400"
                )
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function FloatingAddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 md:bottom-8 left-6 z-30 rounded-full bg-gold text-[#16213E] shadow-lg w-14 h-14 flex items-center justify-center hover:bg-gold-light transition active:scale-95"
      aria-label="إضافة"
    >
      <Plus size={26} />
    </button>
  );
}
