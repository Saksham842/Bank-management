import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { LayoutDashboard, Receipt, LineChart, Shield, LogOut, Wallet, ShieldCheck, User } from 'lucide-react';
import { motion } from 'framer-motion';

export const Layout = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { to: '/transactions', label: 'Transactions', icon: <Receipt size={18} /> },
    { to: '/budgets', label: 'Budgets & Limits', icon: <Wallet size={18} /> },
    { to: '/reports', label: 'Financial Reports', icon: <LineChart size={18} /> },
    { to: '/settings', label: 'Account Security', icon: <Shield size={18} /> }
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 overflow-hidden relative font-sans">
      {/* Mesh Gradient background accents */}
      <div className="absolute top-[10%] left-[-10%] w-[35%] h-[35%] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 blur-[130px] rounded-full pointer-events-none" />

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900/60 backdrop-blur-xl text-slate-300 flex flex-col sticky top-0 h-screen z-50 border-r border-white/5 shadow-2xl shrink-0">
        {/* Branding header */}
        <div className="px-6 py-6 flex items-center gap-3 border-b border-white/5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <span className="text-lg">🧾</span>
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white leading-tight">LedgerPro</h1>
            <span className="text-[9px] text-indigo-400 font-bold tracking-wider uppercase block">
              AI WEALTH EDITION
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-8 flex flex-col gap-1.5">
          {navItems.map(item => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="relative flex items-center gap-3.5 px-4 py-3 rounded-xl hover:text-white transition duration-200 text-xs sm:text-sm font-bold tracking-wide"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute inset-0 bg-indigo-600/20 border border-indigo-500/30 rounded-xl -z-10 shadow-lg"
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  />
                )}
                <span className={`${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'}`}>
                  {item.icon}
                </span>
                <span className={isActive ? 'text-white font-extrabold' : 'text-slate-400 hover:text-white'}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* User profile section at bottom */}
        {user && (
          <div className="p-4 border-t border-white/5 bg-slate-950/30 flex flex-col gap-3">
            <div className="flex items-center gap-3 px-1.5">
              <div className="h-8 w-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <User size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">
                  ACTIVE ACCOUNT
                </span>
                <span className="text-xs text-slate-300 font-bold truncate">
                  {user.email}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 text-xs font-bold cursor-pointer transition duration-150"
            >
              <LogOut size={13} />
              Disconnect Portal
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950/20 grid-bg">
        {/* Floating navbar header */}
        <header className="h-11 bg-slate-950/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-400 tracking-widest uppercase">
              WEALTH PORTAL V2.0
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full font-bold border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <ShieldCheck size={12} className="text-emerald-400" />
              Gemini Security Verified
            </span>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex-1 flex flex-col min-h-0 p-5 max-w-7xl w-full mx-auto overflow-y-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};
