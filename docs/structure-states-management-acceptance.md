# 구조 상태 표시·보기 관리 취소 수용 — 2026-10-05

격리된 VS Code 1.140.0 개발 호스트에서 실제 화면을 확인했다. 제품 코드 변경은 없으며 회귀 테스트와 개발 검증 fixture를 추가했다. 실제 사용자 설정/프로젝트, 도구 설치, VSIX는 변경하지 않았다.

## 확인 결과

| 확인 | 결과 | 근거 범위 |
|---|---|---|
| 구조 X/Z | 값 열 `0xXX`, `0xZZ` | 실제 parser + mapTracePorts + renderStructure로 구성한 합성 UI fixture |
| 미기록 포트 | `Not recorded` | 같은 합성 fixture의 정확한 선언 누락 |
| 모호한 경로 | `Ambiguous path` | 같은 경로의 서로 다른 VCD channel 두 개 |
| 폭 불일치 | `Width mismatch` | semantic 입력 8bit/VCD 선언 4bit |
| 지원 제한 | `Unsupported type` | real 선언을 integral port에 연결할 수 없음 |
| 문구 읽기 | SVG에서는 긴 문구가 축약되고 아래 표에서는 여섯 상태의 전체 문구 표시 | 실제 화면 스크롤로 확인 |
| 기본 지정·해제 | 별표/Default ✓ → 별표 없음/Use as default, 현재 두 신호·11ns 유지 | 기존 검증용 보기의 실제 버튼 입력 |
| 이름 변경 취소 | 다른 이름 입력 후 Escape → 기존 이름 유지 | 실제 입력 + 전체 storage 불변 회귀 |
| 덮어쓰기 취소 | 동일 이름 저장의 Replace/Cancel 확인창 → Cancel, 원래 보기·두 신호·11ns 유지 | 실제 확인창 + 전체 storage 불변 회귀 |
| 삭제 취소 | Delete/Cancel 확인창 → Cancel, 원래 보기·두 신호·11ns 유지 | 실제 확인창 + 전체 storage/default 불변 회귀 |

삭제를 확정하는 물리 입력은 하지 않았다. 실제 삭제 성공 경로는 기존 자동 호스트 검증 근거를 유지하며 이번 수용으로 확대하지 않는다. 기본 지정은 격리 프로필의 검증용 보기에서만 잠시 설정했고 해제했다.

## 합성 fixture의 정직한 경계

검증 실행기는 `.dev/prepare-structure-state-ui.mjs`이며 `.dev/structure-state-ui.cjs`를 VS Code extensionTestsPath로 연다. 화면 제목은 Synthetic structure states, 프로젝트/상태 문구는 “SYNTHETIC UI FIXTURE — no simulator run / no simulation or archive verification”다. recorded 렌더링 분기를 검사하기 위해 presentation context를 전달하지만 실제 TestResult, inputSnapshot, traceIdentity 또는 native 성공 결과를 만들거나 기존 결과를 바꾸지 않는다. 실제 slang elaboration/보존 파일 검증/시뮬레이터 실행과 연동된 X/Z 수용은 아니다.

`.dev/structure-state-ui-model.json`에는 실제 파서/매핑 결과와 여섯 셀 값이 있다. 화면 관찰을 보완하기 위해 `tests/structure-host.test.ts`에서 실제 등록된 구조 호스트를 모의 recorded provider/trace로 실행한다. 정확히 일치한 X/Z 두 채널만 조회하고 미기록/모호함/폭/타입 오류의 channel을 조회하지 않는지, trace invalidation 후 여섯 상태 모두 Unavailable로 바뀌는지 검사했다. 이것 역시 native archive 검증을 대신하지 않는다.

준비 과정 첫 시도는 fixture의 필수 connection 필드 누락으로 exit1, 다음 시도는 current 표시 모드여서 값 열이 없는 준비 창이었다(exit0). fixture의 connection과 recorded presentation을 보완한 최종 창에서 위 여섯 상태를 확인했다. 두 준비 시도를 제품 결함/실패 수용/성공 검증 개수로 세지 않는다.

## 검증 기록

- 최종 관련 자동 **28 PASS / 0 fail / 0 skip**: `.dev/structure-management-final-regression.log`. 이전 27개에 구조 호스트 상태 경계 1개를 추가했다. 보기 관리 테스트의 취소 assertion도 강화했다.
- 집중 중간 실행17개는 최종28개와 중복이며 합산하지 않는다: `.dev/structure-state-regression.log`.
- 타입 검사 `tsc --noEmit`, 개발 빌드 `scripts/build.mjs` exit0.
- 최종 합성 구조 창: `.dev/structure-state-ui-final-host.log` exit0.
- 실제 보기 관리 창: `.dev/view-management-cancel-ui-host.log` exit0.
- 준비 실패 이력: `.dev/structure-state-ui-host.log` exit1; 표시 모드 준비 창 `.dev/structure-state-ui-fixed-host.log` exit0.
- 구조화 수용 기록: `.dev/structure-states-management-acceptance.json`.

## 남은 범위와 다음 순서

구조 상태의 합성 컴포넌트 화면 확인과 보기 관리 취소/기본 해제 경계는 이번 범위에서 완료다. 실제 기록 자료의 X/Z/미기록/모호함 종단 수용, 물리 삭제 확정 경로는 별도다. 삭제 취소와 자동 삭제 성공을 혼동하지 않는다.

다음 실행은 파형 loading 취소·재열기 및 두 reader 메모리 회수의 실제 호스트 관측이다. 이전 worker16/16 종료·RSS plateau 근거는 유지하지만 원래 메모리 수준으로 회수되거나 실제 대표 설계에 적합하다고 선언하지 않는다. 실제 사용자 프로필 충돌 및 대표 실제 설계 경로 기반 수용도 남는다. 별도 PC/VM이 없으므로 깨끗한 Windows는 보류한다. 큰 검증3묶음 + OS 보류1이며 전체 A3/F 완료·배포 준비 완료가 아니다.
