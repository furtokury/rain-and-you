export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`.env에 ${name}을 설정해주세요.`);
  return value;
}

export const isDevelopment = process.env.NODE_ENV === 'development';

export function getBotToken(): string {
  return requireEnv(isDevelopment ? 'DISCORD_BOT_TEST_TOKEN' : 'DISCORD_BOT_TOKEN');
}

export function getDatabaseConfig() {
  const port = Number(requireEnv('DATABASE_PORT'));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DATABASE_PORT는 1~65535 사이 정수여야 합니다.');
  }
  // 비밀번호의 공백을 보존하고, 빈 비밀번호도 허용합니다.
  const password = process.env.DATABASE_PASS;
  if (password === undefined) throw new Error('.env에 DATABASE_PASS를 설정해주세요.');

  return {
    hostname: requireEnv('DATABASE_HOST'),
    port,
    username: requireEnv('DATABASE_USER'),
    password,
    database: requireEnv(isDevelopment ? 'DATABASE_TEST_NAME' : 'DATABASE_NAME'),
  };
}
