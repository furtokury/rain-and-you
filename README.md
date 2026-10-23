# rain-and-you

discord.js + TypeScript로 만든 작은 디스코드 봇입니다.
[mountain](https://github.com/junhg0211/mountain)의 명령어별 `data` / `execute` 구성을 참고했습니다.
웹사이트 없이 봇만 실행하며, MySQL/MariaDB 연결 예제를 포함합니다.

## 시작하기

Bun 1.3.10 이상을 사용합니다. 개발과 배포 모두 Bun이 TypeScript를 직접 실행합니다. discord.js는
14.26.4로 고정했습니다.

```sh
bun install
```

1. [Discord Developer Portal](https://discord.com/developers/applications)에서 앱을 만들고 **Bot**
   메뉴에서 토큰을 발급합니다.
2. 프로젝트 루트의 `.env`를 설정합니다. 이미 있다면 아래 누락된 항목만 추가하세요. `.env.example`은
   양식입니다.

   ```dotenv
   DISCORD_BOT_TOKEN=봇_토큰
   DISCORD_BOT_TEST_TOKEN=테스트_봇_토큰

   DATABASE_HOST=localhost
   DATABASE_PORT=3306
   DATABASE_USER=DB_사용자
   DATABASE_PASS=DB_비밀번호
   DATABASE_NAME=운영_DB_이름
   DATABASE_TEST_NAME=테스트_DB_이름
   ```

   앱 ID는 봇 토큰으로 자동 조회합니다. 서버 ID는 필요 없습니다. `.env`는 Git에서 제외됩니다. 테스트
   봇은 별도 Discord 앱으로 만들어 같은 방식으로 서버에 초대하세요.

3. 앱의 **OAuth2 → URL Generator**에서 `bot`, `applications.commands`를 선택하고 **Send Messages**
   권한을 선택합니다. 생성한 URL로 테스트 서버에 봇을 초대합니다. 서버에 앱을 추가할 권한이
   필요합니다. Privileged Gateway Intents나 웹 서버, Interactions Endpoint URL 설정은 필요 없습니다.
4. 명령어를 등록하고 봇을 실행합니다.

   ```sh
   bun run deploy:commands:dev
   bun run dev
   ```

5. 테스트 서버에서 `/ping` 또는 `/echo message:안녕`을 입력합니다. 봇 프로세스가 실행 중이어야
   응답합니다. `Ctrl+C`로 종료합니다.

명령어는 전역으로 등록되어 봇이 설치된 모든 서버에서 사용할 수 있습니다. Discord에 변경 사항이
반영되기까지 시간이 걸릴 수 있습니다. 등록 시 이 앱의 전역 명령어 목록 전체를 코드의 목록으로
교체합니다. 봇 실행 시에는 자동으로 등록하지 않습니다.

| 실행            | 봇 토큰                  | DB 이름              |
| --------------- | ------------------------ | -------------------- |
| `bun run dev`   | `DISCORD_BOT_TEST_TOKEN` | `DATABASE_TEST_NAME` |
| `bun run start` | `DISCORD_BOT_TOKEN`      | `DATABASE_NAME`      |

개발용 값이 없을 때 운영용 값으로 대체하지 않습니다. 명령어 등록도 테스트 봇은
`bun run deploy:commands:dev`, 운영 봇은 `bun run deploy:commands`로 구분합니다.

## 데이터베이스 예제

MySQL/MariaDB에 운영 DB와 테스트 DB를 미리 생성하고 사용자 접근 권한을 설정하세요.
호스트·포트·사용자·비밀번호는 공통으로 사용하고, DB 이름만 실행 환경에 따라 선택합니다. 테스트 DB는
운영 DB와 다른 이름을 지정하세요.

`/db`를 실행하면 선택된 DB 이름, DB 서버 시간, 요청 사용자 ID를 본인에게만 보여줍니다. 별도
테이블이나 초기화 작업이 필요 없는 읽기 전용 예제입니다. DB 연결은 처음 사용하는 시점에 생성하므로
`/ping`, `/echo`, 명령어 등록에는 DB 설정이 필요하지 않습니다.

SQL은 `src/commands/db.ts`에서, 공통 연결은 `src/db.ts`에서 작성하면 됩니다. Bun의 SQL 태그 안에서
`${value}`를 사용하면 값을 안전하게 바인딩합니다.

## 어디서 코딩하면 되나요?

```text
src/
  index.ts             # 로그인, 이벤트 처리, 명령어 실행과 오류 처리
  env.ts               # 필수 환경 변수 검사 (.env는 Bun이 자동 로딩)
  db.ts                # 환경별 MySQL/MariaDB 연결과 종료
  deploy-commands.ts   # Discord에 명령어 목록 등록
  commands/
    types.ts           # 공통 Command 타입
    index.ts           # 사용할 명령어 목록
    ping.ts            # 가장 단순한 응답 예제
    echo.ts            # 문자열 옵션을 받는 예제
    db.ts              # DB 조회와 SQL 매개변수 예제
```

**먼저 `src/commands/ping.ts`의 `execute()` 안에서 응답 문구를 바꿔보세요.** 개발 모드에서는
저장하면 봇이 재시작됩니다. 응답 처리 코드만 바꿀 때는 명령어를 다시 등록하지 않아도 됩니다.

새 명령어를 추가하려면:

1. `ping.ts`를 복사해서 `src/commands/hello.ts`를 만듭니다.
2. `data`의 이름을 `hello`로 바꾸고 설명과 `execute()` 내용을 작성합니다.
3. `src/commands/index.ts`에서 import하고 `commands` 배열에 추가합니다.
4. `bun run deploy:commands:dev`를 다시 실행합니다. 이름·설명·옵션 변경이나 명령어 삭제 시에도 다시
   등록해야 합니다.

기존 예제의 `.js` 상대 import는 Bun이 해당 `.ts` 파일로 해석합니다.

Discord에는 3초 안에 최초 응답을 보내야 합니다. 오래 걸리는 작업은 먼저 대기 응답을 보내고 완료 시
수정하세요.

```ts
async execute(interaction) {
  await interaction.deferReply();
  // API 요청 등 시간이 걸리는 작업
  await interaction.editReply('처리 완료!');
}
```

## 검사와 일반 실행

```sh
bun run check   # 타입 검사
bun run start   # Bun으로 봇 실행
```

배포 서버에 Bun을 설치하고 소스와 `bun.lock`을 올린 뒤 아래처럼 실행합니다. `.env` 또는 서버 환경
변수에 운영 토큰과 DB 설정을 넣으세요. 별도 빌드는 필요 없습니다.

```sh
bun install --frozen-lockfile --production
bun run start
```

명령어 목록을 변경했다면 `bun run deploy:commands`도 실행하세요.

## 응답이 없을 때

- `/ping`이 안 보이면 초대 범위를 확인하고 명령어를 다시 등록한 뒤 반영을 기다립니다.
- 명령어가 보이지만 응답이 없으면 봇 실행 터미널의 로그인 로그와 오류를 확인합니다.
- 로그인에 실패하면 Developer Portal에서 발급한 Bot Token인지 확인합니다.

참고: [discord.js v14 문서](https://discord.js.org/docs/packages/discord.js/14.26.4),
[Discord 앱 명령어 문서](https://docs.discord.com/developers/interactions/application-commands).
