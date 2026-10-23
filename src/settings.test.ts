import { expect, test } from 'bun:test';
import { isDue, parseTime } from './settings.js';
test('24시간제 시각 검증', () => {
  expect(parseTime('00:00')).toBe('00:00');
  expect(parseTime('23:59')).toBe('23:59');
  for (const value of ['24:00','09:60','9:00','오전 9시','-1:00']) expect(() => parseTime(value)).toThrow();
});
test('KST 분 단위 예약 경계와 당일 보충 전송', () => {
  expect(isDue('09:30',new Date('2026-10-23T00:29:59Z'))).toBe(false);
  expect(isDue('09:30',new Date('2026-10-23T00:30:00Z'))).toBe(true);
  expect(isDue('09:30',new Date('2026-10-23T10:00:00Z'))).toBe(true);
  expect(isDue('09:30',new Date('2026-10-23T15:00:00Z'))).toBe(false);
});

import settings, { formatSettings } from './commands/settings.js';
test('설정 확인은 옵션 없는 조회이고 변경 옵션은 별도 제공한다', () => {
  const options = settings.data.toJSON().options!;
  expect(options.map(o => o.name)).toEqual(['확인','변경']);
  expect('options' in options[0] ? options[0].options?.length ?? 0 : 0).toBe(0);
  expect(formatSettings({guild_id:'1',channel_id:'123',notification_time:'18:30',enabled:1})).toBe('현재 알림 설정\n채널: <#123>\n시각: 18:30 (KST)\n알림: 켜짐');
  expect(formatSettings({guild_id:'1',channel_id:null,notification_time:'09:00',enabled:0})).toContain('채널: 미설정');
});
