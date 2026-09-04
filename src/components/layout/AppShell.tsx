import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Archive, BookOpen, FolderKanban, Home, Lightbulb, Menu, Search, SlidersHorizontal } from "lucide-react";
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
  { label: "Wiki", href: "/wiki", icon: BookOpen },
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
      <a href="#main-content" className="sr-only fixed left-4 top-4 z-[200] rounded-pill bg-foreground px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2">
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 w-[min(1180px,calc(100vw-3rem))] items-center gap-3">
          <button type="button" className="shrink-0 rounded-pill px-2 py-1 font-display text-xl font-bold tracking-[-0.03em] focus-visible:outline-offset-2" onClick={() => navigate("/")} aria-label="Futurelab Wiki home">
            futurelab<span className="font-medium text-muted"> wiki</span>
          </button>
          <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search everything" className="ml-auto hidden h-11 min-w-[280px] items-center gap-3 rounded-pill border border-border bg-surface px-4 text-left text-sm text-muted transition hover:border-[#1111112e] lg:flex">
            <Search className="h-4 w-4" aria-hidden="true" /> Search everything...
            <kbd className="ml-auto rounded-md border border-border bg-white px-2 py-0.5 text-[11px] text-muted">Ctrl K</kbd>
          </button>
          <Button variant="secondary" size="icon" className="md:hidden" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen} aria-controls="mobile-navigation" aria-label={mobileOpen ? "Close navigation" : "Open navigation"}><Menu className="h-4 w-4" aria-hidden="true" /></Button>
          <NotificationBell />
          <Button variant="secondary" className="hidden md:inline-flex" onClick={() => navigate("/profile")}>{isGuest ? "Development Guest" : profile?.display_name ?? "Profile"}</Button>
        </div>
        {mobileOpen ? <nav id="mobile-navigation" className="mx-auto grid w-[min(1180px,calc(100vw-3rem))] grid-cols-2 gap-2 border-t border-border pb-4 pt-3 md:hidden" aria-label="Mobile navigation">
          {visibleNavItems.map((item) => <NavLink key={item.href} to={item.href} onClick={() => setMobileOpen(false)} className={({ isActive }) => cn("rounded-lg px-4 py-3 text-sm font-semibold transition", isActive ? "bg-foreground text-white" : "bg-surface text-foreground hover:bg-[#EFF1F3]")}>{item.label}</NavLink>)}
        </nav> : null}
      </header>

      <div className="mx-auto grid w-[min(1180px,calc(100vw-3rem))] gap-8 py-8 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden md:block"><nav className="sticky top-28 space-y-2" aria-label="Primary navigation">
          {visibleNavItems.map((item) => { const Icon = item.icon; return <NavLink key={item.href} to={item.href} end={item.href === "/"} className={({ isActive }) => cn("flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-semibold transition", isActive ? "bg-foreground text-white" : "text-muted hover:bg-surface hover:text-foreground")}><Icon className="h-4 w-4" aria-hidden="true" />{item.label}</NavLink>; })}
          <div className="my-5 h-px bg-border" />
          <NavLink to="/ideas/leaderboard" className={({ isActive }) => cn("flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-semibold transition", isActive ? "bg-foreground text-white" : "text-muted hover:bg-surface hover:text-foreground")}><Lightbulb className="h-4 w-4" aria-hidden="true" />Leaderboard</NavLink>
        </nav></aside>
        <main id="main-content" tabIndex={-1} className="min-w-0 pb-24 outline-none md:pb-8"><Outlet /></main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 flex overflow-x-auto rounded-pill border border-border bg-white/95 p-1 shadow-soft backdrop-blur md:hidden" aria-label="Bottom navigation">
        {visibleNavItems.map((item) => { const Icon = item.icon; return <NavLink key={item.href} to={item.href} end={item.href === "/"} className={({ isActive }) => cn("flex min-w-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-pill px-2 py-2 text-[11px] font-semibold transition", isActive ? "bg-foreground text-white" : "text-muted hover:bg-surface")}><Icon className="h-4 w-4" aria-hidden="true" /><span>{item.label}</span></NavLink>; })}
      </nav>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
