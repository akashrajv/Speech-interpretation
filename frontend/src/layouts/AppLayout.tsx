import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  Database,
  CheckCircle2,
  Settings,
  Mic,
  Activity,
  Sparkles,
  Server,
  Layers,
  ChevronRight
} from 'lucide-react';
import { getHealth } from '../services/api';
import { HealthStatus } from '../types';

export const AppLayout: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const location = useLocation();

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, [location.pathname]);

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/analysis/new', label: 'New Analysis', icon: PlusCircle },
    { to: '/history', label: 'Analysis History', icon: History },
    { to: '/dataset', label: 'Dataset Explorer', icon: Database },
    { to: '/validation', label: 'Model Validation', icon: CheckCircle2 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#0a0e17] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0d1322] border-r border-slate-800/80 flex flex-col justify-between select-none z-20">
        <div>
          {/* Logo & Brand Header */}
          <div className="px-6 py-5 border-b border-slate-800/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                Counterpoint <span className="text-xs px-1.5 py-0.5 rounded font-mono font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">AI</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Temporal Speech Analytics</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* System Status Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
          <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" /> System Status
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${health?.database_connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                Acoustic Engine
              </span>
              <span className="text-[11px] font-mono text-emerald-400">v1.0 Ready</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Gemini Coach
              </span>
              <span className={`text-[11px] font-mono ${health?.gemini_configured ? 'text-indigo-400' : 'text-slate-500'}`}>
                {health?.gemini_configured ? 'Active' : 'Fallback'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-14 border-b border-slate-800/80 bg-[#0d1322]/80 backdrop-blur sticky top-0 z-10 px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Counterpoint AI</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-slate-200 font-medium capitalize">
              {location.pathname === '/' ? 'Dashboard Overview' : location.pathname.replace('/', '').replace('/', ' / ')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/analysis/new"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm shadow-indigo-600/30 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Evaluate Speech</span>
            </NavLink>
          </div>
        </header>

        <div className="flex-1 p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
