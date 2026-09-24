# Orbit backend

The actual agent behind the Orbit UI: LangGraph + a local Ollama model,
SQLite for everything persistent, and a WebSocket server that speaks the
frontend's existing `OrbitEvent` protocol exactly. Nothing on the frontend
needed to change to receive real events — it was already built to.

```
Always-on mic (wake word) ──▶ local STT ──▶ LangGraph agent (Ollama)
                                                    │
                                        tools: files / apps / terminal / notes
                                                    │
                              SQLite (~/.orbit/orbit.db) — conversations,
                              tasks, permission log, FTS5 memory
                                                    │
                                     FastAPI WebSocket server (:8765)
                                                    │
                                   Electron main.cjs (ws client) ──IPC──▶ your
                                                                          existing
                                                                          renderer
```

## What's real here, and what to verify yourself

Everything from the WebSocket server down through the agent graph, the
permission system, and SQLite has been run end-to-end in this environment —
not just written, but actually executed, including deliberately forcing the
two hardest failure modes (a permission pause/resume cycle, and a
multi-tool-call round) to check ids and state stayed correct across them. A
real bug in each was caught and fixed that way; see the comments at the top
of `app/agent/graph.py` if you want the details.

The voice stack (`app/voice/*.py`) could not be run here — this environment
has no microphone or speaker. Its *logic* (the wake-word gating state
machine, push-to-talk start/stop, the TTS-timing fix described below) was
unit-tested with a fake microphone and fake STT/TTS functions standing in
for the real ones, which caught real bugs too. What's untested is the part
that can only be tested on your machine: does the wake-word model actually
recognise your voice at a sensible distance, is `SILENCE_RMS` in
`pipeline.py` tuned right for your mic and room, does pyttsx3 pick a voice
you like. Budget an hour of tuning those three things once it's running.

## 1. Set up Python

```bash
cd orbit-backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
```

If you're not ready to wire up voice yet, comment out the last five lines
of `requirements.txt` (sounddevice, numpy, openwakeword, faster-whisper,
pyttsx3) — everything else runs fine without them; only `start_always_on`
and `start_push_to_talk` will fail, with a clear `ModuleNotFoundError`
rather than crashing anything else.

## 2. Set up the model

Install [Ollama](https://ollama.com/download), then:

```bash
ollama serve                     # if it isn't already running as a service
scripts\pull_model.ps1           # Windows
# scripts/pull_model.sh          # macOS/Linux
```

This pulls `qwen2.5:7b-instruct` by default — small enough for a laptop
CPU, capable enough at the tool-calling format LangGraph needs. Point at a
different model with the `ORBIT_MODEL` environment variable; anything
Ollama serves that supports tool calling works, since `app/agent/llm.py` is
the only file that would need to change for a different provider entirely.

## 3. Run the backend on its own first

```bash
python -m app.server
```

You should see `Orbit backend ready — data dir: ...` and nothing else
until something connects. `~/.orbit/orbit.db` and `~/.orbit/notes.md` get
created at this point — that's the entire persistent footprint.

## 4. Wire the frontend to it

Three changes, all in your existing `orbit` project, none of them touching
the parts you've already customised in `src/components/`.

**a) Swap the backend `useOrbit` talks to.**
In `src/orbit/useOrbit.ts`:

```diff
-import { createMockBackend } from "./mockBackend";
+import { createIpcBackend } from "./ipcBackend";

-  const backend = useMemo(() => createMockBackend(), []);
+  const backend = useMemo(() => createIpcBackend(), []);
```

That's the entire frontend code change. `ipcBackend.ts` already exists in
your project and already implements the right interface — it was written
for exactly this swap.

**b) Give Electron a WebSocket client.**
`electron-changes/main.cjs` (in this delivery) replaces your
`electron/main.cjs`. The diff is additive: your window creation, the
external-link handler, and the `window:*` IPC handlers are untouched — the
new part is a `ws` client that connects to `ws://127.0.0.1:8765/ws`,
forwards every message straight to `webContents.send("orbit:event", ...)`,
and forwards `orbit:command` IPC messages back to the socket. It
reconnects automatically every 2 seconds if the backend isn't up yet, and
queues commands sent while disconnected rather than dropping them — useful
at launch, since Electron's window is usually ready before Python is.

Copy it over, then add the one new dependency it needs:

```bash
npm install ws
```

`electron/preload.cjs` needs no changes at all — its `onEvent`/`send`
bridge was already generic.

**c) Nothing else.** Every component under `src/components/` reads from
`useOrbit()`'s return value, not from the backend directly, so none of them
change.

## 5. Run it for real

```bash
# terminal 1
cd orbit-backend && .venv\Scripts\activate && python -m app.server

# terminal 2
cd orbit && npm run dev
```

Say something, or type in the fallback text box — either goes through
`ipcBackend.ts` → Electron IPC → the WebSocket → `Session.submit()` →
the LangGraph agent, and real events (`task_started`, `task_step`,
`permission_required`, …) should appear in the UI exactly like the mock
scenarios did, except now backed by an actual local model and actual tools
running on your machine.

## 6. Turn on "always listening"

By default Orbit waits for you to press the mic button (`listen` /
`stop_listening` — the same commands `ipcBackend.ts` already sends). To get
the Jarvis behaviour — listening continuously, only fully activating on a
wake word — two things:

1. Install the voice dependencies (step 1) and confirm a mic is available.
2. Turn on the `auto_listen_on_startup` setting. There's no UI for this
   yet — `src/components/settings/Settings.tsx` only holds local React
   state today, not anything the backend reads. Fastest way to flip it for
   now:

   ```bash
   python -c "from app import db; db.init_db(); db.set_setting('auto_listen_on_startup', True)"
   ```

   `app/server.py` already checks this setting on every new connection and
   calls `voice.start_always_on()` automatically when it's on — restart the
   backend after setting it.

   Wiring an actual toggle in Settings later is a small frontend change:
   send `{command: "update_settings", payload: {auto_listen_on_startup: true}}`
   through the same `window.orbit.send` the rest of `ipcBackend.ts` uses,
   and listen for the `"settings"` event type this backend already emits in
   response (`app/server.py`'s `get_settings`/`update_settings` commands).
   That event type isn't in the frontend's `OrbitEvent` union yet — it's an
   inert no-op in the reducer until you add a case for it, by design, so
   adding it now doesn't require any change today.

3. The wake word is `hey_jarvis` by default (one of openWakeWord's
   pretrained models — see `ORBIT_WAKE_WORD` in `app/config.py`). Training
   a custom "Hey Orbit" model is a separate, optional step using
   openWakeWord's own training notebook; nothing here depends on the name.

Once that's on: Orbit runs a lightweight wake-word classifier over every
~30ms of audio in the background (`app/voice/pipeline.py`), discards
everything that doesn't cross the threshold, and only starts recording,
transcribing, and acting once it hears the wake word. After it finishes
speaking a reply, if `continuous_listening` is also on, it gives you a
6-second window to reply without repeating the wake word — see
`CONTINUOUS_WINDOW_SECONDS` in `pipeline.py` if you want that longer or
shorter.

## 7. Start Orbit automatically when you log in

```powershell
scripts\autostart_windows.ps1
```

Edit the two paths at the top of `scripts\start_orbit.ps1` first (where
your `orbit` and `orbit-backend` folders actually are). This creates a
Startup-folder shortcut that starts the backend, waits three seconds, then
starts Electron. Run the same script with `-Remove` to undo it.

This is the OS-level "open the laptop and it's running" part. Whether it
starts *listening* the instant it opens is the separate
`auto_listen_on_startup` setting from step 6 — the two are independent by
design, the same way the frontend's Settings screen treats "Start Orbit
with Windows" and "Continuous listening" as separate switches.

## Extending it

**A new tool**: add a `@tool`-decorated function under `app/agent/tools/`,
add it to `ALL_TOOLS` and `ACTIVITY_TYPE` in `registry.py`, and add a label
case in `_describe_call()` in `graph.py`. If it's risky, add a branch in
`app/permissions.py::classify()` — anything not listed there is denied by
default (fail closed), so a new tool is safe by construction even before
you get to writing its risk rule.

**A different model provider**: only `app/agent/llm.py` changes. The graph,
tools, and permission system don't know or care what's behind `get_llm()`.

**A real vector memory** instead of FTS5 keyword search: only `app/memory.py`
changes — `remember()`/`recall()` is the entire interface the rest of the
backend uses.

**Screen reading / mouse / keyboard control**: there's no tool for these
yet, deliberately — they're the highest-risk category (`allow_screen`,
`allow_mouse` in `app/config.py::DEFAULT_PERMISSIONS` already exist as
settings, unused so far) and the ones most worth getting right rather than
shipping quickly. `pyautogui` for mouse/keyboard and `mss` + a local OCR
model for screen reading are the natural choices; wire them the same way
`terminal.py` is wired — a tool, a risk classification, a label — and
they'll show up in the frontend's Computer panel for free, since
`ComputerState.control` already has `"mouse"` and `"reading"` as values
waiting to be used.
