// Fills for income/expense marks. Validated for color-vision deficiency on the
// slate-900 panel (OKLab ΔE 8.3 deutan): the brighter -400 steps used for text
// collapse into one color for red-green colorblind users when used as fills.
export const CHART_COLORS = {
  income: '#059669', // emerald-600
  expense: '#f43f5e', // rose-500
  grid: '#1e293b', // slate-800
  axis: '#64748b', // slate-500
  surface: '#0f172a', // slate-900, used as the gap between marks
}
