# F1U 사용자 편집 프로필의 제한된 충돌 검증 (2026-10-06)

현재 Code/User 기본 프로필의 RTL 편집 관련 설정과 실제 설치된 mshr-h.veriloghdl 1.29.0을 격리 개발 창에 복제했다. 원래 프로필/설치 확장은 수정하지 않았다. 기본 프로필의 관련 사용자 키 바인딩은 0개이며 editor/RTL 편집 재정의는 없었다. Verilog linter 설정 2개를 복사했다. 계정/저장소 데이터, 기타 확장, 사용자 snippets, 이름 있는 프로필 및 workspace 설정은 제외했다. 모든 사용자 환경의 수용 완료를 뜻하지 않는다.

## 구현한 검증 경로

- scripts/editor-profile.mjs: JSONC 설정을 읽고 편집 관련 설정/바인딩만 복사한다. 기존 Verilog 확장 하나만 복사하며 오래된 설치 RTL 확장은 제외한다. 원본 설정 파일의 SHA를 기록한다. jsonc-parser는 개발 의존성으로 명시했다.
- scripts/test-vscode.mjs: RTL_EDITOR_PROFILE_TEST=1에서만 복제한 확장을 활성화한다. 기존 검증의 --disable-extensions 경로는 유지한다. RTL_EDITOR_PROFILE_PHYSICAL=1은 이 모드를 요구하며 실제 입력 창을 표시한다.
- tests/vscode/editor-profile.ts: 기존 editor/semantic native 검사를 재사용한다. 물리 입력 모드는 별도로 준비한 네 파일에서 문서/커서 위치를 검사한다. fixture 준비/단계 진행은 키 입력 자체를 대신하지 않는다.

제품 코드나 기본 키 바인딩은 변경하지 않았다. VSIX 생성/설치도 하지 않았다.

## 실제 command/provider 검사

격리 run-22Vp8d. VSCODE_EXECUTABLE=D:/Tools/Microsoft VS Code/Code.exe, RTL_DEV_HOME=D:/Dev/verilog_ide/.dev/rtl-dev, RTL_EDITOR_PROFILE_TEST=1, node scripts/test-vscode.mjs.

mshr-h.veriloghdl을 명시적으로 activate하고 isActive=true를 확인했다. module/package/case/class/fork 템플릿, native snippet placeholder, begin 수락 후 커서/Enter, 기존 closer 재사용, comments/strings, if/always에 블록 강제 삽입 없음, tabs/CRLF, undo, 기본 completion, 설정 비활성화를 검사했다.

의미 분석에서는 미저장 포트 추천/이미 연결된 포트 제외, 방향·폭/연결 후보, module parameter 및 함수·task signature, enum case, package/import/lexical scope, hover/definition/diagnostics, restart와 설정·manifest 실패 복구를 검사했다. 기존 semantic suite의 지원 부분집합이다.

run-22Vp8d/project/.rtl/extension-test.json: passed/editorProfile/lexicalCommands/semantic=true, peer active=true version1.29.0, physicalKeys=false. host/launcher exit0. command 실행을 실제 키 입력으로 계산하지 않는다.

## 실제 Tab/Enter 입력

격리 run-MmeiXH. 위 설정에 RTL_EDITOR_PROFILE_PHYSICAL=1을 추가했다. Computer Use 스킬의 Sky native 입력으로 실제 편집 영역을 클릭한 뒤 각 사례에 한 번씩 키를 입력했다. 단순 문서 준비에는 completion menu가 열려 있지 않았다.

| 실제 입력 | 정확한 결과와 커서 |
|---|---|
| module + Tab | module 이름/port/body/endmodule 템플릿, 0행 character7 |
| package + Tab | package 이름/body/endpackage, 0행 character8 |
| begin + Tab | beginend 사이, 0행 character5 |
| begin + Enter | begin/들여쓴 본문/end, 1행 character4 |

각 입력 후 실제 화면을 관찰하고 단계 진행 신호를 보냈다. 검사기는 화면과 별도로 document text/selection을 확인했다. 물리 입력 코드는 rtl.expandTemplate/rtl.insertNewline을 호출하지 않는다. run-MmeiXH/project/.rtl/extension-test.json의 physicalKeys/passed=true, 네 observation의 내용/커서가 일치하며 host/launcher exit0.

이번에는 module 이름→port→body의 여러 번 물리 Tab, begin Tab 뒤 Enter, suggest widget 열린 상태, Ctrl+Z/다중 커서/F5/사용자 snippet 충돌까지 물리 입력으로 검사한 것은 아니다. 이 중 command/provider로 검사한 경우와 구분한다.

## 관련 검사와 원본 보존

TypeScript --noEmit 및 native launcher 개발 build exit0. tests/language.test.ts 11 PASS. 함께 실행한 semantic/completion.test.ts 7개는 integration flag 없이 SKIP였으므로 semantic PASS 숫자에 포함하지 않는다. native semantic suite 통과는 별도 근거다.

run-22Vp8d/editor-profile-source-check.json: 원본 settings.json/keybindings.json의 검증 후 SHA가 준비 당시 SHA와 동일하다. 물리 run도 같은 입력 SHA를 사용했다. 사용자 소스 examples/counter 및 사용자 프로필을 변경하지 않았다.

## 발견한 환경 제한과 다음 순서

기존 Verilog 확장이 활성화되었지만 자체 linter는 verilator_bin.exe를 PATH에서 찾지 못해 ENOENT 로그를 남겼다. RTL_DEV_HOME은 우리 도구 탐색을 위한 것이며 외부 확장의 PATH를 자동 변경하지 않는다. 또한 현재 modelsim.arguments 값에 verilator 옵션 설정 문장이 문자열로 들어 있다. 이를 사용자 의도로 단정하거나 자동 수정하지 않았다.

따라서 이번 결과는 활성 peer의 편집 기능과 우리 lexical/semantic 동작 및 기본 키 입력의 호환성이다. 외부 linter도 정상 실행되는 상황의 diagnostics 중복/충돌은 미검증이다. 사용자에게 필요하다면 해당 확장의 lint 설정을 별도로 정리하는 선택지를 안내하되 시스템 PATH/사용자 설정을 묵시적으로 바꾸지 않는다.

다음 주 검증은 대표 규모·loading 취소·두 reader 메모리 복구다. 편집 프로필 게이트에는 정상 외부 linter, 사용자 snippets/이름 있는 프로필/workspace 재정의 및 추가 물리 입력의 잔여를 유지한다. 깨끗한 Windows, OS DPI/physical Esc, pan/zoom full-query 지연과 전체 성능 수용도 미완료다.
