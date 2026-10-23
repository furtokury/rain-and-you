import { REST, Routes, type RESTGetAPIOAuth2CurrentApplicationResult, type RESTGetAPIApplicationCommandsResult } from "discord.js";
import { getBotToken } from "./env.js";
import { commands } from "./commands/index.js";
import { buildCommandBody } from "./command-registration.js";

const token = getBotToken();
const rest = new REST({ version: "10" }).setToken(token);

try {
  const application = (await rest.get(
    Routes.oauth2CurrentApplication(),
  )) as RESTGetAPIOAuth2CurrentApplicationResult;
  const route = Routes.applicationCommands(application.id);
  const existingCommands = await rest.get(route, {
    query: new URLSearchParams({ with_localizations: "true" }),
  }) as RESTGetAPIApplicationCommandsResult;
  // Entry Point를 보존하면서 전역 슬래시 명령어 목록을 갱신합니다.
  await rest.put(route, {
    body: buildCommandBody(commands.map((command) => command.data.toJSON()), existingCommands),
  });
  console.log(`${commands.length}개 전역 슬래시 명령어 등록 완료`);
} catch (e) {
  console.error("명령어 등록 실패: 봇 토큰과 네트워크 연결을 확인해주세요.");
  console.error(e);
  process.exitCode = 1;
}
