# 실행 예외 화면 수용 — 2026-10-05

실제 키·마우스로 VS Code 1.140.0 격리 지속 저장 개발 창에서 확인했다. `.dev/vscode-tests/run-rQSqPW/project-peer`의 Core 예제 사본과 의도적으로 문법 오류를 넣은 별도 TB를 사용했다. 사용자 예제와 설치된 확장을 수정하지 않았다. UI는 Computer Use로 관찰했고 결과 파일/프로세스 검사는 별도로 수행했다.

| 검사 | 실제 결과 |
|---|---|
| 컴파일 오류 | `ui_compile_error` failed 77ms; Last run 실패 및 결과 진단 로그 열기 확인 |
| 준비 중 Stop | 작은 RTL/g++ 도구 검증 안내에서 Stop; cancelled 결과 11815ms |
| 빌드 중 Stop | g++ timing object 컴파일 중 Stop; cancelled 10257ms, simulation Running 로그 없음 |
| 프로세스 정리 | 취소 run UUID에 속한 Windows 하위 프로세스0개 |
| 취소 뒤 복구 | TB 편집기 F5 → counter_basic passed 19248ms, Last run 1 passed |
| 정상 반복 | 앞선 두 실행 passed 19192/19660ms. 늦은 Stop 클릭은 취소 성공으로 세지 않음 |
| F5 범위 | 등록된 TB에서 시뮬레이션; 일반 counter.sv에서는 기존 SystemVerilog 디버거 안내, Cancel로 닫음 |

준비 Stop은 실제 안내에서 눌렀지만 비동기 전환 때문에 결과가 생성된 정확한 단계까지 단정하지 않는다. 빌드 Stop은 g++ 로그와 simulation 미시작으로 구분했다. 시간은 결과 기록의 전체 경과 시간이며 Stop 이후 정리 시간과 같지 않다.

## 보완한 결함 A3-RUN-F5-1

F5 keybinding이 없어 등록된 TB에서도 일반 디버거 안내가 열렸다. extension.ts에서 활성 파일을 manifest 테스트 source와 비교하는 컨텍스트를 갱신하고 package.json에 editorTextFocus/언어/TB 조건으로 rtl.runCurrent를 연결했다. Windows 경로 비교는 대소문자를 정규화한다. 실행 중 중복 요청은 기존 실행 guard로 처리한다. GUI와 CLI의 Core 실행 모델은 변경하지 않았다.

최종 타입 검사·개발 빌드 통과. 관련 extension-ui 자동18 PASS/0 fail/skip (`.dev/execution-detail-regression-context.log`, 기존16개와 신규2개). 신규 회귀는 활성 파일/Windows 대소문자/비파일 소스/manifest 갱신의 컨텍스트와 현재 TB 실행 경계를 검증한다. F5 키 입력 연결의 양성/음성 동작은 물리 UI로 별도 확인했다. 수정 전/후 개발 창 모두 정상 exit0. 패키징·VSIX·설치 없음.

기계 판독 근거 `.dev/execution-detail-ui-acceptance.json`, 프로세스 검사 `.dev/execution-detail-process-check.json`, 개발 창 로그 `.dev/execution-detail-ui-host.log` / `.dev/execution-detail-ui-fixed-host.log`. 생성된 실행 출력은 사본 `.rtl/`에 있다. 실제 정상3 PASS/의도한 실패1/취소2이며 과거 suite 수와 합산하지 않는다.

## 남은 검증과 재개 순서

큰 검증3묶음은 유지한다. 첫 묶음의 실행 예외 일부를 닫았으며 다음은 탭/CRLF·다른 파일 package 변경·분석 비활성화/도구 누락 화면, 구조 X/Z·미기록/Up/double-click, 저장 보기 관리/누락 신호다. 이후 실제 사용자 프로필 충돌 및 대표 실제 설계/loading 취소/두 reader 메모리 회수를 확인한다. 실제 설계 경로가 아직 없으므로 합성 fixture를 대표 실제 설계로 간주하지 않는다. 깨끗한 Windows는 사용자 별도 PC/VM 없음으로 별도 보류1이다.

전체 검증 완료 또는 베타 준비 완료가 아니다. 사용자 요청에 따라 파형 UX 개선은 검증 이후 피드백을 받고 진행한다. 이전 문서의 실행 예외 미수용 표현은 당시 체크포인트 이력이다.
