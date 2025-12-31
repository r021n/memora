import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Database, Trophy } from 'lucide-react';

const BottomNav: React.FC = () => {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
      isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
    }`;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 shadow-lg z-40 flex items-center justify-around px-2 sm:hidden">
      <NavLink to="/" className={navClass}>
        <Home size={24} />
        <span className="text-xs font-medium">Home</span>
      </NavLink>
      <NavLink to="/manage" className={navClass}>
        <Database size={24} />
        <span className="text-xs font-medium">Manage</span>
      </NavLink>
    </div>
  );
};

export const DesktopHeader: React.FC = () => {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium ${
      isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
    }`;

  return (
    <header className="hidden sm:flex fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 items-center justify-between px-6 lg:px-12">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">M</div>
        <span className="text-xl font-bold text-slate-800">Memora</span>
      </div>
      <nav className="flex items-center space-x-4">
        <NavLink to="/" className={navClass}>
          <Home size={20} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/manage" className={navClass}>
          <Database size={20} />
          <span>Manage</span>
        </NavLink>
      </nav>
    </header>
  );
};

export default BottomNav;