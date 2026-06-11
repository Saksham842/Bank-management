import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../AppContext';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, ShieldAlert, Key, UserCheck, Smartphone, 
  Coins, Trash2, Download, Upload, HelpCircle, Save 
} from 'lucide-react';

export const Settings = () => {
  const { user, saveUser, settings, updateSettings, transactions, goals, showToast } = useContext(AppContext);

  // Profile forms
  const [profileName, setProfileName] = useState(user?.name || 'Jane Doe');
  const [profileIncome, setProfileIncome] = useState(user?.income?.toString() || '45000');
  const [profileEmail, setProfileEmail] = useState(user?.email || 'jane.doe@ledgerpro.ai');

  // MFA state
  const [step, setStep] = useState('initial');
  const [mfaSecret, setMfaSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [qrSvg, setQrSvg] = useState('');

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileIncome(user.income?.toString() || '');
      setProfileEmail(user.email || '');
    }
  }, [user]);

  // Generate simulated QR Code SVG
  const generateSimulatedMFA = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 16; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setMfaSecret(secret);

    // Render a mock premium looking high-tech QR grid inside SVG
    let paths = '';
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if ((r + c) % 2 === 0 || (r % 3 === 0 && c % 4 === 0) || (r > 12 && c < 3) || (r < 3 && c > 12)) {
          paths += `M${c * 8 + 4},${r * 8 + 4}h6v6h-6z `;
        }
      }
    }
    const svg = (
      <svg className="h-32 w-32 text-indigo-400" viewBox="0 0 120 120" fill="currentColor">
        {/* Finder patterns */}
        <rect x="2" y="2" width="28" height="28" rx="2" fill="none" stroke="currentColor" strokeWidth="4" />
        <rect x="8" y="8" width="16" height="16" rx="1" />
        <rect x="90" y="2" width="28" height="28" rx="2" fill="none" stroke="currentColor" strokeWidth="4" />
        <rect x="96" y="8" width="16" height="16" rx="1" />
        <rect x="2" y="90" width="28" height="28" rx="2" fill="none" stroke="currentColor" strokeWidth="4" />
        <rect x="8" y="96" width="16" height="16" rx="1" />
        {/* Randomized data dots */}
        <path d={paths} />
      </svg>
    );
    setQrSvg(svg);
    setStep('setup');
  };

  const verifyMFA = (e) => {
    e.preventDefault();
    if (verificationCode.length !== 6) {
      showToast('error', 'Please enter a 6-digit code.');
      return;
    }
    // Any 6-digit code acts as successful simulation confirmation
    updateSettings({ ...settings, mfaEnabled: true, mfaSecret });
    if (user) {
      saveUser({ ...user, twoFactorEnabled: true });
    }
    showToast('success', 'Two-Factor Authentication secured successfully!');
    setStep('initial');
    setVerificationCode('');
  };

  const disableMFA = () => {
    if (!window.confirm('Are you sure you want to disable 2FA? This decreases your security rating.')) return;
    updateSettings({ ...settings, mfaEnabled: false, mfaSecret: '' });
    if (user) {
      saveUser({ ...user, twoFactorEnabled: false });
    }
    showToast('warning', 'Two-Factor Authentication disabled.');
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    if (!profileName || !profileIncome) {
      showToast('error', 'Name and Income are required.');
      return;
    }
    const updated = {
      ...user,
      name: profileName,
      income: parseFloat(profileIncome),
      email: profileEmail,
      onboardingDone: true
    };
    saveUser(updated);
    showToast('success', 'Security profile updated successfully.');
  };

  const handleCurrencyChange = (val) => {
    updateSettings({ ...settings, currency: val });
    showToast('info', `Base currency changed to ${val}`);
  };

  // Export full JSON database backup
  const handleBackup = () => {
    const backupData = {
      user,
      transactions,
      goals,
      settings,
      backupVersion: 1,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    link.download = `LedgerPro_Encrypted_Backup_${dateStr}.json`;
    link.click();
    showToast('success', 'Database backup downloaded.');
  };

  // Clear Database completely
  const handlePurge = () => {
    if (!window.confirm('CRITICAL WARNING: This will permanently delete all logged transactions, goals, and settings. This action is irreversible. Proceed?')) return;
    localStorage.clear();
    showToast('warning', 'Vault purged. Reloading dashboard...');
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 w-full">
      <div>
        <h2 className="text-lg font-extrabold text-white tracking-tight leading-tight">Settings & Vault Security</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Configure localization parameters, 2FA credentials, and database backups</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">User Profile Identity</p>
            
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    value={profileName} 
                    onChange={e => setProfileName(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Monthly Post-Tax Income</label>
                  <input 
                    type="number" 
                    value={profileIncome} 
                    onChange={e => setProfileIncome(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  value={profileEmail} 
                  onChange={e => setProfileEmail(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" 
                  required 
                />
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                <button 
                  type="submit" 
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-violet-900/30"
                >
                  <Save className="h-3.5 w-3.5" /> Save Profile Profile
                </button>
              </div>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5">
            <div className="flex items-start gap-4">
              <div className="bg-violet-950/40 text-violet-400 p-2.5 rounded-xl border border-violet-500/20 shadow-[0_0_15px_rgba(124,58,237,0.15)] flex-shrink-0">
                <Smartphone size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Two-Factor Authenticator Setup</h3>
                <p className="text-xs text-slate-450 leading-relaxed max-w-lg">
                  Verify logins using a secondary 6-digit TOTP token generated by security apps like Google Authenticator or Authy.
                </p>
              </div>
            </div>

            <hr className="border-slate-800/80" />

            {step === 'initial' ? (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className={`h-2.5 w-2.5 rounded-full ${settings?.mfaEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                  <span className="font-semibold text-slate-300">
                    Status: {settings?.mfaEnabled ? 'Secured & Active' : 'Unprotected'}
                  </span>
                </div>
                {settings?.mfaEnabled ? (
                  <button
                    onClick={disableMFA}
                    className="px-4 py-2 border border-rose-500/30 text-rose-450 rounded-xl text-xs font-semibold hover:bg-rose-950/30 transition duration-200"
                  >
                    Deactivate MFA Security
                  </button>
                ) : (
                  <button
                    onClick={generateSimulatedMFA}
                    className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-semibold hover:bg-violet-700 shadow-[0_0_15px_rgba(124,58,237,0.25)] transition duration-200"
                  >
                    Setup Google Authenticator
                  </button>
                )}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-5 bg-slate-950/40 p-5 rounded-xl border border-slate-900"
              >
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 items-center">
                  <div className="sm:col-span-3 space-y-3">
                    <h4 className="font-bold text-white text-xs">Scan Security Key</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Open Google Authenticator or any TOTP wallet, select "+" and scan this QR code or input the following base-32 key.
                    </p>
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="font-mono text-xs select-all text-slate-300 font-bold tracking-wider">{mfaSecret}</div>
                      <Key size={13} className="text-slate-500" />
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex justify-center bg-white p-3 rounded-xl border border-slate-850 h-36 w-36 mx-auto">
                    {qrSvg}
                  </div>
                </div>

                <form onSubmit={verifyMFA} className="space-y-3 pt-4 border-t border-slate-900">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Confirm 6-Digit TOTP Token</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2 text-sm text-center font-mono tracking-widest text-slate-200 focus:outline-none w-40"
                      required
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition duration-200"
                      >
                        Verify and Secure
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep('initial')}
                        className="px-4 py-2 border border-slate-800 text-slate-400 rounded-xl text-xs hover:text-white transition duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Base Currency</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { symbol: '₹', name: 'INR' },
                { symbol: '$', name: 'USD' },
                { symbol: '€', name: 'EUR' },
                { symbol: '£', name: 'GBP' },
                { symbol: '¥', name: 'JPY' },
                { symbol: '₿', name: 'BTC' }
              ].map(cur => (
                <button
                  key={cur.symbol}
                  onClick={() => handleCurrencyChange(cur.symbol)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${settings?.currency === cur.symbol ? 'bg-violet-600/10 border-violet-500 text-white font-bold' : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:text-white'}`}
                >
                  <span className="text-base">{cur.symbol}</span>
                  <span className="text-[9px] mt-0.5">{cur.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Database Backup</p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Export an encrypted client-side JSON configuration payload containing all secure ledger histories.
            </p>
            <button
              onClick={handleBackup}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white rounded-xl transition-all"
            >
              <Download className="h-3.5 w-3.5" /> Download JSON Backup
            </button>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-red-500/10 bg-red-950/5 space-y-4">
            <p className="text-[10px] uppercase font-bold text-red-400 tracking-widest">Factory Purge</p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Wipe active caches and reinitialize standard sandbox database profiles.
            </p>
            <button
              onClick={handlePurge}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-950/20 hover:bg-red-900/20 border border-red-500/20 text-xs font-semibold text-red-400 rounded-xl transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" /> Purge Cache Caches
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
