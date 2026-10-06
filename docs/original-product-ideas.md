좋아. 지금까지 너랑 같이 얘기하면서 나온 걸 **“네가 실제로 불편함을 느껴서 넣고 싶어 한 기능” 중심**으로 다시 정리해보면 꽤 명확해. 단순 아이디어 목록이 아니라, **왜 필요했는지 / 우리가 어떤 형태로 발전시켰는지 / 구현 점검 포인트가 뭔지**까지 같이 묶어서 볼게.

## 1. 모듈 인스턴스할 때 포트 정보를 매번 파일 열어서 확인해야 하는 불편

네가 가장 처음 강하게 얘기한 불편 중 하나였어.

예를 들어:

```systemverilog
alu u_alu (
    .???
);
```

이렇게 인스턴스할 때 매번 `alu.sv` 파일로 가서:

```systemverilog
input logic clk;
input logic [31:0] a;
output logic [31:0] result;
```

를 확인해야 하는 게 귀찮다는 거였지.

우리가 발전시킨 방향은:

- module 이름
- parameter
- input/output/inout
- type
- width

를 IDE가 semantic하게 이해하고,

```systemverilog
alu u_alu (
```

까지 입력했을 때 함수 호출처럼:

```text
alu #(
    WIDTH = 32
)

input  clk      logic
input  a        logic [WIDTH-1:0]
input  b        logic [WIDTH-1:0]
output result   logic [WIDTH-1:0]
```

를 보여주는 것.

### 구현 점검
- module instance context를 인식하는가?
- 해당 module definition을 찾는가?
- parameter와 port가 모두 나오는가?
- width/type도 보이는가?
- 다른 파일에 정의된 module도 되는가?

이건 **핵심 UX 1순위**야.

---

## 2. `.port(` 입력할 때 가능한 port를 추천해주는 기능

여기서 한 단계 더 나갔지.

```systemverilog
alu u_alu (
    .
```

까지 치면:

```text
clk
rst_n
a
b
opcode
result
```

가 뜨는 방식.

그리고 이미 쓴 포트는 제외.

```systemverilog
alu u_alu (
    .clk(clk),
    .a(a),
    .
```

이면:

```text
rst_n
b
opcode
result
```

만 뜨는 식.

### 나중에 발전시킨 아이디어
`.opcode(`까지 입력했을 때:

```text
Expected: input logic [2:0]

Recommended:
opcode
alu_opcode
decoded_opcode
```

처럼 **width/type이 맞는 signal을 우선 추천**.

### 구현 점검
- `. ` 뒤에서 port completion이 뜨는가?
- 이미 연결한 port를 제외하는가?
- port direction/type/width를 함께 보여줄 수 있는가?
- 향후 type-aware ranking을 넣을 구조가 있는가?

---

## 3. `pkg::` 뒤에서 package 안의 symbol 자동완성

너가 package를 실제 프로젝트에서 굉장히 유용하게 썼다고 했고, 이걸 꽤 중요하게 얘기했어.

예:

```systemverilog
cpu_pkg::
```

를 치면:

```text
WIDTH
opcode_t
state_t
ALU_ADD
ALU_SUB
instruction_t
decode_opcode()
```

같이 package 내부의 접근 가능한 symbol이 자동완성 목록으로 나오는 것.

### 포함 대상
- typedef
- enum
- parameter
- localparam
- function
- task
- class
- struct/union type
- 기타 package-visible symbol

### 추가로 얘기했던 것
`import cpu_pkg::*;`가 되어 있으면:

```systemverilog
sta
```

만 입력해도 `state_t` 같은 imported symbol이 추천되어야 함.

반대로:

```systemverilog
import cpu_pkg::state_t;
```

만 했으면 그 symbol만 노출.

### 구현 점검
- `pkg::` context를 인식하는가?
- package symbol table이 만들어지는가?
- package가 다른 파일에 있어도 되는가?
- `import pkg::*`를 scope에 반영하는가?
- `import pkg::symbol`도 구분하는가?

이것도 **너가 실제 RTL하면서 느낀 핵심 불편**이야.

---

## 4. 일반적인 VS Code식 semantic autocomplete

너가 말한:

> `pri`만 쳐도 printf 같은 후보가 뜨는 것처럼 Verilog에서도 했으면 좋겠다.

이거.

단순 keyword 추천이 아니라 **현재 scope에서 사용 가능한 것만 보여주는 completion**이 목표였어.

예:

```systemverilog
assign result =
```

까지 썼다면:

```text
a
b
opcode
carry
alu_result
WIDTH
ALU_ADD
```

같은 현재 context symbol만 추천.

### 추천 대상
- local signal
- variable
- parameter
- localparam
- port
- imported symbol
- function
- task
- type
- enum literal

### 구현 점검
- lexical completion이 아니라 semantic completion인가?
- 현재 module/function/block scope를 구분하는가?
- 다른 module 내부 signal이 섞이지 않는가?
- prefix filtering이 되는가?
- fuzzy matching을 붙일 여지가 있는가?

---

## 5. `begin` 입력하면 `end` 자동 생성

이것도 네가 소프트웨어 개발환경에서 특히 편했다고 한 기능.

원하는 동작은:

```systemverilog
begin|
```

에서 Enter를 치면:

```systemverilog
begin
    |
end
```

즉:

- `end` 자동 생성
- indentation 자동
- cursor가 block 내부로 이동

### 중요한 원칙
너가 정확하게 짚은 게:

```systemverilog
if (...)
```

나

```systemverilog
always_ff (...)
```

는 반드시 begin/end가 필요한 게 아니니까 자동으로 block을 강제하면 안 된다.

즉:

```text
begin을 입력했을 때만 → end 자동 생성
```

이 원칙.

### 구현 점검
- `begin` + Enter에서 `end`가 생기는가?
- indentation이 맞는가?
- cursor 위치가 맞는가?
- 이미 `end`가 있으면 중복 생성하지 않는가?

---

## 6. `case` → `endcase` 자동 생성

네가 직접:

> case는 무조건 endcase가 뒤에 붙어야 하니까 case 치면 같이 생기면 좋겠다.

라고 했던 기능.

예:

```systemverilog
case (state)
    |
endcase
```

### 확장 가능 대상
우리가 나중에 같이 얘기했던 pairing:

```text
begin / end
case / endcase
module / endmodule
package / endpackage
interface / endinterface
function / endfunction
task / endtask
class / endclass
generate / endgenerate
fork / join
```

### 구현 점검
- `case`를 실제 case statement context로 인식하는가?
- `casez`, `casex`도 고려 가능한가?
- closing keyword 중복 방지가 되는가?
- indentation이 자연스러운가?

---

## 7. 테스트벤치를 여러 개 만들고 원하는 것만 실행

이건 simulation UX에서 네가 추가한 중요한 요구사항.

프로젝트에:

```text
alu_basic_tb
alu_overflow_tb
cpu_fetch_tb
cpu_branch_tb
...
```

처럼 여러 testbench가 있을 때:

### 실행 모드
- Run Current
- Run Selected
- Run All

### 원하는 GUI

```text
Testbenches

☑ alu_basic_tb
☐ alu_overflow_tb
☑ cpu_fetch_tb
☐ cpu_branch_tb

[ Run Selected ]
[ Run All ]
```

### 구현 점검
- 여러 test target을 project model이 이해하는가?
- GUI에서 체크 선택 가능한가?
- current/selected/all을 구분하는가?
- 실행 target별 결과를 따로 저장하는가?

---

## 8. 테스트별 PASS / FAIL / 실행시간 / waveform 결과

위 기능에서 자연스럽게 확장된 것.

원했던 느낌은:

```text
alu_basic_tb       ✓ PASS   0.42s
alu_overflow_tb    ✕ FAIL   0.31s
cpu_fetch_tb       ✓ PASS   1.18s
```

그리고 실패한 테스트를 누르면:

```text
[ Open Source ]
[ Open Waveform ]
[ Re-run ]
```

### 구현 점검
- test별 result object가 존재하는가?
- PASS/FAIL 기준이 정의되어 있는가?
- execution time을 저장하는가?
- stdout/stderr/log를 test별로 갖는가?
- waveform 경로가 test result와 연결되는가?

---

## 9. Verilator/Icarus/ModelSim/Xcelium/XSim 등을 선택 가능한 구조

처음엔 MVP니까 Verilator 하나만 쓰되, **처음부터 Verilator 전용 프로그램으로 만들면 안 된다**고 했지.

우리가 정한 방향:

```text
SimulatorBackend
├─ VerilatorBackend
├─ IcarusBackend
├─ QuestaBackend
├─ ModelSimBackend
├─ XceliumBackend
└─ XSimBackend
```

### 핵심
사용자가:

```text
Simulator
● Verilator
○ Icarus
○ Questa
○ Xcelium
○ XSim
```

선택할 수 있게.

하지만 MVP는 Verilator only.

### 구현 점검
- backend interface가 따로 있는가?
- Verilator CLI 호출 코드가 core에 박혀 있지 않은가?
- 향후 backend 추가 시 기존 core를 크게 고칠 필요 없는가?

---

## 10. backend-specific CLI 옵션을 사용자가 몰라도 되게

이건 우리가 꽤 중요하게 얘기한 architecture 철학.

나쁜 예:

```toml
verilator_flags = "--binary --timing --trace-fst"
```

좋은 예:

```toml
timing = true
waveform = "fst"
coverage = true
```

그다음:

```text
Core intent
→ VerilatorBackend
→ --timing --trace-fst
```

식으로 translation.

### 구현 점검
- `rtl.toml`이 Verilator-specific하지 않은가?
- user intent와 tool flags가 분리되어 있는가?
- backend가 options를 해석하는가?

---

## 11. source file을 일일이 command에 넣지 않아도 되는 프로젝트 관리

너가 Verilator 쓰면서 실제로 불편했다고 한 부분.

현재:

```bash
verilator a.sv b.sv c.sv d.sv ...
```

를 사용자가 매번 관리하는 게 불편.

우리가 원한 건:

```text
rtl/
├─ top.sv
├─ alu.sv
├─ regfile.sv
└─ controller.sv
```

를 project가 알아서 읽고 dependency를 구성하는 것.

### 구현 점검
- glob source discovery가 되는가?
- include dir를 처리하는가?
- package/import dependency를 처리하는가?
- top module을 기준으로 source graph를 구성하는가?
- 사용자가 file list를 매번 작성하지 않아도 되는가?

---

## 12. `rtl.toml` 하나로 프로젝트 설명

Vivado project가 너무 무거웠던 경험에서 나온 아이디어.

우리가 원하는 repository:

```text
my-cpu/
├─ rtl/
├─ tb/
├─ rtl.toml
├─ README.md
└─ .gitignore
```

정도.

`rtl.toml`에는:

- project name
- top
- sources
- include dirs
- defines
- default simulator
- waveform
- tests

정도만.

### 구현 점검
- 설정 파일 하나로 프로젝트가 열리는가?
- 별도의 import/create project wizard가 필수가 아닌가?
- git clone 후 folder open만으로 인식되는가?

---

## 13. Vivado처럼 프로젝트 파일을 엄청 생성하지 않기

이건 너가 아주 강하게 강조했던 부분.

Vivado를 쓰면:

```text
.cache
.gen
.hw
.ip_user_files
.runs
.sim
.srcs
```

등이 잔뜩 생기고 GitHub에 소스만 관리하기 귀찮다는 문제.

우리가 정한 원칙:

> **Source repository must remain clean.**

generated data는:

```text
.rtl/
├─ build/
├─ cache/
└─ waves/
```

하나에 몰거나,

아예:

```text
~/.rtl-dev/cache/project-hash/
```

같은 외부 cache로.

### 구현 점검
- project open/run 후 root에 무슨 파일이 생기는가?
- `.rtl/` 이외에 불필요한 파일이 생성되는가?
- `.gitignore` 한두 줄로 정리가 가능한가?

이건 꼭 실제 MVP 폴더를 열어서 확인해봐야 해.

---

## 14. 필요한 툴이 없으면 GUI에서 설치 안내 + 자동 설치

너가 추가한 굉장히 중요한 zero-setup 요구사항.

사용자가 IDE 설치했는데:

```text
Verilator 없음
slang 없음
Surfer 없음
```

이면 terminal에서 알아서 설치하라고 하면 안 된다고 했지.

원한 UI는:

```text
RTL Environment Setup

✓ Git
✕ Verilator
✕ slang

[ Install Missing Components ]
```

사용자가 승인하면 설치.

### architecture
우리가 얘기한 구조:

```text
DependencyManager
├─ detect()
├─ install()
├─ update()
└─ healthCheck()
```

그리고:

```text
InstallProvider
├─ WindowsProvider
├─ LinuxProvider
├─ MacProvider
└─ PortableBinaryProvider
```

### 구현 점검
- 최소 Verilator/slang detect가 되는가?
- GUI에서 Ready/Missing이 표시되는가?
- 설치 버튼/approval flow가 있는가?
- 설치가 아직 stub이라면 provider 구조는 있는가?
- PATH hardcoding 없이 tool location을 찾는가?

---

## 15. Windows-first + cross-platform

너가 현재 Windows 중심이고 Vivado도 Windows에서 많이 쓰니까 나온 원칙.

### 우리가 원한 구조
- Windows 우선 지원
- Linux도 지원
- macOS 가능하면 지원
- `bash` shell 전제로 만들지 않기
- executable + args 형태로 process 실행

예:

```ts
spawn("verilator", ["--binary", ...]);
```

### 구현 점검
- path separator hardcoding이 없는가?
- `/usr/bin/...` 같은 가정이 없는가?
- `.exe`를 고려하는가?
- PowerShell/bash 특정 문법에 의존하지 않는가?

---

## 16. Toolchain과 Project를 분리

이것도 중요한 철학.

Verilator 등을 프로젝트마다 설치하면 안 됨.

원한 구조:

```text
RTL Dev Environment
└─ Toolchain
   ├─ Verilator
   ├─ slang
   └─ Waveform Viewer
```

그리고 각각의 프로젝트는:

```text
my-project/
├─ rtl/
├─ tb/
└─ rtl.toml
```

뿐.

### 구현 점검
- toolchain global detection이 있는가?
- project config에 tool path를 매번 넣지 않아도 되는가?
- toolchain status UI가 project-independent한가?

---

## 17. slang와 Verilator 역할 분리

이건 단순 구현 디테일 같지만 장기 확장에 매우 중요하게 잡았어.

### 우리가 정한 역할

```text
slang
→ SystemVerilog semantic frontend

Verilator
→ compile/simulation backend
```

즉 module/port/package/scope 분석을 Verilator result에 의존하지 않기.

### 이유
나중에 simulator를 Questa로 바꿔도:

- completion
- hierarchy
- hover
- signature help

가 그대로 유지되어야 함.

### 구현 점검
- semantic 기능이 Verilator parsing output에 종속되어 있지 않은가?
- semantic provider interface가 존재하는가?
- simulation backend와 editor intelligence가 분리됐는가?

---

## 18. VS Code는 UI shell이고, Core는 독립적으로

처음부터 standalone IDE를 만들지 않고 VS Code 위에 올리기로 했지만, **VS Code 자체가 제품의 core가 되어서는 안 된다**고 했지.

원한 구조:

```text
VS Code Extension
        ↓
       Core
        ↑
       CLI
```

그리고 editor intelligence는 가능하면 LSP 기반.

### 구현 점검
- extension 내부에 business logic이 너무 많이 박혀 있지 않은가?
- project/simulator/test logic을 core가 담당하는가?
- VS Code가 없어도 core/CLI 테스트가 가능한가?

---

## 19. GUI와 CLI가 같은 Core를 사용

네가 GUI를 중요하게 생각하긴 하지만 CLI도 유용하니까, 두 개가 다른 구현을 갖지 않게 하기로 했어.

예:

```text
GUI: Run Selected
        ↓
      Core

CLI: rtl test ...
        ↓
      Core
```

### 구현 점검
- CLI와 VS Code extension이 공통 API를 쓰는가?
- test discovery/result model이 공유되는가?

---

## 20. module hierarchy를 눈에 보이게

RTL 프로젝트가 커지면 파일 목록보다 구조가 중요하니까:

```text
cpu_top
├─ controller
├─ alu
├─ regfile
└─ cache
```

형태로 hierarchy를 보여주는 기능.

### 구현 점검
- module definition graph가 아니라 **instance hierarchy**를 보여주는가?
- instance name과 module type을 구분하는가?
- 클릭하면 source로 갈 수 있는 구조인가?
- parameterized instance도 표현 가능한가?

---

## 21. Unreal Blueprint처럼 top-level structural diagram

이건 너가 처음부터 꽤 흥미롭게 생각했던 아이디어.

장기적으로:

```text
[ Controller ] ── alu_op ──▶ [ ALU ]
                                │
                                ▼
                           [ Register ]
```

같이 module들을 block으로 보여주고 연결.

우리가 scope를 조심해서:

### 단계 1
```text
Code → Read-only Diagram
```

### 단계 2
```text
Diagram → Structural RTL generation
```

### 단계 3
필요하면 양방향 sync 검토

로 가기로 했어.

### 구현 점검
MVP에서 없어도 됨. 대신:
- hierarchy/object model이 나중에 diagram에 재사용 가능하게 설계됐는가?
- instance/connection 정보가 core에서 추출 가능한가?

---

## 22. drag & drop으로 top module 구성

Blueprint 아이디어의 발전형.

예:

```text
Module Library

[ ALU ]
[ RegisterFile ]
[ Controller ]
```

에서 drag/drop 후 port 연결.

그러면:

```systemverilog
logic [2:0] alu_op;

controller u_controller (
    .alu_op(alu_op)
);

alu u_alu (
    .opcode(alu_op)
);
```

를 생성.

이것도 장기 기능.

---

## 23. enum 기반 `case` skeleton 생성

우리가 editor UX 발전 아이디어로 얘기했던 것.

예:

```systemverilog
typedef enum logic [1:0] {
    IDLE,
    RUN,
    DONE
} state_t;
```

에서:

```systemverilog
case (state)
```

를 쓰고 command를 누르면:

```systemverilog
case (state)
    IDLE: begin

    end

    RUN: begin

    end

    DONE: begin

    end

    default: begin

    end
endcase
```

자동 생성.

이건 MVP 필수는 아니고 **semantic code action** 계열.

---

## 24. closing label 자동 생성

Optional 아이디어.

```systemverilog
module alu;
```

를:

```systemverilog
endmodule : alu
```

또는:

```systemverilog
begin : decode_block
...
end : decode_block
```

처럼 자동 closing label을 붙이는 기능.

사용자 setting으로 on/off.

---

## 25. waveform을 simulation과 자연스럽게 연결

Vivado처럼 큰 waveform subsystem부터 만드는 게 아니라:

```text
Simulation
→ VCD/FST
→ Open Waveform
```

흐름을 간단하게.

초기엔 Surfer 같은 viewer를 이용해도 되고,
후에는 IDE 내장 viewer 가능.

### 중요했던 UX
특히:

```text
FAIL test
→ Open Waveform
```

즉 **test와 waveform이 연결**되는 것.

---

# 지금 체크할 때 우선순위

MVP가 끝났다면 나는 아래 순서로 확인하는 게 제일 좋아.

### A. 네가 처음 가장 불편해했던 editor 경험
1. module signature help
2. module port completion
3. `pkg::` completion
4. scope-aware completion
5. `begin/end`
6. `case/endcase`

이 6개가 실제 사용감의 핵심.

### B. Verilator를 쓰며 불편했던 simulation/project 경험
7. source 자동 discovery
8. `rtl.toml`
9. multiple testbench
10. Run Current / Selected / All
11. PASS / FAIL
12. waveform 연결
13. Verilator command 자동화

### C. Vivado에서 불편했던 개발환경 문제
14. lightweight project
15. repo clean
16. `.rtl/` 또는 external cache
17. GitHub에 쉽게 올릴 수 있음

### D. 설치/환경 세팅 불편
18. Verilator/slang detect
19. GUI toolchain status
20. missing tool install flow
21. Windows-first cross-platform

### E. 미래 확장성
22. backend abstraction
23. semantic/simulation 분리
24. VS Code/core 분리
25. CLI/GUI core 공유
26. hierarchy
27. diagram으로 확장 가능한 object model

---

그리고 사실 네 아이디어를 한 문장씩 압축하면 **최종적으로 이 7가지 문제를 해결하려던 프로젝트**였어.

1. **“모듈 쓰려는데 포트 보려고 다른 파일 열기 싫다.”**
2. **“SystemVerilog도 C/C++ IDE처럼 제대로 자동완성됐으면 좋겠다.”**
3. **“begin/end, case/endcase 같은 당연한 걸 내가 왜 매번 타이핑해야 하지?”**
4. **“simulation 돌리려고 파일 목록과 CLI를 내가 왜 관리해야 하지?”**
5. **“여러 테스트벤치를 IDE가 test로 이해하고 원하는 것만 돌려줬으면 좋겠다.”**
6. **“Vivado처럼 프로젝트가 RTL보다 더 거대해지면 싫다.”**
7. **“툴 설치와 PATH 설정까지 RTL 엔지니어가 신경 쓰지 않았으면 좋겠다.”**

이게 사실 우리 프로젝트의 출발점이자 가장 중요한 acceptance criteria라고 봐.

MVP를 평가할 때 기능 개수보다 **이 7개 중 몇 개가 실제로 사라졌는가**를 보면 훨씬 정확할 거야.