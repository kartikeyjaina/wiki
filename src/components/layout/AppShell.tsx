import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Archive, FolderKanban, Home, Lightbulb, Menu, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { isDevelopmentGuest } from "@/lib/devGuest";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Assets", href: "/assets", icon: Archive },
  { label: "Ideas", href: "/ideas", icon: Lightbulb },
  { label: "Projects", href: "/projects", icon: FolderKanban },
];

export function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { profile, session, isAdmin } = useProfile();
  const isGuest = isDevelopmentGuest(session);
  const visibleNavItems = isAdmin ? [...navItems, { label: "Admin", href: "/admin", icon: SlidersHorizontal }] : navItems;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-white text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 w-[min(1180px,100vw-3rem)] items-center gap-4">
          <button
            type="button"
            className="font-display text-xl font-bold tracking-[-0.03em]"
            onClick={() => navigate("/")}
          >
            futurelab<span className="font-medium text-muted"> wiki</span>
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ml-auto hidden h-11 min-w-[280px] items-center gap-3 rounded-pill border border-border bg-surface px-4 text-left text-sm text-muted transition hover:border-[#1111112e] lg:flex"
          >
            <Search className="h-4 w-4" />
            Search everything...
            <kbd className="ml-auto rounded-md border border-border bg-white px-2 py-0.5 text-[11px] text-muted">Ctrl K</kbd>
          </button>
          <Button variant="secondary" size="icon" className="md:hidden" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen} aria-controls="mobile-navigation" aria-label={mobileOpen ? "Close navigation" : "Open navigation"}>
            <Menu className="h-4 w-4" />
            <span className="sr-only">Open navigation</span>
          </Button>
          <NotificationBell />
          <Button variant="secondary" className="hidden md:inline-flex" onClick={() => navigate("/profile")}>
            {isGuest ? "Development Guest" : profile?.display_name ?? "Profile"}
          </Button>
        </div>
        {mobileOpen ? (
            <nav id="mobile-navigation" className="mx-auto grid w-[min(1180px,100vw-3rem)] grid-cols-2 gap-2 pb-4 md:hidden" aria-label="Mobile">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn("rounded-md px-4 py-3 text-sm font-semibold", isActive ? "bg-foreground text-white" : "bg-surface text-foreground")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        ) : null}
      </header>

      <div className="mx-auto grid w-[min(1180px,100vw-2rem)] gap-8 py-8 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden md:block">
          <nav className="sticky top-28 space-y-2" aria-label="Primary">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex h-11 items-center gap-3 rounded-md px-4 text-sm font-semibold transition",
                      isActive ? "bg-foreground text-white" : "text-muted hover:bg-surface hover:text-foreground",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
            <div className="my-5 h-px bg-border" />
            <NavLink
              to="/ideas/leaderboard"
              className={({ isActive }) =>
                cn(
                  "flex h-11 items-center gap-3 rounded-md px-4 text-sm font-semibold transition",
                  isActive ? "bg-foreground text-white" : "text-muted hover:bg-surface hover:text-foreground",
                )
              }
            >
              <Lightbulb className="h-4 w-4" />
              Leaderboard
            </NavLink>
          </nav>
        </aside>
        <main className="min-w-0 pb-24">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-pill border border-border bg-white/95 p-1 shadow-soft backdrop-blur md:hidden" aria-label="Bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                cn("flex h-12 items-center justify-center rounded-pill", isActive ? "bg-foreground text-white" : "text-muted")
              }
            >
              <Icon className="h-4 w-4" />
              <span className="sr-only">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
