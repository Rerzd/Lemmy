// The calculators on /calculators, in tab order. The id is what ?tool= holds.
export const TOOLS = [
  { id: 'groceries', label: 'Groceries' },
  { id: 'savings', label: 'Savings goal' },
  { id: 'compound', label: 'Compound interest' },
  { id: 'loan', label: 'Loan' },
  { id: 'rule', label: '50/30/20' },
  { id: 'converter', label: 'Currency converter' },
] as const

export type ToolId = (typeof TOOLS)[number]['id']

// Ids that tie each tab to its panel (aria-controls / aria-labelledby).
export const tabId = (id: ToolId) => `tool-tab-${id}`
export const panelId = (id: ToolId) => `tool-panel-${id}`

// Unknown or missing ?tool= falls back to the groceries planner.
export function parseTool(value: string | null): ToolId {
  return TOOLS.find((t) => t.id === value)?.id ?? 'groceries'
}
