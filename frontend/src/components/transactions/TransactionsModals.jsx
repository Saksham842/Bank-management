import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import { PDFImportModal } from './PDFImportModal';
import { ReceiptScanModal } from './ReceiptScanModal';

export const TransactionsModals = ({
  auditTx, setAuditTx,
  showPDFModal, setShowPDFModal, handleBulkImport,
  showScanModal, setShowScanModal, handleReceiptSave,
  settings
}) => (
  <>
    {/* Audit Trail Drawer */}
    <AnimatePresence>
      {auditTx && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAuditTx(null)} className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.28 }}
            className="relative w-full max-w-md bg-slate-950 border-l border-slate-800 h-full p-6 overflow-y-auto z-10 flex flex-col">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-5">
              <div>
                <h3 className="font-bold text-base text-white">Audit Trail</h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {auditTx.id}</p>
              </div>
              <button onClick={() => setAuditTx(null)} className="p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"><X className="h-5 w-5" /></button>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 mb-5">
              <p className="text-[9px] uppercase font-bold text-emerald-400 mb-2">Current (v{auditTx.version})</p>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                {[['Merchant', auditTx.merchant], ['Amount', `${settings.currency}${auditTx.amount}`], ['Category', auditTx.category], ['Date', auditTx.date]].map(([k, v]) => (
                  <React.Fragment key={k}><span className="text-slate-500">{k}</span><span className="text-white font-medium">{v}</span></React.Fragment>
                ))}
              </div>
            </div>

            <p className="text-[10px] uppercase font-bold text-slate-400 mb-3">Edit History</p>
            <div className="space-y-3 flex-1">
              {(auditTx.auditTrail || []).map((trail, i) => (
                <div key={i} className="relative pl-5 border-l border-slate-800">
                  <div className="absolute top-2 left-[-4px] h-2.5 w-2.5 rounded-full bg-violet-600 border-2 border-slate-950" />
                  <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-xs">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold text-slate-300">Version {trail.version}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{format(parseISO(trail.editedAt), 'MMM dd, HH:mm')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                      {[['Merchant', trail.previousValue.merchant], ['Amount', `${settings.currency}${trail.previousValue.amount}`], ['Date', trail.previousValue.date]].map(([k, v]) => (
                        <React.Fragment key={k}><span className="text-slate-500">{k}</span><span className="text-slate-300">{v}</span></React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Feature 2: PDF Import Modal */}
    <AnimatePresence>
      {showPDFModal && (
        <PDFImportModal
          onClose={() => setShowPDFModal(false)}
          onImport={handleBulkImport}
          settings={settings}
        />
      )}
    </AnimatePresence>

    {/* Feature 6: Receipt Scan Modal */}
    <AnimatePresence>
      {showScanModal && (
        <ReceiptScanModal
          onClose={() => setShowScanModal(false)}
          onSave={handleReceiptSave}
          settings={settings}
        />
      )}
    </AnimatePresence>
  </>
);
