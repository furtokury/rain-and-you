import { expect, test } from "bun:test";
import { ApplicationCommandType, EntryPointCommandHandlerType, type RESTGetAPIApplicationCommandsResult } from "discord.js";
import { buildCommandBody } from "./command-registration.js";

const ping = { name: "ping", description: "Ping" };

test("Entry Point가 없으면 슬래시 명령어만 등록한다", () => {
  expect(buildCommandBody([ping], [])).toEqual([ping]);
});

test("Entry Point의 설정을 보존하고 이전 슬래시 명령어는 교체한다", () => {
  const entryPoint = {
    id: "123", application_id: "456", version: "789",
    type: ApplicationCommandType.PrimaryEntryPoint,
    name: "launch", name_localizations: { ko: "실행" },
    description: "Launch activity", description_localizations: { ko: "활동 실행" },
    handler: EntryPointCommandHandlerType.DiscordLaunchActivity,
    default_member_permissions: null,
  };
  const existing: RESTGetAPIApplicationCommandsResult = [
    entryPoint,
    { id: "321", application_id: "456", version: "789",
      type: ApplicationCommandType.ChatInput, name: "old", description: "Old command",
      default_member_permissions: null },
  ];
  const body = buildCommandBody([ping], existing);
  expect(body).toHaveLength(2);
  expect(body[0]).toEqual(ping);
  expect(body[1]).toMatchObject({
    type: entryPoint.type, name: entryPoint.name,
    description: entryPoint.description, handler: entryPoint.handler,
    name_localizations: entryPoint.name_localizations,
    description_localizations: entryPoint.description_localizations,
  });
  expect(body[1]).not.toHaveProperty("id");
  expect(existing).toHaveLength(2);
});
