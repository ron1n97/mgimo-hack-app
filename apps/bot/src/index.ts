import { Bot, GrammyError, HttpError } from 'grammy';
import { DEMO_ACCOUNTS } from '@dekanat/shared';
import { ApiClient } from './api';
import { clearUserToken, getUserToken, setUserToken } from './session';
import { formatRequests, formatSchedule, formatToday } from './format';

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';

if (!token) {
  console.warn(
    '[bot] TELEGRAM_BOT_TOKEN is empty — skipping start (set token to enable).',
  );
  process.exit(0);
}

const bot = new Bot(token);
const api = new ApiClient(apiUrl);

function requireAuth(ctx: { from?: { id: number } }): string | null {
  const id = ctx.from?.id;
  if (id == null) return null;
  return getUserToken(id) ?? null;
}

bot.command('start', async (ctx) => {
  const demos = DEMO_ACCOUNTS.map((a) => `• ${a.email} / ${a.password}`).join(
    '\n',
  );
  await ctx.reply(
    [
      'Деканат+ — демо-бот (концепт, не офиц. сервис вуза).',
      '',
      'Привязка аккаунта (демо):',
      '/login email password',
      '',
      'Лучший путь позже: одноразовый код из веб-кабинета.',
      `Веб: ${webUrl}`,
      '',
      'Команды: /today · /schedule · /requests · /logout',
      '',
      'Демо-аккаунты:',
      demos,
    ].join('\n'),
  );
});

bot.command('login', async (ctx) => {
  const text = ctx.message?.text ?? '';
  const parts = text.trim().split(/\s+/);
  // /login email password
  if (parts.length < 3) {
    await ctx.reply('Формат: /login email password');
    return;
  }
  const email = parts[1];
  const password = parts.slice(2).join(' ');
  try {
    const auth = await api.login(email, password);
    if (!ctx.from) {
      await ctx.reply('Не удалось определить пользователя Telegram.');
      return;
    }
    setUserToken(ctx.from.id, auth.tokens.accessToken);
    await ctx.reply(
      `Ок, вошли как ${auth.user.fullName ?? auth.user.email} (${auth.user.role}).`,
    );
  } catch (err) {
    await ctx.reply(`Логин не удался: ${String(err)}`);
  }
});

bot.command('logout', async (ctx) => {
  if (ctx.from) clearUserToken(ctx.from.id);
  await ctx.reply('Сессия сброшена.');
});

bot.command('today', async (ctx) => {
  const jwt = requireAuth(ctx);
  if (!jwt) {
    await ctx.reply('Сначала /login email password');
    return;
  }
  api.setToken(jwt);
  try {
    const data = await api.today();
    await ctx.reply(formatToday(data));
  } catch (err) {
    await ctx.reply(`Ошибка /today: ${String(err)}`);
  }
});

bot.command('schedule', async (ctx) => {
  const jwt = requireAuth(ctx);
  if (!jwt) {
    await ctx.reply('Сначала /login email password');
    return;
  }
  api.setToken(jwt);
  try {
    const data = await api.schedule();
    const text = formatSchedule(data);
    // Telegram hard limit ~4096
    if (text.length > 4000) {
      await ctx.reply(text.slice(0, 3900) + '\n…');
    } else {
      await ctx.reply(text);
    }
  } catch (err) {
    await ctx.reply(`Ошибка /schedule: ${String(err)}`);
  }
});

bot.command('requests', async (ctx) => {
  const jwt = requireAuth(ctx);
  if (!jwt) {
    await ctx.reply('Сначала /login email password');
    return;
  }
  api.setToken(jwt);
  try {
    const data = await api.requests();
    await ctx.reply(formatRequests(data.items));
  } catch (err) {
    await ctx.reply(`Ошибка /requests: ${String(err)}`);
  }
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`[bot] error while handling update ${ctx.update.update_id}`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error('[bot] Grammy error:', e.description);
  } else if (e instanceof HttpError) {
    console.error('[bot] HTTP error:', e);
  } else {
    console.error('[bot] unknown error:', e);
  }
});

console.log(`[bot] starting against API_URL=${apiUrl}`);
bot.start();
