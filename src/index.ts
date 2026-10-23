import { migrate } from './task-store.js';
import { startNotifications } from './notifications.js';
import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { getBotToken } from './env.js';
import { closeDB } from './db.js';
import { commandMap } from './commands/index.js';

const token = getBotToken();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let stopNotifications = () => {};
client.once(Events.ClientReady, (readyClient) => {
  console.log(`${readyClient.user.tag} 로그인 완료`);
  stopNotifications = startNotifications(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    try { await commandMap.get(interaction.commandName)?.autocomplete?.(interaction); }
    catch (error) {
      console.error('자동완성 실패:', error);
      if (!interaction.responded) await interaction.respond([]).catch(() => {});
    }
    return;
  }
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

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  stopNotifications();
  await client.destroy();
  await closeDB();
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown().catch(() => {
      console.error('봇 종료 중 오류가 발생했습니다.');
      process.exitCode = 1;
    });
  });
}

try {
  await migrate();
  await client.login(token);
} catch {
  console.error('봇 시작 실패: DB 설정, 토큰과 네트워크 연결을 확인해주세요.');
  await shutdown();
  process.exitCode = 1;
}
