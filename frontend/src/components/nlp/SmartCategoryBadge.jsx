export const SmartCategoryBadge = ({ category, source }) => {
  const getStyles = () => {
    switch (source) {
      case 'local_ml':
        return {
          bgClass: 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20',
          label: 'ML'
        };
      case 'claude_api':
      case 'gemini_api':
      case 'nlp_text':
        return {
          bgClass: 'bg-violet-950/30 text-violet-400 border-violet-500/20',
          label: 'AI'
        };
      case 'csv':
        return {
          bgClass: 'bg-blue-950/30 text-blue-400 border-blue-500/20',
          label: 'CSV'
        };
      default:
        return {
          bgClass: 'bg-slate-800/80 text-slate-350 border-slate-700',
          label: ''
        };
    }
  };

  const s = getStyles();

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${s.bgClass} transition-colors duration-150`}>
      {category}
      {s.label && (
        <span className="text-[8px] font-extrabold bg-white/10 text-inherit px-1 py-0.5 rounded tracking-wide leading-none">
          {s.label}
        </span>
      )}
    </span>
  );
};
