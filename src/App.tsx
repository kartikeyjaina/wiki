import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";

const Login = lazy(() => import("@/pages/Login").then((module) => ({ default: module.Login })));
const Home = lazy(() => import("@/pages/Home").then((module) => ({ default: module.Home })));
const Assets = lazy(() => import("@/pages/Assets").then((module) => ({ default: module.Assets })));
const AssetDetail = lazy(() => import("@/pages/AssetDetail").then((module) => ({ default: module.AssetDetail })));
const SavedAssets = lazy(() => import("@/pages/SavedAssets").then((module) => ({ default: module.SavedAssets })));
const Profile = lazy(() => import("@/pages/Profile").then((module) => ({ default: module.Profile })));
const Wiki = lazy(() => import("@/pages/Wiki").then((module) => ({ default: module.Wiki })));
const NewWikiPage = lazy(() => import("@/pages/NewWikiPage").then((module) => ({ default: module.NewWikiPage })));
const CollectionDetail = lazy(() => import("@/pages/CollectionDetail").then((module) => ({ default: module.CollectionDetail })));
const Ideas = lazy(() => import("@/pages/Ideas").then((module) => ({ default: module.Ideas })));
const NewIdea = lazy(() => import("@/pages/NewIdea").then((module) => ({ default: module.NewIdea })));
const IdeaLeaderboard = lazy(() => import("@/pages/IdeaLeaderboard").then((module) => ({ default: module.IdeaLeaderboard })));
const IdeaDetail = lazy(() => import("@/pages/IdeaDetail").then((module) => ({ default: module.IdeaDetail })));
const Projects = lazy(() => import("@/pages/Projects").then((module) => ({ default: module.Projects })));
const ProjectDetail = lazy(() => import("@/pages/ProjectDetail").then((module) => ({ default: module.ProjectDetail })));
const People = lazy(() => import("@/pages/People").then((module) => ({ default: module.People })));
const Admin = lazy(() => import("@/pages/Admin").then((module) => ({ default: module.Admin })));

function RouteLoading() {
  return (
    <div className="grid min-h-[50vh] place-items-center p-8" role="status" aria-live="polite">
      <span className="font-display text-sm font-semibold text-muted-foreground">Loading workspace…</span>
    </div>
  );
}

export default function App() {
  const { session, loading, configured } = useSession();
  const { isAdmin } = useProfile();
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const handleActionError = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      if (typeof message !== "string") return;
      setActionError(message);
      window.setTimeout(() => setActionError((current) => current === message ? null : current), 4000);
    };
    window.addEventListener("workspace-action-error", handleActionError);
    return () => window.removeEventListener("workspace-action-error", handleActionError);
  }, []);

  if (loading) return <div className="grid min-h-screen place-items-center bg-white font-display text-xl font-bold tracking-[-0.03em]">futurelab wiki</div>;

  if (configured && !session) {
    return (
      <Suspense fallback={<RouteLoading />}>
        <Login />
      </Suspense>
    );
  }

  return (
    <>
      {actionError ? <div className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium shadow-lift" role="alert">{actionError}</div> : null}
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="assets" element={<Assets />} />
            <Route path="assets/:id" element={<AssetDetail />} />
            <Route path="saved" element={<SavedAssets />} />
            <Route path="profile" element={<Profile />} />
            <Route path="wiki" element={<Wiki />} />
            <Route path="wiki/new" element={<NewWikiPage />} />
            <Route path="wiki/:slug" element={<Wiki />} />
            <Route path="collections/:slug" element={<CollectionDetail />} />
            <Route path="ideas" element={<Ideas />} />
            <Route path="ideas/new" element={<NewIdea />} />
            <Route path="ideas/leaderboard" element={<IdeaLeaderboard />} />
            <Route path="ideas/:id" element={<IdeaDetail />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="people" element={<People />} />
            <Route path="people/:id" element={<People />} />
            <Route path="admin/*" element={isAdmin || !configured ? <Admin /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
