import settings from './settings.js';
import work from './work.js';
import type { Command } from './types.js';

export const commands: Command[] = [work, settings];
export const commandMap = new Map(commands.map((command) => [command.data.name, command]));
