import { REST, Routes, type RESTGetAPIOAuth2CurrentApplicationResult } from 'discord.js';
import { requireEnv } from './env.js';
import { commands } from './commands/index.js';

const token = requireEnv('DISCORD_BOT_TOKEN');
const rest = new REST({ version: '10' }).setToken(token);

try {
  const application = await rest.get(
    Routes.oauth2CurrentApplication(),
  ) as RESTGetAPIOAuth2CurrentApplicationResult;
  // 이 앱의 전역 명령어 목록을 아래 목록으로 교체합니다.
  await rest.put(Routes.applicationCommands(application.id), {
    body: commands.map((command) => command.data.toJSON()),
  });
  console.log(`${commands.length}개 전역 슬래시 명령어 등록 완료`);
} catch {
  console.error('명령어 등록 실패: 봇 토큰과 네트워크 연결을 확인해주세요.');
  process.exitCode = 1;
}
