import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { PeranUser } from '../../types';
import { 
  Wrench, 
  Bell, 
  UserCircle2, 
  ShieldCheck, 
  Truck, 
  ShoppingBag, 
  ReceiptText, 
  Users, 
  ChevronDown 
} from 'lucide-react';

const roleList: { role: PeranUser; label: string; icon: any; color: string }[] = [
  { role: 'SA', label: 'Service Advisor (SA)', icon: UserCircle2, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { role: 'Foreman', label: 'Foreman', icon: Wrench, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { role: 'Mekanik', label: 'Mekanik (Tablet/HP)', icon: Wrench, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { role: 'Admin Purchasing', label: 'Admin Purchasing', icon: ShoppingBag, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { role: 'Admin Invoice', label: 'Admin Invoice (Kasir)', icon: ReceiptText, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { role: 'Security', label: 'Pos Security', icon: ShieldCheck, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { role: 'Customer Fleet', label: 'Web Fleet Customer', icon: Truck, color: 'text-sky-600 bg-sky-50 border-sky-200' },
];

export const Navbar: React.FC = () => {
  const { currentRole, currentUser, setRole, notificationCount } = useAppStore();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
            K3
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">BENGKEL KIM 3</span>
              <span className="hidden sm:inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                Digital System
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Fleet & Workshop Monitoring Realtime</p>
          </div>
        </div>

        {/* Role Switcher & Persona Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* Role selector dropdown */}
          <div className="relative group">
            <label className="text-[10px] uppercase font-bold text-slate-400 block sm:hidden">Peran:</label>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer shadow-xs">
              <span className="text-xs font-bold text-slate-700 hidden md:inline">Mode Peran:</span>
              <select
                value={currentRole}
                onChange={(e) => setRole(e.target.value as PeranUser)}
                className="bg-transparent text-xs font-semibold text-blue-700 focus:outline-none cursor-pointer pr-2"
              >
                {roleList.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Notifications */}
          <button 
            type="button" 
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Notifikasi"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Current User Badge */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shadow-inner">
              {currentUser.charAt(0)}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight">{currentUser}</div>
              <div className="text-[10px] text-blue-600 font-medium">{currentRole}</div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
