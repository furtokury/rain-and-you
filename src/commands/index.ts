import ping from './ping.js';
import echo from './echo.js';
import db from './db.js';
import type { Command } from './types.js';

// 새 명령어를 import한 뒤 아래 배열에 추가하세요.
export const commands: Command[] = [ping, echo, db];
export const commandMap = new Map(commands.map((command) => [command.data.name, command]));
