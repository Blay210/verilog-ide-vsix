## 최신 실행 지점 — F1X 스터디 비공개 베타 (2026-10-06)

사용자 승인으로 0.3.1 VSIX/CLI/새 예제/안내 ZIP 배포를 준비했다. 정식 stable·독립 앱이 아니다. 전체184 PASS(초기 오래된 DOM 참조2 FAIL 수정)/타입 검사·build, 실제 VSIX 격리 설치 및 설치 폴더 native 편집/semantic/두 PASS/내장 파형·보존 구조 ready/host exit0, 배포 CLI check·두 PASS·hierarchy exit0와 GUI/CLI 결과 일치를 확인했다. 언어 빠른 재시작의 pending changes TypeError가 발견돼 알려진 제한으로 남긴다. 깨끗한Windows/대표사용설계·장시간/프로필·일부 실제입력 게이트는 유지한다. 다음은 스터디 설치·실사용 피드백 수집 → 언어 재시작 경쟁 및 중단 오류 우선 수정 → 0.3.x 회귀 검증이며, 후속 U12/독립 앱은 기존 순서를 따른다. [수용·발견 문제·재현](private-beta-acceptance.md), [설치 안내](private-beta-guide.md). 이전 VSIX 금지/미배포 기록은 당시 상태이며 이번 명시적 배포 요청이 우선한다.

# 제품 전체 로드맵과 현재 상태

F1W 실제 progress Cancel 버튼 검증 통과(run-odiLDS): 테스트 전용20초 load dispatch 지연에서 native 클릭으로 target reader 종료·document 제거, 기존 peer 값 유지, 정상 재열기/값 복구·3/3worker exit/SHA/host exit0 확인. 관련4 PASS/타입 검사·개발 build 통과. [실제 조작·제한 조건](waveform-physical-cancel-acceptance.md). 제품 코드 변경 없음. 일반 parse 중 물리 취소 latency/전체 안정화 수용은 아니며 실제 입력/Escape·프로필 잔여 및 대표 설계·장시간/깨끗한Windows 게이트를 유지한다.

F1V 합성 중간 규모 취소·메모리 회복 검증: 4096신호 두 reader의 native loading중 닫기/peer 보존/4cycle/worker9개 종료/SHA 검증 통과. 최종15초 자연 idle 두 실행에서 RSS baseline221–222MiB→191–193MiB 회복을 재현했다. 초기3초 미회복도 보존한다. 독립8cycle16reader exit, 256RTL파일 분석·실행중 취소/재시도1 PASS, 관련23 PASS/타입 검사·개발 build 통과. [근거·측정조건·제한](waveform-memory-recovery-acceptance.md). 제품변경 없음. 다음 물리 Cancel 조작·취소 복구와 잔여 입력/프로필 수용, 실제 설계 경로 제공 시 대표 프로젝트 검증. 전체 규모·메모리 수용/깨끗한Windows 완료는 아니다.

F1U 기본 사용자 편집 설정과 설치된 Verilog HDL 1.29.0을 격리 복제해 editor/semantic native 검사 통과(run-22Vp8d), 실제 module/package/begin Tab 및 begin Enter의 내용·커서 검증 통과(run-MmeiXH), 두 host exit0. 11 lexical PASS/semantic unit7 SKIP/타입 검사·개발 build 통과, 원본 설정 SHA 유지. 외부 linter는 PATH의 실행 파일 미발견으로 동작하지 않았으므로 정상 외부 diagnostics 충돌은 미검증이다. [근거·범위·재현](editor-profile-acceptance.md). 다음 대표 규모·loading 취소·두 reader 메모리 복구, 편집 프로필 잔여는 별도로 유지한다.

F1T 보존 결과·구조·파형 경계 재검증: 관련 32 PASS/타입 검사·개발 build 통과. 실제 VS Code run-Mpz1Al에서 package/include를 포함한 두 시뮬레이션, 보존 소스/구조/값·양방향 커서·닫기/재열기·손상 차단/복구 통과, host exit0. 별도 generate/array/escaped·한글/공백 경로 Core/worker 실제 검사 1 PASS. 제품 변경 없이 late values 무효화 회귀를 추가했다. [근거·초기 대기·지원 범위](recorded-boundary-acceptance.md). 다음 실제 사용자 편집 프로필 충돌→대표 설계·loading 취소·두 reader 메모리 복구. 전체 안정화/배포 완료는 아니며 깨끗한 Windows 보류는 유지한다.

최신F1S(2026-10-06): 기본cursor 재사용 실제drag/zoom/pan/하단scroll·Reload/전체값 확인. 다음retained 구조·파형 연동경계→실제프로필→대표규모·메모리복구의열린3묶음으로돌아간다. [이번근거·한계](waveform-cursor-physical-acceptance.md). viewport변경지연/물리Esc/DPI/깨끗한Windows 보류유지.

최신F1R(2026-10-06): cursor-only 재사용 기본적용 및혼합경계 검증완료(42 PASS/native8exit). 다음 실제 연속cursor/zoom·pan UI반응성 확인, 대표설계·실제프로필·retained/RSS/깨끗한Windows 게이트유지. [근거·제한](waveform-cursor-reuse-acceptance.md). 아래F1Q 검증전용 문구는 이전상태다.

최신 F1Q(2026-10-06): cursor-only 검증후보 구현/A-B 통과(41 PASS/3native각각8exit). 다음viewport·resize/reorder 혼합/real·wide·zero/error 경계검증 후기본채택판단. 일반사용은기존full query. [구현·측정·남은게이트](waveform-cursor-reuse-candidate.md). 아래F1P 후보탐색순서는과거기록이다.

최신 F1P(2026-10-06): 밀집파형 조회·전달 비용계측/40 PASS/두native 각각8exit 및복구확인. 다음은 같은viewport cursor-only 제한재사용 후보 비교다. 제품캐시/압축은아직채택하지않았다. [근거·후보조건·남은게이트](waveform-transport-profile.md). 아래 이전 체크포인트의 다음순서를 대체한다.

# 최신 실행 체크포인트 — F1O (2026-10-06)

장시간 진단 누락 보완을 실제 host에서 확인했고, 제한된 실제 waveform shortcut/overflow/창크기·앱zoom 정렬 검증을 마쳤다. 관련39 PASS/타입검사·개발build/native exit0. [범위와 다음 작업](waveform-native-layout-acceptance.md). 다음은 dense query/전달 비용 계측이다. OS DPI/물리Escape/대표설계/실제프로필/보존경계/RSS/깨끗한OS 게이트는 남아 있으며 전체안정화·배포완료로 표시하지 않는다.

기준일: 2026-10-06. **현재 범위·구현 상태·다음 실행 순서의 기준 문서**다. 과거 체크포인트의 다음 작업 순서보다 이 문서가 우선한다. 구현과 검증은 별도 판단한다. 지원 부분집합의 구현을 전체 기능 완료로 표시하지 않는다.

## 제품 목표와 기록 방식

2026-10-06 사용자선호(F1M): 시간눈금은절대시각이기본이다. 긴소수표시만정수부/나머지두줄로분리하고viewport-relative값을기본으로쓰지않는다. 커서정렬은sharedscroll/gutter로해결하며표시기준변경과분리한다. 관련6 PASS/타입 검사·빌드 exit0, F1L native잔여검증순서유지. [표시계약](waveform-absolute-time.md).

최종 제품은 독립 VS Code/Code-OSS 기반 RTL 설계·시뮬레이션 IDE다. 확장은 초기 호스트다. source-first 프로젝트, 편집기 독립 Core/semantic, simulator/waveform 교체 경계, 사용자 승인 설치를 유지한다. 자체 엔진과 Code-OSS fork는 후속 단계이며 지금 착수하지 않는다. 사용자 배포 지시 전에는 개발 빌드·검증만 하고 VSIX를 만들거나 설치하지 않는다.

- 이 문서: 기능별 현재 상태와 실행 순서. 요청을 받으면 기존 항목과 대조하고 새 요구에 ID를 붙인다.
- [PROGRESS](../PROGRESS.md): 가장 최근 작업·검증·다음 작업의 짧은 체크포인트. [이전 진행 이력](../PROGRESS-history.md)은 보존한다.
- [handoff](handoff.md): 다른 모델의 재시작 절차·실행 방법·주의점. 아래 과거 체크포인트는 당시 기록이다.
- [delivery-plan](delivery-plan.md): A–I 세부 작업과 진입 기준. [architecture](architecture.md): 공통 계약과 경계.
- [product-audit](product-audit.md), [원래 25개 아이디어](original-product-ideas.md): 요구 출처와 상세 감사. [verification](verification.md), 각 acceptance 문서: 날짜별 실제 증거·미검증.
- packages/vscode/docs의 문서는 기존 배포용 사본이고 현재 개발 상태의 기준이 아니다. handoff-gpt6-sol은 과거 인수인계 시나리오다.

작업마다 해당 ID의 구현/제한/검증 상태, PROGRESS, handoff의 다음 작업을 갱신한다. 통과한 시험의 날짜·명령·개수를 기록하고 실제 GUI/대표 설계 수용을 자동 시험으로 대체하지 않는다. 완료하지 않은 요구와 보류 사유를 지우지 않는다.

## 원래 6단계에서의 위치

| 단계 | 현재 위치 | 남은 제품 완료 조건 |
|---|---|---|
| 1 실행 MVP | 프로젝트·설치·Verilator·테스트·CLI·파형 경로 구현 | 깨끗한 Windows 승인 설치→실행→파형 종단 수용은 별도 환경 부재로 보류 |
| 2 편집 지원 | 2A lexical, 2B module/port, 2C package/scope 구현 부분집합 | 실제 사용자 프로필 충돌, 일부 의미 모델·정확성 경계 검증 |
| 3 프로젝트·검증 확장 | semantic package 자동 정렬·태그·실행 이력·입력 보존·1–4 jobs 구현 | 대표 프로젝트 규모와 취소·복구 수용; 정밀 최소 source graph 등 후속 |
| 4 구조 탐색 | elaborated hierarchy·읽기 전용 연결도·canvas pan/zoom/Fit·보존 포트 값/커서 연동 | 노드 자유 배치, 클럭 재생, 지원된 내부 연산 그래프 |
| 5 제품 확장 | 내장 VCD·저장 보기·눈금·정렬·버스 비트·보존 enum 표시 부분집합 구현 | enum array/struct 확장, 내부 FST, 다른 OS/backend, 안정화와 제품 UX |
| 6 구조 작성·독립 앱 | 계약/방향 문서화 | structural RTL 생성과 독립 IDE 구현; 자체 compiler/simulator는 별도 장기 트랙 |

단계 1–5의 일부를 함께 진행한 상태다. 단계 5 전체 완료나 초기 안정판 수용 완료로 간주하지 않는다.

## 초기 25개 요구의 추적표

ID는 original-product-ideas의 항목 번호다. 상세 근거는 product-audit와 acceptance 문서를 함께 읽는다.

| ID | 요구 | 현재 구현·남은 범위 |
|---|---|---|
| O01 | module 정보/서명·인수 안내 | module/parameter/port 및 일반 function/task 서명·hover/이동 구현; class/object/system call 전체 지원 아님 |
| O02 | . 미연결 포트 추천·연결 추천 | 사용 포트 제외·implicit 연결 필터 보완, 폭/타입/이름 순위 구현; 완전한 assignability 보장 아님 |
| O03 | package/import 추천 | compiler scope 기반 부분집합 구현; class/object 중첩 등 제외 |
| O04 | 현재 scope 변수 추천 | 선언 순서·shadowing·import 포함 prefix 구현; fuzzy/타입 위치 필터 미구현 |
| O05 | begin Tab/Enter와 closer 존중 | 구현·격리 실제 편집 수용; 사용자 프로필 충돌 검증 남음 |
| O06 | module/package/case 등 템플릿 | lexical snippet 구현; class 템플릿은 class semantic 지원 의미 아님 |
| O07 | 여러 TB 실행 | 현재/선택/전체와 Testing API, 전용 Simulation 화면 U02 구현; 새 toolbar 물리 조합 수용은 별도 |
| O08 | 결과·로그·시간·재실행 | 취소/시간 초과 포함 구현; 대규모 이력 관리 후속 |
| O09 | 여러 simulator 교체 | SimulatorBackend 계약+Verilator 구현; 다른 backend 미구현 |
| O10 | 공통 실행 설정 | timing/assertion/VCD/FST/off 구현; coverage 지원 없음 |
| O11 | source/include/package 관리 | glob·중복 제거·안정 순서·semantic package 자동 정렬/manifest 모드 구현; top 최소 source graph 미구현 |
| O12 | 가벼운 폴더 프로젝트 | rtl.toml 구현; top은 테스트별 지정 |
| O13 | 생성물과 도구 분리 | .rtl/와 프로젝트 밖 공유 도구 구현; 임의 RTL 파일 출력 자체를 sandbox하지 않음 |
| O14 | 승인 기반 Windows 도구 설치 | 발견·공식 설치·실제 smoke 경로 구현; 깨끗한 Windows GUI 수용 보류, update/rollback 후속 |
| O15 | 여러 OS | Windows x64/UCRT64 우선; Linux/macOS 제품 수용 미완료 |
| O16 | toolchain과 프로젝트 분리 | 구현; U02에서 설정을 toolbar overflow/빈 화면 안내로 분리 |
| O17 | semantic과 simulator 분리 | slang/LSP와 Verilator 분리 구현 |
| O18 | 편집기 독립성과 자체 IDE | 공통 계층 구현; 독립 앱 H 미구현 |
| O19 | GUI/CLI 공통 실행 | Core 공유 구현; 저장 파형 보기 등 UI 기능이 CLI와 모두 동일한 것은 아님 |
| O20 | hierarchy 탐색 | elaborated instance/parameter/generate/array/source 구현; 대표 실제 대규모 수용 남음 |
| O21 | module diagram과 내부 탐색 | SVG 연결도·더블클릭 내부·Back/Up·기록 포트 값·U04 pan/zoom/Fit 구현; 노드 배치 변경·내부 연산 E 남음 |
| O22 | 블록 연결로 RTL 생성 | 미구현 G; 읽기 전용 배치 변경과 소스 생성은 별도 |
| O23 | enum case 생성 | 명시적 code action 구현; 누락 case 자동 채움 미구현. 파형 enum 이름 U05는 별도 |
| O24 | end 라벨과 변경 동기화 | 명시적 action/Undo 구현; 자동 이름 동기화 미구현 |
| O25 | 결과→파형 | 내장 VCD·외부 GTKWave VCD/FST 구현; 내장 FST/live 미구현 |

## 최근 요청과 다음 작업

| ID | 요구·상태 | 다음 완료 기준 |
|---|---|---|
| U01 | 단일 커서: 구현·관련 자동/GUI 수용 | A/B·B checkbox·Delta strip 제거; Cursor/Zoom range만 제공, 기존 B 저장값 무시; 공유 커서 자동 회귀. [이번 증거·범위](waveform-cursor-acceptance.md) |
| U02 | Simulation Activity Bar: 구현·관련 수용 | Tests/Run History, Run All/선택 실행·Stop·행 실행/파형/소스, 공통 runner 재사용. 샘플은 빈 화면 안내로 분리. [검증 범위](simulation-panel-acceptance.md) |
| U03 | 테스트별 outdated 표시: 구현·관련 수용 | Simulation 행 경고/Outdated, Checking inputs/Inputs unknown/Unsaved edits 구분, 이전 PASS/FAIL 유지. 관련33+보존 회귀10 PASS·실제 host/native2 PASS. [검증·제한](input-freshness-acceptance.md) |
| U04 | schematic canvas: 1차 구현·관련 수용 | 기존 scope 세로 배치에 pan·포인터 중심 zoom·Fit·scope별 camera 복원. 관련23 PASS·실제 화면/소스 불변 확인. 노드 자유 배치는 후속. [증거·제한](structure-canvas-acceptance.md) |
| U05 | 파형 enum 이름: 1차 구현·관련 수용 | 보존 입력 분석 전/후 검증·정확한 경로/폭 매핑, Auto 이름/숫자 override·X/Z fallback·1bit 이름/자식 bit 숫자. 관련52 PASS·native1 PASS·실제 화면/Reload 시간 보존. array/struct/class·단독 VCD 추정은 제외. [범위·증거](waveform-enum-acceptance.md) |
| U06 | 테스트별 여러 저장 보기·default | 구현; 누락 신호 보존·다른 실행/프로젝트 격리. 관련 acceptance 유지 |
| U07 | 행 X/이동 버튼 제거, 그룹 drag·Ctrl/Shift | 구현; 삭제 Signals로 통일. 실제 Shift 범위+묶음 drag 수용, Ctrl/Shift 마우스 조합은 자동 이벤트 검증 |
| U08 | 좁은 신호 열·큰/작은 시간 눈금 | 구현: 1/2/5 간격과 정밀 시간 계산; timescale은 단위/정밀도이며 눈금 간격과 별개 |
| U09 | bus 개별 bit 펼침 | 구현: 부모 최대32·추가 bit 최대128, 저장/복원. 자식 독립 정렬/스타일/Edge 후속 |
| U10 | syntax 색·RTL 파일 아이콘 | grammar/아이콘 구현; 테마 적용 확인 필요, 전체 semantic coloring은 별도 |
| U11 | Explorer TB 파일 행 hover ▶: 자체 IDE 후속 | 사용자가 지칭한 것은 tb/의 실제 파일 행. 기본 Explorer의 공개 확장 API로 hover 액션 추가 불가; 현재 등록 TB 우클릭/편집기 상단 실행 구현. 임의 tb_ 이름 판별 없이 manifest로 대상을 식별하고 공유 파일은 설정 선택 |
| U12 | 가벼운 프로젝트·TB/소스 자동 탐색: 설계 제안·미구현 | 후보 발견 + 실행 top/설정 기억 + 모호할 때만 범위 선택. 폴더 구조 비강제, 기존 설정 우선, Core/CLI 공유. [방식 비교·단계별 완료 조건](project-discovery-direction.md) |
| P01 | 빠른 반복 빌드·증분 캐시 | 조사/설계만. 현재 실행별 새 build 디렉터리로 cross-run 재사용 없음; 도구/입력/옵션 키·불변 결과 경계 필요 |

실행 순서: U01/U02/U03 및 U04/U05 1차 구현 후 **A3/F 잔여 안정화 수용 중**. F1R cursor-only 최적화를 기본 적용했고 F1S에서 실제 drag/zoom/pan/하단 scroll·Reload와32부모/128bit 값 대조를 확인했다. F1T에서 보존 결과와 구조·파형의 지원 VCD 부분집합 종단/경계를 재검증했다. F1U에서 기본 편집 프로필·활성 Verilog 확장의 제한된 호환성과 네 가지 실제 키 입력을 확인했다. F1V에서 합성 256파일 분석·취소/재시도와 4096신호 두 reader의 종료 및 15초 자연 메모리 회복을 재현했다. F1W에서 지연 dispatch 조건의 실제 Cancel 버튼·peer 보존·재열기 복구를 확인했다. **다음은 잔여 실제 입력/Escape·프로필 수용**이며 실제 설계 경로가 제공되면 대표 프로젝트를 검증한다. 정상 외부 linter/사용자 snippets·추가 프로필 충돌 잔여는 유지한다. viewport를 바꾸는 full-query 지연/RSS/이전900ms 원인과 physical Esc/OS DPI는 미완료다. [F1S 실제 범위](waveform-cursor-physical-acceptance.md), [F1R 기본 적용](waveform-cursor-reuse-acceptance.md). U12 자동 발견은 제안, U11 정확한 Explorer hover는 H 후속이다.

## delivery A–I와 장기 기능

A: 편집 신뢰성 보완 구현, A3 사용자 환경 검증 남음. B: 서명 도움 부분집합 구현. C: 연결 추천/code actions 구현. D1: 구조 탐색, D2: 보존 입력 소스, D3: 관측 포트 값/공유 커서 부분집합 구현. **D4 클럭 기준 기록 재생 미구현**이며 실제 simulator pause/step과 다르다. E: register/mux/adder/MAC 내부 연산 그래프 미구현; 기록되지 않은 값을 관측값으로 추측하지 않는다. F: 규모·취소·복구 안정화 진행 중, 내장 FST indexed reader 후속. G: structural 작성 미구현. H: 독립 IDE 미구현. I: 자체 compiler/simulator 미구현; P01 성능 계측/증분 설계와 별도다.

## 남은 검증과 출하 판단

기존 3묶음 중 보존 데이터 구조 연동 종단/경계는 F1T에서 지원 VCD/관측 포트 범위를 통과했다([근거와 제한](recorded-boundary-acceptance.md)). 남은 큰 검증은 2묶음이다: (1) F1U 제한 수용 이후 실제 사용자 편집 프로필의 외부 linter/사용자 snippets·추가 설정 잔여, (2) 대표 실제 프로젝트 규모·loading 취소·두 reader 메모리 복구. F1V에서 (2)의 합성 규모 loading중 닫기/worker 종료/15초 자연 RSS 회복을 제한적으로 통과했다. 실제 설계·물리 Cancel/장시간·전체 workbench 메모리는 남는다. F1W 실제 Cancel 버튼/복구는 지연 dispatch 조건에서 통과했으며 무지연 parse중 물리 취소·기록 enum subprocess 취소는 별도 잔여다. 다음 실행은 잔여 실제 입력/Escape·프로필 검증이다. 합성 중간 규모 시험 통과는 실제 수백 RTL 파일/수천 신호 수용 완료가 아니다. 깨끗한 Windows는 별도 PC/VM 부재로 보류 1건이며 재검증할 조건을 유지한다.

날짜가 다른 테스트 수를 합쳐 전체 회귀 완료로 쓰지 않는다. 이번 waveform 34 PASS와 structure-view 7 PASS는 관련 범위이며 과거 전체 138 PASS를 갱신한 전체 회귀가 아니다. 전체 출하 여부는 잔여 게이트와 사용자 실제 사용 피드백 후 판단한다.

관련 설계: [IDE UX](ide-ux-direction.md), [파형 UX](waveform-ux-plan.md), [시각 디버깅](visual-debugging-roadmap.md), [증분 성능](simulation-performance-direction.md), [현재 검증](current-validation.md).
