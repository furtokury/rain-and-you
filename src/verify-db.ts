import work from './commands/work.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { getSettings, saveSettings } from './settings.js';
// 명시적으로 실행하는 테스트 DB 통합 검증. 임시 서버의 테스트 행만 정리한다.
import { strict as assert } from 'node:assert';
import { isDevelopment } from './env.js';
import { closeDB, getDB } from './db.js';
import { migrate, create, list, change, detail } from './task-store.js';
if (!isDevelopment) throw new Error('테스트 환경에서만 실행할 수 있습니다.');
const access = {userId:'123456789012345678',admin:true};
const guild = `test-${Date.now()}`;
try {
  await migrate();
  assert.equal((await getSettings(guild,access.userId)).enabled,0);
  await assert.rejects(saveSettings(guild,access.userId,{enabled:true}));
  await saveSettings(guild,access.userId,{channel:'123456789',time:'18:30'});
  assert.equal((await getSettings(guild,access.userId)).notification_time,'18:30');
  assert.equal(Number((await getSettings(guild,access.userId)).enabled),0);
  await Promise.all([saveSettings(guild,access.userId,{time:'10:15'}),saveSettings(guild,access.userId,{enabled:false})]);
  const settings = await getSettings(guild,access.userId);
  assert.equal(settings.notification_time,'10:15');
  assert.equal(Number(settings.enabled),0);
  assert.equal(settings.channel_id,'123456789');
  await create(guild,'테스트','곡','2027-01-01','2027-01-04',access.userId);
  const stranger = {userId:'223456789012345678',admin:false};
  const owner = {...access,admin:false};
  assert.equal((await list(guild,stranger)).length,0);
  assert.equal((await list(guild,owner)).length,1);
  const privateTask = (await list(guild,owner))[0];
  await assert.rejects(change(guild,privateTask.id,'완료',stranger));
  await assert.rejects(detail(guild,privateTask.id,stranger));
  await assert.rejects(detail('other',privateTask.id,access));
  assert.equal((await detail(guild,privateTask.id,owner)).creator_id,access.userId);
  await change(guild,privateTask.id,'공유변경',owner,undefined,[stranger.userId]);
  assert.equal((await list(guild,stranger)).length,1);
  assert.deepEqual((await detail(guild,privateTask.id,stranger)).members,[stranger.userId]);
  await change(guild,privateTask.id,'연기',stranger,'2027-01-05');
  await change(guild,privateTask.id,'공유변경',stranger,undefined,[]);
  assert.equal((await list(guild,stranger)).length,0);
  await assert.rejects(detail(guild,privateTask.id,stranger));
  assert.equal((await list('other',access)).length,0);
  await getDB()`UPDATE tasks SET creator_id=NULL WHERE guild_id=${guild}`;
  assert.equal((await list(guild,owner)).length,0);
  assert.equal((await list(guild,access)).length,1);
  assert.equal((await getSettings(guild,stranger.userId)).notification_time,null);
  assert.equal((await getSettings('other',access.userId)).channel_id,null);
  await saveSettings(guild,access.userId,{enabled:true});
  assert.equal(Number((await getSettings(guild,access.userId)).enabled),1);
  const [task] = await list(guild,access);
  assert.ok(task);
  await assert.rejects(create(guild,'테스트','곡','2027-01-01','2027-01-15',access.userId));
  await assert.rejects(change(guild,task.id,'연기',access,'2027-01-03'));
  await assert.rejects(change('other',task.id,'완료',access));
  await change(guild,task.id,'연기',access,'2027-01-15');
  assert.equal((await list(guild,access))[0].due_date,'2027-01-15');
  await change(guild,task.id,'마감일변경',access,'2027-01-02');
  await change(guild,task.id,'완료',access);
  assert.equal((await detail(guild,task.id,access)).status,'completed');
  assert.equal((await list(guild,access,true)).length,1);
  assert.equal((await list(guild,access)).length,0);
  await assert.rejects(create(guild,'테스트','곡','2027-01-01','2027-01-15',access.userId));
  await create(guild,'테스트','곡','2027-01-02','2027-01-15',access.userId);
  await change(guild,(await list(guild,access))[0].id,'취소',access);
  assert.equal((await list(guild,access)).length,0);
  async function runCommand(action: string, values: Record<string,string>) {
    const replies: string[] = [];
    await work.execute({
      guildId:guild,guild:{members:{fetch:async () => ({user:{bot:false}})}},user:{id:access.userId},memberPermissions:{has:() => true},
      options:{getSubcommand:() => action,getString:(key:string) => values[key] ?? null},
      deferReply:async () => {},
      editReply:async (reply:{content:string}) => { replies.push(reply.content); },
      followUp:async (reply:{content:string}) => { replies.push(reply.content); },
    } as unknown as ChatInputCommandInteraction);
    assert.equal(replies.length,1);
    return replies[0];
  }
  await runCommand('생성',{'의뢰자명':'회귀검증','곡제목':'남은곡','지정인원':'223456789012345678 323456789012345678','착수일':'2027-02-01','마감':'14'});
  await runCommand('생성',{'의뢰자명':'회귀검증','곡제목':'완료할곡','착수일':'2027-02-01','마감':'3'});
  const active = await list(guild,access);
  const shared = active.find(t => t.song_title === '남은곡')!;
  assert.equal((await detail(guild,shared.id,access)).members.length,2);
  const detailedReply = await runCommand('상세',{'프로젝트':shared.id});
  assert.ok(detailedReply.includes('생성한 사람: <@123456789012345678>'));
  assert.ok(detailedReply.includes('<@323456789012345678>'));
  const completed = active.find(t => t.song_title === '완료할곡')!;
  const reply = await runCommand('완료',{'프로젝트':completed.id});
  assert.ok(reply.includes('작업 완료 처리했습니다.'));
  assert.ok(reply.includes('작업 목록 대상: <@123456789012345678>'));
  assert.ok(reply.includes('서버 전체 작업 (관리자)'));
  assert.ok(reply.includes('남은곡'));
  assert.ok(!reply.includes('완료할곡'));
  const remaining = (await list(guild,access))[0];
  const cancelled = await runCommand('취소',{'프로젝트':remaining.id});
  assert.ok(cancelled.includes('현재 미완료 작업이 없습니다.'));
  assert.ok(!cancelled.includes('남은곡'));
  console.log('DB 통합 검증 통과 (중복, 아카이브, 변경, 서버 분리, 처리 후 응답)');
} finally {
  await getDB()`DELETE FROM task_members WHERE task_id IN (SELECT id FROM tasks WHERE guild_id=${guild})`;
  await getDB()`DELETE FROM tasks WHERE guild_id=${guild}`;
  await getDB()`DELETE FROM personal_settings WHERE guild_id=${guild}`;
  await closeDB();
}
