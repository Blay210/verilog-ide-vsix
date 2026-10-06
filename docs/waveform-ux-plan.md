# 파형·IDE UX 사용자 피드백과 실행 순서

최신 추가 요청: [구체 UI 방향](ide-ux-direction.md). Simulation 전용 Activity Bar, 결과 outdated 표시, schematic pan/zoom, A/B 제거·단일 Cursor/Zoom range를 요청했다. 논의/문서 상태이며 구현 완료가 아니다. 아래는 앞선 피드백의 구현 이력이다.

2026-10-05. 독립 Code-OSS RTL IDE가 최종 제품이며, 현재 확장의 배치를 제품의 최종 UI로 고정하지 않는다. 처음 사용하는 엔지니어도 명령어를 외우지 않고 설계·실행·결과 탐색을 할 수 있어야 한다.

| 사용자 요청 | 현재 상태 | 결정·다음 작업 |
|---|---|---|
| Explorer 아래 RTL Start 개선 | 기존 위치 유지, 개선 계획 | 전용 RTL 화면에서 프로젝트 상태·테스트 선택·Run/Stop·결과를 묶는다. 전용 activity/view container와 webview로 현재 VS Code에서도 개선 가능하다. 최종 앱의 전역 chrome 통합은 Code-OSS 제품 단계에서 처리한다. |
| 파형 행 X 제거 | 구현 | 신호 포함/제외는 Signals 계층 체크 상자로 통일한다. 행 제거 버튼 없음. |
| 위아래 버튼 → 드래그, 여러 행 이동 | 구현, 일부 물리 수용 남음 | 신호 이름 클릭은 단일 선택, Ctrl/Meta는 토글, Shift는 범위, Ctrl+Shift는 범위 추가. 선택한 행을 이름 영역에서 드래그하면 표시 순서를 유지해 묶음 이동한다. 파형 캔버스의 Shift는 기존 cursor B 역할을 유지한다. |
| SIGNAL 폭 축소 | 구현 | 기본 이름/값 열 216px, 좁은 화면 190/160px. 기존 264/215/175px보다 줄였다. 열을 직접 resize하는 기능은 아직 없다. |
| 큰 눈금·작은 눈금, 읽기 좋은 시간 | 구현 | 화면 범위/폭에 따라 1/2/5×10^n tick 간격, 0 기준 정렬, 보조 눈금, 겹치는 글자 생략. 실제 시간과 cursor 조회는 반올림하지 않는다. |
| 버스의 개별 비트 펼치기 | 구현·첫 UI 수용 | 부모·자식 표시와 보기 저장·복원. 자식 독립 정렬/스타일은 후속. [범위·검증](waveform-bits-acceptance.md). |
| enum 숫자 대신 상태 이름 | 미구현, 비트 다음 | 보존된 실행의 타입·계층 경로와 enum 값 매핑을 연결한다. 매핑을 검증할 수 없으면 숫자로 표시한다. |

## 시간 눈금의 의미

`timescale 1ns/1ps`의 1ns는 지연의 시간 단위, 1ps는 시간 정밀도다. 뷰어의 주요/보조 눈금 간격을 지정하는 설정은 아니다. 8.24ns는 실제 커서 시각으로는 유효하지만 화면 범위를 균등 분할해서 주요 눈금까지 그런 값이 되는 것은 가독성 문제였다. 새 ruler는 주요 눈금을 읽기 좋은 간격에 맞추고 파형 원본 시각은 보존한다. 예: 0~41.2ns 범위를 800px에서 보면 큰 눈금 10ns, 작은 눈금 2ns이며 화면 폭에 따라 달라진다. 아주 좁은 화면에서는 보조 눈금도 겹치지 않도록 줄인다.

후속 협의 항목: 표시 단위(ns 등) 고정 옵션과 clock 기준 눈금. 여러 클럭이 있는 설계를 고려해 clock 눈금은 명시적으로 기준 신호를 고르게 해야 한다. 이번에는 자동 물리 시간 눈금만 구현했다.

## 비트 펼치기 구현 조건

- 원본 버스 채널에서 bit 값을 투영하고 별도의 가짜 시뮬레이션 신호를 생성하지 않는다. X/Z도 각 비트에 보존한다.
- `[7:0]`, `[0:7]`, 0이 아닌 선언 범위를 구분해야 한다. range 정보가 없는 경우 추측해 원래 선언 인덱스라고 표시하지 않는다.
- 접힘 상태·자식 표시 순서를 테스트별 저장 보기에 포함하고 기존 보기 schema 호환을 검증한다.
- 기존 최대 32개 표시와 폭 제한을 무시하지 않는다. 확장 행 제한/가상화를 설계하고 안내한다. 부모 제거 시 자식도 일관되게 처리한다.

## enum 표시 구현 조건

- 현재 semantic 모델의 enum 관련 정보가 있어도 파형 렌더러의 타입 연결은 구현된 것이 아니다. 내부 신호/typedef/package/parameter 특수화까지 경로·폭·실행 자료를 대조해야 한다.
- 이름이나 숫자만으로 상태 타입을 추측하지 않는다. 실행 후 소스가 바뀌어도 당시 enum 정의를 사용한다.
- 검증된 매핑은 `IDLE` 등으로 표시하고 hover에 원래 bit/숫자를 남긴다. 미정의 값, X/Z, 타입 미연결은 명확하게 숫자 또는 X/Z로 표시한다.
- 동일 값의 여러 enum 별칭과 음수/큰 값 정책, 오래된 보기 호환을 검증한다. standalone VCD에 타입 정보가 없으면 자동 enum 이름을 보장하지 않는다.

## 실제 검증과 한계

관련 자동 검증 29 PASS / 0 fail / 0 skip: 선택 범위·토글·그룹 순서, 실제 번들 이벤트의 native 및 pointer 경로/취소, cursor 유지, 큰 BigInt 시간, 좁은 ruler/보조 눈금, worker·저장 보기·호스트 연동 회귀. 타입 검사와 개발 빌드 통과. VSIX 생성/설치 없음.

VS Code 1.140.0 격리 개발 프로필의 합성 VCD(4신호,11변화,41.2ns)에서 행 버튼 없음과 5ns 큰 눈금/1ns 보조 grid를 확인했다. 처음 HTML drag 두 번은 순서가 바뀌지 않아 성공으로 세지 않았다. pointer capture 보완 후 `clk,data,valid,ready` → `data,valid,ready,clk`를 실제 마우스로 확인했다. cursor A 4.556ns와 신호 4개 유지. 이전 좁은 화면에서 20ns 큰 눈금도 확인했다.

Ctrl/Shift의 실제 마우스 조합과 실제 그룹 드래그/보기 저장 재시작은 이번 물리 수용에 포함하지 않는다. 자동 이벤트 검증과 사람이 실제 사용하는 검증을 혼동하지 않는다. 합성 VCD는 native 시뮬레이션 성공 결과로 세지 않는다. 검증 창 종료 exit0.

현재: 비트 펼치기와 Shift+키보드 범위 선택 후 물리 묶음 drag 수용 완료. Ctrl/Shift+마우스 조합은 남음. 실행 순서: enum 이름 표시 → RTL 시작/실행 화면 통합 → 대표 설계/로딩 취소/두 reader 메모리 관측 및 기존 A3 세부 검증 재개. 큰 검증 3묶음과 별도 깨끗한 Windows 보류 1은 여전히 남아 있다. 별도 PC/VM 없음; 전체 베타 안정화 완료가 아니다.

공식 API 근거: [VS Code webviews](https://code.visualstudio.com/api/ux-guidelines/webviews), [Tree/view containers](https://code.visualstudio.com/api/extension-guides/tree-view), [Verilator timescale](https://verilator.org/guide/latest/exe_verilator.html#cmdoption-timescale).
