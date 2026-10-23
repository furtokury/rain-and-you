import { migrate } from './task-store.js';
import { closeDB } from './db.js';
try { await migrate(); console.log('작업 관리 테이블 준비 완료'); }
catch (error) { console.error('DB 초기화 실패:', error); process.exitCode = 1; }
finally { await closeDB(); }
