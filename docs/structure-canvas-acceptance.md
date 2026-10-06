# U04 회로도 canvas 1차 — 구현과 수용

2026-10-05. 기존 읽기 전용 elaborated port 연결도를 고정 높이의 이동/확대 가능한 SVG 작업 영역으로 개선했다. 내부 연산이나 합성 netlist를 새로 생성한 것은 아니다.

## 구현 범위

- 빈 배경의 왼쪽 drag로 pan, 휠로 포인터 중심 zoom. +/− 버튼은 화면 중심 확대/축소, Fit은 표시 중인 scope의 전체 연결을 맞춘다. 배율은 1–800%로 제한한다.
- 화면 크기가 바뀌면 Fit 상태는 전체 맞춤을 유지하고, 수동 위치는 같은 중심을 유지한다. 캔버스에 포커스가 있을 때만 방향키·+/−·0(Fit)이 동작한다. 모듈의 기존 Enter/Space 탐색은 유지한다.
- pointer capture와 이동 임계값으로 drag와 클릭을 구분한다. 카드/소스 링크의 왼쪽 입력을 pan이 가로채지 않으며, 가운데 버튼 pan도 지원한다. drag 후 발생한 click/dblclick은 탐색하지 않고 다음 의도적 클릭은 정상 처리한다.
- 기존 scope별 자동 세로 배치와 포트 방향/연결 표현, 모듈 double-click·View inside·Back/Forward/Up·source 링크를 유지한다. 각 scope 화면 위치를 webview state에 최대32개 보관한다. 키는 project root·current/recorded·run ID·test·scope로 분리하고, geometry 변경/잘못된 상태는 Fit으로 복구한다.
- camera는 UI 내부 transform만 변경하고 host 메시지·RTL·기록값을 수정하지 않는다. 기존 nonce/generation/revision 및 기록 파형 identity 검증은 그대로다. stale 구조도 화면 위치 조작은 가능하지만 소스/계층 탐색 제한은 유지한다.
- 구조 값 갱신 메시지에 남았던 ‘cursor A’ 안내를 ‘waveform cursor’로 정리했다. 내부 공유 커서 계약은 변경하지 않았다.

## 자동 검증

최종 관련23 PASS / fail0 / cancelled0 / skipped0:

```text
node node_modules/tsx/dist/cli.mjs --test tests/structure-canvas.test.ts tests/structure-view.test.ts tests/structure-navigation.test.ts tests/structure-host.test.ts
node node_modules/typescript/bin/tsc --noEmit
node scripts/build.mjs
```

포인터 중심 world 좌표 보존·Fit/배율 한계·drag capture·다른 pointer 무시·취소·다음 drill-down 허용·scope 복원·다른 root/run 격리·resize·32개 저장 한계·잘못된 상태 fallback·키보드 포커스 경계를 검증했다. 기존 source escaping/CSP·200개 제한·stale 탐색 차단·recorded archive/시간/값/구식 응답 차단 회귀도 통과했다. 타입 검사와 개발 빌드 exit0. 전체 suite/대표 대규모 수용을 새로 완료한 것은 아니다.

## 실제 화면 수용

Computer Use로 격리 VS Code1.140.0 개발 창을 조작했다. 기존 native counter_basic run cb411e7e-e7b0-416f-bed7-ac55cf5794bc의 검증된 retained structure/VCD를 열었다. 이번에 새 시뮬레이션을 실행한 것은 아니다. examples/counter나 사용자 프로젝트는 수정하지 않았다.

첫 profile `.dev/vscode-tests/run-canvas-jlrex2`에서 실제 확인:

- 좁은 화면 Fit71%, 측면 패널을 닫아 넓히면 Fit101%로 자동 재계산.
- 휠 확대101→124%, 빈 공간 drag100px/50px로 내용 이동, 카드 double-click으로 dut 내부 진입.
- Hierarchy에서 top으로 복귀할 때124%와 pan 위치 복원, Fit101%로 전체 연결 복구.
- Time15ns→Go 후 clk=1/rst_n=1/count=0x01 표시와 camera 유지.

초기 fixture의 종료 명령은 command palette에 기여하지 않아 호출할 수 없었다. 창을 닫아 runner exit1이었으며 첫 receipt는 ready만 있고 passed가 없다. 제품 camera 실패나 성공 자동 receipt로 취급하지 않는다.

fixture에 전용 종료 statusbar 액션을 추가한 최종 profile `.dev/vscode-tests/run-canvas-mRC2QW`에서는 단일 cursor 문구, View inside와 Back 복귀를 다시 확인했다. 종료 액션이 DUT 원본 바이트 불변·structure stale=false·trace ready를 검사했다. `receipt.json`은 passed=true/sourceUnchanged=true/traceReady=true/inspected=counter_basic_tb, 최종 host exit0이다. 첫 profile의 pan/zoom 물리 증거와 최종 종료/소스 검증의 범위를 구분한다.

## 제한과 다음

노드 자체 drag 배치·배치 저장, 자동 회로 net routing, 선택 노드 Fit, 내부 register/mux/MAC 연산 그래프는 미구현이다. 현재 배치는 기존 세로 카드/포트 binding이며 synthesis schematic과 같지 않다. camera state는 해당 webview의 scope 왕복/재렌더 범위이며 닫은 panel·앱 재시작 복원을 보장하지 않는다. 문서 설명과 표는 canvas 밖에 남아 있다.

키보드·가운데 버튼·pointercancel·run 격리·resize의 상세 좌표는 자동 이벤트 범위이며 실제 대규모/다중 모듈 복잡한 연결·touch/트랙패드 수용은 별도다. 기존 안정화3묶음·깨끗한 Windows 보류1을 유지한다. 다음은 U05 파형 enum 이름이며 U12 자동 탐색은 설계 단계다. VSIX/설치/배포 없음.
