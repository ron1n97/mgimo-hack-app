import { PushSubscriptionService } from './push-subscription.service';

describe('PushSubscriptionService', () => {
  function makeService() {
    const store = new Map<
      string,
      {
        id: string;
        userId: string;
        endpoint: string;
        p256dh: string;
        auth: string;
        userAgent: string | null;
      }
    >();
    let seq = 0;
    const prisma = {
      pushSubscription: {
        upsert: jest.fn(
          async ({
            where,
            create,
            update,
          }: {
            where: { endpoint: string };
            create: {
              userId: string;
              endpoint: string;
              p256dh: string;
              auth: string;
              userAgent?: string | null;
            };
            update: {
              userId: string;
              p256dh: string;
              auth: string;
              userAgent?: string | null;
            };
          }) => {
            const existing = store.get(where.endpoint);
            if (existing) {
              const next = {
                ...existing,
                userId: update.userId,
                p256dh: update.p256dh,
                auth: update.auth,
                userAgent: update.userAgent ?? existing.userAgent,
              };
              store.set(where.endpoint, next);
              return next;
            }
            const row = {
              id: `ps-${++seq}`,
              userId: create.userId,
              endpoint: create.endpoint,
              p256dh: create.p256dh,
              auth: create.auth,
              userAgent: create.userAgent ?? null,
            };
            store.set(row.endpoint, row);
            return row;
          },
        ),
        deleteMany: jest.fn(
          async ({
            where,
          }: {
            where: { userId: string; endpoint: string };
          }) => {
            const row = store.get(where.endpoint);
            if (row && row.userId === where.userId) {
              store.delete(where.endpoint);
              return { count: 1 };
            }
            return { count: 0 };
          },
        ),
        findMany: jest.fn(async ({ where }: { where: { userId: string } }) =>
          [...store.values()].filter((r) => r.userId === where.userId),
        ),
      },
    };
    return {
      service: new PushSubscriptionService(prisma as never),
      store,
      prisma,
    };
  }

  it('upserts subscription for user', async () => {
    const { service, store } = makeService();
    const row = await service.subscribe('user-a', {
      endpoint: 'https://push.example/x',
      keys: { p256dh: 'pk', auth: 'ak' },
      userAgent: 'Chrome',
    });
    expect(row.userId).toBe('user-a');
    expect(store.get('https://push.example/x')?.p256dh).toBe('pk');
  });

  it('reassigns endpoint to new user on upsert', async () => {
    const { service, store } = makeService();
    await service.subscribe('user-a', {
      endpoint: 'https://push.example/x',
      keys: { p256dh: 'pk', auth: 'ak' },
    });
    await service.subscribe('user-b', {
      endpoint: 'https://push.example/x',
      keys: { p256dh: 'pk2', auth: 'ak2' },
    });
    expect(store.get('https://push.example/x')?.userId).toBe('user-b');
  });

  it('unsubscribes only own endpoint', async () => {
    const { service } = makeService();
    await service.subscribe('user-a', {
      endpoint: 'https://push.example/a',
      keys: { p256dh: 'pk', auth: 'ak' },
    });
    const foreign = await service.unsubscribe(
      'user-b',
      'https://push.example/a',
    );
    expect(foreign).toEqual({ removed: false });
    const own = await service.unsubscribe('user-a', 'https://push.example/a');
    expect(own).toEqual({ removed: true });
  });
});
