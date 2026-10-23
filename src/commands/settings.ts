import { ChannelType, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from './types.js';
import { getSettings, parseTime, saveSettings, type Settings } from '../settings.js';
import { InputError } from '../tasks.js';
export function formatSettings(value: Settings): string {
  return `현재 알림 설정\n채널: ${value.channel_id ? `<#${value.channel_id}>` : '미설정'}\n시각: ${value.notification_time ? `${value.notification_time} (KST)` : '미설정'}\n알림: ${value.enabled ? '켜짐' : '꺼짐'}`;
}
const settings: Command = {
  data: new SlashCommandBuilder().setName('설정').setDescription('알림 설정 확인 또는 변경 (시각은 KST)')
    .setContexts(InteractionContextType.Guild)
    .addSubcommand(s => s.setName('확인').setDescription('현재 알림 채널, 시각, 켜짐 여부 확인').addUserOption(o => o.setName('대상').setDescription('관리자가 설정을 확인할 사용자')))
    .addSubcommand(s => s.setName('변경').setDescription('알림 설정 변경')
    .addUserOption(o => o.setName('대상').setDescription('관리자가 설정을 변경할 사용자'))
    .addChannelOption(o => o.setName('채널').setDescription('매일 작업 알림을 보낼 채널').addChannelTypes(ChannelType.GuildText,ChannelType.GuildAnnouncement))
    .addStringOption(o => o.setName('시각').setDescription('KST 24시간제 HH:mm, 예: 09:00 또는 18:30'))
    .addBooleanOption(o => o.setName('알림').setDescription('매일 알림 켜기/끄기'))),
  async execute(i) {
    await i.deferReply({flags:MessageFlags.Ephemeral});
    try {
      if (!i.guildId || !i.guild) throw new InputError('서버에서 사용해주세요.');
      const target = i.options.getUser('대상') ?? i.user;
      if (target.id !== i.user.id && !i.memberPermissions?.has(PermissionFlagsBits.Administrator)) throw new InputError('다른 사람의 알림 설정은 서버 관리자만 변경·조회할 수 있습니다.');
      if (!await i.guild.members.fetch(target.id).catch(() => null)) throw new InputError('서버에 있는 사용자를 선택해주세요.');
      if (i.options.getSubcommand() === '확인') {
        const value = await getSettings(i.guildId,target.id);
        await i.editReply({content:formatSettings(value),allowedMentions:{parse:[]}});
        return;
      }
      const channel = i.options.getChannel('채널');
      const rawTime = i.options.getString('시각');
      const enabled = i.options.getBoolean('알림');
      const time = rawTime === null ? undefined : parseTime(rawTime.trim());
      if (channel) {
        const actual = await i.guild.channels.fetch(channel.id);
        const me = i.guild.members.me ?? await i.guild.members.fetchMe();
        const permissions = actual?.permissionsFor(me);
        if (!actual || ![ChannelType.GuildText,ChannelType.GuildAnnouncement].includes(actual.type) || !permissions?.has([PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages]))
          throw new InputError('봇이 채널을 보고 메시지를 보낼 수 있는 서버 텍스트 채널을 선택해주세요.');
      }
      const changed = channel !== null || time !== undefined || enabled !== null;
      if (!changed) throw new InputError('변경할 채널, 시각 또는 알림 여부를 입력해주세요. 현재 설정은 /설정 확인으로 볼 수 있습니다.');
      const value = await saveSettings(i.guildId,target.id,{channel:channel?.id,time,enabled:enabled ?? undefined});
      await i.editReply({content:`설정을 저장했습니다.\n${formatSettings(value)}`,allowedMentions:{parse:[]}});
    } catch (error) {
      if (error instanceof InputError) { await i.editReply(error.message); return; }
      throw error;
    }
  },
};
export default settings;
