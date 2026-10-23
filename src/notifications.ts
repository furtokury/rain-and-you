import type { Client } from 'discord.js';
import { getDB } from './db.js';
import { isDevelopment } from './env.js';
import { list } from './task-store.js';
import { isDue, type Settings } from './settings.js';
import { messages, today } from './tasks.js';
export function startNotifications(client: Client): () => void {
  // 기존 환경 변수는 최초 설정으로만 가져온다. 이후 /설정의 DB 값이 우선한다.
  const legacyChannel = process.env[isDevelopment ? 'DISCORD_TEST_NOTIFICATION_CHANNEL_ID' : 'DISCORD_NOTIFICATION_CHANNEL_ID']?.trim();
  let imported = !legacyChannel;
  let busy = false;
  async function tick() {
    if (busy || !client.isReady()) return;
    busy = true;
    try {
      const db = getDB();
      if (!imported) {
        try {
        const channel = await client.channels.fetch(legacyChannel!);
        if (channel && 'guildId' in channel) {
          await db`INSERT IGNORE INTO guild_settings (guild_id,channel_id,enabled) VALUES (${String(channel.guildId)},${legacyChannel},TRUE)`;
          // 이전 버전에서 오늘 이미 보낸 알림도 보존한다.
          await db`INSERT IGNORE INTO guild_notifications (guild_id,notification_date,sent,claimed_at) SELECT ${String(channel.guildId)},notification_date,sent,claimed_at FROM task_notifications WHERE channel_id=${legacyChannel}`;
        }
        } catch (error) { console.error('이전 알림 채널 설정 가져오기 실패 (/설정으로 지정 가능):',error); }
        imported = true;
      }
      const settings: Settings[] = await db`SELECT * FROM guild_settings WHERE enabled=TRUE AND channel_id IS NOT NULL`;
      const now = new Date();
      const day = today(now);
      for (const setting of settings) {
        if (!isDue(setting.notification_time,now)) continue;
        let claimed = false;
        const guild = setting.guild_id;
        try {
          await db`INSERT IGNORE INTO guild_notifications (guild_id,notification_date) VALUES (${guild},${day})`;
          claimed = await db.begin(async tx => {
            const rows = await tx`SELECT sent,claimed_at FROM guild_notifications WHERE guild_id=${guild} AND notification_date=${day} FOR UPDATE`;
            if (rows[0].sent || Number(rows[0].claimed_at) > Date.now() - 600000) return false;
            await tx`UPDATE guild_notifications SET claimed_at=${Date.now()} WHERE guild_id=${guild} AND notification_date=${day}`;
            return true;
          });
          if (!claimed) continue;
          const channel = await client.channels.fetch(setting.channel_id!);
          if (!channel || !channel.isTextBased() || !channel.isSendable() || !('guildId' in channel) || channel.guildId !== guild) throw new Error('알림 채널을 확인해주세요.');
          for (const content of messages(await list(guild),day)) await channel.send({content,allowedMentions:{parse:[]}});
          await db`UPDATE guild_notifications SET sent=TRUE WHERE guild_id=${guild} AND notification_date=${day}`;
        } catch (error) {
          console.error(`서버 ${guild} 매일 알림 실패:`,error);
          if (claimed) await db`UPDATE guild_notifications SET claimed_at=0 WHERE guild_id=${guild} AND notification_date=${day}`.catch(() => {});
        }
      }
    } catch (error) { console.error('알림 설정 조회 실패:',error); }
    finally { busy = false; }
  }
  const timer = setInterval(() => void tick(),30000);
  void tick();
  return () => clearInterval(timer);
}
