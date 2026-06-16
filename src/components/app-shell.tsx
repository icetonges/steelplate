"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Onboarding } from "./onboarding";

export type Child = {
  id: string;
  name: string;
  birthMonth: string;
  gradeSetting: string | null;
  stageNotes: string | null;
  familyNonNegotiables: string | null;
  successDefinition: string | null;
  parentWorkingEdge: string | null;
  snapshotVersion: number;
  updatedAt: string;
};

const ChildCtx = createContext<{
  child: Child;
  refresh: () => Promise<void>;
} | null>(null);

/** Access the current child. Safe to call inside any page rendered by AppShell. */
export function useChild() {
  const ctx = useContext(ChildCtx);
  if (!ctx) throw new Error("useChild must be used within AppShell");
  return ctx;
}

const NAV = [
  { href: "/", label: "Mentor" },
  { href: "/diary", label: "Diary" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/snapshot", label: "Snapshot" },
  { href: "/history", label: "History" },
];

/**
 * Loads the single child profile at runtime, gates the app behind onboarding
 * if none exists, and renders the nav + current page once it does.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [child, setChild] = useState<Child | null | undefined>(undefined);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    const r = await fetch("/api/child");
    const { child } = await r.json();
    setChild(child);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (child === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center text-steel">
        Loading…
      </main>
    );
  }

  if (!child) return <Onboarding onCreated={refresh} />;

  return (
    <ChildCtx.Provider value={{ child, refresh }}>
      <div className="max-w-3xl mx-auto px-5">
        <header className="flex items-center justify-between py-5 border-b border-steel/20">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="text-temper text-xs tracking-[0.3em] uppercase">steelplate</span>
            <span className="text-mist text-sm">· {child.name}</span>
          </Link>
          <span className="text-steel text-xs">v{child.snapshotVersion}</span>
        </header>

        <nav className="flex gap-1 py-3 text-sm overflow-x-auto">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "px-3 py-1.5 rounded-lg whitespace-nowrap " +
                  (active ? "bg-temper text-gunmetal font-medium" : "text-mist hover:bg-slate")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="py-6">{children}</main>
      </div>
    </ChildCtx.Provider>
  );
}
