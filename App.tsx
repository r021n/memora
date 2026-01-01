import React from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { StoreProvider } from "./context/StoreContext";
import BottomNav, { DesktopHeader } from "./components/BottomNav";
import Home from "./pages/Home";
import Manage from "./pages/Manage";
import Exercise from "./pages/Exercise";

const AppContent: React.FC = () => {
  const location = useLocation();
  const showNav = location.pathname !== "/exercise";

  return (
    <div className="min-h-screen font-sans bg-slate-50 text-slate-800 selection:bg-indigo-100 selection:text-indigo-800">
      {showNav && <DesktopHeader />}

      <main className="w-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/manage" element={<Manage />} />
          <Route path="/exercise" element={<Exercise />} />
        </Routes>
      </main>

      {showNav && <BottomNav />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <Router>
        <AppContent />
      </Router>
    </StoreProvider>
  );
};

export default App;
