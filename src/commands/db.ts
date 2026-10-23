import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { getDB } from '../db.js';
import type { Command } from './types.js';

export default {
  data: new SlashCommandBuilder()
    .setName('db')
    .setDescription('현재 데이터베이스 연결과 서버 시간을 확인합니다.'),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const db = getDB();
    // ${...} 값은 SQL에 안전하게 바인딩됩니다. 문자열을 이어 붙이지 마세요.
    const [row] = await db<{ database_name: string; server_time: string; user_id: string }[]>`
      SELECT DATABASE() AS database_name,
             CAST(CURRENT_TIMESTAMP AS CHAR) AS server_time,
             ${interaction.user.id} AS user_id
    `;
    if (!row) throw new Error('DB 조회 결과가 없습니다.');
    await interaction.editReply({
      content: `DB 연결 성공!\nDB: ${row.database_name}\n서버 시간: ${row.server_time}\n요청한 사용자: ${row.user_id}`,
      allowedMentions: { parse: [] },
    });
  },
} satisfies Command;
