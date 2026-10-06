# Product direction

Read `docs/architecture.md` and the current verification notes before extending this project. Follow `docs/delivery-plan.md` for the next execution order; a new owner should start with `docs/handoff.md`.

- The final product is an independent VS Code/Code-OSS-based RTL design and simulation IDE. The VS Code extension is an initial host, not the end product.
- Help engineers focus on RTL structure. Keep projects source-first, lightweight and easy to put in Git; generated project outputs belong in `.rtl/`, shared tools/caches outside user projects.
- Keep Core and language logic independent of VS Code. Keep semantic analysis separate from simulation. GUI and CLI reuse Core behavior.
- Verilator and GTKWave are initial adapters. Preserve replacement boundaries for dedicated future compiler/simulator and waveform technology; do not prematurely implement a compiler or fork Code-OSS.
- Follow the incremental roadmap. Basic lexical editing is phase 2A; module/port intelligence through a semantic provider is 2B; package/scope completion is 2C. Do not describe keyword completion as semantic analysis.
- Never force begin/end for if/always/for. Respect existing closers, comments, strings, user indentation, ordinary editor shortcuts and explicit tool-install approval.
- Validate changes with relevant tests and update documentation with actual results and remaining limitations. Keep existing simulation behavior working.
- During active feature development, build and validate without producing or installing release VSIX packages. Prepare distribution only when the user decides the product is ready for use and asks for it.
