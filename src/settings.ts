import { getDB } from './db.js';
import { InputError } from './tasks.js';
export interface Settings { guild_id: string; user_id?: string; channel_id: string | null; notification_time: string | null; enabled: number }
export function parseTime(value: string): string {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new InputError('시각은 KST 기준 HH:mm으로 입력해주세요. 예: 09:00, 18:30');
  return value;
}
export function isDue(time: string, now = new Date()): boolean {
  const kst = new Date(now.getTime() + 9 * 3600000);
  return kst.toISOString().slice(11,16) >= time;
}
export async function getSettings(guild: string, user: string): Promise<Settings> {
  const rows = await getDB()`SELECT * FROM personal_settings WHERE guild_id=${guild} AND user_id=${user}`;
  return rows[0] ?? {guild_id:guild,user_id:user,channel_id:null,notification_time:null,enabled:0};
}
export async function saveSettings(guild: string, user: string, patch: {channel?:string;time?:string;enabled?:boolean}) {
  const db = getDB();
  await db`INSERT IGNORE INTO personal_settings (guild_id,user_id) VALUES (${guild},${user})`;
  return db.begin(async tx => {
    const rows = await tx`SELECT * FROM personal_settings WHERE guild_id=${guild} AND user_id=${user} FOR UPDATE`;
    const current = rows[0] as Settings;
    const channel = patch.channel ?? current.channel_id;
    const time = patch.time ?? current.notification_time;
    const enabled = patch.enabled === undefined ? Boolean(current.enabled) : patch.enabled;
    if (enabled && (!channel || !time)) throw new InputError('알림을 켜려면 먼저 채널과 시각을 지정해주세요.');
    await tx`UPDATE personal_settings SET channel_id=${channel}, notification_time=${time}, enabled=${enabled} WHERE guild_id=${guild} AND user_id=${user}`;
    return {guild_id:guild,channel_id:channel,notification_time:time,enabled:Number(enabled)};
  });
}
