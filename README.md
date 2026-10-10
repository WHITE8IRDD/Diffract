<p align="center">
  <img src="public/icon.svg" alt="Diffract logo" width="96" />
</p>

<h1 align="center">Diffract</h1>

<p align="center">
  <b>AI-Native Image Editor</b> — a lightweight, blazing-fast, fully-offline
  image editor for Windows 11 with deep local AI integration.<br/>
  Tauri v2 · React 19 · PixiJS v8 (WebGPU) · ONNX Runtime Web · Zustand · Tailwind v4 · shadcn/ui
</p>

<p align="center">
  <img alt="Phase 1" src="https://img.shields.io/badge/phase-1%20foundation-4cc2ff"/>
  <img alt="Offline" src="https://img.shields.io/badge/AI-100%25%20offline-6ccb7a"/>
  <img alt="Install budget" src="https://img.shields.io/badge/install-%3C150%20MB-9b9b9b"/>
</p>

---

## What is Diffract?

A Photoshop-class editor rebuilt around three ideas:

1. **Native speed** — a Tauri v2 shell (Rust + WebView2) and a WebGPU canvas
   compositor (PixiJS v8) with render-on-demand and dirty-texture uploads.
   Target: 8K pan/zoom at 60 fps, < 2 s launch, < 200 MB idle RAM.
2. **Real editing model** — layers, blend modes, non-destructive layer masks,
   adjustment layers (Phase 2), 60-step history, Photoshop keyboard shortcuts.
3. **Local AI, free and offline** — background removal (BiRefNet), object
   selection (SAM), generative fill (SD 1.5 inpainting), ×4 upscaling
   (Real-ESRGAN), style transfer and sky replacement run on the user's GPU
   via ONNX Runtime Web. Models download on first use; nothing phones home.

## Getting started

```bash
# Frontend (browser preview / UI development)
npm install
npm run dev          # → http://localhost:5173

# Production web bundle
npm run build

# Desktop app (requires the Rust toolchain)
npm run tauri:dev    # dev app with hot reload
npm run tauri:build  # → src-tauri/target/release/bundle/msi/*.msi
```

> The same bundle runs in a plain browser (UI development) and inside the
> Tauri WebView: `src/hooks/useTauri.ts` detects the runtime and falls back
> to web equivalents (downloads instead of native dialogs, etc.).

## Architecture & file structure

```
diffract/                      ← repository root (the monorepo)
├── package.json               # npm scripts: dev / build / tauri:* / icons
├── vite.config.ts             # Vite 8 + React + Tailwind v4, WebGPU-safe CSP
├── tsconfig.json              # strict TS (noUncheckedIndexedAccess, …)
├── index.html                 # SPA entry
├── components.json            # shadcn/ui configuration
│
├── src/                       ══ FRONTEND ══
│   ├── main.tsx               # React 19 entry
│   ├── App.tsx                # providers + global wiring
│   ├── index.css              # Fluent dark design tokens (Tailwind v4 @theme)
│   │
│   ├── components/
│   │   ├── layout/            # the Windows 11 workspace shell
│   │   │   ├── AppShell.tsx   #   title bar · menu · tools · canvas · dock · status
│   │   │   ├── TitleBar.tsx   #   caption + native window controls (Tauri)
│   │   │   ├── MenuBar.tsx    #   File Edit Image Layer Select Filter View Window Help
│   │   │   ├── menuData.ts    #   declarative menu catalogue (phase-tagged items)
│   │   │   ├── LeftToolbar.tsx#   tool strip with flyout groups + shortcuts
│   │   │   ├── DocumentTabs.tsx #  multi-document tab strip
│   │   │   ├── RightDock.tsx  #   dockable panel column
│   │   │   └── StatusBar.tsx  #   zoom · coords · doc size · GPU badge
│   │   ├── panels/
│   │   │   ├── PanelShell.tsx #   collapsible panel chrome
│   │   │   ├── LayersPanel.tsx#   stack · blend modes · opacity · masks · thumbs
│   │   │   ├── PropertiesPanel.tsx # tool + layer inspector
│   │   │   ├── HistoryPanel.tsx #  undo stack navigator
│   │   │   └── ColorPickerPanel.tsx # SV square · hue · swatches · recents
│   │   ├── canvas/
│   │   │   ├── CanvasViewport.tsx # Pixi canvas · pan/zoom · tool input
│   │   │   └── EmptyState.tsx  #  brand + CTAs when no document is open
│   │   ├── dialogs/
│   │   │   ├── NewDocumentDialog.tsx # size · DPI · colour mode · presets
│   │   │   ├── ExportAsDialog.tsx    # PNG/JPEG/WebP export pipeline
│   │   │   └── AboutDialog.tsx
│   │   ├── icons/
│   │   │   ├── Logo.tsx       #   prism-splitting-light brand mark
│   │   │   └── toolIcon.tsx   #   tool glyph set (lucide + custom)
│   │   └── ui/                # shadcn/ui primitives (Fluent-styled)
│   │       ├── button.tsx · input.tsx · label.tsx · separator.tsx
│   │       ├── slider.tsx · switch.tsx · tabs.tsx · tooltip.tsx
│   │       ├── dropdown-menu.tsx · dialog.tsx · popover.tsx · scroll-area.tsx
│   │
│   ├── engine/                ══ PixiJS v8 CANVAS ENGINE ══
│   │   ├── PixiEngine.ts      # WebGPU compositor · viewport · layers · export
│   │   ├── registry.ts        # engine singleton accessor
│   │   └── types.ts           # RasterSurface · MaskSurface · PixelSnapshot
│   │
│   ├── tools/                 ══ TOOL SYSTEM ══
│   │   ├── types.ts           # Tool contract · ToolId · per-tool options
│   │   ├── base.ts            # brush dab stamping · stroke sampling
│   │   ├── MoveTool.ts        # V — move layer content (axis constrain)
│   │   ├── BrushTool.ts       # B/E — size · hardness · opacity · flow · spacing
│   │   ├── ViewTools.ts       # H/Z/I — hand · zoom · eyedropper
│   │   ├── ToolRegistry.ts    # all tools + Photoshop flyout groups
│   │   └── index.ts
│   │
│   ├── ai/                    ══ LOCAL AI RUNTIME ══
│   │   ├── ModelRegistry.ts   # BiRefNet · SAM · SD-inpaint · Real-ESRGAN · …
│   │   ├── OnnxSession.ts     # session manager · WebGPU→WebGL→WASM negotiation
│   │   └── index.ts
│   │
│   ├── store/                 ══ ZUSTAND STATE ══
│   │   ├── types.ts           # DocumentState · LayerState · ViewState
│   │   ├── useDocumentStore.ts# documents (tabs) + layer stack commands
│   │   ├── useHistoryStore.ts # per-document undo/redo (60 states, coalescing)
│   │   ├── useUIStore.ts      # tools · panels · workspace · dialogs
│   │   └── useColorStore.ts   # fg/bg swatches · recents
│   │
│   ├── hooks/
│   │   ├── usePixiEngine.ts   # engine lifecycle + store→scene sync
│   │   ├── useKeyboardShortcuts.ts # global Photoshop keyboard map
│   │   ├── useAppCommands.ts  # menu-action dispatcher (command pattern)
│   │   └── useTauri.ts        # native/browser capability bridge
│   │
│   └── utils/
│       ├── shortcuts.ts       # shortcut table + accelerator formatting
│       ├── color.ts           # RGBA/HSV/hex conversions
│       ├── blendModes.ts      # Phase-1 blend-mode table (→ Pixi/Canvas names)
│       ├── math.ts · ids.ts · cn.ts
│
├── src-tauri/                 ══ RUST BACKEND (Tauri v2) ══
│   ├── Cargo.toml             # tauri 2 · image crate · release profile tuned
│   ├── tauri.conf.json        # window · CSP · msi bundle (Windows 11 x64)
│   ├── capabilities/default.json # least-privilege capability set
│   ├── build.rs
│   ├── src/
│   │   ├── main.rs            # binary entry (windows_subsystem = "windows")
│   │   ├── lib.rs             # builder · plugins · command registration
│   │   └── commands.rs        # export_image · open_image · read_text_file
│   └── icons/                 # generated: icon.ico + pngs (npm run icons)
│
├── models/README.md           # AI weights manifest (binaries never committed)
├── public/
│   ├── icon.svg               # prism brand mark
│   └── models/README.md       # dev-time model drop point
└── scripts/
    ├── generate-icons.mjs     # npm entry for icon generation
    └── generate_icons.py      # dependency-free rasterizer (PNG + ICO)
```

## Design notes (Phase 1)

| Requirement | How it's met |
| --- | --- |
| WebGPU canvas | `PixiEngine` prefers the WebGPU renderer, falls back to WebGL2. Render-on-demand (ticker stopped) + dirty-only texture uploads. |
| Photoshop layout | Menu bar, left tool strip, right dock (Layers / Properties / History / Color), document tabs, status bar. |
| Photoshop shortcuts | Single source of truth in `utils/shortcuts.ts`; menus display the same accelerators. |
| Layer system | Raster layers with opacity, fill, visibility, locks, clipping, blend modes (Normal, Multiply, Screen, Overlay, Soft/Hard Light, Color Dodge/Burn, Difference) and black/white masks (red-channel alpha mask on GPU). |
| History | Command pattern with pixel snapshots; 60 states, live-slider coalescing, per-document stacks. |
| File I/O | Rust `image` crate: PNG/JPEG/WebP/TIFF decode & encode; export pipeline flattens in the engine and encodes host-side. |
| Offline AI | `ai/` scaffolding with model manifest + session manager; weights download on first use into app data. |
| Install size | Frontend bundle ≈ 1 MB JS (300 KB gzip); models excluded from the installer. |

## Roadmap

| Phase | Contents | Status |
| --- | --- | --- |
| **1 — Foundation** | Shell · canvas engine · layer stack · core tools · file ops · history | ✅ scaffold + shell + engine live |
| **2 — Advanced editing** | Selection refinement · adjustment layers · transforms · retouching · filters | queued |
| **3 — AI features** | Background removal · SAM selection · generative fill · upscale · style transfer · sky | queued |
| **4 — Pro** | PSD read/write · RAW · colour management · pen tool · smart objects · actions · plugins | queued |

Menu items beyond the current phase are visible but disabled and tagged
(`P2`, `P3`, …) — the roadmap lives inside the product.

## Licence

MIT © Diffract Contributors
