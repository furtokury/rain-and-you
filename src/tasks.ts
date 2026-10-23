import { escapeMarkdown } from 'discord.js';
export class InputError extends Error {}
const DAY = 86_400_000;
export function today(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
}
export function date(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value || value < '1000-01-01')
    throw new InputError('날짜는 실제 존재하는 YYYY-MM-DD 형식으로 입력해주세요.');
  return value;
}
export function deadline(start: string, value: string): string {
  date(start);
  const raw = value.trim();
  const days = raw === '빠른마감' ? 3 : raw === '일반마감' ? 14 : /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(days) || days < 0 || days > 365000) throw new InputError('마감은 빠른마감, 일반마감 또는 0 이상의 정수 일수로 입력해주세요.');
  const result = new Date(Date.parse(start) + days * DAY).toISOString().slice(0, 10);
  return date(result);
}
export interface Task { id: string; client_name: string; song_title: string; start_date: string; due_date: string }
function withWeekday(value: string): string {
  return `${value} ${'일월화수목금토'[new Date(value).getUTCDay()]}`;
}
function dateLabel(task: Task): string {
  return `착수 ${withWeekday(task.start_date)}, 마감 ${withWeekday(task.due_date)}`;
}
export function label(task: Task): string { return `${task.client_name} - ${task.song_title} (${dateLabel(task)})`; }
export function autocompleteLabel(task: Task): string {
  const suffix = ` (${dateLabel(task)})`;
  const prefix = `${task.client_name} - ${task.song_title}`;
  const available = 100 - suffix.length;
  return `${prefix.length > available ? prefix.slice(0, available - 1) + '…' : prefix}${suffix}`;
}
export function messages(tasks: Task[], current = today()): string[] {
  if (!tasks.length) return ['현재 미완료 작업이 없습니다.'];
  const sorted = [...tasks].sort((a,b) => a.due_date.localeCompare(b.due_date) || a.start_date.localeCompare(b.start_date) || a.id.localeCompare(b.id));
  const chunks: string[] = []; let chunk = '';
  sorted.forEach((task, index) => {
    const delta = Math.round((Date.parse(current) - Date.parse(task.due_date)) / DAY);
    const d = delta === 0 ? 'D±0' : `D${delta > 0 ? '+' : ''}${delta}`;
    const safe = (s: string) => escapeMarkdown(s).replace(/[\r\n]/g, ' ');
    const line = `${index + 1}. ${safe(task.client_name)} - ${safe(task.song_title)} (**${d}**, 착수 ${task.start_date}, 마감 ${task.due_date})`;
    if (chunk.length + line.length + 1 > 1900) { chunks.push(chunk); chunk = ''; }
    chunk += (chunk ? '\n' : '') + line;
  });
  if (chunk) chunks.push(chunk);
  return chunks;
}

export function detailMessages(task: Task & {creator_id:string | null; status:string; members:string[]}): string[] {
  const safe = (value: string) => escapeMarkdown(value).replace(/[\r\n]/g, ' ');
  const lines = [
    '**작업 상세**',
    `의뢰자: ${safe(task.client_name)}`,
    `곡 제목: ${safe(task.song_title)}`,
    `상태: ${{active:'미완료',completed:'완료',cancelled:'취소'}[task.status] ?? safe(task.status)}`,
    `착수일: ${withWeekday(task.start_date)} (KST)`,
    `마감일: ${withWeekday(task.due_date)} (KST)`,
    `생성한 사람: ${task.creator_id ? `<@${task.creator_id}>` : '공석 (기존 작업)'}`,
    `지정 인원: ${task.members.length ? task.members.map(id => `<@${id}>`).join(', ') : '없음'}`,
    '접근 권한: 생성한 사람, 지정 인원, 서버 관리자 (Administrator)',
    '가능한 작업: 조회·수정·완료·취소·공유 변경',
    `작업 ID: ${task.id}`,
  ];
  const chunks: string[] = []; let chunk = '';
  for (const line of lines) {
    if (chunk.length + line.length + 1 > 1900) { chunks.push(chunk); chunk = ''; }
    chunk += (chunk ? '\n' : '') + line;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

export function personalMessages(contents: string[], user: string, admin: boolean, title: string): string[] {
  const header = `${title} 대상: <@${user}>\n조회 범위: ${admin ? '서버 전체 작업 (관리자)' : '본인이 접근 가능한 작업'}\n\n`;
  const limit = 2000 - header.length;
  return contents.flatMap(content => {
    const chunks: string[] = [];
    while (content.length > limit) {
      const newline = content.lastIndexOf('\n',limit);
      const end = newline > 0 ? newline : limit;
      chunks.push(header + content.slice(0,end));
      content = content.slice(end + (newline > 0 ? 1 : 0));
    }
    if (content) chunks.push(header + content);
    return chunks;
  });
}
