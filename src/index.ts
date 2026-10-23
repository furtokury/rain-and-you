import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { requireEnv } from './env.js';
import { commandMap } from './commands/index.js';

const token = requireEnv('DISCORD_BOT_TOKEN');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  console.log(`${readyClient.user.tag} 로그인 완료`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    const command = commandMap.get(interaction.commandName);
    if (!command) {
      await interaction.reply({ content: '아직 지원하지 않는 명령어입니다.', flags: MessageFlags.Ephemeral });
      return;
    }
    await command.execute(interaction);
  } catch (error) {
    console.error(`/${interaction.commandName} 실행 실패:`, error);
    try {
      const content = '명령어를 처리하는 중 오류가 발생했습니다.';
      if (interaction.deferred) await interaction.editReply({ content });
      else if (interaction.replied) await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
      else await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    } catch (replyError) {
      console.error('오류 응답 전송 실패:', replyError);
    }
  }
});

client.on(Events.Error, (error) => console.error('Discord 클라이언트 오류:', error));

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void client.destroy(); });
}

try {
  await client.login(token);
} catch {
  console.error('Discord 로그인 실패: 토큰과 네트워크 연결을 확인해주세요.');
  await client.destroy();
  process.exitCode = 1;
}
