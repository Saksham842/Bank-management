import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ShieldAlert, ArrowRight, Sparkles, TrendingUp, Cpu } from 'lucide-react';

export const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register, error, clearError, loading } = useAuthStore();
  const [localError, setLocalError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    const success = await register(email, password);
    if (success) {
      navigate('/onboarding');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 overflow-hidden relative font-sans">
      {/* Dynamic Background Mesh Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-900/20 blur-[140px] rounded-full pointer-events-none" />
      
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-7/12 p-16 flex-col justify-between relative overflow-hidden border-r border-white/5 bg-slate-900/25 grid-bg">
        {/* Top Header */}
        <div className="flex items-center gap-3.5 z-10">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <span className="text-xl">🧾</span>
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-white font-sans">LedgerPro</h2>
            <p className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase">Wealth Intelligence Platform</p>
          </div>
        </div>

        {/* Middle interactive statistics display */}
        <div className="my-auto max-w-xl z-10 relative">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-4">
              <Sparkles size={12} className="text-indigo-400 animate-pulse" />
              Secure Data Ledger
            </span>
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Take complete control <br />
              of your <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">financial destiny</span>
            </h1>
            <p className="mt-4 text-slate-400 leading-relaxed text-sm xl:text-base">
              Create an account in seconds. Access state-of-the-art tools including transaction heatmaps, multi-factor security setup, and AI-driven categorization fallbacks completely for free.
            </p>
          </motion.div>

          {/* Floating Feature Widgets */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            {/* Widget 1 */}
            <motion.div
              whileHover={{ y: -4 }}
              className="glass-panel p-5 rounded-2xl border border-white/5 hover-card cursor-default"
            >
              <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3.5">
                <TrendingUp size={18} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Interactive Budgets</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Define caps, track triggers, and get notified automatically before limits are breached.
              </p>
            </motion.div>

            {/* Widget 2 */}
            <motion.div
              whileHover={{ y: -4 }}
              className="glass-panel p-5 rounded-2xl border border-white/5 hover-card cursor-default"
            >
              <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 mb-3.5">
                <Cpu size={18} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Google Gemini Powered</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Completely free AI insights with zero limits or paid API credit checks.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-500 z-10 flex items-center gap-6">
          <span>&copy; {new Date().getFullYear()} LedgerPro. All rights reserved.</span>
          <a href="#" className="hover:text-slate-300 transition duration-150">Terms</a>
          <a href="#" className="hover:text-slate-300 transition duration-150">Privacy Policy</a>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-5/12 flex items-center justify-center p-8 sm:p-12 md:p-16 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Form Header */}
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Create account</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-2">
              Sign up today and get access to your secure AI ledger portal.
            </p>
          </div>

          {/* Error Banner */}
          {(error || localError) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs sm:text-sm mb-6"
            >
              <ShieldAlert size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{localError || error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Address */}
            <div>
              <label className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-2 block">
                Email Address
              </label>
              <div className="relative group">
                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                <input
                  type="email"
                  className="input-premium pl-11 bg-slate-900/60 dark:bg-slate-900 border-white/5 text-white placeholder-slate-500"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                    />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-2 block">
                Password
              </label>
              <div className="relative group">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                <input
                  type="password"
                  className="input-premium pl-11 bg-slate-900/60 dark:bg-slate-900 border-white/5 text-white placeholder-slate-500"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-2 block">
                Confirm Password
              </label>
              <div className="relative group">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                <input
                  type="password"
                  className="input-premium pl-11 bg-slate-900/60 dark:bg-slate-900 border-white/5 text-white placeholder-slate-500"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Register Button */}
            <button
              type="submit"
              className="btn-primary h-11 flex items-center justify-center gap-2 text-sm w-full mt-3 font-bold transition duration-200"
              disabled={loading}
            >
              {loading ? (
                <span>Creating profile...</span>
              ) : (
                <>
                  Register Account
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Bottom Switch Link */}
          <div className="mt-8 text-center text-xs sm:text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-305 font-bold hover:underline" onClick={clearError}>
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
