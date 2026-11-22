import { NotificationDispatcher } from './notification-dispatcher';

type FakeSub = {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function makeDispatcher(opts: {
  vapid?: { publicKey: string; privateKey: string; subject: string };
  subs?: FakeSub[];
  send?: jest.Mock;
  deleteEndpoint?: (endpoint: string) => void;
}) {
  const subs = opts.subs ?? [];
  const prisma = {
    pushSubscription: {
      findMany: jest.fn(async ({ where }: { where: { userId: string } }) =>
        subs.filter((s) => s.userId === where.userId),
      ),
      deleteMany: jest.fn(async ({ where }: { where: { endpoint: string } }) => {
        opts.deleteEndpoint?.(where.endpoint);
        return { count: 1 };
      }),
    },
  };
  const sendWebPush =
    opts.send ??
    jest.fn(async () => ({ statusCode: 201 }));

  const dispatcher = new NotificationDispatcher(prisma as never, {
    get: (key: string) => {
      if (!opts.vapid) return undefined;
      if (key === 'VAPID_PUBLIC_KEY') return opts.vapid.publicKey;
      if (key === 'VAPID_PRIVATE_KEY') return opts.vapid.privateKey;
      if (key === 'VAPID_SUBJECT') return opts.vapid.subject;
      return undefined;
    },
  } as never);
  dispatcher.useSender(sendWebPush);
  return { dispatcher, prisma, sendWebPush };
}

describe('NotificationDispatcher', () => {
  const note = {
    id: 'n1',
    userId: 'u1',
    title: 'Новая оценка',
    body: 'Международное право — отлично',
    kind: 'grade_posted',
    readAt: null,
    createdAt: new Date(),
  };

  it('no-ops when VAPID missing', async () => {
    const { dispatcher, sendWebPush } = makeDispatcher({});
    const result = await dispatcher.dispatch(note);
    expect(result).toEqual({ sent: 0, skipped: 'no_vapid' });
    expect(sendWebPush).not.toHaveBeenCalled();
  });

  it('skips non-push kinds', async () => {
    const { dispatcher, sendWebPush } = makeDispatcher({
      vapid: {
        publicKey: 'pub',
        privateKey: 'priv',
        subject: 'mailto:demo@local',
      },
    });
    const result = await dispatcher.dispatch({
      ...note,
      kind: 'request_status',
    });
    expect(result).toEqual({ sent: 0, skipped: 'kind' });
    expect(sendWebPush).not.toHaveBeenCalled();
  });

  it('sends to each subscription for grade_*', async () => {
    const send = jest.fn(
      async (input: { endpoint: string }) => {
        void input;
        return { statusCode: 201 };
      },
    );
    const { dispatcher } = makeDispatcher({
      vapid: {
        publicKey: 'pub',
        privateKey: 'priv',
        subject: 'mailto:demo@local',
      },
      subs: [
        {
          id: 's1',
          userId: 'u1',
          endpoint: 'https://push.example/1',
          p256dh: 'k1',
          auth: 'a1',
        },
        {
          id: 's2',
          userId: 'u1',
          endpoint: 'https://push.example/2',
          p256dh: 'k2',
          auth: 'a2',
        },
      ],
      send,
    });
    const result = await dispatcher.dispatch(note);
    expect(result.sent).toBe(2);
    expect(result.skipped).toBeUndefined();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0].endpoint).toBe('https://push.example/1');
  });

  it('drops gone subscriptions (410/404)', async () => {
    const deleted: string[] = [];
    const send = jest.fn(async () => {
      const err = Object.assign(new Error('Gone'), { statusCode: 410 });
      throw err;
    });
    const { dispatcher } = makeDispatcher({
      vapid: {
        publicKey: 'pub',
        privateKey: 'priv',
        subject: 'mailto:demo@local',
      },
      subs: [
        {
          id: 's1',
          userId: 'u1',
          endpoint: 'https://push.example/gone',
          p256dh: 'k',
          auth: 'a',
        },
      ],
      send,
      deleteEndpoint: (ep) => deleted.push(ep),
    });
    const result = await dispatcher.dispatch({
      ...note,
      kind: 'digest_morning',
    });
    expect(result.sent).toBe(0);
    expect(deleted).toEqual(['https://push.example/gone']);
  });
});
