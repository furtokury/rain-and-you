export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`.env에 ${name}을 설정해주세요.`);
  return value;
}
