# Orbit

The frontend for Orbit: a private, local-first assistant that lives on your computer, listens, does
multi-step work, and tells you what it's doing. Electron + React + TypeScript + Vite + Tailwind.

No AI, speech engine, computer control or Python backend is included. All of that is simulated, and
the seam where it plugs in is marked.

## Running it

```bash
npm install
npm run dev
```

That starts Vite on port 5173 and opens the Electron window once it's up.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite + Electron together |
| `npm run dev:web` | Renderer only, in a browser — handy while styling |
| `npm run build` | Type-check, then build the renderer into `dist/` |
| `npm run typecheck` | `tsc --noEmit` |


## Layout

```
electron/
  main.cjs              window, and the IPC seam for the agent process
  preload.cjs           the only surface the renderer gets (contextIsolation on)
src/
  types/orbit.ts        OrbitState, Task, Activity, PermissionRequest, ComputerState…
  orbit/
    events.ts           the OrbitEvent union + the OrbitBackend interface
    reducer.ts          pure (session, event) -> session
    mockBackend.ts      the stand-in engine, driven by timers
    ipcBackend.ts       the real one, ready to swap in
    scenarios.ts        six scripted end-to-end scenarios
    useOrbit.ts         the hook every component consumes
  components/
    layout/             Header, Sidebar
    orbit/              OrbitCore, Stage, Transcript, VoiceControl, StatusIndicator
    chat/               ConversationView, Message
    tasks/              ActiveTask (+ TaskStep), PermissionRequest
    computer/           ComputerPanel
    command/            CommandPalette
    settings/           Settings
    ui/index.tsx        Button, IconButton, Toggle, Modal, Popover, Tooltip, KeyCap, cn
  data/
    mockConversations.ts
  App.tsx               layout, shortcuts, wiring
  index.css             design tokens, keyframes, scrollbars, focus rings
```

## How the UI is driven

One event stream, start to finish:

```
mockBackend  --OrbitEvent-->  reducer  -->  session state  -->  components
```

No component knows the engine is fake. `mockBackend.ts` emits `state_changed`, `transcript`,
`task_step`, `permission_required` and the rest on timers; `reducer.ts` folds them into an
`OrbitSession`; everything renders from that.

### Plugging in the real backend

`src/orbit/ipcBackend.ts` is already written against the same interface. Change one line in
`useOrbit.ts`:

```ts
// const backend = useMemo(() => createMockBackend(), []);
const backend = useMemo(() => createIpcBackend(), []);
```

Then have Python emit the same `OrbitEvent` objects, and forward them from `electron/main.cjs`:

```js
window.webContents.send("orbit:event", event);
```

Commands from the UI arrive on the `orbit:command` channel — `listen`, `stop_listening`, `submit`,
`cancel`, `retry`, `resolve_permission`. The permission flow is already a request/response pair, so
an agent that blocks waiting for approval maps onto it directly.

## Design

Charcoal base (`#0a0b0d`), zinc surfaces, hairline borders, and a single accent — a desaturated
sea-glass green (`#8fb9a8`), chosen to read calm rather than neon. Amber and clay appear only as
semantics: amber asks for permission, clay reports a failure. All of it lives as CSS variables at
the top of `index.css`, so retheming is one block.

The Orbit core is a single SVG with six behaviours: still when idle, a breathing halo while
listening, a satellite crossing the ring while thinking, the ring sweeping while working, the core
resolved into a waveform while speaking, amber and held while waiting, ring broken on error. It
shrinks into a status bar once a session has content so the conversation gets the room.

Motion is gated twice — `prefers-reduced-motion` in CSS, and `useReducedMotion()` in JS, because
the orbiting satellite uses SMIL, which media queries don't reach.

## What the mock does

The microphone button runs the scenarios in rotation. The suggested tasks and the command palette
run a specific one.

| Scenario | Demonstrates |
| --- | --- |
| Find and summarise my latest paper | the full loop: listen, think, work, read, speak |
| Open my Orbit project in VS Code | launching and driving an application |
| Clear old installers from Downloads | destructive confirmation, both branches |
| Install project dependencies | command confirmation, literal command shown |
| Search the web in Chrome | failure with a specific reason and a retry |
| Add key points to my notes | keyboard control, typing into an app |

Stopping at any point — Esc, Stop, or Interrupt while Orbit is speaking — cancels the task and says
what state it was left in.

## Shortcuts

| Keys | Action |
| --- | --- |
| Ctrl + Space (hold) | Talk. Chosen over bare Space so it never fights with typing. |
| Ctrl + K | Commands and search |
| Esc | Close what's open, otherwise stop Orbit |
| Enter / Shift + Enter | Send typed message / new line |
| Ctrl + N | New task |
| Ctrl + B | Show or hide sessions |
| Ctrl + J | Show or hide computer activity |

## Deliberate omissions

- Internal reasoning is never rendered. Tasks show steps and status only; the copy in
  `scenarios.ts` is written as user-facing actions for that reason.
- The computer-control switches in Settings say plainly in the interface that nothing enforces them
  yet. Claiming otherwise would be the one dishonest thing a privacy-first assistant could do.
- No storage. Settings reset on reload, by design, until there's something real to persist.
