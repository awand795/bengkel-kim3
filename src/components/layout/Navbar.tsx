import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  Bell, 
  LogOut,
  ShieldCheck,
  User
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentRole, currentUser, notificationCount, logout } = useAppStore();

  const getRoleBadgeStyle = () => {
    switch (currentRole) {
      case 'Security':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'SA':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Foreman':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'Mekanik':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Admin Purchasing':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Admin Invoice':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'PIC Terkait':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'Customer Fleet':
      default:
        return 'bg-sky-50 text-sky-800 border-sky-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="KIM3 Bengkel" 
            className="h-10 sm:h-11 w-auto object-contain"
          />
        </div>

        {/* Right Side: Role Badge, Notifications & Profile */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* Locked Role Badge (No Dropdown - strictly role-based) */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${getRoleBadgeStyle()}`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{currentRole}</span>
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

          {/* Current User Badge & Logout */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shadow-inner">
              {currentUser.charAt(0)}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight">{currentUser}</div>
              <div className="text-[10px] text-slate-500 font-medium">{currentRole}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
              title="Keluar dari Akun (Logout)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Navbar;
