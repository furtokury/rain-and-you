import { getDB } from './db.js';
import { InputError, type Task } from './tasks.js';
export async function migrate() {
  const db = getDB();
  await db`CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id VARCHAR(20) PRIMARY KEY, channel_id VARCHAR(20) NULL,
    notification_time CHAR(5) NOT NULL DEFAULT '09:00', enabled BOOLEAN NOT NULL DEFAULT FALSE
  )`;
  await db`CREATE TABLE IF NOT EXISTS guild_notifications (
    guild_id VARCHAR(20) NOT NULL, notification_date CHAR(10) NOT NULL,
    sent BOOLEAN NOT NULL DEFAULT FALSE, claimed_at BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, notification_date)
  )`;
  await db`CREATE TABLE IF NOT EXISTS tasks (
    id CHAR(36) PRIMARY KEY, guild_id VARCHAR(20) NOT NULL,
    client_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    song_title VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    start_date CHAR(10) NOT NULL, due_date CHAR(10) NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'active',
    UNIQUE KEY task_identity (guild_id, client_name, song_title, start_date),
    KEY active_tasks (guild_id, status, due_date)
  ) CHARACTER SET utf8mb4`;
  await db`CREATE TABLE IF NOT EXISTS task_notifications (
    channel_id VARCHAR(20) NOT NULL, notification_date CHAR(10) NOT NULL,
    sent BOOLEAN NOT NULL DEFAULT FALSE, claimed_at BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (channel_id, notification_date)
  )`;
}
export async function list(guild: string): Promise<Task[]> {
  return await getDB()`SELECT id, client_name, song_title, start_date, due_date FROM tasks WHERE guild_id=${guild} AND status='active' ORDER BY due_date, start_date, id`;
}
export async function create(guild: string, client: string, song: string, start: string, due: string) {
  try {
    await getDB()`INSERT INTO tasks (id,guild_id,client_name,song_title,start_date,due_date) VALUES (${crypto.randomUUID()},${guild},${client},${song},${start},${due})`;
  } catch (error) {
    if ((error as {errno?:number;code?:string}).errno === 1062 || (error as {code?:string}).code === 'ER_DUP_ENTRY') throw new InputError('같은 의뢰자명·곡 제목·착수일의 작업이 이미 있습니다. 완료·취소 기록도 확인해주세요.');
    throw error;
  }
}
export async function change(guild: string, id: string, action: string, due?: string) {
  const db = getDB();
  return db.begin(async tx => {
    const rows = await tx`SELECT id, client_name, song_title, start_date, due_date FROM tasks WHERE guild_id=${guild} AND id=${id} AND status='active' FOR UPDATE`;
    const task = rows[0] as Task | undefined;
    if (!task) throw new InputError('미완료 작업을 자동완성 목록에서 다시 선택해주세요.');
    if (due) {
      if (due < task.start_date) throw new InputError('마감일은 착수일보다 빠를 수 없습니다.');
      if (action === '연기' && due <= task.due_date) throw new InputError('연기할 날짜는 기존 마감일보다 뒤여야 합니다.');
      await tx`UPDATE tasks SET due_date=${due} WHERE id=${id} AND guild_id=${guild}`;
    } else {
      const status = action === '완료' ? 'completed' : 'cancelled';
      await tx`UPDATE tasks SET status=${status} WHERE id=${id} AND guild_id=${guild}`;
    }
    return task;
  });
}
