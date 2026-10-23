import { PermissionFlagsBits, type Client } from 'discord.js';
import { getDB } from './db.js';
import { list } from './task-store.js';
import { isDue, type Settings } from './settings.js';
import { messages, today } from './tasks.js';
export function startNotifications(client: Client): () => void {
  let busy = false;
  async function tick() {
    if (busy || !client.isReady()) return;
    busy = true;
    try {
      const db = getDB();
      const settings: Settings[] = await db`SELECT * FROM personal_settings WHERE enabled=TRUE AND channel_id IS NOT NULL AND notification_time IS NOT NULL`;
      const now = new Date();
      const day = today(now);
      for (const setting of settings) {
        if (!isDue(setting.notification_time!,now)) continue;
        let claimed = false;
        const guild = setting.guild_id;
        const user = setting.user_id!;
        try {
          const server = await client.guilds.fetch(guild);
          const member = await server.members.fetch({user,force:true}).catch(() => null);
          if (!member) continue;
          await db`INSERT IGNORE INTO personal_notifications (guild_id,user_id,notification_date) VALUES (${guild},${user},${day})`;
          claimed = await db.begin(async tx => {
            const rows = await tx`SELECT sent,claimed_at FROM personal_notifications WHERE guild_id=${guild} AND user_id=${user} AND notification_date=${day} FOR UPDATE`;
            if (rows[0].sent || Number(rows[0].claimed_at) > Date.now() - 600000) return false;
            await tx`UPDATE personal_notifications SET claimed_at=${Date.now()} WHERE guild_id=${guild} AND user_id=${user} AND notification_date=${day}`;
            return true;
          });
          if (!claimed) continue;
          const channel = await client.channels.fetch(setting.channel_id!);
          if (!channel || !channel.isTextBased() || !channel.isSendable() || !('guildId' in channel) || channel.guildId !== guild) throw new Error('알림 채널을 확인해주세요.');
          for (const content of messages(await list(guild,{userId:user,admin:member.permissions.has(PermissionFlagsBits.Administrator)}),day)) await channel.send({content:`<@${user}>\n${content}`,allowedMentions:{parse:[]}});
          await db`UPDATE personal_notifications SET sent=TRUE WHERE guild_id=${guild} AND user_id=${user} AND notification_date=${day}`;
        } catch (error) {
          console.error(`서버 ${guild} 매일 알림 실패:`,error);
          if (claimed) await db`UPDATE personal_notifications SET claimed_at=0 WHERE guild_id=${guild} AND user_id=${user} AND notification_date=${day}`.catch(() => {});
        }
      }
    } catch (error) { console.error('알림 설정 조회 실패:',error); }
    finally { busy = false; }
  }
  const timer = setInterval(() => void tick(),30000);
  void tick();
  return () => clearInterval(timer);
}
