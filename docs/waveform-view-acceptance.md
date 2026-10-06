# 테스트별 저장 파형 보기 수용 기록

2026-10-05 · A3 부분 수용. VS Code 1.140.0의 격리 개발 프로필에서 실제 키·마우스로 확인했다. 사용자 프로필, 전체 A3 및 베타 준비 완료를 뜻하지 않는다.

| 확인 | 결과 |
|---|---|
| Save view에서 한글 이름 입력 | `기본 카운터` 저장, clk/rst_n/count 3신호 유지 |
| Use as default | 별표와 Default ✓ 표시 |
| clk 선택 해제 | 2신호, Unsaved changes 및 기본 지정 비활성 표시 |
| 다른 이름으로 저장 | `리셋과 결과` 저장; 두 보기 선택 목록 확인 |
| 기본 보기 다시 선택 | 3신호 복원 |
| 일반 개발 창 종료·재시작 | `기본 카운터 ★`, Default ✓, 3신호 복원 |
| 새 실제 시뮬레이션 결과 열기 | CLI 재실행 결과에서도 같은 기본 보기 복원 |

fixture는 `.dev/vscode-tests/run-rQSqPW/project`다. 첫 두 보기 전환은 extension test 모드, 마지막 기본 보기 저장/재시작/새 결과는 지속 저장 개발 모드에서 확인했다. 두 보기 모두의 재시작, 다른 TB·다른 프로젝트의 물리 격리, 누락/이름 변경 신호, 덮어쓰기·이름 변경·삭제 대화상자는 이번에 확인하지 않았다. 재실행은 CLI로 시작했으므로 GUI Run/Stop 버튼 수용으로 세지 않는다.

## 발견 및 실행기 보완

extensionTestsPath가 있는 VS Code는 저장소를 메모리로 운영한다. 이 모드에서 재시작 후 보기가 사라지는 관측을 제품 저장 실패로 해석하지 않는다. 설치된 VS Code의 `getStorageOptions()` 구현과 로그로 확인했다. `scripts/test-vscode.mjs`에 `RTL_MANUAL_PERSISTENT=1`을 추가하여 extensionTestsPath 없이 격리 개발 프로필을 실행한다. 자동 완료 receipt를 만들지 않으며 종료 코드도 제품 수용 PASS가 아니다.

`RTL_MANUAL_RESUME_ROOT`는 `.dev/vscode-tests/run-*`의 기존 사본만 허용하고 프로젝트와 프로필을 재사용한다. manual harness는 오래된 stop 상태를 초기화하며 `RTL_MANUAL_WAVEFORM=1`에서 두 native 예제를 준비한다. readiness 파일은 파형을 열기 전에 기록하여 준비 bookkeeping이 열린 trace를 무효화하지 않게 했다. 제품 파형/Core 동작은 변경하지 않았다.

## 재현

개발 검증용 PowerShell에서 `VSCODE_EXECUTABLE`을 기존 Code.exe 전체 경로로 지정하고 실행한다. 새 설치 및 사용자 프로필 변경은 없다.

```powershell
$env:RTL_DEV_HOME = "$PWD/.dev/rtl-dev"
$env:RTL_MANUAL_ACCEPTANCE = '1'
$env:RTL_MANUAL_WAVEFORM = '1'
node scripts/test-vscode.mjs
```

첫 test 모드의 `.rtl/manual-ready.json`에서 준비된 waveform을 확인한다. 수동 검증 종료는 해당 사본의 `.rtl/manual-stop.json`에 `{"finish":true}`를 기록한다. 이후 같은 사본을 지속 저장 모드로 열고 실제 결과 VCD를 연다.

```powershell
$env:RTL_MANUAL_RESUME_ROOT = "$PWD/.dev/vscode-tests/run-rQSqPW"
$env:RTL_MANUAL_PERSISTENT = '1'
node scripts/test-vscode.mjs
```

지속 저장 모드에서는 harness가 실행되지 않으므로 테스트 준비·자동 파일 열기·15분 제한이 없다. 개발 창을 정상 종료하고 같은 설정으로 다시 실행한다. 일반 파형 파일은 TB에 연결되지 않으므로 보기 저장 검증에는 실제 `.rtl/runs/.../wave.vcd`를 사용한다.

## 검증 근거와 다음 순서

- typecheck 및 development build 통과; 저장 보기 관련 회귀 5 PASS/0 fail/skip: `.dev/wave-view-regression.log`.
- 첫/재개 test host의 두 예제씩 native 4 PASS: `.dev/wave-view-manual.log`, `.dev/wave-view-resume.log`.
- 지속 저장/재시작 로그: `.dev/wave-view-persistent.log`, `.dev/wave-view-persistent-resume.log`; 정상 창 종료 exit0.
- 새 CLI native PASS: `.dev/wave-view-new-run-final.log`, counter_basic run `70182969-45a4-4af8-a169-9df0c31c7802`. 최초 잘못된 CLI 파일 경로의 MODULE_NOT_FOUND는 `.dev/wave-view-new-run.log`에 보존하며 시뮬레이션 실패로 세지 않는다.
- 실제 팝업/선택/별표/재시작/새 run의 화면 근거는 이번 대화의 computer-use screenshot/accessibility 관측이다. `.dev/wave-view-acceptance.json`은 관측 요약이며 자동 host receipt가 아니다.

다음은 4,096신호 화면의 실제 검색·선택·zoom/pan/time 수용, 이후 남은 편집/실행 버튼 및 사용자 프로필 충돌·실제 설계/메모리 검증이다. 별도 PC/VM이 없어 깨끗한 Windows 설치 종단은 보류다. 전체 suite 반복, VSIX 생성·설치는 하지 않았다.
