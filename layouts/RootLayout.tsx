import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import BottomNav, { DesktopHeader } from "../components/BottomNav";

const RootLayout: React.FC = () => {
  const location = useLocation();
  const showNav = location.pathname !== "/exercise";

  return (
    <div className="min-h-screen font-sans bg-slate-50 text-slate-800 selection:bg-indigo-100 selection:text-indigo-800">
      {showNav && <DesktopHeader />}

      <main className="w-full">
        <Outlet />
      </main>

      {showNav && <BottomNav />}
    </div>
  );
};

export default RootLayout;
