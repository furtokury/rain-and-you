import work from './commands/work.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { getSettings, saveSettings } from './settings.js';
// 명시적으로 실행하는 테스트 DB 통합 검증. 임시 서버의 테스트 행만 정리한다.
import { strict as assert } from 'node:assert';
import { isDevelopment } from './env.js';
import { closeDB, getDB } from './db.js';
import { migrate, create, list, change } from './task-store.js';
if (!isDevelopment) throw new Error('테스트 환경에서만 실행할 수 있습니다.');
const guild = `test-${Date.now()}`;
try {
  await migrate();
  assert.equal((await getSettings(guild)).enabled,0);
  await assert.rejects(saveSettings(guild,{enabled:true}));
  await saveSettings(guild,{channel:'123456789',time:'18:30'});
  assert.equal((await getSettings(guild)).notification_time,'18:30');
  assert.equal(Number((await getSettings(guild)).enabled),1);
  await Promise.all([saveSettings(guild,{time:'10:15'}),saveSettings(guild,{enabled:false})]);
  const settings = await getSettings(guild);
  assert.equal(settings.notification_time,'10:15');
  assert.equal(Number(settings.enabled),0);
  assert.equal(settings.channel_id,'123456789');
  await create(guild,'테스트','곡','2027-01-01','2027-01-04');
  const [task] = await list(guild);
  assert.ok(task);
  await assert.rejects(create(guild,'테스트','곡','2027-01-01','2027-01-15'));
  await assert.rejects(change(guild,task.id,'연기','2027-01-03'));
  await assert.rejects(change('other',task.id,'완료'));
  await change(guild,task.id,'연기','2027-01-15');
  assert.equal((await list(guild))[0].due_date,'2027-01-15');
  await change(guild,task.id,'마감일변경','2027-01-02');
  await change(guild,task.id,'완료');
  assert.equal((await list(guild)).length,0);
  await assert.rejects(create(guild,'테스트','곡','2027-01-01','2027-01-15'));
  await create(guild,'테스트','곡','2027-01-02','2027-01-15');
  await change(guild,(await list(guild))[0].id,'취소');
  assert.equal((await list(guild)).length,0);
  async function runCommand(action: string, values: Record<string,string>) {
    const replies: string[] = [];
    await work.execute({
      guildId:guild,
      options:{getSubcommand:() => action,getString:(key:string) => values[key] ?? null},
      deferReply:async () => {},
      editReply:async (reply:{content:string}) => { replies.push(reply.content); },
      followUp:async (reply:{content:string}) => { replies.push(reply.content); },
    } as unknown as ChatInputCommandInteraction);
    assert.equal(replies.length,1);
    return replies[0];
  }
  await runCommand('생성',{'의뢰자명':'회귀검증','곡제목':'남은곡','착수일':'2027-02-01','마감':'14'});
  await runCommand('생성',{'의뢰자명':'회귀검증','곡제목':'완료할곡','착수일':'2027-02-01','마감':'3'});
  const active = await list(guild);
  const completed = active.find(t => t.song_title === '완료할곡')!;
  const reply = await runCommand('완료',{'프로젝트':completed.id});
  assert.ok(reply.startsWith('작업 완료 처리했습니다.'));
  assert.ok(reply.includes('남은곡'));
  assert.ok(!reply.includes('완료할곡'));
  const remaining = (await list(guild))[0];
  const cancelled = await runCommand('취소',{'프로젝트':remaining.id});
  assert.ok(cancelled.includes('현재 미완료 작업이 없습니다.'));
  assert.ok(!cancelled.includes('남은곡'));
  console.log('DB 통합 검증 통과 (중복, 아카이브, 변경, 서버 분리, 처리 후 응답)');
} finally {
  await getDB()`DELETE FROM tasks WHERE guild_id=${guild}`;
  await getDB()`DELETE FROM guild_settings WHERE guild_id=${guild}`;
  await closeDB();
}
