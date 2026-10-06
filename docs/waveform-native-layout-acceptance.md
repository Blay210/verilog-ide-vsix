# F1O 장시간 진단·실제 창 정렬 검증 (2026-10-06)

F1N에서 중단된 최신 커서 진단과 실제 창의 overflow/폭 변경 검증을 이어서 수행했다. 절대시간 표시 방식은 사용자 사용 피드백으로 추후 개선할 수 있다.

## 재현과 범위

기존 VS Code 1.140.0을 격리 개발 프로필로 실행했다. `RTL_MANUAL_ACCEPTANCE=1`, `RTL_MANUAL_DENSE=1`, `RTL_WAVEFORM_RENDER_TEST=1`, `VSCODE_EXECUTABLE=D:/Tools/Microsoft VS Code/Code.exe`, `node scripts/test-vscode.mjs`.

이번 결과는 `.dev/vscode-tests/run-ljPKYm/project/.rtl/`에 있다. 원점 9007199254740993 ps, 32개의 8bit 신호와 4096 step 합성 VCD를 사용한다. 사용자 examples/counter를 수정하지 않았다.

수동 harness에 `manual-layout.json`의 revision 1..4와 single/dense 두 이름만 받는 제한된 fixture 준비 경로를 추가했다. 이 경로는 동일 창에서 1 부모/0 bit 및 32 부모/128 bit 구성을 준비한다. 일반 UI 사용자 동작이나 체크박스 수용 증거로 세지 않는다. Development/Test 명시 진단 flag와 격리 workspace 검사는 유지한다. 마우스/키보드는 native Computer Use로 별도 조작했다.

## 실제 화면과 수치 대조

- 160행에서 오른쪽 canvas를 클릭해 ruler/trace 커서가 같은 x 위치인 것을 확인했다.
- single 준비 후 실제 세로 파형 스크롤바가 사라진 화면에서 정렬을 확인했다. 같은 창을 최대화/복원해 약 1707×1019 및 1443×904 화면에서 커서 선이 일치함을 관찰했다. 임의 창 테두리 drag는 크기를 변경하지 못했으므로 성공으로 세지 않는다.
- dense 재준비 후 스크롤바가 다시 생겨도 오른쪽 커서 정렬을 확인했다. 현재 폭에 따라 한 줄/두 줄 절대시간 눈금이 선택되는 것도 확인했다.
- 창 초기화 뒤 **132331.3 ms**에 물리 canvas 클릭한 커서 `9007199254744621`의 새 진단이 수신됐다. 부모32개와 bit128개를 fixture 생성 규칙에서 독립 계산한 값으로 모두 대조했다. `late-cursor-checked.json`: passed=true. F1N의 2분 이후 누락 보완이 실제 host에서 확인됐다.
- canvas 포커스 **Ctrl+-**로 VS Code UI는 축소됐고, 새 resize 응답의 정확한 cursor/from/to는 이전과 동일했다. `host-zoom-checked.json`: passed=true. 축소 뒤 ruler/trace 선도 정렬됐다.
- 일반 **=**는 span4095→2047 tick으로 파형을 확대했고 커서를 유지했다. 범위3041..4095 step. 일반 **Left**는 span을 유지하며 범위를2530..4577의 절대 tick suffix로 이동했다(`from=9007199254742530`, `to=9007199254744577`). 커서가 범위 밖이 되면 선이 보이지 않는 정상 동작을 관찰했다. wave-zoom-checked/wave-pan-checked: passed=true.

late cursor 한 번의 renderer RTT218.8ms/draw30.4ms는 국소 관측이다. 부하/폭이 다른 이전 숫자와 성능비율을 계산하지 않는다. dense 응답성/전달 비용의 수용은 아직 아니다.

## 종료와 검증

관련39 tests PASS/0 fail/skip, TypeScript 검사 exit0, native runner 개발 build 및 host exit0. `extension-test.json`: passed/sourceHashPreserved=true, manualHarness=true, acceptancePassed=false. 자동 receipt는 source SHA 보존과 harness 종료 증거이며 위 제한된 물리 검증을 전체 제품 수용으로 확대하지 않는다.

## 다음 작업과 남은 한계

이번 좁은 실제 창 검사 묶음은 완료했다. 다음 순서는 **dense query/전달 비용 계측**이다. worker query, worker 왕복, webview 전체 왕복, payload/직렬화 및 renderer 비용을 구분하고 충분한 근거 후 bounded 후보를 비교한다. 최신 요청/Reload/loading/cancel/peer 및 정확한 값 보존은 필수다.

실제 OS DPI 변경, Ctrl 비연속 mouse group 및 drag 중 물리 Escape는 별도 미검증이다. 기존 bundled VM 통과와 구분한다. 대표 설계(수백 RTL/수천 신호), 실제 사용자 프로필 충돌, retained 구조 경계, RSS 기준선 회수/이전900ms 원인, 깨끗한 Windows 별도 환경 부재도 유지한다. 배포/VSIX/자체 compiler/Code-OSS fork를 시작하지 않는다.
