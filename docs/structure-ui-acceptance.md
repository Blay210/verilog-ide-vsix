# 보존 구조·파형 연동 실제 수용 — 2026-10-05

VS Code 1.140.0 격리 지속 저장 개발 프로필에서 실제 키·마우스로 확인했다. 기존 `.dev/rtl-dev`를 재사용했다. 새 native 실행이나 VSIX/설치 없이 이전 정상 실행의 보존 입력과 VCD를 사용했다. 수정 전후 개발 창 모두 정상 종료 exit0, 최종 typecheck/development build 및 관련 회귀31 PASS/0 fail/skip이다.

## 실제 관측

| 항목 | 조작 | 결과 |
|---|---|---|
| 보존 구조 | RTL Start→Show Results→counter_basic 결과→Explore Recorded Structure | run `675e8d02-4d69-4e6e-9430-64d30baad110`, counter_basic_tb와 dut의 2노드 구조 표시; 현재 편집 fixture의 의도적인 진단과 무관하게 보존 입력으로 분석 |
| 내부 탐색 | View inside · dut, Back, Forward | DUT 내부 및 테스트 top 사이 이동; 포트 clk/rst_n/count와 연결 방향 표시 |
| 구조→파형 | DUT Time에 25 ns→Go→Open linked waveform | 같은 run의 cursor A=25 ns; clk=1, rst_n=1, count=0x02 일치 |
| 파형→구조 | 파형 Go에 35 ns→Go | 구조 Time=35 ns, count=0x03으로 갱신; 수정 후 실제 파형 선/커서 표시까지 재확인 |
| 파형만 닫기 | 해당 wave.vcd 탭 닫기→구조 15 ns/Go | 구조 독립 조회 유지, count=0x01; 연결 파형 재열기 시 A=15 ns와 값 복원 |
| 구조만 닫기 | 구조 탭 닫기→파형 35 ns/Go | 파형 독립 조회 유지, count=0x03 |
| 구조 재열기 | RTL Hierarchy의 dut 클릭→안내된 Refresh | 처음은 값 Unavailable 및 재연결 안내; Refresh 후 같은 run의 35 ns와 count=0x03 복구 |
| 다른 run 격리 | 이전 run `e758f959-a3c5-49e4-939c-59dde60aed97` 파형을 열어 5 ns/Go | 이전 파형 A=5 ns, count=0x00; 구조의 run 675e… 시간은35 ns/count=0x03 유지 |
| 정의 소스 이동 | DUT Open definition | 실행 당시 counter.sv 정의 위치 열림; 구조는 보존 소스의 읽기 전용 링크임을 안내. 이번에는 편집 차단 키 입력까지 별도 시험하지 않음 |
| 화면 배치 복구 | 폭 약460px의 파형 화면 및 더 넓은 화면의 Signals 숨기기 | 시간축·세 신호·값·cursor가 계속 표시됨 |

구조가 표시하는 값은 기록된 파형의 관측이다. 내부 연산 모델이나 실시간 simulator stepping을 검증한 것이 아니다. 예제 DUT에는 더 깊은 하위 모듈이 없으며 이에 대한 안내를 확인했다. 실제 double-click/Up 버튼, X/Z·미기록·폭 불일치의 화면 수용은 이번 범위에 포함하지 않았으며 세부 예외 검증에 남긴다.

## 발견 및 보완 — A3-WAVE-LAYOUT-1

수정 전 파형 폭이650px 이하이거나 신호 browser를 숨기면 파형 영역이 보이지 않았다. 값 조회와 접근성 트리의 값은 정상이어도 화면 수용은 실패다. CSS가 browser를 display:none 처리하고 grid의 첫 열을0으로 설정했지만 main은 자동 배치되어 그 열에 들어갔다.

`packages/vscode/src/webview/waveform.css`에서 main을 항상 두 번째 grid 열/첫 행에 배치했다. 정상 폭에서 browser가 표시되는 구성과 좁은/숨김 구성의 같은 계약을 유지한다. 수정 후 실제 좁은 화면에서 ruler/clk/rst_n/count와 값을 확인하고, 넓은 화면의 Signals 버튼으로 browser를 숨겨도 파형이 유지되는 것을 확인했다. Core/parser/trace identity/cursor 계약 변경 없음. 낮은 영향의 CSS 변경에 구현을 그대로 복사한 테스트를 추가하지 않았으며, 실제 화면 재검증과 기존 관련 회귀를 사용했다.

## 근거와 재현

사본 `.dev/vscode-tests/run-execution-jP8yeV/project`, 실행기 RTL_MANUAL_ACCEPTANCE/RTL_MANUAL_PERSISTENT/RTL_MANUAL_RESUME_ROOT. 수정 전 로그 `.dev/structure-ui-host.log`, 수정 후 `.dev/structure-ui-fixed-host.log`, 회귀 `.dev/structure-ui-regression.log`, 관측 요약 `.dev/structure-ui-acceptance.json`이다. 실제 screenshot/accessibility 관측을 자동 host receipt와 혼동하지 않는다.

관련 회귀: structure-host/navigation/view, trace-cursor/links/map, waveform-link-host/webview, waveform-ruler의31개. 전체 suite/실제 slang suite/Verilator suite를 이번에 재실행했다고 하지 않는다. 주 VCD는6신호/15전이/end41 ns,543 bytes이며 종료 후 SHA256이 result.traceIdentity와 일치했다(`db9f0f7eaafabfebce7fb23de8f9db179791769cb822520c7ffb5412594486b8`). 보존 소스/파형 파일을 수정하지 않았다. 입력 초점 이동 도중 검증용 call-probe 사본에 발생한 오입력은 즉시 Undo하여 복구했고 저장하지 않았다.

구조를 닫았다 계층 목록으로 재열면 현재 Refresh가 필요하다. 안내/복구는 확인했지만 자동 재연결 UX 개선 여지는 남는다. 개발 창 재시작은 두 화면이 계속 살아 있는 상태의 재열기와 다르며 재시작 후 cursor 지속성 보장으로 확대하지 않는다.

## 남은 검증 — 큰 작업4묶음 + 별도 보류1

1. 저장 보기: 다른 TB/프로젝트 격리, 두 저장 보기 모두의 재시작 복원.
2. 세부 예외: 탭/CRLF·파일 간 package 변경·도구 누락/비활성화·컴파일 오류/준비 및 빌드 중 Stop·F5, 구조 double-click/Up·X/Z/미기록 상태 화면.
3. 실제 사용자 프로필: 타 확장 및 키·편집 설정 충돌 비교.
4. 대표 실제 설계/성능: 중간 규모 실제 설계, 파형 loading 취소/복구, 두 reader의 종료 후 메모리 회수.

깨끗한 Windows 설치 종단은 별도 PC/VM 부재로 별도 보류1이다. 큰 작업 묶음 개수이며 남은 개별 테스트 케이스 개수를 뜻하지 않는다. 다음은 다른 TB·프로젝트 저장 보기 격리다. 전체 A3/F 또는 배포 준비 완료가 아니다.
