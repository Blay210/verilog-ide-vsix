# 구조 탐색·파형 예외·저장 보기 추가 수용 — 2026-10-05

VS Code 1.140.0의 격리된 지속 저장 개발 프로필에서 실제 마우스/키 입력을 확인했다. 제품 코드 변경은 저장 보기 목록의 같은 테스트 탭 간 갱신에 한정한다. 패키징/VSIX 설치, 실제 사용자 프로필 변경, 새 도구 설치는 하지 않았다.

## 실제 확인 범위

| 항목 | 관찰 결과 | 판정 |
|---|---|---|
| 보존 구조 내부 탐색 | 이전 실제 PASS run `241f290f-a1f6-4322-90d7-cbf38adba3e9`의 top 카드에서 DUT를 더블 클릭하면 `counter_basic_tb/dut`로 이동하고 Up이 활성화됨 | 통과 |
| Up | 실제 버튼 클릭으로 top으로 돌아오며 top에서는 Up이 비활성화됨 | 통과 |
| 합성 VCD X | 6ns에서 clk X/count `0xXX`, X 구간의 별도 표시 | 통과, 독립 파형에 한정 |
| 합성 VCD Z | 11ns에서 clk Z/count `0xZZ`, Z 구간의 별도 표시 | 통과, 독립 파형에 한정 |
| 독립 파형 격리 | “Standalone or older waveform” 안내. 합성 파형 6/11ns 이동에도 실제 보존 구조는 0ps/end41ns 유지 | 통과 |
| 보기 이름 변경 | `검증용 XZ 두 신호`를 `검증용 누락 신호`로 바꿔도 두 신호 유지 | 통과 |
| 누락 신호 | count가 없는 파형에서 해당 보기 선택 시 clk만 표시하고 “1 missing signal(s) — retained in saved view” 안내 | 통과 |
| 누락 경로 보존 | 누락 상태에서 새 `검증용 누락 보존 사본` 저장. 완전한 파형에서 해당 사본 선택 시 clk/count 두 신호 복원 | 통과 |
| 다른 탭의 저장 변경 | 수정 전에는 Reload까지 새 보기 목록이 보이지 않음. 수정 후 누락 파형에서 `검증용 실시간 목록` 저장 → 이미 열려 있던 완전한 파형 탭에 Reload 없이 나타남 | 결함 보완 후 통과 |
| 현재 상태 보존 | 수정 후 원래 탭의 `검증용 누락 보존 사본` 선택, 두 신호, 11ns 유지 | 통과 |

첫 개발 창과 수정 후 재시작 창 모두 정상 exit0. 화면 관찰을 기록한 수용 결과이며 자동 이미지 비교 결과는 아니다.

## 결함 A3-WAVE-VIEW-SYNC-1

`waveform.ts`는 저장 변경 결과를 변경한 탭에만 전달하여 같은 테스트의 다른 run 탭에는 오래된 목록이 남았다. 같은 확장 호스트 안에서 테스트 키가 일치하는 살아 있는 패널에 `viewsChanged`를 전달하고 패널 종료 시 구독을 제거했다. 웹뷰는 목록만 갱신한다. 다른 탭에서 기본 보기를 바꾸더라도 현재 신호/스타일/범위/커서를 강제로 적용하지 않는다. 선택한 보기가 삭제되면 현재 표시를 유지하며 Custom으로 전환한다.

호스트 회귀는 이미 열린 peer의 즉시 갱신, standalone 제외, 닫힌 패널 제외를 검사한다. 실제 웹뷰 실행 회귀는 이름/기본 목록 갱신, 현재 선택/커서/신호 유지, peer 삭제 후 Custom 전환, 새 파형 요청이 발생하지 않음을 검사한다. 삭제/취소 경로는 자동 검증 근거이며 이번 물리 UI에서 삭제를 실행한 것으로 세지 않는다. 별도 VS Code 창/확장 호스트 사이의 실시간 통지는 이번 범위가 아니다.

## fixture와 증거

- 준비: `.dev/prepare-wave-edge-fixtures.mjs`.
- 프로젝트: `.dev/vscode-tests/run-rQSqPW/project-peer`.
- 격리 프로필: `.dev/vscode-tests/run-rQSqPW/profile`.
- 합성 입력: `.rtl/runs/ui-wave-edge-full/wave.vcd`와 `ui-wave-edge-missing/wave.vcd`.
- 두 fixture의 result.json은 저장 보기를 테스트와 연관 짓는 최소 name/top/directory/waveform만 갖는다. `fixture_note`로 합성 자료임을 명시하며 성공 상태/runId/보존 입력/traceIdentity를 만들지 않는다. 실제 native run 파일은 수정하지 않았다.
- 최종 실제 run의 VCD SHA256/크기가 기록된 traceIdentity와 일치하는지 수용 JSON 생성 시 다시 검사한다. 이것은 전후 전체 디렉터리 비교가 아니다.
- 수정 전 관련 회귀: `.dev/structure-edge-regression.log` — 25 PASS.
- 수정 후 집중 회귀: `.dev/structure-edge-view-sync-regression.log` — 7 PASS.
- 최종 관련 회귀: `.dev/structure-edge-final-regression.log` — 27 PASS/0 fail/skip. 위 반복 실행 개수를 합산하지 않는다.
- 타입 검사 `tsc --noEmit`, 개발 빌드 `scripts/build.mjs` exit0.
- 개발 창 로그: `.dev/structure-edge-ui-host.log`, `.dev/structure-edge-view-sync-ui-host.log` — 모두 exit0.
- 구조화 기록: `.dev/structure-wave-edge-ui-acceptance.json`.

## 남은 검증과 재개

독립 합성 파형의 X/Z를 실제 보존 구조 포트 X/Z 수용으로 대체하지 않는다. 구조 X/Z·미기록/모호한 연결의 실제 화면, 저장 보기 관리의 물리 취소/삭제·기본 해제 등 아직 직접 확인하지 않은 세부 경계는 남는다. 해당 경계의 자동 회귀와 물리 수용을 구분한다.

다음은 구조 미기록/모호한 연결 및 남은 관리 예외를 범위에 맞는 검증 fixture로 확인하고, 실제 사용자 프로필 충돌과 loading 취소/두 reader 메모리 회수를 이어간다. 실제 대표 설계 경로는 아직 제공되지 않았다. 깨끗한 Windows는 별도 PC/VM이 없어 보류다. 현재 큰 검증 3묶음 + OS 보류1을 유지하며 전체 A3/F 완료로 선언하지 않는다. 파형 UX 개선은 검증 후 사용자의 피드백을 받는다.

재개 시 실제 run을 조작해 X/Z를 꾸미지 말 것. 합성 화면 수용이 필요하면 별도 검증 자료임을 명시하고 보존 실행 성공/검증된 trace처럼 기록하지 말 것. 검증용 저장 보기 세 개는 격리 프로필에 남겨 재현에 사용하며 사용자 기본 보기에는 지정하지 않았다.
