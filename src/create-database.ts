import { SQL } from 'bun';
import { getDatabaseConfig } from './env.js';
const { database, ...config } = getDatabaseConfig();
const db = new SQL({ adapter:'mysql', ...config });
try {
  await db.unsafe(`CREATE DATABASE IF NOT EXISTS \`${database.replace(/`/g,'``')}\` CHARACTER SET utf8mb4`);
  console.log('환경별 데이터베이스 준비 완료');
} finally { await db.close(); }
