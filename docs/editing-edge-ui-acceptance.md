# 편집 예외 화면 수용 — 2026-10-05

VS Code 1.140.0 격리 지속 저장 개발 창에서 Computer Use로 실제 키·마우스 입력을 확인했다. 검증 프로젝트는 `.dev/editing-edges/project`, 실행기는 `.dev/launch-editing-edges.mjs`다. 기존 `.dev/rtl-dev` 도구를 사용했고 설치/VSIX/제품 코드 변경은 없다.

## 통과한 범위

| 항목 | 실제 관측과 근거 |
|---|---|
| 탭/CRLF begin | 화면에 Tab Size:4/CRLF 확인. 한 탭 뒤 begin에서 Tab → begin/end 사이 커서 → Enter. 본문 두 탭, end 한 탭, 중복 closer 없음 |
| Undo | Enter 한 번 Undo → inline beginend, Tab 한 번 Undo → begin. 직접 Enter도 동일한 본문 들여쓰기/closer 생성 |
| 저장 바이트 | `begin-tab-saved.json`: CRLF3개, bare LF 없음, `\tbegin\r\n\t\t\r\n\tend` |
| 탭/CRLF module | module Tab → 이름 TabProbe 입력 → Tab 포트 필드 → input logic clk 입력 → Tab 본문 필드(화면 line5 col9) |
| 템플릿 바이트 | `module-tab-saved.json`: CRLF5개, bare LF 없음. 포트/본문 두 탭, module/닫는 괄호/endmodule 한 탭 |
| 다른 파일의 미저장 package | edge_pkg.sv의 EXPORTED를 UPDATED로 바꾸고 저장하지 않음. consumer.sv의 edge_pkg::에서 명시적 추천을 요청하니 UPDATED만 표시, Tab 수락 후 Ready |
| 디스크 보존 | 후보 조회 직전 디스크에는 EXPORTED가 그대로 있음(`package-unsaved-disk.json`). 동일 파일 조회를 파일 간 수용으로 세지 않음 |
| Disabled | 검증 프로젝트 설정의 rtl.editor.semantic=false → 실제 상태 표시줄 Disabled |
| Tools missing | 격리 개발 프로필의 도구 경로를 빈 경로로 지정 → 실제 Tools missing 및 Set Up 안내. 상태 메뉴에 경로/원인과 설치·Retry·설정·로그 접근 확인 |
| 복구 | 격리 프로필 도구 경로 설정을 비워 원래 RTL_DEV_HOME 사용으로 복원하고 상태 메뉴 Retry Analysis 클릭 → 미저장 UPDATED 두 파일 유지, 기존 도구 경로와 Ready 확인 |

설정 변경은 검증 fixture/격리 개발 프로필 파일로 준비했으며 사용자 설정 화면의 토글 조작을 완료했다고 주장하지 않는다. 누락 안내에서 설치 버튼을 누르지 않았고 새 다운로드/설치는 없다. 프로필에는 새 빈 settings.json(`{}`)만 남으며 도구 경로 override는 제거했다. 원래 사용자 프로필과 시스템 PATH는 수정하지 않았다.

begin/module probe는 manifest에 없는 편집 전용 파일이다. Not a listed source는 예상 상태이며 slang 분석 성공 또는 시뮬레이션 성공 근거로 취급하지 않는다. package/consumer는 manifest에 포함되며 실제 의미 분석과 후보/Ready를 확인했다. 처음 fixture manifest의 빈 test sources가 거절되어 consumer.sv를 명시한 뒤 검증했다. fixture 작성 실수를 제품 결함으로 세지 않는다.

## 검사와 재개

관련 language/semantic-queries 자동20 PASS/0 fail/skip (`.dev/editing-edges-regression.log`). 타입 검사와 개발 빌드 exit0, 개발 창 정상 종료 exit0 (`.dev/editing-edges-host.log`). 새 native/전체 suite 검증으로 확대하지 않는다. 미저장 package/consumer 변경은 저장하지 않고 개발 창의 hot-exit 상태로 보존했다. JSON 근거는 최종 종료 전 관측 시점을 기록한다.

다음은 구조 X/Z·미기록 포트·Up/double-click 및 저장 보기 관리/누락 신호의 실제 화면이다. 실제 사용자 프로필 충돌, 대표 실제 설계/loading 취소/두 reader 메모리 회수도 남는다. 큰 검증3묶음과 깨끗한 Windows 별도 보류1 유지. 별도 PC/VM 없음은 이미 확인했으며 합성 fixture를 실제 설계로 간주하지 않는다. 모든 탭 크기/혼합 들여쓰기/호출 형태나 전체 A3/F 완료가 아니다.
