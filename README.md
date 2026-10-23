# rain-and-you

Bun + discord.js + MySQL/MariaDB 기반 서버 공용 작업 관리 봇.
기능과 입력 규칙은 [지침서](docs/BOT_SPEC.md)를 참조하세요.

## 설정

Bun 1.3.10 이상에서 `bun install --frozen-lockfile`을 실행합니다.
`.env.example`을 참고해 `.env`에 토큰과 DB 연결 정보를 설정합니다.

| 환경 | 토큰 | DB | 알림 채널 |
| --- | --- | --- | --- |
| 테스트 | DISCORD_BOT_TEST_TOKEN | DATABASE_TEST_NAME | DISCORD_TEST_NOTIFICATION_CHANNEL_ID |
| 운영 | DISCORD_BOT_TOKEN | DATABASE_NAME | DISCORD_NOTIFICATION_CHANNEL_ID |

DB 연결의 DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASS는 공통입니다.
테스트와 운영 DB는 다른 이름을 사용하세요. DB 자체와 사용자 권한은 미리 준비해야 합니다. DB 생성 권한이 있다면 `NODE_ENV=development bun src/create-database.ts` (테스트) 또는 `NODE_ENV=production bun src/create-database.ts` (운영)로 DB를 준비할 수 있습니다.
봇 시작 시 tasks, task_notifications 테이블을 없을 때만 생성합니다. 기존 테이블이나 데이터를 삭제하지 않습니다.

```sh
bun run db:migrate:test
bun run deploy:commands:dev
bun run dev
```

운영에서는 다음을 실행합니다.

```sh
bun run db:migrate
bun run deploy:commands
bun run start
```

명령어 등록은 기존 예제 명령어를 `/작업`, `/설정`으로 교체하며 Activity Entry Point는 보존합니다.
봇 초대에 bot, applications.commands 범위와 채널 보기, 메시지 보내기 권한이 필요합니다.
기본 명령어 권한은 서버 관리 권한입니다. 서버 설정 → 연동 → 봇에서 두 계정에 명령어 사용 권한을 부여하세요.
서버별 목록을 공유하며 DM은 지원하지 않습니다.

## 사용

- `/작업 생성`: 착수일 생략 시 KST 기준 오늘로 설정합니다. 마감 필드에서 빠른마감/일반마감 자동완성 선택 또는 일수 직접 입력
- `/작업 확인`: 미완료 전체 목록
- `/작업 연기`: 기존보다 뒤인 마감일 지정
- `/작업 마감일변경`: 마감일 직접 지정
- `/작업 완료`, `/작업 취소`: 기록을 남기고 목록에서 제외

프로젝트 필드에 의뢰자명·곡 제목·착수일을 입력해 검색하고 자동완성 후보를 선택합니다.
최대 25개 후보를 표시하므로 찾는 항목이 없으면 검색어를 구체화하세요.
`/설정 확인`으로 현재 알림 설정을 확인합니다. 본인에게만 표시됩니다.
`/설정 변경 채널:#작업알림 시각:18:30`으로 채널과 매일 발송 시각(KST)을 설정합니다.
시각은 HH:mm 형식이며 기본값은 09:00입니다. 채널 지정 시 알림이 켜집니다.
`/설정 변경 알림:False`로 끄고 `알림:True`로 다시 켭니다. 생략한 옵션은 유지됩니다.
설정은 서버별로 DB에 저장되며 재시작 없이 다음 확인 주기부터 적용됩니다.
기존 환경 변수의 채널은 최초 기본값으로만 가져옵니다. 이후에는 `/설정`이 우선합니다.
설정 시각 이후 재시작 시 당일 미전송 알림도 보냅니다. 이미 전송한 날에는 설정을 바꿔도 다시 보내지 않습니다.
30초 주기로 확인하므로 최대 약 30초 지연될 수 있습니다. 계속 실행되는 프로세스가 필요합니다.
성공한 알림은 DB로 중복을 방지합니다. 전송 도중 프로세스가 종료되거나 여러 메시지 중 일부만 실패하면 재시도 시 일부가 중복될 수 있습니다.

## 검증

```sh
bun run check
bun test
bun run test:db # 테스트 DB에 임시 행을 생성하고 검증 후 정리
```

`.env`의 비밀값은 Git에 포함하지 않습니다. 운영 프로세스는 별도 프로세스 관리 도구로 유지하세요.

작업 명령어 별칭: `/작업 목록` = `/작업 확인`, `/작업 추가` = `/작업 생성`, `/작업 파기`·`/작업 중단` = `/작업 취소`. 입력 옵션, 자동완성, 처리 결과는 원래 명령어와 동일합니다.
