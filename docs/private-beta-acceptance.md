# F1X — 0.3.1 스터디 비공개 베타 수용

사용자가 2026-10-06 스터디 내부에서 먼저 사용하면서 검증하는 배포를 승인했다. 이전 개발 중 VSIX 금지 기록은 당시 정책이며, 이번 요청 범위에서는 VSIX와 CLI/예제 묶음을 만든다. Marketplace 게시나 기본 사용자 프로필에 자동 설치하지 않는다.

현재 등급은 **private beta**다. 독립 Code-OSS 앱/EXE나 정식 stable이 아니다. 기존 로드맵 1–5의 구현 부분집합을 사용해 보고, 중요한 오류와 반복되는 UX 불편부터 수정한다. 독립 앱·자체 컴파일러는 지금 패키징의 완료 조건이 아니다.

## 이번 변경과 검사

- 전체 자동 회귀 최초 실행: 184개 중 182 PASS / 2 FAIL. F1K에서 행 컨테이너가 `#trace-rows`로 바뀐 뒤 두 webview 시험이 이전 `#traces`를 조회했다. 시험 참조만 수정했으며 제품 렌더링은 변경하지 않았다.
- 수정 후 전체 `tests/*.test.ts`: **184 PASS / 0 FAIL / 0 SKIP**, 별도 타입 검사 통과. 두 집중 시험은 전체 184개에 포함되므로 더하지 않는다.
- 확장 버전 0.3.1, bundle CLI의 workspace 버전은 기존 0.1.0. VSIX에는 번들 extension/server/worker, Python bridge, 파형 JS/CSS, 문법/아이콘, 사용 안내/라이선스가 들어 있다. src/node_modules/source map/과거 검증 문서는 제외했다.
- `scripts/package.mjs`는 Core 템플릿으로 배포 예제를 생성한다. 사용자가 수정한 `examples/counter`를 복사하거나 수정하지 않는다. 같은 버전의 예제 폴더가 이미 존재하면 재생성을 거부하므로 다시 패키징할 때 기존 묶음을 별도로 보존해야 한다.
- 실제 VSIX 설치 위치: `.dev/package-tests/run-BHIbpi/extensions/rtl-dev-local.rtl-dev-0.3.1`. 사용자 기본 프로필과 분리했다. 설치 폴더를 개발 테스트 호스트로 로드하여 실제 배포 파일을 검사한다. GUI로 설치 버튼을 누른 검사나 깨끗한 OS 설치 시험과는 다르다.
- 최초 native smoke에서 lexical/semantic 및 두 시뮬레이션 PASS 후 연결 상태 검사 실패. 구조를 열기 전에 연동을 요구한 검사 순서를 수정했다. 최종 결과는 아래 수용 결과와 `.rtl/package-test.json`을 기준으로 판단한다.
- 배포 CLI 복사본에서 실제 `check`, `test --all` exit0, 두 테스트 PASS. `hierarchy counter_basic --json`도 exit0, counter DUT/포트 및 diagnostics 빈 배열 확인. 기존 공유 도구를 사용했으며 설치 시험은 아니다.

### 최종 패키지 수용 결과

`scripts/test-private-beta.mjs`로 새 격리 프로필 `.dev/package-tests/final-HjhRaE`에서 설치된 VSIX 폴더를 테스트 호스트로 로드했다. lexical/semantic 검사, 두 테스트 PASS, recorded structure의 ready, 내장 VCD metadata 및 연결 ready, 닫기, 포함된 bridge/server/worker/JS/CSS 읽기 검사를 통과했다. `.rtl/package-test.json`의 passed=true와 `RTL_INSTALLED_PACKAGE_PASS`, 프로세스 exit0을 확인했다. 단순 실행 요청 반환이나 이전 run-BHIbpi/project-final의 미완료 실행을 통과로 세지 않는다.

GUI/CLI는 같은 pristine counter 템플릿의 두 테스트에서 PASS 결과가 일치한다. 검사는 기존 도구/격리 개발 테스트 호스트를 사용했으며 실제 GUI 설치 조작·새 PC 승인 설치 통과를 의미하지 않는다. ZIP에는 검사 프로젝트 생성물/프로필/개인 경로가 포함되지 않는다. 공유 묶음의 `VALIDATION.json`, `KNOWN-ISSUES.md`, 파일별 SHA256 및 ZIP SHA256으로 수용 범위와 무결성을 확인한다.

최종 VSIX 410,630 bytes / ZIP 516,010 bytes. native 검사 후 실제 번들에 포함된 30개 dependency 라이선스를 추가했다. 최종 VSIX의 런타임·사용 안내는 검사된 설치 파일과 SHA256 일치, package.json은 VS Code가 추가한 `__metadata`를 제외하면 동일하다. 추가 notice는 원본 SHA256 일치. ZIP의 16개 파일 내용과 `.gitignore` 포함/생성물 제외를 확인했다. `dist/SHA256SUMS-0.3.1.txt`는 최종 VSIX/ZIP의 해시를 기록한다. 라이선스 추가 후 native 결과를 새 실행으로 재계산하지 않는다.

재현: Node22+와 의존성이 준비된 저장소에서 `node scripts/package.mjs`. 격리 폴더에 VSIX 설치 후 `VSCODE_EXECUTABLE`, `RTL_INSTALLED_EXTENSION`(설치 폴더), `RTL_DEV_HOME`(공유 도구)을 지정해 `node scripts/test-private-beta.mjs`를 실행한다. runner는 새 `.dev/package-tests/final-*`에 예제/프로필을 생성하고 Electron CLI용 환경을 분리하며 host exit code를 전달한다. 최종 ZIP/VALIDATION/KNOWN-ISSUES/해시 작성은 이번 수용 후 별도로 수행했으며 package 명령 자체가 native 수용/ZIP까지 자동화하지는 않는다.

## 발견한 문제와 남은 게이트

- native semantic 검사 중 빠른 설정 변경/재시작에서 `vscode-languageclient`의 `Delivering pending changes failed: TypeError: this.task is not a function`을 두 실행에서 관측했다. 이후 추천·signature·manifest 복구 검사 자체는 PASS였다. 원인/수정은 미완료이며 재시작 경쟁 상태를 다음 수정 우선순위로 둔다. 재현 시 Reload로 비교하고 언어 로그를 첨부한다. 의도적인 ENOENT/잘못된 TOML 검사 오류와 구분한다.
- 깨끗한 Windows 승인 설치→시뮬레이션→파형 전체는 별도 PC/VM 부재로 미검증이다. 이번 설치는 기존 도구를 재사용했다.
- 대표 사용자 RTL/장시간 메모리·성능, 정상 외부 linter 충돌, 실제 Escape/일부 DPI 조작 잔여는 유지한다. F1V 합성 규모 검사를 실제 설계 전체 수용으로 표현하지 않는다.
- 내장 VCD 한도와 enum 지원 부분집합은 [사용 안내](private-beta-guide.md)를 따른다. 내부 FST, 자동 TB 발견, 정확한 Explorer 파일 행 hover 실행, 클럭 재생·내부 연산 그래프, 독립 앱은 아직 없다.

## 다음 실행 순서

1. 스터디원이 ZIP의 START-HERE 안내로 설치 → 예제 두 PASS → 내장 파형 열기를 확인한다. 최초 설치 성공/실패와 버전을 기록한다.
2. 각자 RTL 복사본으로 편집·실행·파형을 사용하고 재현 코드/로그를 모은다. 신호 보기 preset은 PC별 프로필에 저장된다.
3. 언어 재시작 경쟁 문제 및 실제 사용의 중단/오류부터 수정하고 회귀 검증한 0.3.x 비공개 베타를 만든다.
4. 깨끗한 Windows와 대표 프로젝트의 반복 사용이 확인된 후 stable 여부를 판단한다. 이후 U12 가벼운 프로젝트/TB 발견부터 제품 개선을 진행한다.

공유 방법·사용법은 [비공개 베타 안내](private-beta-guide.md), 전체 범위는 [로드맵](project-roadmap.md), 다음 소유자 시작점은 [handoff](handoff.md)다.
