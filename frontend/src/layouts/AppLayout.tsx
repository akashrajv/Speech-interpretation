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
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/analysis/new', label: 'Evaluate Speech', icon: PlusCircle },
    { to: '/history', label: 'Speech History', icon: History },
    { to: '/dataset', label: 'Speech Library', icon: Database },
    { to: '/validation', label: 'Accuracy & Quality', icon: CheckCircle2 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      {/* Sidebar - Crisp White with Deep Dark Blue Elements */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between select-none z-20 shadow-xs">
        <div>
          {/* Logo & Brand Header */}
          <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-900 to-blue-700 flex items-center justify-center shadow-md shadow-blue-900/20">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight text-blue-950 flex items-center gap-1.5">
                Counterpoint <span className="text-[11px] px-1.5 py-0.5 rounded font-mono font-bold bg-blue-50 text-blue-900 border border-blue-200">AI</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">Speech Delivery Analytics</div>
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
                        ? 'bg-blue-900 text-white font-semibold shadow-sm'
                        : 'text-slate-600 hover:text-blue-950 hover:bg-blue-50/70 border border-transparent'
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
        <div className="p-4 border-t border-slate-200 bg-slate-50/80">
          <div className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-2 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-900" /> System Status
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${health?.database_connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                Acoustic Engine
              </span>
              <span className="text-[11px] font-mono font-semibold text-emerald-600">Ready</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Gemini AI Coach
              </span>
              <span className={`text-[11px] font-mono font-semibold ${health?.gemini_configured ? 'text-blue-900' : 'text-slate-500'}`}>
                {health?.gemini_configured ? 'Active' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#f8fafc]">
        <header className="h-14 border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Counterpoint AI</span>
            <span>/</span>
            <span className="capitalize text-blue-950 font-semibold">
              {location.pathname === '/'
                ? 'Dashboard'
                : location.pathname.split('/')[1]?.replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/analysis/new"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Evaluate Speech</span>
            </NavLink>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto w-full flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
