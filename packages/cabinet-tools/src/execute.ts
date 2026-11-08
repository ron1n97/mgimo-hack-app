import { CabinetClient } from './client';

export type ToolArgs = Record<string, unknown>;

export async function executeCabinetTool(
  client: CabinetClient,
  name: string,
  args: ToolArgs = {},
): Promise<unknown> {
  switch (name) {
    case 'get_profile':
      return client.getProfile();
    case 'get_today':
      return client.getToday();
    case 'get_schedule':
      return client.getSchedule(
        typeof args.from === 'string' ? args.from : undefined,
        typeof args.to === 'string' ? args.to : undefined,
      );
    case 'get_grades':
      return client.getGrades();
    case 'get_requests':
      if (args.staff === true) return client.getStaffRequests();
      return client.getRequests();
    case 'create_request':
      return client.createRequest({
        type: String(args.type ?? ''),
        title: String(args.title ?? ''),
        body: String(args.body ?? ''),
      });
    case 'draft_request_ai':
      return client.draftRequestAi({
        type: String(args.type ?? ''),
        context: typeof args.context === 'string' ? args.context : undefined,
      });
    case 'next_actions_ai':
      return client.nextActionsAi({
        focus: typeof args.focus === 'string' ? args.focus : undefined,
      });
    case 'explain_notification_ai':
      return client.explainNotificationAi({
        title: String(args.title ?? ''),
        body: String(args.body ?? ''),
        kind: typeof args.kind === 'string' ? args.kind : undefined,
      });
    case 'get_notifications':
      return client.getNotifications();
    case 'update_request_status':
      return client.updateRequestStatus({
        id: String(args.id ?? ''),
        status: String(args.status ?? ''),
        note: typeof args.note === 'string' ? args.note : undefined,
      });
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
