# U05 — 보존 실행의 enum 파형 이름 (2026-10-06)

## 구현과 사용

내장 VCD의 **Values → Auto (enum names)**에서 검증된 enum 값을 `IDLE`, `LOAD`처럼 표시한다. 신호별 Format에서도 Auto를 선택할 수 있다. 새 화면은 Auto이며 기존 Hex 등의 저장 보기/편집기 상태는 그대로 유지한다. Hex/Unsigned/Signed/Binary는 명시적 숫자 표시다. 이름 없는 값·X/Z·자료 부족은 기존 숫자 표시로 돌아간다. tooltip은 원시 bits와 hex를 함께 제공한다. 1-bit enum도 Auto에서는 이름이 있는 구간으로 그리며 펼친 자식 비트는 0/1/X/Z를 유지한다.

slang hierarchy의 enumSignals는 instance/generate 직접 변수·net의 canonical enum 타입을 추출한다. package typedef와 signed 음수는 고정 폭 binary 인코딩으로 전달한다. Core/semantic/waveform 모델은 VS Code에 의존하지 않는다. Waveform mapTraceEnums는 기존 mapTracePorts의 정확한 segmented path·TOP wrapper·폭·모호성 검사를 재사용한다. 이름은 signal ID별로 연결하며 같은 channel code를 쓰는 일반 raw 별칭에 enum 타입을 전파하지 않는다.

기록 trace 연결과 보존 입력 검증이 있는 경우에만 기존 semantic runtime으로 분석한다. 보존 입력을 분석 전/후 Core에서 다시 검증하며 overlays는 비어 있다. 현재 원본 RTL이나 미저장 편집을 옛 파형에 섞지 않는다. runtime 설치를 자동으로 요청/실행하지 않는다. 신뢰되지 않은 workspace/도구 없음/단독 VCD는 숫자로 볼 수 있다. 분석 실패는 경고와 숫자 fallback으로 처리하며 정상 trace 연결을 유지한다. 읽기 취소는 runtime 검증과 semantic 하위 프로세스에도 전달한다. 자료가 무효화되면 이름과 기존 파형을 비우고 재검증한다. enum 매핑은 보기/편집기 상태에 저장하지 않는다.

## 검증 근거

- 관련 회귀 52 PASS, 0 fail/skip: enum mapper·실제 번들 webview·raw bits·숫자 override·reload 이름 제거·VCD/worker·저장 보기·linked host/webview·정확한 path·structure host/view·실제 slang hierarchy/completion.
- 실제 Verilator5.050 + slang11 실행 1 PASS(17.907s): `.dev/integration/enum-한글 I2XNSK`, run `06478a56-b814-4cad-bd8d-862a7d261b88`. 당시 `IDLE=0/LOAD=1/DONE=3`인 내부 state를 VCD에 연결했다. 원본 RTL을 NEW_IDLE/NEW_LOAD로 바꾸어도 기록 이름 유지. 분석 중 보존 파일 변조는 거절, 사전 취소는 거절. `.dev/u05-native-receipt.json`은 변조 검증 전 값 연결 receipt이며 이후 거절은 통합 시험 assertion으로 검증한다.
- 실제 격리 VS Code1.140.0의 첫 profile `run-enum-tDoXSI`: 세 구간 이름·7.459ns LOAD·Hex 0x1·Auto 복원 확인. 당시 Reload가 커서를 0으로 되돌려 기존 문제를 발견했다. 첫 host exit0/sourceUnchanged receipt는 이 결함의 수정 성공 근거가 아니다.
- 수정: 같은 directory/run/inputIdentity/traceIdentity에 한해 새 cursor group의 revision0이면 이전 시간을 복원한다. 살아 있는 peer의 수정 시간은 덮어쓰지 않는다. 기존 host 회귀에 단독 Reload 시간 보존 assertion을 추가했다.
- 수정 후 최종 profile `run-enum-PiWgE4`: 7.486ns LOAD → Reload → 같은 7.486ns LOAD를 물리 확인. receipt passed=true/enumNames=true/traceReady=true/sourceUnchanged=true/cursor="7486", host exit0. receipt는 호스트 metadata와 완료 시각을 assertion으로 검사하며 클릭 경로의 근거는 화면 수용 기록이다. 최종 관련52 PASS는 수정 후 다시 실행한 숫자이며 이전52/집중1을 합산하지 않는다.
- 타입 검사·개발 빌드 exit0. VSIX 생성·설치 없음. 사용자의 examples/counter는 변경하지 않았다.

재현: RTL_SEMANTIC_PYTHON을 기존 slang python.exe로 지정한 뒤 `node node_modules/tsx/dist/cli.mjs --test tests/semantic/enums.test.ts tests/waveform-enums.test.ts tests/waveform-enum-webview.test.ts tests/waveform-link-host.test.ts`. native는 RTL_DEV_HOME을 `.dev/rtl-dev`, RTL_INTEGRATION=1로 지정하고 `tests/integration/enums.test.ts`를 실행한다. fixture는 프로젝트의 `.dev/` 아래 생성된다.

## 제한과 다음 순서

직접 enum 스칼라만 지원한다. enum unpacked/packed array·struct 필드·class/procedural scope·VCD 경로가 없는 변수는 추정하지 않는다. 최대256bit/256개 enum 항목, 중복 인코딩은 매핑 거절. 생성 영역의 compiler path는 지원하지만 모든 backend trace 변형을 보장하지 않는다. FST 내장 이름 표시·사용자 alias dictionary·trace 내장 enum metadata는 후속이다. standalone VCD에 현재 코드 이름을 임의로 연결하지 않는다. RTL language support가 이미 준비되어 있어야 기록의 이름을 얻을 수 있다.

이 작업은 대표 수백 RTL/수천 신호의 분석 지연 수용이나 전체 안정화 완료가 아니다. 다음은 A3/F 남은 검증: 기록 구조 경계·실제 사용자 편집 프로필·대표 규모에서 loading 취소/복구와 두 reader 메모리. 깨끗한 Windows 설치는 별도 환경 없음으로 보류 유지. U12 자동 탐색은 별도 설계 제안이며 이번에 구현하지 않았다.
