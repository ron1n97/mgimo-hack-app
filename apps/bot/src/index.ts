import { Bot, GrammyError, HttpError, InlineKeyboard, Keyboard } from 'grammy';
import {
  CabinetClient,
  loginByEmail,
  loginByPhone,
} from '@dekanat/cabinet-tools';
import { DEMO_ACCOUNTS } from '@dekanat/shared';
import { runCabinetAgent } from './agent';
import {
  createApproval,
  decideApproval,
  formatImpact,
} from './approvals';
import {
  appendTurn,
  clearHistory,
  historyForModel,
} from './memory';
import { clearSession, getSession, setSession } from './session';

function loadEnvFile(path: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    if (!fs.existsSync(path)) return;
    for (const line of fs.readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env) || !process.env[k]) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile(`${process.cwd()}/../../.env`);
loadEnvFile(`${process.cwd()}/.env`);

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
const zKey = process.env.ZCODE_API_KEY?.trim();
const zBase =
  process.env.ZCODE_BASE_URL?.trim() ?? 'https://api.z.ai/api/coding/paas/v4';
const zModel = process.env.ZCODE_MODEL?.trim() ?? 'glm-5.3';

if (!token) {
  console.warn('[bot] TELEGRAM_BOT_TOKEN empty — exit 0');
  process.exit(0);
}

/** RU VPS block api.telegram.org — route via HTTP CONNECT proxy (undici ProxyAgent). */
function buildFetch() {
  const proxy =
    process.env.TELEGRAM_PROXY?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim();
  if (!proxy) return fetch;
  try {
    // Explicit undici dep — ProxyAgent is HTTP CONNECT only (not raw SOCKS).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ProxyAgent, fetch: undiciFetch } = require('undici') as {
      ProxyAgent: new (url: string) => unknown;
      fetch: (
        input: RequestInfo | URL,
        init?: RequestInit & { dispatcher?: unknown },
      ) => Promise<Response>;
    };
    const dispatcher = new ProxyAgent(proxy);
    console.log(`[bot] telegram via proxy ${proxy.replace(/\/\/.*@/, '//***@')}`);
    // Grammy's node shim passes node-fetch fields (`agent`, foreign AbortSignal)
    // that undici rejects — strip them and attach dispatcher instead.
    return ((url: RequestInfo | URL, init?: RequestInit) => {
      const raw = { ...(init as Record<string, unknown>) };
      delete raw.agent;
      delete raw.compress;
      delete raw.duplex;
      delete raw.signal;
      return undiciFetch(url, { ...raw, dispatcher } as RequestInit & {
        dispatcher?: unknown;
      });
    }) as typeof fetch;
  } catch (err) {
    console.warn('[bot] proxy setup failed, direct fetch', err);
    return fetch;
  }
}

const bot = new Bot(token, {
  client: {
    fetch: buildFetch(),
  },
});

const contactKeyboard = new Keyboard()
  .requestContact('📱 Войти по номеру телефона')
  .resized()
  .oneTime();

function userLabel(user: unknown): string {
  if (!user || typeof user !== 'object') return 'пользователь';
  const u = user as {
    email?: string;
    studentProfile?: { fullName?: string } | null;
    staffProfile?: { fullName?: string } | null;
    role?: string;
  };
  return (
    u.studentProfile?.fullName ??
    u.staffProfile?.fullName ??
    u.email ??
    u.role ??
    'пользователь'
  );
}

async function profileHint(client: CabinetClient): Promise<string> {
  try {
    const me = (await client.getProfile()) as {
      role?: string;
      phoneE164?: string | null;
      studentProfile?: {
        fullName?: string;
        groupLabel?: string;
        course?: number;
      } | null;
      staffProfile?: { fullName?: string; department?: string } | null;
    };
    if (me.studentProfile) {
      return `${me.studentProfile.fullName}, ${me.studentProfile.groupLabel}, курс ${me.studentProfile.course}, role=${me.role}`;
    }
    if (me.staffProfile) {
      return `${me.staffProfile.fullName}, ${me.staffProfile.department}, role=${me.role}`;
    }
    return `role=${me.role}`;
  } catch {
    return '';
  }
}

bot.command('start', async (ctx) => {
  const demos = DEMO_ACCOUNTS.map((a) => `• ${a.phone} → ${a.email}`).join(
    '\n',
  );
  await ctx.reply(
    [
      'Деканат+ — реактивный ИИ-агент кабинета (концепт, не офиц. сервис).',
      '',
      '1) Поделитесь контактом (номер = аккаунт).',
      '2) Пишите обычным текстом — агент сам дергает tools.',
      '3) Создание заявки / смена статуса — кнопки «Подтвердить / Отклонить».',
      '',
      'Демо-номера:',
      demos,
      '',
      `/login email password · веб: ${webUrl}`,
      '/whoami · /logout · /reset (очистить память диалога)',
    ].join('\n'),
    { reply_markup: contactKeyboard },
  );
});

bot.command('logout', async (ctx) => {
  if (ctx.from) {
    clearSession(ctx.from.id);
    clearHistory(ctx.from.id);
  }
  await ctx.reply('Сессия и память сброшены.', {
    reply_markup: contactKeyboard,
  });
});

bot.command('reset', async (ctx) => {
  if (ctx.from) clearHistory(ctx.from.id);
  await ctx.reply('Память диалога очищена. Сессия входа сохранена.');
});

bot.command('whoami', async (ctx) => {
  const s = ctx.from ? getSession(ctx.from.id) : undefined;
  if (!s) {
    await ctx.reply('Не вошли. Нажмите кнопку с контактом.', {
      reply_markup: contactKeyboard,
    });
    return;
  }
  const client = new CabinetClient({
    apiUrl,
    accessToken: s.accessToken,
  });
  try {
    const hint = await profileHint(client);
    await ctx.reply(
      [`Сессия: ${s.label ?? 'ok'}`, hint].filter(Boolean).join('\n'),
    );
  } catch (err) {
    await ctx.reply(`Профиль: ${String(err)}`);
  }
});

bot.command('login', async (ctx) => {
  const text = ctx.message?.text ?? '';
  const parts = text.trim().split(/\s+/);
  if (parts.length < 3) {
    await ctx.reply('Формат: /login email password');
    return;
  }
  const email = parts[1];
  const password = parts.slice(2).join(' ');
  try {
    const auth = await loginByEmail(apiUrl, email, password);
    if (!ctx.from) return;
    const label = userLabel(auth.user);
    setSession(ctx.from.id, auth.accessToken, label);
    clearHistory(ctx.from.id);
    await ctx.reply(
      `Ок, ${label}. Пишите текст — агент с tools + подтверждение мутаций.`,
      { reply_markup: { remove_keyboard: true } },
    );
  } catch (err) {
    await ctx.reply(`Логин не удался: ${String(err)}`);
  }
});

bot.on('message:contact', async (ctx) => {
  const contact = ctx.message.contact;
  if (!ctx.from) return;
  if (contact.user_id && contact.user_id !== ctx.from.id) {
    await ctx.reply('Нужен ваш собственный контакт из Telegram.');
    return;
  }
  try {
    const auth = await loginByPhone(
      apiUrl,
      contact.phone_number,
      String(ctx.from.id),
    );
    const label = userLabel(auth.user);
    setSession(ctx.from.id, auth.accessToken, label);
    clearHistory(ctx.from.id);
    await ctx.reply(
      [
        `Вошли как ${label}.`,
        'Агент: память диалога, чтение без спроса, запись — только после ваших кнопок.',
        'Примеры: «что сегодня», «долги и что делать», «черновик справки для военкомата».',
      ].join('\n'),
      { reply_markup: { remove_keyboard: true } },
    );
  } catch (err) {
    const demos = DEMO_ACCOUNTS.map((a) => `• ${a.phone} → ${a.email}`).join(
      '\n',
    );
    await ctx.reply(
      [
        `Номер ${contact.phone_number} ещё не привязан к аккаунту.`,
        '',
        'Как починить:',
        `1) Веб ${webUrl}/profile — укажите этот телефон и сохраните`,
        '2) Или /login email password — и снова поделитесь контактом',
        '',
        'Демо-номера:',
        demos,
      ].join('\n'),
      { reply_markup: contactKeyboard },
    );
    console.warn('[bot] phone login failed', contact.phone_number, err);
  }
});

bot.callbackQuery(/^ap:(ok|no):(.+)$/, async (ctx) => {
  const ok = ctx.match[1] === 'ok';
  const id = ctx.match[2];
  const decided = decideApproval(id, ok);
  await ctx.answerCallbackQuery({
    text: decided ? (ok ? 'Подтверждено' : 'Отклонено') : 'Устарело',
  });
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await ctx.reply(ok ? '✅ Действие подтверждено, продолжаю…' : '❌ Отклонено.');
  } catch {
    /* message may be old */
  }
});

bot.on('message:text', async (ctx) => {
  const text = ctx.message.text?.trim() ?? '';
  if (!text) return;
  if (text.startsWith('/')) {
    await ctx.reply('Не знаю такую команду. Напишите /help или /start.', {
      reply_markup: contactKeyboard,
    });
    return;
  }

  const s = ctx.from ? getSession(ctx.from.id) : undefined;
  if (!s || !ctx.from) {
    await ctx.reply('Сначала войдите контактом или /login.', {
      reply_markup: contactKeyboard,
    });
    return;
  }

  if (!zKey) {
    await ctx.reply('ZCODE_API_KEY не задан — ИИ недоступен.');
    return;
  }

  const client = new CabinetClient({
    apiUrl,
    accessToken: s.accessToken,
  });
  const hint = await profileHint(client);
  const telegramId = ctx.from.id;

  let statusMsgId: number | undefined;
  const statusChatId = ctx.chat.id;

  async function setStatus(line: string) {
    await ctx.replyWithChatAction('typing');
    try {
      if (statusMsgId == null) {
        const m = await ctx.reply(`⏳ ${line}`);
        statusMsgId = m.message_id;
      } else {
        await bot.api.editMessageText(
          statusChatId,
          statusMsgId,
          `⏳ ${line}`,
        );
      }
    } catch {
      /* ignore edit races */
    }
  }

  try {
    const answer = await runCabinetAgent({
      llm: { apiKey: zKey, baseUrl: zBase, model: zModel },
      client,
      userText: text,
      history: historyForModel(telegramId),
      label: s.label,
      profileHint: hint,
      hooks: {
        onStatus: setStatus,
        requestApproval: async (toolName, args) => {
          const { id, promise } = createApproval({
            telegramId,
            toolName,
            args,
          });
          const kb = new InlineKeyboard()
            .text('✅ Подтвердить', `ap:ok:${id}`)
            .text('❌ Отклонить', `ap:no:${id}`);
          await ctx.reply(
            [
              '⚠️ Нужно ваше подтверждение (агент не пишет в API без вас):',
              formatImpact(toolName, args),
            ].join('\n'),
            { reply_markup: kb },
          );
          return promise;
        },
      },
    });

    if (statusMsgId != null) {
      try {
        await bot.api.deleteMessage(statusChatId, statusMsgId);
      } catch {
        /* */
      }
    }

    const out =
      answer.length > 4000 ? answer.slice(0, 3900) + '\n…' : answer;
    await ctx.reply(out);
    appendTurn(telegramId, text, out);
  } catch (err) {
    await ctx.reply(`ИИ ошибка: ${String(err).slice(0, 500)}`);
  }
});

bot.catch((err) => {
  console.error(`[bot] update ${err.ctx.update.update_id}`);
  const e = err.error;
  if (e instanceof GrammyError) console.error('[bot] Grammy:', e.description);
  else if (e instanceof HttpError) console.error('[bot] HTTP:', e);
  else console.error('[bot]', e);
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    [
      '/start — вход',
      '/login email password — войти по почте',
      '/whoami — кто я',
      '/reset — очистить память диалога',
      '/logout — выйти',
      `Веб: ${webUrl}`,
    ].join('\n'),
    { reply_markup: contactKeyboard },
  );
});

console.log(
  `[bot] agent api=${apiUrl} web=${webUrl} model=${zModel} zai=${zKey ? 'yes' : 'no'}`,
);
bot.start({
  drop_pending_updates: true,
  onStart: (info) => console.log(`[bot] polling as @${info.username}`),
});
