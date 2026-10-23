import { describe, expect, test } from 'bun:test';
import { date, deadline, messages, today, label, autocompleteLabel, type Task } from './tasks.js';
import work from './commands/work.js';
describe('작업 날짜와 목록', () => {
  test('KST 자정 경계', () => {
    expect(today(new Date('2026-10-22T14:59:59Z'))).toBe('2026-10-22');
    expect(today(new Date('2026-10-22T15:00:00Z'))).toBe('2026-10-23');
  });
  test('달력 날짜, 미래 착수, 숫자와 프리셋', () => {
    expect(deadline('2028-02-27','빠른마감')).toBe('2028-03-01');
    expect(deadline('2026-12-25','일반마감')).toBe('2027-01-08');
    expect(deadline('2026-12-25','0')).toBe('2026-12-25');
    expect(() => date('2026-02-30')).toThrow();
    expect(() => deadline('2026-10-23','-1')).toThrow();
    expect(() => deadline('2026-10-23','1.5')).toThrow();
  });
  test('D값 내림차순과 번호, 긴 목록 분할', () => {
    const tasks: Task[] = ['2026-11-06','2026-10-26','2026-10-23','2026-10-21'].map((due_date,i) => ({id:String(i),client_name:'의뢰인',song_title:'곡',start_date:'2026-10-01',due_date}));
    const content = messages(tasks,'2026-10-23').join('\n');
    expect(content.match(/\*\*(.*?)\*\*/g)).toEqual(['**D+2**','**D±0**','**D-3**','**D-14**']);
    const chunks = messages(Array.from({length:100},(_,i) => ({...tasks[0],id:String(i),song_title:'곡'.repeat(100)})));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(c => c.length <= 1900)).toBe(true);
    expect(chunks.join('\n')).toContain('100.');
    expect(messages([])).toEqual(['현재 미완료 작업이 없습니다.']);
  });
  test('명령어 구조와 자동완성', () => {
    const body = work.data.toJSON();
    expect(body.options?.map(o => o.name)).toEqual(['생성','확인','연기','마감일변경','완료','취소','목록','추가','파기','중단']);
  });
});

test('자동완성에 착수·마감 날짜와 요일을 보존한다', () => {
  const task = {id:'1',client_name:'의뢰인',song_title:'곡',start_date:'2026-10-22',due_date:'2026-10-25'};
  expect(label(task)).toBe('의뢰인 - 곡 (착수 2026-10-22 목, 마감 2026-10-25 일)');
  const long = autocompleteLabel({...task, song_title:'긴곡제목'.repeat(100)});
  expect(long.length).toBeLessThanOrEqual(100);
  expect(long).toContain('마감 2026-10-25 일');
  expect(long).toContain('착수 2026-10-22 목');
});
