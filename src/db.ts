import { SQL } from 'bun';
import { getDatabaseConfig } from './env.js';

let db: SQL | undefined;

export function getDB(): SQL {
  // 명령어 등록이나 DB를 쓰지 않는 명령어에는 DB 연결이 필요하지 않습니다.
  return db ??= new SQL({
    adapter: 'mysql',
    ...getDatabaseConfig(),
    max: 5,
    connectionTimeout: 10,
    idleTimeout: 30,
  });
}

export async function closeDB(): Promise<void> {
  if (db) await db.close({ timeout: 5 });
  db = undefined;
}
