import { Bot, GrammyError, HttpError, Keyboard } from 'grammy';
import {
  CabinetClient,
  loginByEmail,
  loginByPhone,
} from '@dekanat/cabinet-tools';
import { DEMO_ACCOUNTS } from '@dekanat/shared';
import { clearSession, getSession, setSession } from './session';
import { runCabinetAgent } from './llm';

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

const bot = new Bot(token);

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

bot.command('start', async (ctx) => {
  const demos = DEMO_ACCOUNTS.map(
    (a) => `• ${a.phone} → ${a.email}`,
  ).join('\n');
  await ctx.reply(
    [
      'Деканат+ — ИИ-бот кабинета (концепт, не офиц. сервис вуза).',
      '',
      'Авторизация: поделитесь контактом (номер должен быть привязан к аккаунту).',
      'Демо-номера:',
      demos,
      '',
      `Или /login email password · веб: ${webUrl}`,
      'После входа пишите обычным текстом — ИИ дергает tools кабинета (расписание, оценки, заявки…).',
      '/logout — выйти · /whoami — кто я',
    ].join('\n'),
    { reply_markup: contactKeyboard },
  );
});

bot.command('logout', async (ctx) => {
  if (ctx.from) clearSession(ctx.from.id);
  await ctx.reply('Сессия сброшена.', { reply_markup: contactKeyboard });
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
    const me = (await client.getProfile()) as {
      email?: string;
      role?: string;
      phoneE164?: string;
      studentProfile?: { fullName?: string; groupLabel?: string };
    };
    await ctx.reply(
      [
        s.label ? `Сессия: ${s.label}` : 'Сессия активна',
        me.email ? `email: ${me.email}` : '',
        me.role ? `role: ${me.role}` : '',
        me.phoneE164 ? `phone: ${me.phoneE164}` : '',
        me.studentProfile?.groupLabel
          ? `группа: ${me.studentProfile.groupLabel}`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
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
    await ctx.reply(
      `Ок, вошли как ${label}. Пишите вопрос текстом — ИИ с tools кабинета.`,
      { reply_markup: { remove_keyboard: true } },
    );
  } catch (err) {
    await ctx.reply(`Логин не удался: ${String(err)}`);
  }
});

bot.on('message:contact', async (ctx) => {
  const contact = ctx.message.contact;
  if (!ctx.from) return;
  // Only accept own contact
  if (contact.user_id && contact.user_id !== ctx.from.id) {
    await ctx.reply('Нужен ваш собственный контакт из Telegram.');
    return;
  }
  const phone = contact.phone_number;
  try {
    const auth = await loginByPhone(apiUrl, phone, String(ctx.from.id));
    const label = userLabel(auth.user);
    setSession(ctx.from.id, auth.accessToken, label);
    await ctx.reply(
      [
        `Вошли как ${label}.`,
        'Номер привязан к аккаунту — доступны действия кабинета через ИИ.',
        'Примеры: «что сегодня?», «расписание на неделю», «мои долги», «создай заявку на справку…»',
      ].join('\n'),
      { reply_markup: { remove_keyboard: true } },
    );
  } catch (err) {
    await ctx.reply(
      [
        `Не нашли аккаунт по номеру ${phone}.`,
        'Демо: +79001111111 (Анна), +79002222222 (Борис), +79003333333 (staff).',
        'Либо /login email password',
        String(err),
      ].join('\n'),
      { reply_markup: contactKeyboard },
    );
  }
});

bot.on('message:text', async (ctx) => {
  const text = ctx.message.text?.trim() ?? '';
  if (!text || text.startsWith('/')) return;

  const s = ctx.from ? getSession(ctx.from.id) : undefined;
  if (!s) {
    await ctx.reply('Сначала войдите контактом или /login.', {
      reply_markup: contactKeyboard,
    });
    return;
  }

  if (!zKey) {
    await ctx.reply('ZCODE_API_KEY не задан — ИИ недоступен.');
    return;
  }

  await ctx.replyWithChatAction('typing');
  const client = new CabinetClient({
    apiUrl,
    accessToken: s.accessToken,
  });

  try {
    const answer = await runCabinetAgent({
      llm: { apiKey: zKey, baseUrl: zBase, model: zModel },
      client,
      userText: text,
    });
    // Telegram limit
    if (answer.length > 4000) {
      await ctx.reply(answer.slice(0, 3900) + '\n…');
    } else {
      await ctx.reply(answer);
    }
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

console.log(
  `[bot] start api=${apiUrl} model=${zModel} zai=${zKey ? 'yes' : 'no'}`,
);
bot.start();
