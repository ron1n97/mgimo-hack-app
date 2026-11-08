/** Tool blast-radius policy (gate at boundary, not in the prompt). */

export type ToolRisk = 'read' | 'write' | 'sensitive';

export const TOOL_RISK: Record<string, ToolRisk> = {
  get_profile: 'read',
  get_today: 'read',
  get_schedule: 'read',
  get_grades: 'read',
  get_requests: 'read',
  get_notifications: 'read',
  draft_request_ai: 'read',
  next_actions_ai: 'read',
  explain_notification_ai: 'read',
  create_request: 'write',
  update_request_status: 'sensitive',
};

export function toolRisk(name: string): ToolRisk {
  return TOOL_RISK[name] ?? 'sensitive';
}

export function needsApproval(name: string): boolean {
  const r = toolRisk(name);
  return r === 'write' || r === 'sensitive';
}
