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
import { People } from "@/pages/People";
import { SearchPage } from "@/pages/Search";
import { Brand } from "@/pages/Brand";
import { Projects } from "@/pages/Projects";
import { Admin } from "@/pages/Admin";
import { useProfile } from "@/hooks/useProfile";

export default function App() {
  const { session, loading, configured } = useSession();
  const { isAdmin } = useProfile();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-white font-display text-xl font-bold tracking-[-0.03em]">futurelab wiki</div>;
  }

  if (configured && !session) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="brand" element={<Brand />} />
        <Route path="assets" element={<Assets />} />
        <Route path="assets/:id" element={<AssetDetail />} />
        <Route path="ideas" element={<Ideas />} />
        <Route path="ideas/new" element={<NewIdea />} />
        <Route path="ideas/leaderboard" element={<IdeaLeaderboard />} />
        <Route path="ideas/:id" element={<IdeaDetail />} />
        <Route path="projects" element={<Projects />} />
        <Route path="people" element={<People />} />
        <Route path="people/:id" element={<People />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="admin/*" element={isAdmin || !configured ? <Admin /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
