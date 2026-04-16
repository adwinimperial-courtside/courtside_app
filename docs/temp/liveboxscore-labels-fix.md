236:// ─── Stat label map ───────────────────────────────────────────────────────────
238:const STAT_LABELS = {
240:  '3PT':          '3-Point Field Goal',
243:  'DREB':         'Defensive Rebound',
377:  // ── Latest activity label ──────────────────────────────────────────────────
388:    const label    = STAT_LABELS[latestLog.stat_label] || STAT_LABELS[statType] || latestLog.stat_label || statType;
392:      return { who: "• Timeout", label, teamName };
395:      return { who: "• Substitution", label, teamName };
403:      return { who: `• ${jersey}${name}`, label, teamName };
407:    return { who: `• ${latestLog.stat_label || statType}`, label, teamName };
520:                  <p className="text-slate-500 text-[11px]">{latestActivityLabel.label}</p>
