> 2026-10-05 후속 실행 지시: 문서 정리 후 단일 커서부터 구현한다. 현재 상태는 [전체 로드맵](project-roadmap.md)을 기준으로 갱신하며 아래 최초 제안의 미구현 표시는 당시 기록이다.

# IDE 화면 구성 — 사용자 제안과 설계 방향

## 2026-10-05 구현 갱신과 Explorer 요청

U01 단일 커서와 U02 Simulation container를 구현했다. [현재 전체 상태](project-roadmap.md), [Simulation 수용](simulation-panel-acceptance.md)이 아래 최초 제안의 미구현 문구보다 우선한다.

사용자는 **Explorer의 tb/ 아래 tb_counter.sv 같은 파일 행에 hover하면 우측 ▶가 나타나는 것**을 명확히 요청했다. Simulation 테스트 행 버튼과 다른 요구 U11로 보존한다. 기본 파일 Explorer에는 확장의 view/item/context inline 메뉴를 넣을 수 없고 Explorer context는 우클릭이다. workbench 내부 explorer contribution은 공개 extension API가 아니다. 현재는 등록된 파일만 Explorer 우클릭 Run RTL Testbench와 편집기 상단 ▶를 제공한다. 이름/폴더만으로 DUT나 helper 파일을 TB로 단정하지 않고 manifest test.sources와 URI를 대조한다. 공유 파일은 실행 구성 선택, 선택 취소는 무실행. F5의 기존 다중 대상 실행은 유지한다.

독립 IDE H에서는 파일 행 hover ▶를 공통 실행 서비스에 연결한다. 단일 test 직접 실행·여러 test 선택·미등록 TB 설정 안내·키보드 접근·클릭이 파일 열기와 충돌하지 않는 영역을 함께 설계한다. 전역 DOM 변경이나 private API injection으로 현재 VS Code에 강제로 붙이지 않는다.

근거: [공개 menu contribution](https://code.visualstudio.com/api/references/contribution-points#contributes.menus), [Explorer 내부 renderer](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/files/browser/views/explorerViewer.ts).

2026-10-05. 사용자 요청은 아이디어 검토·설명·구체화다. 이번 기록은 UI 구현 완료가 아니며 자동으로 Code-OSS fork/배포를 시작하지 않는다.

## 현재 구현의 정확한 위치

RTL Start는 초기 확장에서 실행/설정/예제 생성을 모아 둔 Explorer tree다. 전용 RTL 실행 화면으로 정리하는 방향은 있었지만 최종 위치/세부 디자인은 확정하지 않았다. 이번 Simulation Activity Bar 제안을 그 방향의 구체안으로 기록한다.

RTL Hierarchy는 실제 slang elaboration의 instance/parameter/generate/array/port binding을 보여 주는 탐색 tree다. Structure 화면에는 SVG 블록/포트 연결, 내부 보기/더블클릭, 경로·뒤로/상위, 소스 이동, 지원된 보존 실행의 포트 관측값과 파형 시간 연동이 있다. U04에서 canvas pan/zoom/Fit을 구현했으며 수동 블록 배치·일반 내부 연산 그래프는 아직 없다. 따라서 기반의 구현과 최종 schematic 제품 경험의 완료를 구분한다. 포트 자동완성과 semantic 기반을 공유하지만 트리 UI가 포트 추천을 위해 반드시 필요한 것은 아니다.

## Simulation 전용 Activity Bar — 제안 구체안

- 왼쪽 아이콘 한 개로 Simulation container를 열고 Explorer는 파일 탐색에 집중한다. 현재 VS Code의 custom view container API로 구현 가능하다.
- 정상 화면의 주 내용은 프로젝트별 테스트 목록, 실행/중지, 최근 결과다. Run All은 view 제목 toolbar에, 테스트별 Run/파형 열기는 행 액션에 둔다. 여러 선택은 tree canSelectMany와 기존 Testing API/Core를 재사용한다. 별도 runner를 복제하지 않는다.
- 행 클릭은 선택으로 두고 실행/파형 열기는 눈에 보이는 명시적 액션으로 구분한다. 파일을 열려고 눌렀는데 실행되는 동작이나 뜻이 바뀌는 클릭을 피한다. 파형은 가장 최근 완료 실행을 기본으로 열고 실행 시각/ID를 보여 준다. 더 오래된 실행은 펼친 이력에서 고른다.
- 빈 프로젝트일 때만 설정/프로젝트 생성 안내. Create Counter Example은 일반 실행 목록에서 빼고 시작 안내의 Samples로 옮기거나 배포 UX에서 제외한다. Toolchain/Language 설정은 필요 상태 안내 또는 설정 메뉴로 분리한다.
- counter_basic/counter_reset은 하드코딩된 제품 고정 항목이 아니라 프로젝트 manifest의 실제 테스트다. 제품 기본 예제 노출을 제거하더라도 사용자 프로젝트에 같은 이름의 테스트가 있으면 정상 표시한다.
- 같은 이름의 테스트를 가진 여러 프로젝트, 여러 test top/구성, 실행 중 항목과 이전 완료 결과를 구분한다. 완성 자체 IDE에서는 Run/Stop/현재 대상의 전역 배치까지 통합하되 extension 단계에서도 UI 개선을 미루지 않는다.

## 결과와 현재 설계 불일치 표시

2026-10-05 U03 구현: Simulation 행의 Outdated/Checking inputs/Inputs unknown/Unsaved edits 구분과 PASS/FAIL 유지. 관련33+보존 회귀10 PASS, 실제 host/native2 PASS·변경/복원/dirty 분리 확인. [검증 범위와 비용 제한](input-freshness-acceptance.md). 아래는 원래 설계 요구이며 Explorer 파일 배지·변경 대상별 최소 재평가는 후속이다.

사용자는 테스트벤치 옆 작은 세모 느낌표 같은 조용한 표시를 원한다. 우선 Simulation 테스트 행을 주 표시 위치로 한다. PASS/FAIL은 당시 실행 결과이며 outdated는 현재 입력과의 불일치다. 둘은 독립 상태다. PASS를 FAIL로 바꾸지 않는다.

TB 본문만 아니라 해당 실행이 사용한 DUT/package/include/defines/top/parameter 등의 입력을 비교한다. 기반 Core의 compareResultInputs와 보존 입력 정보는 있지만 상시 테스트 행 outdated 표시는 아직 미구현이다. watcher/편집 이벤트를 debounce하고 변경된 관련 테스트만 재평가한다. dirty 미저장 입력은 별도 안내하며 실제 저장본 mismatch와 구분한다. legacy/검증 실패/지원하지 않는 입력은 확인 불가로 표시하고 모두 outdated로 단정하지 않는다. 전체 include tree의 보수적인 비교 때문에 불필요한 mismatch가 생길 수 있는 한계도 남긴다.

지난 파형은 그 실행의 유효한 기록이므로 그대로 열고 '이후 설계가 변경됨'을 표시한다. 현재 구조와 과거 값을 조용히 합치지 않는다. 재실행해 성공·실패한 결과와 새 입력 기준을 갱신한다. 표시가 없음을 최신 입력 보장의 근거로 사용하지 않도록 확인 중/확인 불가 tooltip을 설계한다.

Explorer의 TB 파일에도 FileDecorationProvider 배지를 넣는 것은 가능하다. 한 파일이 여러 테스트/구성에서 사용될 수 있어 파일 배지는 요약하고 tooltip에 affected tests를 열거한다. 첫 구현은 Simulation 행 표시를 우선하고 전역 파일 배지는 선택적인 후속으로 둔다. 팝업을 반복 띄우지 않는다.

## Hierarchy → schematic 경험

2026-10-05 U04 1차 구현: 기존 세로 배치 연결도에 pan·포인터 중심 zoom·Fit·scope별 camera 복원을 추가했다. 관련23 PASS와 실제 보존 실행 화면 조작·소스 불변 확인. [증거와 제한](structure-canvas-acceptance.md). 아래 계획 중 노드 자유 이동·선택 노드 맞춤·내부 연산 그래프는 미구현이다.

왼쪽 Hierarchy는 위치 탐색용 목차로 남고 주 작업 공간은 독립적인 읽기 전용 diagram editor로 만든다. 기본 자동 배치, 여백 드래그 pan, 포인터 기준 wheel zoom, Fit/선택 노드로 이동, 더블클릭 내부 진입, 경로/Back/Up을 일관되게 연결한다. 수동 블록 이동은 시각적 배치만 변경하고 RTL 연결을 수정하지 않는다. 이 배치 저장은 instance/context identity와 연계해야 한다. 큰 설계에서 모든 계층을 펼쳐 그리지 않고 현재 scope 위주로 그린다.

1차는 elaborated module/port 연결도와 canvas 조작이다. Vivado synthesis schematic을 UX 참고로 삼되 synthesized gate netlist라고 표시하지 않는다. 합성 결과는 상수 접기/최적화로 원본 모듈·신호가 사라질 수 있어 source-first RTL 연결도와 의미가 다르다.

후속 제한된 내부 연산 그래프에서는 register/mux/adder/MAC 같은 지원 부분집합을 정확히 나타낸다. arbitrary procedural RTL을 완전한 회로 그림이라고 주장하지 않는다. 실제 기록되지 않은 중간값을 계산된 추측으로 관측값처럼 표시하지 않는다. 시간 재생과 실제 simulator pause/step도 구분한다. 기존 visual-debugging-roadmap.md의 데이터 정확성 경계를 유지한다.

## 파형 단일 커서 — 사용자 변경 요청

Cursor A/B 선택과 B checkbox/별도 strip을 없앤다. pointer combobox는 Cursor / Zoom range 두 가지다. Cursor는 유일한 시각 선택, Zoom range는 구간 드래그 확대다. 현재 시각은 위 toolbar에서 작게 표시해 값을 조회하는 기준 시각은 알 수 있게 한다. 기존 구조 연동의 공유 cursor A는 내부 계약을 유지할 수 있으나 사용자 화면에서는 그냥 Cursor다.

추가 기능을 숨겨 둔 B 모드를 이번 단순화에 넣지 않는다. B-관련 값/Delta UI/Shift+B 동작/영구 B 상태와 안내 문구도 함께 정리해야 한다. 과거 편집기 상태에 B가 있어도 단일 커서 화면에 복원하지 않는다. Shift 신호 선택과 파형 도구 동작을 혼동하지 않게 한다. 두 시각 차이 측정은 현재 기능 제거에 따른 trade-off이며 향후 별도 요구가 생기면 새 UX로 검토한다.

## 진행 순서·미구현 상태

초기 제안 이후 단일 커서·Simulation 화면·outdated 표시·canvas 1차 조작을 구현하고 각 acceptance에 범위를 기록했다. 다음은 enum 및 A3/F 잔여 수용이다. 수동 노드 배치·내부 연산·자동 프로젝트 탐색은 별도 후속이며 자체 compiler/fork/패키징은 이번 UX 범위가 아니다. 최신 순서는 제품 로드맵을 따른다.

근거: [VS Code custom view containers](https://code.visualstudio.com/api/extension-guides/tree-view#view-container), [file decoration API](https://code.visualstudio.com/api/references/vscode-api#FileDecorationProvider). 테스트 UI는 공통 Core/Testing API를 재사용한다.
