> 전체 기능의 구현/미구현과 다음 작업은 [제품 로드맵](docs/project-roadmap.md), 최신 검증은 [PROGRESS](PROGRESS.md)를 확인하세요.

# RTL Dev

최종 제품은 **VS Code/Code-OSS 기반의 독립적인 Verilog/SystemVerilog 전용 IDE**입니다. 엔지니어가 툴 설정보다 RTL 구조와 설계에 집중하도록 편집·프로젝트·시뮬레이션·검증·파형을 통합합니다. 현재 확장은 그 기능들을 검증하는 초기 배포 형태이며 최종 제품의 경계가 아닙니다. 장기적으로 자체 컴파일러/시뮬레이터와 자체 파형 기능을 개발할 수 있도록 공통 로직과 도구별 어댑터를 분리합니다.

현재 비공개 베타 버전 0.3.1에는 Windows 우선의 프로젝트·시뮬레이션 MVP, 기본 RTL 편집, slang 기반 모듈·포트 의미 분석과 package·범위별 심볼 추천, package 의존 순서 정렬, 태그·이력·병렬 테스트, 전개된 설계 계층과 읽기 전용 포트 연결도, 내장 VCD 파형 뷰어가 포함되어 있습니다. 2026-10-06 사용자 요청으로 스터디 내부용 VSIX와 CLI 패키지를 준비합니다. 정식 stable/독립 IDE 앱/Marketplace 공개 배포는 아닙니다. 설치·사용·제한·피드백은 [비공개 베타 안내](docs/private-beta-guide.md)를 참고하세요.

최종 사용 흐름은 화면의 프로젝트 설정·테스트 선택·실행/중지 버튼·결과·파형을 중심으로 구성합니다. 명령 팔레트와 단축키는 선택적인 보조 기능입니다. 현재 명령 중심의 개발 안내는 최종 UX가 아니며, 독립 IDE 이전에도 확장에서 버튼 중심의 흐름을 개선합니다.

개발 진행: 보존 실행의 구조 포트 값·파형 시간 연동, 단일 커서, Simulation 전용 화면·입력 변경 표시·회로도 이동/확대를 구현했습니다. 구조 값은 integral module ports/VCD 범위입니다. 지원 범위의 enum 파형 이름과 주요 UX를 구현했고, 실제 사용 환경·대표 설계 안정화 게이트는 유지합니다. 최신 범위·검증·다음 순서는 [제품 로드맵](docs/project-roadmap.md), [진행현황](PROGRESS.md), [인수인계](docs/handoff.md)에 기록합니다.

## 기록된 실행의 구조와 값 보기

1. 테스트 실행 후 결과 메뉴에서 **Explore Recorded Structure**를 선택합니다.
2. 모듈 카드/포트 표에서 선택 시각의 값을 확인합니다. **Time**에 `5 ns`처럼 입력하고 **Go** 또는 Enter로 이동합니다. Hex로 표시하며 표에 마우스를 올리면 원래 bit 값을 확인할 수 있습니다.
3. **Open linked waveform**을 누르면 내장 파형이 열립니다. 파형의 **cursor**를 움직이면 구조 값도 바뀌며, 구조에서 시간을 바꾸면 파형 커서도 이동합니다. 이 버튼은 연결을 위해 내장 뷰어를 명시적으로 사용합니다.

각 화면은 동일한 보존 실행에만 연결됩니다. 현재 소스로 탐색하는 Current design에는 과거 값을 표시하지 않습니다. 미기록·경로 모호·폭 불일치·미지원 타입은 이유를 표시합니다. 당시 소스나 파형이 변경되면 값 연결을 차단합니다. 파일 복원 후 구조의 Refresh와 파형의 Reload로 다시 검증하세요. 파형만 손상됐다면 구조 탐색은 유지됩니다.

검증된 입력 사본과 VCD가 있는 실행만 연결할 수 있습니다. 과거/미지원 파형은 일반 보기로 열리며 FST는 GTKWave를 사용합니다. 관측값은 기록 파형의 시간 값이며 simulator의 실시간 pause/step이나 클럭 재생 기능은 아닙니다. 구조 창을 닫았다가 다시 열면 Refresh로 값 연결을 재개합니다. 현재 manifest가 없는 기록에서도 구조/값 연결은 되지만 기존 테스트별 파형 보기 저장은 현재 프로젝트 설정이 있을 때만 제공됩니다.

## 화면에서 바로 사용하기

등록된 테스트벤치 소스 편집기에 커서를 두고 **F5**를 누르면 해당 테스트를 실행합니다. 여러 테스트가 같은 소스를 사용하면 함께 실행합니다. 일반 RTL 파일이나 다른 화면에서는 기존 VS Code F5 동작을 유지합니다. 저장된 실행 소스 사본은 현재 테스트벤치로 간주하지 않습니다. 프로젝트 개발용 F5(확장 호스트 시작)와, 열린 확장 호스트 안에서의 TB F5(시뮬레이션)는 서로 다른 창의 동작입니다.

왼쪽 **Simulation** 아이콘에서 **Tests**를 엽니다. 테스트 행 ▶로 하나를 실행하고, Ctrl/Shift로 여러 행을 선택한 뒤 제목의 **Run Selected Tests**를 누르세요. 선택이 없으면 선택 창이 열립니다. **Run All Tests**는 전체 실행입니다. 행 클릭은 대상 선택이며 실행하지 않습니다. 프로젝트·top·최근 상태/시간을 표시하고 tooltip에서 root와 실행 시각을 확인합니다.

Tests 안내와 하단 RTL 상태 표시줄에서 준비/실행 진행과 마지막 배치 결과를 확인합니다. 제목 **Stop Simulation**은 실행 준비·빌드·시뮬레이션을 취소합니다. 행의 파형 버튼은 해당 테스트의 가장 최근 완료 결과를 엽니다. 최신 결과에 파형이 없으면 이전 결과로 대체하지 않고 버튼을 숨깁니다. **Run History**에서 예전 실행의 로그·파형·재실행을 선택하세요.

저장된 DUT/TB/include나 실행 설정이 이전 실행과 다르면 테스트 행에 경고 아이콘과 **Outdated**가 나타납니다. 이전 PASS/FAIL과 파형은 당시 기록으로 유지됩니다. **Unsaved edits**는 미저장 편집, **Checking inputs**는 확인 중, **Inputs unknown**은 비교 정보 부족/확인 실패입니다. 상세 이유는 행에 마우스를 올리면 확인할 수 있습니다. 원본 복원이나 재실행 후 비교 상태가 갱신됩니다. 도구 환경이나 실행 성능의 동일성을 보장하는 표시는 아닙니다.

대상 선택은 현재 개발 창에서만 유지되고 manifest에서 제거되면 해제됩니다. 여러 프로젝트의 같은 이름도 별도 대상으로 구분합니다. ‘Ready’는 테스트 선택이 가능하다는 뜻이며 도구는 실행 시 검증합니다. 설치를 거절하거나 준비가 실패하면 테스트가 실행되지 않았음을 표시합니다. 빌드와 시뮬레이션은 하나의 실행 상태로 표시하며, 자동 저장/대상 확인 전의 짧은 준비 구간에는 Stop이 제공되지 않습니다.

Explorer에서 등록된 TB를 우클릭해 **Run RTL Testbench**, 또는 TB 편집기 상단 ▶로 실행할 수 있습니다. 같은 파일에 여러 테스트 설정이 있으면 하나를 고릅니다. 일반 DUT와 보존 소스에는 이 실행 액션을 제공하지 않습니다. 기본 Explorer의 파일 행 hover ▶는 아직 없으며 독립 IDE 후속 요구로 기록했습니다. RTL Hierarchy는 Explorer에 유지합니다.

Tests 제목 **⋯**에서 도구·언어 설정과 Refresh를 엽니다. 예제/최소 프로젝트 생성은 빈 프로젝트 안내에 있습니다. 별도로 시작한 언어 설치는 해당 진행 알림에서 취소하세요. 명령 팔레트도 보조 경로로 유지합니다. 기존 개발 프로필의 사용자 지정 뷰 배치가 유지될 수 있으므로 Tests/Run History가 Explorer에 남으면 뷰 제목 우클릭의 위치 이동으로 Simulation에 배치할 수 있습니다.

문법 강조는 자체 TextMate 문법으로 제공하며 예약어·타입·숫자·문자열·주석·전처리·시스템 태스크를 구분합니다. 실제 색상은 선택한 색상 테마를 따릅니다. 이는 포트/변수의 의미를 구분하는 semantic coloring과는 별개이며 모든 SystemVerilog 문법을 세분화한 상태는 아닙니다. 독립 IDE에서도 유지할 기본 편집 기능입니다.

파일 아이콘은 `.v`/`.vh`에 파란 **V 칩**, `.sv`/`.svh`에 청록 **SV 칩** 기본 아이콘을 제공합니다. 밝은/어두운 테마용 자산을 포함합니다. 활성 파일 아이콘 테마의 명시적 매핑이 우선할 수 있고, 파일 아이콘 표시를 꺼둔 경우 표시되지 않습니다. 사용자의 기존 아이콘 테마를 자동으로 교체하지 않습니다.

## 사용자 시작 방법

1. 개발 환경을 아래 방법으로 빌드한 뒤 이 저장소를 VS Code에서 열고 **Run → Run Without Debugging（Ctrl+F5）→ RTL Dev Extension**으로 개발 호스트를 실행합니다. 기존 0.2.0 VSIX에는 새 의미 분석 기능이 없습니다.
2. `examples/counter` 폴더를 엽니다. 새 폴더에서는 Command Palette의 **RTL: Create Counter Example** 또는 **RTL: Create Minimal Project**를 사용합니다. 기존 파일을 덮어쓰지 않습니다.
3. **RTL: Toolchain**에서 상태를 확인하고 **Install missing components / update**를 선택합니다. 표시된 설치 항목과 위치를 확인하고 승인합니다. 취소해도 편집은 가능합니다.
4. VS Code Testing 뷰에서 테스트 하나 또는 전체를 실행합니다. **RTL: Run Selected Tests**는 여러 테스트를 체크해서 실행합니다. **RTL: Run Current Testbench**는 현재 파일에 등록된 테스트를 실행합니다. **RTL: Run Tests by Tag**는 같은 태그를 가진 테스트를 선택합니다.
5. Testing 뷰 아래 **RTL Results**에서 결과를 클릭하면 로그, 소스, 파형 열기와 현재 설정으로 재실행을 선택할 수 있습니다. **RTL: Show Run History**로 저장된 실행 기록을 다시 볼 수 있습니다.

확장을 사용하는 데 Node/npm은 필요하지 않습니다. Windows x64의 MSYS2 UCRT64 기반 Verilator 5.x, GCC, Python, LZ4/zlib 빌드 의존성을 사용합니다. 기존 GTKWave는 버전 확인 후 재사용합니다. 자동 설치는 사용자 전용 `~/.rtl-dev/tools/msys64`에 설치하며 시스템 PATH를 변경하지 않습니다. 설치 위치는 **RTL: Toolchain → Choose tool storage folder**에서 고를 수 있습니다. CLI에서는 `RTL_DEV_HOME`을 지정합니다. MSYS2는 짧은 ASCII 경로를 요구하므로 도구 설치 경로에는 공백·한글을 사용하지 마세요. 기존 UCRT64 환경은 `RTL_MSYS2_ROOT`로 지정할 수 있습니다.

프로젝트 폴더의 공백·한글은 빌드 동안 생성하는 임시 junction 별칭으로 처리하며 소스를 복사하지 않습니다. `.sv` 파일 이름 자체는 ASCII·공백 없는 이름을 사용하세요. 상대 include 경로 안의 비 ASCII 이름까지 변환하지는 않습니다. 결과는 원래 프로젝트의 `.rtl/`에 남고 임시 별칭은 빌드 후 제거합니다. Windows GCC 16의 `-Os` 링크 문제를 피하기 위해 어댑터가 C++20 및 `-O2`를 지정합니다.

## 내장 파형 뷰어 (5A)

`.vcd` 파일을 열거나 **RTL Results → Open Waveform**, **RTL: Open Waveform**을 선택하면 편집기 안에서 파형을 볼 수 있습니다. VCD 열기에는 별도 프로그램 설치가 필요하지 않습니다. FST는 기존 GTKWave를 사용합니다. 내장 화면의 **GTKWave ↗** 또는 **RTL: Open Waveform in GTKWave**로 외부 뷰어를 선택할 수 있고, `rtl.waveform.viewer`를 `external`로 바꾸면 명령과 결과의 파형 열기를 GTKWave로 연결합니다. 파일 더블클릭의 기본 편집기는 VS Code의 **Reopen Editor With**에서 선택합니다.

- 왼쪽에서 이름·계층 경로로 검색하고 신호를 체크합니다. 처음에는 중복 별칭을 제외한 최대 8개를 표시하며, 최대 32개까지 선택합니다. 신호 포함/제외는 왼쪽 체크 상자로 통일합니다. 신호 이름을 클릭하고 Ctrl(토글)·Shift(범위)로 여러 행을 선택한 뒤 이름 영역에서 드래그해 순서를 바꿉니다. 묶음의 기존 상대 순서는 유지됩니다.
- 버스 이름 앞 **▸/▾**로 개별 비트를 펼치거나 접습니다. 선언 범위가 없으면 `bit offset N`으로 표시합니다. 최대128비트 버스와 전체128개 추가 비트 행을 지원합니다. 접힘 상태도 **Save view…**로 저장할 수 있습니다. 자식 비트는 부모와 함께 이동하며 개별 정렬은 아직 지원하지 않습니다.
- 파형을 클릭하면 하나의 커서가 이동하며 값 열은 그 시각의 정확한 값을 표시합니다. 선택한 행의 **‹ Edge / Edge ›**로 이전·다음 변화 지점에 이동합니다.
- 큰 눈금과 작은 눈금은 화면 폭·확대 범위에 맞춰 읽기 좋은 1/2/5 간격으로 자동 조절합니다. 커서 시간과 원본 파형 값은 반올림하지 않습니다.
- **Fit**, 확대·축소, 좌우 이동, Ctrl+휠을 지원합니다. 파형을 클릭해 포커스를 둔 상태에서는 `+`, `-`, `0`, 방향키도 사용할 수 있습니다. 시간 입력에 `25 ns`처럼 단위를 넣어 이동하고 Auto/Hex/Unsigned/Signed/Binary로 값을 읽습니다.
- **Drag → Cursor**를 선택하면 클릭·드래그로 해당 커서를 옮깁니다. **Zoom range**를 선택하고 파형 또는 시간 눈금에서 좌우로 드래그하면 선택 구간을 확대합니다. 반대 방향 드래그도 가능하며 **Esc**는 진행 중인 조작을 취소합니다. **Fit**으로 전체 범위로 돌아갑니다.
- **Snap cursor**는 선택한 신호의 원본 변화 시각 중 현재 커서와 가장 가까운 곳으로 이동합니다. Cursor/Zoom range 어느 모드에서든 하나의 커서를 사용합니다. 동률이면 앞선 시각을 선택하며 초기 값 기록도 변화 시각에 포함합니다. 이전/다음 Edge 버튼도 같은 커서를 이동합니다.
- 신호 행을 선택한 뒤 **Format / Color**로 그 신호만 진수·색상을 바꿉니다. Default는 전체 Values 설정과 기본 색을 따릅니다. **Reset signal style**로 해당 신호의 설정을 되돌립니다. X/Z는 전용 경고 색을 유지합니다. 설정은 신호 경로별 편집기 상태에 저장하며 같은 화면의 Reload 후 복원합니다. 여러 실행에서 재사용하려면 아래의 테스트별 저장 보기를 사용합니다. 별도 파일 내보내기는 아직 지원하지 않습니다.
- 확대가 부족해 변화가 겹치면 활동 구간으로 표시하고 확대 안내를 제공합니다. 이를 평평한 파형으로 생략하지 않으며 커서 값은 정확하게 조회합니다. X/Z를 구분하고 64비트를 넘는 버스·시간에도 정수 정밀도를 유지합니다.
- 읽기 시점의 스냅샷입니다. 시뮬레이션이 끝난 뒤 **Reload**로 갱신합니다. 신호 선택·화면 범위·커서는 편집기 상태에 보관하며 RTL 소스나 파형 파일을 수정하지 않습니다.

첫 버전의 범위는 로컬 VCD 최대 32 MiB, 선언 10,000개, 값 변화 1,000,000개, 신호 폭 16,384비트, 디코딩 값 총 64 MiB입니다. 동시에 네 파일까지 열 수 있고 읽기는 취소하거나 30초 후 중단합니다. 파일 해석은 별도 worker에서 수행하며 화면에는 선택한 시간 구간만 전달합니다. 같은 시각의 값 변경은 마지막 값으로 합쳐집니다. real 값은 숫자 텍스트로 표시하며 아날로그 곡선, event/string 확장, 실시간 추적, 내장 FST, 대용량 디스크 인덱싱은 후속 작업입니다. 제한을 넘거나 지원하지 않는 형식은 오류를 안내합니다.

보존 입력과 VCD가 검증된 실행은 **Values → Auto (enum names)**에서 enum을 `IDLE`, `LOAD`처럼 표시합니다. 기존 RTL language support가 준비되어 있어야 하며 현재 소스의 이름을 과거 파형에 섞지 않습니다. 모듈/generate의 직접 enum 변수·net을 지원하고 배열/struct/class는 아직 제외합니다. 이름 없는 값·X/Z·단독 VCD·도구 부족은 기존 숫자로 표시합니다. Hex 등의 숫자 형식과 신호별 Format을 선택할 수 있으며 펼친 자식 bit는 그대로 0/1/X/Z입니다. 기존 저장 보기의 Hex 설정을 바꾸려면 Auto를 선택해 다시 저장하세요. [지원·검증 범위](docs/waveform-enum-acceptance.md).

## 테스트별 파형 보기 저장

같은 테스트를 반복 실행할 때는 파형 화면 위쪽의 **View**를 사용하세요.

1. 테스트 결과의 파형을 열고 필요한 신호·순서·표시 형식·색상을 정합니다.
2. **Save view…**에서 `리셋 확인`, `데이터 전송`처럼 이름을 붙입니다. 다른 이름으로 저장하면 별도 보기가 생깁니다. 기존 이름을 선택하면 덮어쓰기 확인을 거칩니다.
3. **Use as default**로 기본 보기를 지정합니다. 이후 같은 프로젝트·테스트 이름·top의 새 VCD 결과를 열면 자동 적용됩니다. **Default ✓**를 다시 누르면 기본 지정을 해제합니다.
4. **View** 목록에서 여러 보기를 전환합니다. **⋯**에서 이름 변경·삭제를 할 수 있습니다. 기본 보기의 이름을 바꿔도 지정은 유지되고 삭제하면 해제됩니다.

신호 설정을 바꾸면 **Unsaved changes**가 표시됩니다. 변경 사항은 자동으로 저장된 보기를 덮어쓰지 않으며, 다시 Save view…로 저장합니다. 변경 중에는 기본 지정 버튼이 비활성화됩니다. 다른 보기를 선택하면 미저장 신호 설정 대신 선택한 보기를 적용합니다. 커서와 확대 범위는 저장 보기의 대상이 아니며 새 실행은 전체 시간 범위에서 시작합니다. 이미 열었던 파일에서는 그 편집기의 상태를 우선 복원합니다.

보기에 있는 신호가 새 실행에 없으면 개수를 안내하고, 안내에 마우스를 올리면 경로를 볼 수 있습니다. 신호는 저장된 보기에서 자동 삭제하지 않으며 나중 실행에서 다시 나타나면 복원됩니다. 없어진 신호를 의도적으로 제외하려면 **Custom**으로 전환해 현재 목록을 새로 저장하세요. 최대 테스트당 20개 보기, 보기당 32개 신호(현재 없는 신호 포함)를 지원합니다.

왼쪽 **Hierarchy**에서 scope를 선택하면 해당 계층과 하위 계층의 신호를 검색할 수 있습니다. 필터는 이미 표시 중인 파형을 제거하지 않습니다.

보기는 **현재 PC의 VS Code 프로필에 속한 확장 저장소**에 보관합니다. RTL 소스와 `.rtl/` 실행 폴더에 추가 파일을 만들지 않으며, 실행 결과를 정리해도 남습니다. 프로젝트 경로·테스트 이름·top이 달라지면 별도 설정으로 취급합니다. 다른 PC/프로필·팀과의 공유 및 내보내기는 후속 기능입니다. 열린 프로젝트의 `.rtl/runs/.../result.json`과 현재 manifest가 일치하는 VCD에 적용하며, 임의로 연 VCD나 FST는 테스트별 저장 보기의 대상이 아닙니다.

## 기본 RTL 편집 지원

- `.v`, `.vh`, `.sv`, `.svh`를 열면 manifest나 시뮬레이터 없이도 편집 기능을 사용할 수 있습니다.
- `module`을 입력하고 **Tab**을 누르면 선언 틀이 생기고 이름 → 포트 → 본문 순으로 Tab 이동합니다. `package`, `interface`, `program`, `function`, `task`, `generate`, `case`/`casex`/`casez`도 명시적인 키워드 템플릿을 제공합니다. SystemVerilog 전용 선언은 `.sv`/`.svh`에서 제공합니다.
- `begin` 뒤 **Tab**은 `begin│end`처럼 두 키워드 사이에 커서를 둡니다(`│`는 설명용). 이어서 **Enter**를 누르면 본문과 `end`를 다음 줄로 나누고 들여씁니다. 완성된 `begin` 뒤에서는 추천창이 떠 있어도 Enter로 바로 블록을 생성합니다.
- `begin` 또는 `case (...)` 뒤에서 **Enter**를 누르면 본문을 들여쓰고 필요한 `end`/`endcase`를 생성합니다. 커서는 본문에 놓이며 한 번의 Undo로 되돌릴 수 있습니다.
- 이름 붙은 `begin : name`, `casex`, `casez`, 여러 줄 case 표현식도 지원합니다. 기존 닫는 키워드는 재사용합니다. `if`, `always`, `for`에는 begin/end를 강제로 넣지 않습니다.
- 예약어, 게이트 primitive, `$display`, `$monitor`, `$finish` 등 자주 쓰는 시스템 함수·태스크를 추천합니다. `.sv`에서는 `logic`, `always_ff` 등 SystemVerilog 항목도 추천합니다. 후보 검색·선택은 편집기의 기본 추천 UI를 사용합니다.
- 주석·문자열에는 추천 및 블록 생성을 적용하지 않습니다. 문법 색상, 주석 토글, 괄호·큰따옴표 짝도 제공합니다. 숫자 리터럴의 `'`와 전처리기의 backtick에는 짝을 추가하지 않습니다.
- 설정의 **RTL › Editor: Templates**, **Auto Close Blocks**, **Basic Completions**로 각각 끌 수 있습니다. 일반 snippet의 필드 이동, 멀티 커서·선택 영역의 기본 동작을 유지합니다. Tab으로 만든 `begin│end`의 Enter는 본문 줄바꿈으로 처리합니다. 기존 닫는 선언이 있는 위치에서는 선언 템플릿 생성을 보수적으로 생략합니다.

위 기능은 구문 기반 편집 지원입니다. `pkg::` 또는 `.` 뒤에 일반 키워드를 끼워 넣지 않습니다. 전처리 분기로 닫는 키워드의 소속이 모호하면 자동 생성을 건너뜁니다.

## 모듈·포트 의미 분석 (2B)

신뢰한 `rtl.toml` 프로젝트에서 **RTL: Set Up Language Support**를 실행하고 설치 위치와 구성 요소를 확인해 승인합니다. 전용 Python 3.14.7과 slang 11.0.0을 공유 도구 폴더에 설치하며, 시스템 Python이나 PATH는 변경하지 않습니다. 공식 배포의 고정 SHA256을 확인하고 실제 모듈 분석에 성공해야 설치 완료로 판단합니다. 설치 거절·취소 후에도 기본 편집과 기존 시뮬레이션 기능을 사용할 수 있습니다.

- `counter dut(.co`처럼 인스턴스의 **이름으로 연결하는 포트**를 입력하면 `count` 같은 후보와 방향·타입을 표시합니다. 이미 연결한 포트는 제외합니다. 표현식 내부의 객체 멤버 추천은 아직 지원하지 않습니다.
- 모듈 이름·인스턴스 이름·포트 선언·이름으로 연결한 포트 위에 마우스를 올리면 설명을 표시하고, **Go to Definition / F12**로 정의로 이동합니다. 모듈 선언에는 기본 parameter 기준 포트 타입을, 인스턴스에는 재정의한 parameter 기준 타입을 사용합니다.
- 저장하지 않은 RTL 및 기존 include 파일의 변경을 분석에 반영하고 Problems에 slang 진단을 표시합니다. 편집 중인 원본을 자동 저장하지 않습니다. 한글·공백 경로와 UTF-16 오류 위치를 처리합니다.
- manifest의 source/package 순서, include 경로, defines를 재사용합니다. 테스트벤치별 컴파일을 분리하므로 서로 다른 테스트에 같은 모듈 이름이 있어도 섞지 않습니다.
- **RTL › Editor: Semantic**으로 끄거나 **RTL: Restart Language Server**로 재시작할 수 있습니다. 오류는 **RTL Language** 출력에서 확인합니다. 설정 파일 변경은 저장한 뒤 반영됩니다.

현재 범위는 Windows x64, 파일로 저장되어 manifest에 포함된 프로젝트입니다. 새 파일은 처음 한 번 저장해 source glob에 포함해야 합니다. 분석은 변경 후 약 250ms에 시작하며, 이전 요청을 취소하고 최신 결과만 표시합니다. 각 native 분석 작업은 15초 제한이 있으며 대형 프로젝트의 증분 분석은 아직 구현하지 않았습니다. 동일한 소스 위치가 여러 hierarchy에서 서로 다른 포트 타입으로 구체화되면 임의로 하나를 선택하지 않고 인스턴스 추천을 생략합니다. 모듈 포트 signature-help 팝업을 지원합니다. parameter 목록도 지원하며 일반 function/task 인자 안내도 지원합니다. 설계 계층은 아래의 별도 구조 탐색 기능에서 테스트 문맥별로 확인합니다.

slang의 정적 진단과 Verilator의 시뮬레이션 결과는 별개입니다. DUT·테스트벤치·package가 함께 분석될 때 시간 단위 선언이 일부에만 있으면 slang의 `MissingTimeScale` 진단으로 구조 분석이 막힐 수 있습니다. 예제 DUT와 package에는 테스트벤치와 맞는 `timeunit`/`timeprecision`을 명시했습니다. 기존 사용자 소스의 시간 단위는 자동 변경하지 않습니다.

## Package·범위별 추천 (2C)

- `pkg::` 뒤에 package의 typedef·parameter·enum 값·함수를 추천합니다. `import`와 `export`에 따른 접근 규칙을 slang이 판정합니다.
- 일반 식을 입력하거나 **Ctrl+Space**를 누르면 현재 모듈·함수·블록에서 보이는 선언을 추천합니다. 함수 인자, 지역 변수, 모듈 신호와 접근 가능한 import를 포함합니다.
- 내부 선언이 외부 이름을 가리면 내부 선언을 사용합니다. 아직 선언하지 않은 지역 변수, 다른 함수·종료된 블록·종료된 루프의 지역 변수, 모호한 wildcard import는 후보에서 제외합니다.
- 저장하지 않은 package 및 지역 선언의 변경을 반영합니다. 이름 중간에서 추천을 적용해도 식별자 전체를 교체해 뒷부분이 중복되지 않습니다. 주석·문자열·매크로 및 등록되지 않은 열린 파일에서는 의미 추천을 하지 않습니다.

현재는 클래스 본문·객체 멤버·`pkg::class::` 연속 조회를 지원하지 않습니다. 헤더가 주변 scope의 일부만 담는 경우 지역 변수 추천은 보수적으로 제한됩니다. 범위 안에서 접근 가능한 선언을 추천하지만 모든 문법 위치에 맞춰 타입과 값을 구분해 걸러내지는 않습니다. 새 범위 추천에도 **RTL › Editor: Semantic** 설정이 적용됩니다. 모듈·포트 이외의 심볼 hover/F12 확장은 아직 포함하지 않습니다.

이 단계는 추천 요청마다 별도 slang 분석을 수행합니다. 입력 변경·요청 취소 시 이전 분석을 중단하고, 최신 문서에 대응하는 결과만 표시합니다. 프로젝트가 커지면 추천 지연이 생길 수 있으며 증분 분석·캐시는 후속 최적화 항목입니다.

## 설계 구조 탐색 (4단계)

1. `examples/hierarchy`를 열고 **RTL Start → Explore Design Structure**를 선택합니다. 명령 팔레트의 **RTL: Explore Design Structure**도 같은 동작입니다. 분석할 테스트 문맥을 선택합니다. 예제의 `narrow`는 4비트 레인 2개, `wide`는 8비트 레인 3개입니다.
2. Explorer의 **RTL Hierarchy**에서 인스턴스·generate·배열을 펼칩니다. 선택하면 읽기 전용 연결도와 실제 파라미터 값, 포트 방향·타입이 표시됩니다. 비활성 generate 분기는 표시하지 않습니다.
3. 모듈 카드를 **더블클릭**하거나 **View inside** 버튼으로 내부에 들어갑니다. **View** 목록은 테스트 top과 그 아래 모듈 인스턴스를 전체 경로로 구분합니다. 상단 경로를 눌러 조상으로 이동하거나 **Back / Forward / Up**을 사용합니다. `generate`와 배열의 상위는 실제 전개 계층으로 찾습니다. leaf에서는 포트 연결만 보이며 연산 그래프는 아직 표시하지 않습니다.
4. 연결도의 소스 링크 또는 트리 우클릭 **Open Instance Source / Open Module Definition**으로 인스턴스 사용 지점과 모듈 선언을 구분해 이동합니다. 포트 선언·연결 표현식·참조 신호 선언 링크도 제공합니다.
5. RTL 편집 후 화면의 **Refresh** 또는 **RTL: Refresh Design Structure**를 누르면 미저장 코드까지 반영합니다. 소스가 바뀐 이전 화면은 stale 안내를 표시하고 소스·계층 이동을 막습니다. 새로고침은 현재 경로를 보존하고, 사라졌으면 남아 있는 가장 가까운 상위로 이동합니다. **Change test…**로 테스트/프로젝트를 바꾸면 이력을 초기화합니다. 탐색 이력은 창 세션에만 유지됩니다. `rtl.toml` 변경은 먼저 저장해야 합니다. 프로젝트 소스는 자동 저장·수정하지 않습니다.

테스트가 없는 프로젝트는 공통 RTL에서 slang이 판정한 최상위 설계들을 보여줍니다. 테스트가 있으면 문맥 하나를 선택하므로 같은 top 이름이나 다른 파라미터 설정이 섞이지 않습니다. 공통 `SemanticProvider.hierarchy` 모델을 GUI와 CLI가 사용하며 시뮬레이터 실행은 필요하지 않습니다. 설치된 언어 도구와 신뢰된 workspace가 필요합니다.

```sh
rtl hierarchy narrow --project examples/hierarchy
rtl hierarchy wide --json --project examples/hierarchy
```

CLI는 저장된 소스를 사용하고 JSON에 계층·파라미터·포트 연결·소스 위치·진단을 반환합니다. slang 컴파일 진단에 오류가 있으면 불완전한 구조를 그리지 않고 진단과 빈 계층을 반환하며 CLI 종료 코드는 1입니다.

연결도 빈 공간을 드래그하면 이동하고, 마우스 휠로 포인터 위치를 중심으로 확대/축소합니다. **+/−** 버튼과 **Fit** 전체 맞춤도 제공합니다. 모듈 내부에 들어갔다 돌아오면 해당 화면의 위치/배율을 복원합니다. 노드 자체 배치 변경은 아직 지원하지 않습니다.

현재 연결도는 선택한 범위의 하위 인스턴스 포트와 부모 쪽 연결 표현식을 보여줍니다. leaf를 선택하면 해당 인스턴스의 연결을 보여줍니다. 화살표는 input/output/inout 방향이고, 미연결 포트는 선을 그리지 않습니다. 이름 기반·순서 기반·`.*` 연결과 배열 인스턴스의 암시적 비트 분할을 반영합니다. 그 밖의 표현식은 원래 소스 표기를 유지합니다. **합성된 게이트 회로나 always/assign 내부 데이터 흐름을 추론한 그림은 아닙니다.** interface/modport 연결 상세는 지원하지 않는다고 표시하며 잘못된 신호선을 그리지 않습니다.

구조 분석은 요청마다 수행하며 전체 요청 제한은 15초, 반환 계층은 최대 10,000개 노드·128단계입니다. 한 연결도는 최대 200개 포트/블록을 표시하고 초과 시 작은 범위를 선택하도록 안내합니다. 대형 설계 성능, 자동 배치 최적화, 연결도 편집은 후속 범위입니다.

## 개발 및 빌드

Node.js 22 이상과 npm이 필요합니다.

```sh
npm install
npm run typecheck
npm test
npm run build
```

저장소를 VS Code로 열고 **Run → Run Without Debugging（Ctrl+F5）**를 선택하면 자동 빌드 후 별도 Extension Development Host에서 예제가 열립니다. 기능 체험에는 디버깅 없이 실행을 권장합니다. F5는 확장 코드 디버깅용입니다. 이 PC에서 F5 디버거 연결이 실패해 확장 시작이 대기하는 문제가 관찰되었습니다. `command rtl.toolchain not found`가 표시되면 **Run → Stop Debugging（Shift+F5）**으로 중지하고 개발 창을 닫은 뒤, 원래 저장소 창에서 디버깅 없이 다시 실행하세요. 개발 환경에 Node만 제공되는 경우 `node scripts/bootstrap-npm.mjs`로 프로젝트 전용 npm을 준비한 뒤 `node .dev/npm/package/bin/npm-cli.js install`을 사용할 수 있습니다. 패키징 명령은 향후 배포를 위해 남겨 두었지만 일상 개발·검증 과정에서는 실행하지 않습니다.

CLI는 `node packages/cli/dist/cli.cjs`로 실행합니다. 로컬 명령으로 등록하려면 `npm link --workspace @rtl-dev/cli`를 실행합니다.

```sh
rtl check --project examples/counter
rtl test counter_basic --project examples/counter
rtl test --all --project examples/counter
rtl test --tag smoke --jobs 2 --project examples/package-counter
rtl history --json --limit 20 --project examples/package-counter
rtl init --example
rtl tools install
rtl tools install --yes
rtl tools language --yes
```

`tools install`은 계획만 출력합니다. `--yes`가 설치 승인입니다. `check`는 설정과 source를 확인하고 실제 작은 RTL을 컴파일·실행합니다. 테스트 실패는 종료 코드 1, 사용자 중단은 130입니다. GUI와 CLI는 같은 프로젝트 해석 및 테스트 실행 코드를 사용합니다.

## 프로젝트 설정

```toml
version = 1

[project]
name = "counter"

[sources]
# packages = ["rtl/base_pkg.sv", "rtl/packages/**/*.sv"]
# package_order = "auto" # auto | manifest
rtl = ["rtl/**/*.sv"]
# include_dirs = ["include"]
# defines = { FEATURE = 1 }

[simulation]
backend = "verilator"
timing = true
waveform = "vcd" # vcd | fst | none
timeout_ms = 60000
jobs = 1 # 1..4

[[test]]
name = "counter_basic"
tags = ["smoke", "basic"]
top = "counter_basic_tb"
sources = ["tb/counter_basic_tb.sv"]
# timeout_ms = 120000
```

경로는 `rtl.toml` 기준입니다. package 패턴을 먼저, RTL 패턴을 다음으로, 선택한 테스트 source를 마지막으로 전달합니다. 각 패턴 내 파일은 정렬되고 중복은 제거됩니다. `sources.packages`가 있으면 기본 `package_order="auto"`가 slang의 전처리된 구문 트리에서 import·export·package-qualified 참조를 읽고 의존 파일부터 안정적으로 정렬합니다. 설치된 언어 도구가 필요하며 설치는 GUI 승인 또는 CLI `tools language --yes`로 진행합니다. `package_order="manifest"`는 명시한 순서를 그대로 사용합니다. 패턴이 파일을 찾지 못하거나 설정 키가 잘못되면 오류를 표시합니다. include 폴더는 실제 디렉터리여야 합니다. 빈 프로젝트는 `rtl = []`와 테스트 없는 상태로 시작할 수 있습니다.

한 workspace folder마다 루트의 manifest 하나를 인식하며, VS Code multi-root workspace는 지원합니다. 중첩 manifest, 임의 compiler flag, 사용자 실행 스크립트, UVM 실행 환경은 이번 버전에 포함하지 않습니다.

## 패키지·태그·실행 이력 (3단계)

`examples/package-counter`는 순서가 뒤집힌 package 3개와 동시 실행 2개를 포함합니다. 공유 source를 읽어 패키지 파일만 재배치하고 기존 RTL 파일은 수정하지 않습니다. 순환 의존, 중복 package, 찾을 수 없는 import, 같은 파일 안의 선언 전 참조는 원인을 표시합니다. 순서만으로 복구할 수 없는 같은 파일 안의 선언은 직접 정리해야 합니다.

의존 추출은 slang의 전처리·구문 트리를 사용합니다. 클래스와 package 이름이 같은 복잡한 scope의 완전한 이름 해석은 이 정렬 단계에 포함되지 않습니다. 파일 사이에 매크로 정의를 전달하는 구성, 시뮬레이터 전용 암시적 매크로, 클래스 이름과 package 이름 충돌은 명시적인 `package_order="manifest"`와 검증된 파일 순서를 사용하세요. 공통 매크로는 `sources.defines` 또는 각 파일의 include로 선언하는 방식을 권장합니다. `RTL_WAVEFORM`/`RTL_FST`는 선택한 형식에 맞춰 분석에도 반영합니다. 모든 package 파일은 `sources.packages`에 등록하세요.

태그는 대소문자를 구분하고 영숫자로 시작하며 영숫자·`_`·`-`를 허용합니다. CLI에서 여러 `--tag`를 지정하면 모두 가진 테스트를 선택합니다. GUI에서는 태그 하나를 선택하거나 Testing 뷰에서 태그를 필터링할 수 있습니다.

결과 메뉴의 **Check Source Version**으로 현재 저장된 소스·설정이 실행 당시 관측한 입력과 같은지 확인할 수 있습니다. CLI에서는 `rtl history --verify-inputs --json --project <폴더>`를 사용합니다. 새 결과에 실행 ID와 입력 내용 지문을 저장하며, 입력 변경·실행 중 변경·확인 불가·식별 정보 없는 과거 결과를 구분합니다. 확인 불가여도 기존 로그와 파형은 열 수 있습니다.

보존을 지원하는 실행은 복사된 소스로 컴파일하므로 원본을 실행 중 수정해도 당시 소스를 확인할 수 있습니다. 미저장 코드는 포함하지 않습니다. 보존을 지원하지 않는 실행의 비교는 원본을 실행 전후에 읽은 관측이며, 변경 후 원복까지 보장하지 않습니다. 아직 과거 파형을 현재 구조도에 자동 연결하지 않습니다. 동적/찾을 수 없는 include 및 추적 크기 제한은 확인 불가로 표시합니다. 현재 manifest는 별도 parameter override 설정을 제공하지 않으며 소스 내 override는 파일 지문에 포함됩니다.

프로젝트 내부 명시적 소스·package 그룹과 `sources.include_dirs`에서 찾는 literal include는 실행 폴더에 자동 보존합니다. include 경로 순서와 하위 경로, 빈 include 폴더도 유지합니다. package 자동 정렬도 사본에서 다시 분석하며 당시 실제 순서를 기록합니다. 사본 분석 실패 시 원본으로 재시도하지 않습니다. 해당 결과의 **Open Recorded Source**는 당시 테스트벤치를 읽기 전용으로 엽니다. **Open Source**는 현재 원본입니다. 보존하지 못하는 설정은 기존 방식으로 실행하며 이유를 실행 로그/결과에 기록합니다. 원본 소스를 수정하지 않습니다.

새 실행의 파형에는 당시 소스와 실행 ID에 연결된 내용 지문도 기록합니다. 개발용 CLI `rtl trace --run <실행 ID> --json --project <폴더>`로 보존 VCD의 모듈 포트 연결 상태를 확인할 수 있습니다. 정확히 연결됨/기록 없음/경로 모호/폭 불일치/미지원 상태를 구분하고, 파형이 바뀌거나 다른 실행의 정보면 연결을 거절합니다. 과거 지문 없는 파형도 기존 뷰어로 열 수 있지만 구조 값 연결에는 사용하지 않습니다. 현재는 VCD의 integral 포트 매핑이며 **구조도 값 표시와 파형 공유 커서는 다음 단계**입니다. FST는 계속 외부 뷰어를 사용합니다.

보존 include 예제는 `examples/include-counter`입니다. 이 폴더를 개발 호스트에서 열고 **RTL Start**로 두 테스트를 실행하면, 우선순위가 다른 헤더 경로와 nested include를 사용하는 흐름을 확인할 수 있습니다.

CLI `rtl hierarchy --run <실행 ID> --json --project <폴더>`는 보존된 실행 소스로 계층을 분석합니다. 실행 ID는 `rtl history --json`에서 확인합니다. 현재 소스나 설정 파일이 바뀌어도 보존본으로 분석하며, 보존 파일이 변경·삭제되면 명확한 오류를 냅니다. 결과 메뉴의 **Explore Recorded Structure**로 당시 구조도를 열 수 있습니다. 화면의 **Recorded run**과 실행 ID로 현재 설계와 구분하며, 소스 링크는 당시 사본의 위치를 읽기 전용으로 엽니다. **Explore current design…**으로 현재 설계로 돌아갑니다. 현재 원본을 수정해도 보존 구조에 반영하지 않으며 보존 사본이 손상되면 새로고침·이동을 차단합니다. configured include 보존도 지원합니다. 다만 source/header 옆 파일이 지정 경로의 첫 결과를 가리는 경우, configured 경로 없이 상대 경로만으로 찾는 include, 매크로로 만드는 파일명/지시문, 절대·상위(`..`)·backslash 경로와 외부/symlink 소스는 보존 지원에서 제외하고 이유를 기록합니다. 주석/일반 문자열 속 include 텍스트는 허용합니다. 전체 include 트리를 보수적으로 저장하므로 관련 없는 파일 변경도 비교에 나타날 수 있습니다. 소스 사본은 실행마다 저장하므로 이력의 저장 용량이 증가할 수 있습니다.

이력은 각 실행의 `result.json`에 시각·태그·실제 source 순서와 함께 저장됩니다. 새로고침이나 IDE 재시작 후 읽으며 기본 최신 100개를 표시합니다. CLI `history --limit`은 최대 1000개까지 조회합니다. 완성되지 않았거나 손상된 기록, 사라진 로그·파형은 건너뜁니다. 예전 기록은 파일 수정 시각으로 정렬합니다. 이력에서 재실행하면 과거 소스 스냅샷이 아니라 현재 manifest와 소스를 사용하며 삭제된 테스트의 과거 실행은 재실행하지 않습니다. 테스트 결과는 읽기 전용 데이터이고 별도의 실행 인덱스는 만들지 않습니다.

## 테스트벤치와 실행 결과

- `--binary`, timing, assertion 지원을 이용하므로 C++ harness가 필요 없습니다.
- `$finish`를 포함한 정상 종료는 PASS입니다. 실패 조건은 `assert (...) else $fatal(1, "reason")`처럼 표현합니다. PASS는 검증 항목이 충분하다는 뜻이 아니라 프로세스가 정상 종료했다는 뜻입니다.
- 제한 시간은 **컴파일과 시뮬레이션을 합한 시간**입니다. 기본 60초이며 프로젝트 또는 테스트별로 바꿀 수 있습니다.
- 기본 실행은 순차적입니다. `simulation.jobs` 또는 CLI `--jobs`로 1~4개 동시 실행을 선택합니다. 테스트별 폴더·로그·파형을 분리하며 일반 테스트 실패 후에도 나머지는 진행합니다. 취소 시 실행 중인 하위 프로세스를 종료하고 대기 테스트는 시작하지 않습니다. 취소·시간 초과·실패를 구분해 저장합니다. 각 Verilator 빌드는 최대 2개 C++ 컴파일 작업을 사용하므로 메모리 여유에 맞춰 동시 실행 수를 선택하세요.
- 생성물은 `.rtl/runs/<test>-<unique-id>/`의 빌드 파일, `run.log`, `result.json`, 파형입니다. 이전 실행은 덮어쓰지 않습니다. `.rtl/`은 Git에서 제외하세요. 보관 정책은 아직 없으므로 필요하면 실행이 없을 때 직접 정리합니다.
- 시뮬레이션의 작업 디렉터리는 해당 실행 폴더입니다. `$readmemh` 같은 외부 입력 파일은 절대 경로를 사용해야 합니다. fixture 복사·plusargs 설정은 후속 범위입니다.
- 소스가 절대 dump 경로나 파일 출력 경로를 지정하면 그 경로로 쓰게 됩니다. 확장은 사용자 RTL을 수정하거나 파일 접근을 격리하는 보안 샌드박스가 아닙니다.
- Verilator 경고는 로그에 남기고 컴파일을 계속합니다. 문법 오류 및 빌드 실패는 FAIL입니다.

예제는 다음 형태의 dump 코드를 제공합니다. 기존 소스에 자동 삽입하지 않습니다.

```systemverilog
`ifdef RTL_WAVEFORM
`ifdef RTL_FST
    $dumpfile("wave.fst");
`else
    $dumpfile("wave.vcd");
`endif
    $dumpvars(0, counter_basic_tb);
`endif
```

`RTL_WAVEFORM`과 `RTL_FST`는 어댑터가 선택된 형식에 맞춰 정의합니다. 결과 폴더 바로 아래의 선택 형식 파형을 찾아 VCD는 내장 뷰어, FST는 GTKWave로 엽니다. 파형이 없으면 dump 설정 안내를 표시하며 성공한 시뮬레이션을 실패로 바꾸지 않습니다.

## 구조와 확장

| 패키지 | 역할 |
| --- | --- |
| `core` | TOML 검증, source 검색, 중립 모델, 프로세스 실행, 결과 관리, 예제 생성 |
| `language` | 편집기 독립적인 RTL 구문 문맥, 블록 삽입 규칙, 기본 추천 데이터 |
| `semantic` | 편집기 독립 모델·조회, slang 분석·구조 전개 어댑터와 미저장 문서 입력 |
| `language-server` | LSP 프로세스, 변경·취소·진단 관리, 포트 추천·설명·정의 이동 |
| `verilator` | 의도 중심 설정을 Verilator 인자로 변환, 빌드·실행 |
| `toolchain` | 도구 탐지, Windows 설치 계획·설치·검증, GTKWave 연계 |
| `waveform` | 편집기 독립 VCD 모델·해석·시간 구간 조회와 별도 reader worker |
| `cli` | 공통 기능의 명령행 진입점 |
| `vscode` | Testing API, 설치 승인 UI, 진행 상태, 결과 탐색 |

Core는 VS Code를 참조하지 않습니다. `SimulatorBackend`는 기능 지원 정보·확인·빌드·실행을, `ToolInstallProvider`는 계획과 승인을 받은 설치를, `WaveformProvider`는 파형 열기를 분리합니다. 실행은 executable과 args로 처리하고, MSYS2 초기화에만 고정된 shell 명령을 사용합니다.

`SemanticProvider`와 별도 LSP 서버가 slang을 연결합니다. 시뮬레이터가 편집기의 의미 분석 역할을 맡지 않습니다. `language`와 `semantic`은 VS Code API를 참조하지 않습니다. 계층·연결도는 별도 구조 조회를 사용합니다. 내장 VCD 뷰어의 데이터 처리는 `waveform` 패키지로 분리되어 독립 IDE에서도 재사용할 수 있습니다.

## 검증

`npm test`는 설정·순서·중복 제거·결과 격리·프로세스 취소·다운로드 무결성·실패 복구를 검증합니다. 실제 도구 통합 테스트는 Windows PowerShell에서 다음처럼 실행합니다.

```powershell
$env:RTL_INTEGRATION = '1'
npm run test:integration
```

실제 Verilator가 없으면 통합 테스트를 먼저 준비해야 합니다. 명시적으로 활성화했는데 도구가 없으면 실패합니다. 활성화하지 않은 통합 테스트는 건너뜁니다. Windows 샌드박스가 프로세스 트리 종료를 막으면 취소 검증은 일반 개발 셸에서 실행해야 합니다.

실제 VS Code 확장 호스트 검증은 `VSCODE_EXECUTABLE`에 `Code.exe`의 전체 경로를 지정하고 `npm run test:vscode`로 실행합니다. `.dev/vscode-tests/`에 독립된 프로필과 예제를 생성해 기존 사용자 설정을 건드리지 않습니다. 설치 승인·거절·재시도와 workspace trust 경계는 `npm test`의 UI 어댑터 테스트로 검증합니다. 실제 검증 기록과 아직 검증하지 않은 범위는 [검증 보고서](docs/verification.md)에 정리합니다.

도구 경로 변경과 두 workspace의 같은 이름 테스트 회귀는 `VSCODE_EXECUTABLE`과 기존 managed MSYS2의 `RTL_DEV_HOME`을 설정한 뒤 `npm run test:vscode:tools`로 확인합니다. Windows에서 격리 프로필과 새 예제를 만들고 동일 도구의 다른 경로를 사용합니다. 새 도구 설치나 VSIX는 필요하지 않습니다. 다른 compiler 버전으로의 교체나 깨끗한 OS 설치 검증은 아닙니다. 독립된 두 번째 도구 설치를 검증하려면 `RTL_TEST_SECOND_HOME`에 그 저장소를 지정할 수 있습니다. 이 경우 다른 경로 연결 대신 해당 설치로 전환하며 설치 자체를 자동 실행하지 않습니다.


이 저장소에서 이미 설치해 검증한 개발용 도구를 재사용하려면 **RTL: Toolchain → Choose tool storage folder**에서 저장소의 `.dev/rtl-dev` 폴더를 선택하세요. CLI는 같은 경로를 `RTL_DEV_HOME`으로 지정합니다. 설치 로그는 tool storage의 `install.log`에 남습니다.

설치 실패 시 RTL Dev 출력 로그를 확인하고 재시도합니다. 공식 안정 MSYS2 archive의 SHA256을 검증한 뒤 실행하며 pacman 패키지 서명 확인을 유지합니다. 네트워크나 미러 장애가 있으면 실패 원인을 표시합니다. 이미 성공한 패키지는 재설치하지 않습니다. MSYS2 전체 업데이트는 관리 전용 환경에서만 수행합니다. 다른 작업이 설치 중이면 잠금으로 중복 설치를 막습니다.

기반 도구 참고: [MSYS2 installer](https://www.msys2.org/docs/installer/), [Verilator documentation](https://verilator.org/guide/latest/), [UCRT64 Verilator](https://packages.msys2.org/packages/mingw-w64-ucrt-x86_64-verilator).

의미 분석 통합 테스트는 설치한 전용 `python.exe` 경로를 `RTL_SEMANTIC_PYTHON`에 지정한 뒤 `npm run test:semantic`으로 실행합니다. 이 변수를 지정하지 않으면 실제 slang 테스트는 건너뜁니다. 실제 편집기 검증에는 `RTL_SEMANTIC_TEST=1`을 추가합니다. `RTL_EDITOR_ONLY=1`도 함께 지정하면 시뮬레이션을 반복하지 않고 편집 기능만 검증합니다. 실제 언어 서버 검증에는 설치된 runtime을 포함한 `RTL_DEV_HOME`이 필요합니다.

의미 분석 기반 도구와 고정 배포 검증 정보: [slang](https://www.sv-lang.com/), [pyslang 11.0.0](https://pypi.org/project/pyslang/11.0.0/), [Python 3.14.7 공식 SHA256](https://www.python.org/downloads/release/python-3147/).

## 제품 요구사항과 현재 점검 결과

- [초기 아이디어 원문](docs/original-product-ideas.md)
- [25개 요구사항 구현 점검·미구현 항목·우선순위](docs/product-audit.md)
- [계층 다이어그램·클럭별 데이터 흐름 시각화 로드맵](docs/visual-debugging-roadmap.md)

모듈 포트 인자 안내 팝업을 지원하며, parameter 안내도 지원합니다. 일반 function/task 안내도 지원합니다. 포트 추천의 implicit `.name` 연결 제외와 점 뒤 공백 처리는 수정해 실제 편집기에서 검증했습니다. 사용자 환경에서 의미 분석이 시작되지 않는 문제와 자동 검증 결과는 구분해 추적합니다.

다음 개발 담당자는 [최신 인수인계](docs/handoff.md)부터 읽으세요. [진행현황](PROGRESS.md)에서 현재 완료 범위와 다음 작업을 확인할 수 있습니다. 이후 작업 순서는 [통합 실행 계획](docs/delivery-plan.md)을 기준으로 합니다.

### 언어 분석 상태 확인

RTL 파일을 열면 하단 상태 표시줄에 **RTL: Ready / Analyzing / Tools missing / Disabled** 등의 상태가 표시됩니다. 클릭하거나 RTL Start의 **Language Status** 버튼을 누르면 설치·재시도·도구 저장소·설정·로그를 열 수 있습니다. 상태 설명에는 실제 도구 저장 경로와 확인 가능한 프로젝트 경로가 나옵니다.

저장하지 않은 파일은 **Save file first**, manifest에 직접 등록되지 않은 파일은 **Not a listed source**로 표시합니다. include 헤더는 별도로 분석될 수 있어 이 표시가 무조건 분석 불가능을 뜻하지는 않습니다. 현재 include membership은 추적하지 않습니다. workspace 루트에 rtl.toml이 없으면 **Project not configured**이며, 프로젝트가 들어 있는 폴더를 직접 여세요. 소스 진단이 있으면 **Source errors**로 표시하고 Problems에서 확인합니다. 상태 갱신은 약 1.5초 간격입니다.

### 모듈 포트 인자 안내

모듈 인스턴스의 `(`, 쉼표 또는 `.port(`에서 포트 목록과 현재 인자 위치를 표시합니다. 포트 방향·타입과 parameter 적용 후 폭을 보여주며, 다른 파일의 미저장 변경도 분석 결과에 반영합니다. 이미 입력한 포트도 전체 선언 목록에는 남으며 현재 포트가 강조됩니다. 미연결 포트만 보여주는 점 자동완성과는 별도 기능입니다.

`#(...)`에서도 parameter 인자 안내를 지원합니다. 값/type parameter 이름과 선언의 평가된 기본값을 표시하고 localparam은 제외합니다. 이 기본값은 현재 입력한 override 결과가 아닙니다. 일반 함수/태스크 호출 안내도 지원합니다. 잘못된 named 포트, 중첩 함수 호출과 모호한 elaboration에는 포트 안내를 표시하지 않습니다. 실제 타이핑에서 팝업이 안 보이면 먼저 RTL Language Status로 분석 상태를 확인하세요.

### 함수·태스크 인자 안내

`function`/`task` 호출의 `(`, 쉼표에서 현재 범위의 실제 선언을 찾아 인자 방향·타입·이름을 보여줍니다. 함수 반환형과 선언에 적힌 기본값도 표시합니다. 이름으로 지정하는 인자는 해당 이름을 강조하며, 중첩 호출에서는 안쪽 호출을 우선합니다. `pkg::func(...)`도 지원합니다.

객체·클래스 메서드, 시스템 함수, `pkg::class::` 연속 접근은 아직 제외합니다. 분석할 수 없는 미완성 범위나 모호한 선언은 추측하지 않고 안내를 생략합니다. 호출마다 현재 미저장 내용을 compiler lookup으로 확인하므로 큰 설계에서는 지연될 수 있습니다. 물리 키 입력으로 뜨는 UI는 사용자 환경에서 추가 확인이 필요합니다.

### 포트에 연결할 신호 추천

`.port(` 안에서 현재 범위의 신호를 추천하고, 포트와 폭·부호·2/4상태가 같은 단순 정수형 신호를 먼저 제안합니다. 같은 조건에서는 포트와 이름이 비슷한 신호를 우선합니다. 폭이나 부호가 다른 후보도 남으며 추천 설명에 차이가 표시됩니다. 접두어를 입력하면 기존 이름 검색을 그대로 사용합니다.

예를 들어 8-bit 출력 포트 안에서는 8-bit `count`가 1-bit `clk`보다 우선합니다. 다른 표현식을 자유롭게 입력할 수 있으며 자동으로 연결하지 않습니다. enum·구조체·union·배열 등 복합 타입과 output/inout 연결의 쓰기 가능성은 이 정렬로 보장하지 않습니다. 실제 연결 오류는 compiler 진단을 확인하세요.

### enum case 항목 생성

enum 신호를 사용하는 빈 `case(state)`와 `endcase` 사이에 커서를 놓고, 편집기의 **Refactor…** 메뉴에서 **Generate enum case branches**를 선택하세요. 의미 분석이 준비된 프로젝트에서 enum 값별 항목과 `default`의 빈 블록을 생성합니다. enum 별칭, 다른 파일/package와 미저장 변경을 반영하고 필요한 package 이름을 붙입니다. 기존 주석·닫는 키워드를 보존하며 한 번의 Undo로 되돌릴 수 있습니다.

첫 지원 범위는 **단순 신호 이름을 사용하는 빈 일반 case**입니다. 기존 항목이 있거나 복잡한 표현식, casez/casex, 매크로, 중복 값, 알 수 없는 enum 값, 256개를 넘는 항목에는 액션을 제공하지 않습니다. 기존 항목에 누락된 항목을 추가하는 기능은 후속 범위입니다. 탭/줄바꿈과 문서에서 추정한 들여쓰기를 사용하고 추정할 수 없으면 공백 4칸을 사용합니다. 이 액션은 입력 중 자동으로 코드를 삽입하지 않습니다.

### 닫는 블록에 이름 붙이기

SystemVerilog에서 `begin : pipeline` 또는 `module counter`의 이름/여는 키워드, 대응하는 닫는 키워드에 커서를 놓고 **Refactor… → Add closing label '이름'**을 선택하세요. `end : pipeline`, `endmodule : counter`처럼 기존 이름을 붙입니다. package/interface/program도 지원하며 의미 분석 도구 설치는 필요하지 않습니다. 주석과 들여쓰기를 유지하고 한 번의 Undo로 되돌립니다.

이 액션은 이름을 새로 만들거나 기존 라벨을 고치지 않습니다. 이름 없는 begin, 이미 라벨이 있는 closer, 선택 영역, Verilog 언어 모드에는 제공하지 않습니다. 첫 버전은 구문상 짝이 모두 맞는 파일에서만 제공하며, 매크로/전처리기가 있는 파일과 extern 선언·assert property 등 구문 분석만으로 짝이 모호한 경우에는 생략할 수 있습니다. escaped 이름과 function/task/class 라벨은 후속 범위입니다. 입력 중 자동으로 라벨을 붙이지 않습니다.

### class와 fork 템플릿

SystemVerilog에서 줄 시작에 `class`를 입력하고 **Tab**을 누르면 `class 이름; … endclass` 틀이 생깁니다. 이름을 입력한 뒤 Tab으로 본문으로 이동합니다. 이는 반복 입력을 줄이는 구문 템플릿이며 class/object의 의미 분석과 멤버 추천을 지원한다는 뜻은 아닙니다.

`fork` 뒤 **Tab**은 병렬 실행 틀과 종료 방식 선택란을 제공합니다. **join**은 모든 자식이 끝날 때까지, **join_any**는 하나가 끝날 때까지 기다리며 **join_none**은 기다리지 않고 다음 문장으로 진행합니다. 선택란에서 종료 방식을 고른 뒤 Tab으로 본문으로 이동하세요. Verilog 모드에서는 `join`만 제공합니다. 일반 추천창의 class/fork 후보를 선택해도 같은 템플릿을 사용합니다.

기존 endclass/join 계열 키워드가 뒤에 있으면 확장을 생략하고 일반 Tab 동작을 유지합니다. 같은 줄의 기존 코드·주석, 매크로가 있는 파일, `virtual class`/`typedef class` 같은 접두어 문맥은 첫 버전에서 제외합니다. 네이티브 snippet이 들여쓰기·CRLF·필드 이동을 처리하며 확장을 Undo로 되돌릴 수 있습니다. **RTL › Editor: Templates**를 끄면 이 확장도 꺼집니다.


### 개발용 중간 규모 안정화 검증

초기 베타 기준 규모는 RTL 수백 파일·파형 수천 신호입니다. 생성 RTL256파일+top의 실제 slang 분석과4,096신호 두 reader/8,192신호 여유 측정을 추가했습니다. 현재 측정은 합성 입력 기준이며 실제 사용자 환경·화면 응답성·메모리 회수·깨끗한 Windows 수용은 남아 있습니다. 결과와 다음 순서는 [안정화 검증](docs/stability-validation.md)에 기록합니다.

개발자는 `npm run build` 후 `npm run verify:waveform-scale`로 같은 파형 측정을 재현할 수 있습니다. npm이 PATH에 없으면 `node scripts/build.mjs`, `node scripts/verify-waveform-scale.mjs`를 각각 실행합니다. 보고서와 생성 fixture는 개발 저장소의 `.dev/scale-tests/`와 `.dev/waveform-scale-latest.json`에 남습니다. 사용자 프로젝트를 수정하거나 배포 패키지를 만들지 않습니다. 언어 분석 재현에는 기존 설치된 `RTL_SEMANTIC_PYTHON` 설정이 필요하며 자세한 절차는 위 문서를 따릅니다.

파형 규모 측정 후 `npm run verify:waveform-lifecycle` 또는 `node --expose-gc scripts/verify-waveform-lifecycle.mjs`로 두 reader의8회 반복 수명을 확인합니다. 실제 중간 규모 editor 검증은 `RTL_MEDIUM_WAVEFORM_TEST=1`과 기존 `VSCODE_EXECUTABLE`을 설정한 뒤 `node scripts/test-vscode.mjs`를 사용합니다. 보고서는 각각 `.dev/waveform-lifecycle-latest.json`과 해당 `.dev/vscode-tests/run-*/project/.rtl/extension-test.json`입니다. 자동 host 통과와 실제 키/화면 수용은 별도이며 현재 별도 Windows PC/VM이 없어 깨끗한 OS 검증은 보류입니다.

현재 지원 범위의 종합 검증표와 발견 문제·보완 결과는 [종합 검증](docs/comprehensive-validation.md)에 기록합니다. 일반/실제 도구/editor host 통과와 실제 키·화면·깨끗한 OS 수용을 구분합니다. 새 기능 확장 전 이 표와 최신 인수인계를 확인하세요.
