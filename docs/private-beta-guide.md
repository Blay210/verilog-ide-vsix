# RTL Dev 0.3.1 — 스터디 비공개 베타

현재 배포 형태는 **VS Code 확장**입니다. 독립 IDE 실행 파일이나 정식 stable 버전은 아닙니다. Windows x64에서 RTL 편집·테스트 실행·내장 VCD 파형·구조 탐색을 스터디 내부에서 시험하기 위한 버전입니다.

## 설치와 첫 실행

1. VS Code 1.95 이상을 설치합니다. 이번 패키지 검증 환경은 Windows x64 / VS Code 1.140입니다.
2. VS Code의 Extensions 화면에서 오른쪽 위 `…` → **Install from VSIX…**를 선택하고 `rtl-dev-0.3.1.vsix`를 엽니다. 이전 RTL Dev가 있다면 같은 확장 ID로 업데이트됩니다. VS Code가 요청하면 Reload합니다.
3. ZIP을 풀고 **File → Open Folder…**로 `counter-example` 폴더를 엽니다. 첫 시험은 복사본에서 진행해도 좋습니다.
4. 왼쪽 **Simulation** 아이콘을 엽니다. 도구가 없으면 안내에서 Toolchain을 열고, 설치 위치와 내용을 확인한 뒤 설치를 승인합니다. 짧은 영문 경로와 인터넷 연결이 필요합니다. 시스템 PATH를 직접 설정할 필요는 없습니다.
5. 포트 추천·인자 안내에 필요한 언어 분석 도구도 안내에 따라 승인합니다. 설치를 거절해도 기본 템플릿 편집은 가능합니다. 설치가 끝나면 상태가 Ready인지 확인합니다.
6. `counter_basic` 또는 `counter_reset`의 실행 버튼을 누릅니다. **Run All**로 둘 다 실행할 수 있습니다. 진행 중에는 **Stop**으로 취소합니다.
7. PASS 후 테스트/실행 결과의 파형 액션을 눌러 내장 VCD를 엽니다. FAIL이면 로그를 먼저 확인합니다. 일반 편집기에 있는 등록된 TB에서는 F5도 사용할 수 있습니다.

기존 프로젝트는 `rtl.toml`로 RTL·package·include와 테스트 top/source를 설정합니다. 이번 버전은 모든 테스트벤치를 자동 발견하지 않습니다. 예제 설정을 참고해 등록합니다. 생성물은 `.rtl/`에 모이며 이 폴더는 Git에서 제외하세요. 도구는 프로젝트 밖에서 공유됩니다.

## 편집·파형·구조 사용

- `module` + Tab은 이름 → 포트 → 본문으로 이동하는 템플릿입니다. package/case 등도 지원합니다. `begin` + Tab은 begin/end 사이에 커서를 두고, Enter는 들여쓴 본문 줄을 만듭니다.
- module 인스턴스의 `.`에서 미연결 포트를 추천하고, 지원되는 모듈·함수·task 호출에서 인자를 안내합니다. 프로젝트/언어 상태가 Ready여야 의미 분석을 사용할 수 있습니다.
- 파형의 **Signals**에서 표시 신호를 추가·제거합니다. 신호 열의 Ctrl/Shift 선택과 드래그로 순서를 바꾸고, 버스 앞 토글로 bit를 펼칩니다.
- Cursor/Zoom range로 마우스 동작을 선택하고 확대·이동·Fit을 사용합니다. 시간은 절대시각이며 긴 눈금은 두 줄로 표시될 수 있습니다.
- View에서 테스트별 보기를 저장하고 기본 보기로 지정할 수 있습니다. 보기는 해당 PC의 VS Code 프로필에 저장되며 프로젝트 ZIP에 자동 포함되지 않습니다.
- 실행 결과에서 **Explore Recorded Structure**를 열면 실행 당시 입력의 구조를 확인할 수 있습니다. 모듈 내부로 이동하고 linked waveform과 커서를 공유할 수 있습니다. 클럭 재생·실제 simulator step·MAC 내부 연산 그래프는 아직 제공하지 않습니다.

## 테스트벤치 규칙

실패는 assertion 또는 `$fatal`로 표현하세요. 기본 제한 시간은 테스트당60초이며 `rtl.toml`에서 변경할 수 있습니다. 예제의 `$dumpfile("wave.vcd")`/`$dumpvars` 코드를 참고하세요. 기존 코드를 자동 수정해 dump를 추가하지 않습니다. 파형이 없으면 waveform 설정과 dump 코드를 확인합니다.

현재 주 backend는 Verilator입니다. timing/assertion을 사용하며 C++ harness를 작성할 필요는 없습니다. VCD는 내장 뷰어, FST는 외부 GTKWave를 사용합니다.

## 알려진 제한과 처음 사용하는 사람의 확인 항목

- 깨끗한 Windows의 승인 설치부터 파형까지는 별도 PC/VM이 없어 아직 검증하지 못했습니다. 새 PC에서는 설치 성공/실패·Ready 전환을 먼저 알려주세요.
- 실제 사용자 대형 설계·장시간 사용·전체 앱 메모리 수용은 미완료입니다. 합성256RTL파일과4096신호 시험, 취소·복구 및 제한된 메모리 회복을 확인했습니다.
- 내장 VCD 입력 한도는32MiB/10,000신호/1,000,000변화입니다. 표시 부모 신호는 최대32개, 추가 bit는 최대128개입니다. 더 큰 파형은 외부 도구를 사용하세요.
- 확대·이동은 커서 이동보다 느릴 수 있습니다. enum은 실행 당시 소스로 정확하게 연결된 지원 범위만 이름으로 표시합니다. 모든 array/struct/class 의미 분석을 지원하지 않습니다.
- 다른 Verilog 확장과 추천·진단이 중복될 수 있습니다. 문제를 비교할 때 그 확장을 workspace에서만 잠시 비활성화할 수 있습니다. 다른 확장의 linter는 우리 도구 저장소를 자동 공유하지 않습니다. 이번 기본 프로필의 외부 linter는 PATH에서 실행 파일을 찾지 못했습니다.
- RTL 소스가 직접 파일을 쓰거나 system 작업을 하는 것은 실행 코드의 동작입니다. 잘 아는 스터디 프로젝트에서 사용하세요.

설치가 실패하면 같은 설치를 반복하기 전에 Toolchain/Language 상태와 로그를 확인합니다. 일단 편집을 계속할 수 있습니다. 중요한 원본 프로젝트는 Git으로 관리하고 첫 시험은 복사본에서 진행하세요.

## 피드백 보내기

스터디에서 문제를 공유할 때 아래 내용을 함께 기록해주세요. 개인 경로나 비공개 RTL 내용은 필요한 부분만 공유합니다.

```text
RTL Dev 버전 / VS Code 버전 / Windows 버전:
발생 기능(설치·추천·실행·파형·구조):
재현 순서:
기대한 동작 / 실제 동작:
프로젝트 규모(RTL 파일·파형 신호·VCD 크기):
재현 가능한 작은 코드 또는 화면:
관련 로그 / 다시 실행·Reload 후 결과:
```

먼저 예제의 두 테스트 PASS와 파형 열기를 확인하고, 그다음 스터디 프로젝트에서 추천·실행·파형 보기를 시험해주세요. 문제는 재현·수정·회귀 확인 후 다음 비공개 베타에 반영합니다. 이 단계에서 Marketplace 공개 배포는 하지 않습니다.

## 선택 사항: CLI

GUI 사용자는 CLI나 Node.js를 설치할 필요가 없습니다. CLI를 사용하려면 Node.js22 이상이 필요합니다. ZIP의 `cli/rtl.cjs`와 `cli/analyze.py`를 함께 유지합니다. VS Code에서 승인 설치한 도구의 저장 위치가 기본값과 다르면 `RTL_DEV_HOME`으로 동일한 폴더를 지정합니다.

```powershell
node .\cli\rtl.cjs check --project .\counter-example
node .\cli\rtl.cjs test counter_basic --project .\counter-example
node .\cli\rtl.cjs test --all --project .\counter-example
```

CLI는 확장과 같은 Core 실행 모델을 사용하며 실패 시 실패 종료 코드를 반환합니다. 전용 simulator/compiler·독립 IDE 전환은 후속 단계입니다.
