import { InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from './types.js';
import { create, change, list, detail } from '../task-store.js';
import { date, deadline, InputError, label, autocompleteLabel, messages, today, detailMessages, personalMessages } from '../tasks.js';
export const workAliases: Record<string, string> = {
  '목록': '확인', '추가': '생성', '파기': '취소', '중단': '취소',
};
const data = new SlashCommandBuilder().setName('작업').setDescription('작업 일정 관리')
  .setContexts(InteractionContextType.Guild);
for (const name of ['생성','확인','연기','마감일변경','완료','취소','공유변경','상세', ...Object.keys(workAliases)]) {
  const action = workAliases[name] ?? name;
  data.addSubcommand(s => {
    s.setName(name).setDescription(`작업 ${action}`);
    if (action === '생성') {
      s.addStringOption(o => o.setName('의뢰자명').setDescription('의뢰자명').setRequired(true).setMaxLength(100))
        .addStringOption(o => o.setName('곡제목').setDescription('곡 제목').setRequired(true).setMaxLength(100))
        .addStringOption(o => o.setName('마감').setDescription('빠른마감, 일반마감 또는 직접 일수 입력').setRequired(true).setAutocomplete(true))
        .addStringOption(o => o.setName('착수일').setDescription('YYYY-MM-DD (생략하면 오늘, KST 기준)').setRequired(false));
    } else if (action !== '확인') {
      s.addStringOption(o => o.setName('프로젝트').setDescription('의뢰자명, 곡 제목, 착수일, 마감일로 검색').setRequired(true).setAutocomplete(true));
      if (action === '연기' || action === '마감일변경') s.addStringOption(o => o.setName('마감일').setDescription('새 마감일 YYYY-MM-DD').setRequired(true));
    }
    if (action === '생성' || action === '공유변경') s.addStringOption(o => o.setName('지정인원').setDescription('사용자 멘션 또는 ID를 공백으로 구분. 공유변경 시 생략하면 모두 해제'));
    return s;
  });
}
const work: Command = {
  data,
  async autocomplete(i) {
    if (!i.guildId) { await i.respond([]); return; }
    const focused = i.options.getFocused(true);
    const query = String(focused.value).trim().toLocaleLowerCase();
    if (focused.name === '마감') {
      await i.respond([{name:'빠른마감 (+3일)',value:'빠른마감'},{name:'일반마감 (+14일)',value:'일반마감'}].filter(c => c.name.includes(query)));
      return;
    }
    const tasks = await list(i.guildId,{userId:i.user.id,admin:!!i.memberPermissions?.has(PermissionFlagsBits.Administrator)}, i.options.getSubcommand() === '상세');
    await i.respond(tasks.filter(t => query.split(/\s+/).every(q => label(t).toLocaleLowerCase().includes(q))).slice(0,25).map(t => ({name:autocompleteLabel(t),value:t.id})));
  },
  async execute(i) {
    await i.deferReply({flags:MessageFlags.Ephemeral});
    try {
      if (!i.guildId) throw new InputError('서버에서 사용해주세요.');
      const selected = i.options.getSubcommand();
      const action = workAliases[selected] ?? selected;
      const get = (name: string) => i.options.getString(name,true).trim();
      const access = {userId:i.user.id,admin:!!i.memberPermissions?.has(PermissionFlagsBits.Administrator)};
      let members: string[] | undefined;
      if (action === '생성' || action === '공유변경') {
        members = parseMembers(i.options.getString('지정인원') ?? '');
        for (const id of members) {
          const member = await i.guild?.members.fetch(id).catch(() => null);
          if (!member || member.user.bot) throw new InputError('지정 인원은 이 서버의 사용자여야 합니다.');
        }
      }
      let output: string[];
      if (action === '확인') output = messages(await list(i.guildId,{userId:i.user.id,admin:!!i.memberPermissions?.has(PermissionFlagsBits.Administrator)}));
      else if (action === '상세') output = detailMessages(await detail(i.guildId,get('프로젝트'),access));
      else if (action === '생성') {
        const client = get('의뢰자명'), song = get('곡제목'), start = date(i.options.getString('착수일')?.trim() ?? today());
        if (!client || !song || /[\r\n]/.test(client + song)) throw new InputError('의뢰자명과 곡 제목은 비어 있지 않은 한 줄로 입력해주세요.');
        const due = deadline(start, get('마감'));
        await create(i.guildId, client, song, start, due, i.user.id, members);
        output = ['작업을 생성했습니다.', ...messages(await list(i.guildId,{userId:i.user.id,admin:!!i.memberPermissions?.has(PermissionFlagsBits.Administrator)}))];
      } else {
        const due = action === '연기' || action === '마감일변경' ? date(get('마감일')) : undefined;
        await change(i.guildId,get('프로젝트'),action,access,due,members);
        output = [`작업 ${action} 처리했습니다.`, ...messages(await list(i.guildId,{userId:i.user.id,admin:!!i.memberPermissions?.has(PermissionFlagsBits.Administrator)}))];
      }
      // 처리 결과와 작업 정보를 첫 응답에 함께 담는다.
      if (output.length > 1 && output[0].length + output[1].length + 1 <= 2000) {
        output.splice(0, 2, `${output[0]}\n${output[1]}`);
      }
      output = personalMessages(output,i.user.id,access.admin,action === '상세' ? '작업 상세 조회' : '작업 목록');
      await i.editReply({content:output[0],allowedMentions:{parse:[]}});
      for (const content of output.slice(1)) await i.followUp({content,flags:MessageFlags.Ephemeral,allowedMentions:{parse:[]}});
    } catch (error) {
      if (error instanceof InputError) { await i.editReply({content:error.message,allowedMentions:{parse:[]}}); return; }
      throw error;
    }
  },
};
export default work;

export function parseMembers(raw: string): string[] {
  const parts = raw.trim() ? raw.trim().split(/[\s,]+/) : [];
  const ids = parts.map(part => part.replace(/^<@!?(\d+)>$/, '$1'));
  if (ids.some(id => !/^\d{17,20}$/.test(id))) throw new InputError('지정 인원은 사용자 멘션 또는 ID를 공백으로 구분해주세요.');
  if (ids.length > 50) throw new InputError('지정 인원은 최대 50명입니다.');
  return [...new Set(ids)];
}
