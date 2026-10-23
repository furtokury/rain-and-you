import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

export interface Command {
  data: {
    name: string;
    toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
  };
  autocomplete?(interaction: AutocompleteInteraction): Promise<void>;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
