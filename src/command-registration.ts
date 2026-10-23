import {
  ApplicationCommandType,
  type RESTGetAPIApplicationCommandsResult,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  type RESTPutAPIApplicationCommandsJSONBody,
} from "discord.js";

export function buildCommandBody(
  slashCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[],
  existingCommands: RESTGetAPIApplicationCommandsResult,
): RESTPutAPIApplicationCommandsJSONBody {
  // Bulk overwrite 대상에는 Discord가 자동 생성한 Activity Entry Point도 포함됩니다.
  const entryPoints = existingCommands
    .filter((command) => command.type === ApplicationCommandType.PrimaryEntryPoint)
    .map((command) => ({
      type: command.type,
      name: command.name,
      name_localizations: command.name_localizations,
      description: command.description,
      description_localizations: command.description_localizations,
      handler: command.handler,
      integration_types: command.integration_types,
      contexts: command.contexts ?? undefined,
      default_member_permissions: command.default_member_permissions,
      nsfw: command.nsfw,
    }));
  return [...slashCommands, ...entryPoints];
}
