import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useSession } from "@/hooks/useSession";
import { Login } from "@/pages/Login";
import { Home } from "@/pages/Home";
import { Assets } from "@/pages/Assets";
import { AssetDetail } from "@/pages/AssetDetail";
import { Ideas } from "@/pages/Ideas";
import { IdeaDetail } from "@/pages/IdeaDetail";
import { IdeaLeaderboard } from "@/pages/IdeaLeaderboard";
import { NewIdea } from "@/pages/NewIdea";
import { Projects } from "@/pages/Projects";
import { ProjectDetail } from "@/pages/ProjectDetail";
import { Admin } from "@/pages/Admin";
import { useProfile } from "@/hooks/useProfile";
import { CollectionDetail } from "@/pages/CollectionDetail";
import { SavedAssets } from "@/pages/SavedAssets";
import { Profile } from "@/pages/Profile";
import { People } from "@/pages/People";
import { Wiki } from "@/pages/Wiki";
import { NewWikiPage } from "@/pages/NewWikiPage";

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
  if (configured && !session) return <Login />;

  return (
    <>
      {actionError ? <div className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium shadow-lift" role="alert">{actionError}</div> : null}
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
    </>
  );
}
