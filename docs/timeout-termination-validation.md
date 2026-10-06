# Windows 빌드 시간 제한·취소 안정화 — 2026-10-05

## 재현과 보완

기존 비교 사본 `run-rQSqPW/project-peer`의 새 빌드를 계측했다. 일반 basic은 23041ms PASS였지만 1500ms 제한 빌드는 16425ms 뒤 timedOut, C++ 컴파일 로그 직후 사용자 취소는 16215ms 뒤 cancelled였다. 제한 신호는 약 1500ms에 발생했고 Node 이벤트 루프 최대 지연은 52.69ms였다. 취소 후에도 해당 사본의 sh/verilator_bin/cmd/make 프로세스가 관측됐다. 일반 Node 부모·자식 종료 회귀는 통과했으므로 MSYS Perl/셸 경로의 프로세스 트리 종료 결함으로 좁혔다. 기존 190465/229258ms 실행에는 이 계측이 없으므로 당시 전체 지연을 이 원인 하나로 단정하지 않는다.

Windows 도구 검색이 공식 UCRT64의 `verilator_bin.exe`를 직접 선택하게 수정했다. 기존 private 환경의 VERILATOR_ROOT, include/PATH, 경로 별칭, 패키지 서명·설치 승인 계약은 그대로 사용한다. Perl/셸 래퍼의 Windows PID 연결 변화에 의존하지 않도록 실제 컴파일러를 종료 트리의 루트로 유지한다. 다른 OS와 공통 Core 프로세스 계약은 변경하지 않았다. 래퍼 전용 debug/환경 플래그는 현재 GUI/CLI 제품 계약에 포함되어 있지 않다.

같은 사본에서 직접 실행 비교: 정상 basic 15570ms PASS, 1500ms 제한 1819ms timedOut, 빌드 취소 전체 406ms cancelled(취소 신호부터 build-end 약218ms). 모든 비교 실행 종료 후 사본 경로의 프로세스 0개를 확인했다. 실행 시간은 로컬 관측이며 절대적인 종료 시한 보장이 아니다.

## 재현 자료와 회귀

- 계측 실행기 `.dev/verify-timeout.ts`; 변경 전 `.dev/timeout-verification.log/.json`, 직접 호출 비교 `.dev/timeout-direct-verification.log/.json`.
- 제품 수정 `packages/toolchain/src/detect.ts`.
- 신규 실제 회귀 `tests/integration/termination.test.ts`: 공식 binary 선택, 빌드 1500ms 시간 제한, 실제 g++ 로그 직후 취소, 각각 7초 미만의 로컬 정리 여유, Windows 프로세스 목록의 해당 빌드 잔존 부재, reset 재실행/VCD PASS를 확인한다. 실패한 종료를 조기 resolve로 숨기지 않는다.
- Core/공통 프로세스 회귀 `.dev/timeout-core-regression.log`: 10 PASS/0 fail/skip. TypeScript 검사와 개발 빌드 exit0.

최종 실제 회귀 `.dev/timeout-native-regression.log`: 10 PASS/0 fail/skip, exit0(종료 회귀1 + 기존 native 상위1/하위8). 두 정상 VCD 테스트, FST, 파형 비활성화, 컴파일 오류, assertion 실패, 파형 미생성 안내, 무한 시뮬레이션 취소/시간 초과, 공백·한글 경로를 확인했다. 프로세스 잔존 검사를 강화한 최종 `.dev/timeout-tree-regression.log`: 1 PASS/0 fail/skip, exit0, 각각 종료 직후 CIM 목록에 해당 빌드 프로세스 없음 및 reset 복구 PASS. 총 native 테스트 수는 중복 재실행을 합쳐 고유11개로 세지 않는다. 마지막 두 회귀가 일부 동시 실행되었으므로 정상 빌드 성능 비교에는 사용하지 않는다.

이전 전체138개/slang/UI 수용은 이번 새 실행으로 주장하지 않는다. 실제 GUI Stop/F5/컴파일 실패 화면 수용은 CLI/Core 기반 종료 검증과 별개다. VSIX/설치/새 도구 다운로드 없음.

## 남은 범위

큰 검증은 3묶음(세부 예외·실행 안정화, 실제 사용자 프로필 충돌, 대표 실제 설계/loading 취소/두 reader 메모리 회수)이며 깨끗한 Windows는 별도 환경 없음으로 별도 보류1이다. 이번 작업은 첫 묶음의 빌드 종료 결함을 처리한다. 다음 실제 UI 검증은 컴파일 실패 결과·준비/빌드 중 Stop·F5, 이어 탭/CRLF·파일 간 package·도구 상태·구조 예외다. 전체 A3/F 또는 베타 배포 준비 완료가 아니다.
