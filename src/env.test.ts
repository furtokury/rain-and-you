import { expect, test } from 'bun:test';

function readConfig(mode: string, overrides: Record<string, string> = {}) {
  return Bun.spawnSync({
    cmd: [process.execPath, '-e', `
      import { getBotToken, getDatabaseConfig } from './src/env.ts';
      console.log(JSON.stringify({ token: getBotToken(), ...getDatabaseConfig() }));
    `],
    env: {
      ...process.env,
      NODE_ENV: mode,
      DISCORD_BOT_TOKEN: 'production-token',
      DISCORD_BOT_TEST_TOKEN: 'test-token',
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: '3306',
      DATABASE_USER: 'example',
      DATABASE_PASS: ' password with spaces ',
      DATABASE_NAME: 'production_db',
      DATABASE_TEST_NAME: 'test_db',
      ...overrides,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });
}

test('개발 환경은 테스트 토큰과 테스트 DB를 사용한다', () => {
  const result = readConfig('development');
  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout.toString())).toMatchObject({
    token: 'test-token', database: 'test_db', port: 3306,
    password: ' password with spaces ',
  });
});

test('운영 환경은 운영 토큰과 운영 DB를 사용한다', () => {
  const result = readConfig('production');
  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout.toString())).toMatchObject({
    token: 'production-token', database: 'production_db',
  });
});

test('테스트 설정 누락 시 운영 설정으로 대체하지 않는다', () => {
  for (const key of ['DISCORD_BOT_TEST_TOKEN', 'DATABASE_TEST_NAME']) {
    const result = readConfig('development', { [key]: '' });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain(key);
  }
});

test('유효하지 않은 DB 포트를 거부한다', () => {
  for (const port of ['0', '65536', 'abc', '3.5']) {
    const result = readConfig('development', { DATABASE_PORT: port });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain('DATABASE_PORT');
  }
});
