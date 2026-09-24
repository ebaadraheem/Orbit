// Scenarios for Orbit to test and demonstrate the UI. Each scenario is a flat script of timed events, 
// so the renderer can be exercised against realistic pacing without any engine behind it. The scenarios are 
// not used in production, but they are useful for development and testing.


import type { OrbitEvent } from "./events";
import type { Activity, ActivityType, StepStatus, Task, TaskStep } from "../types/orbit";
import { PermissionRequest, OrbitState } from "../types/orbit";

export type Step =
  | { wait: number; emit: OrbitEvent }
  | {
      wait: number;
      gate: {
        request: PermissionRequest;
        granted: Step[];
        denied: Step[];
      };
    };

export interface Scenario {
  id: string;
  /** What the user says to trigger it. Also used as a suggested prompt. */
  utterance: string;
  label: string;
  match: RegExp;
  title: string;
  build: () => Step[];
}

let n = 0;
const uid = (p: string) => `${p}${++n}`;

const step = (label: string, status: StepStatus, detail?: string): TaskStep => ({
  id: uid("s"),
  label,
  status,
  detail,
  at: Date.now(),
});

const act = (
  id: string,
  type: ActivityType,
  label: string,
  status: Activity["status"],
  detail?: string,
): OrbitEvent => ({
  type: "activity",
  payload: { id, type, label, detail, status, at: Date.now() },
});

const task = (id: string, title: string): Task => ({
  id,
  title,
  status: "running",
  steps: [],
  startedAt: Date.now(),
});

const state = (s: OrbitState): OrbitEvent => ({
  type: "state_changed",
  payload: { state: s },
});

function run(
  taskId: string,
  label: string,
  opts: { start?: number; finish?: number; detail?: string; done?: string } = {},
): Step[] {
  const s = step(label, "running", opts.detail);
  return [
    { wait: opts.start ?? 600, emit: { type: "task_step", payload: { taskId, step: s } } },
    {
      wait: opts.finish ?? 900,
      emit: {
        type: "task_step",
        payload: {
          taskId,
          step: { ...s, label: opts.done ?? label, status: "completed" as StepStatus },
        },
      },
    },
  ];
}

const research: Scenario = {
  id: "research",
  utterance: "Find my latest research paper and summarise it.",
  label: "Find and summarise my latest paper",
  match: /(paper|research|summar)/i,
  title: "Latest research paper",
  build: () => {
    const t = uid("task");
    return [
      { wait: 300, emit: state("thinking") },
      { wait: 900, emit: { type: "title", payload: { title: "Latest research paper" } } },
      {
        wait: 200,
        emit: { type: "assistant_message", payload: { text: "I'll look for the most recently modified PDF in your research folder." } },
      },
      { wait: 400, emit: state("working") },
      { wait: 0, emit: { type: "task_started", payload: { task: task(t, "Find and summarise the latest paper") } } },
      { wait: 0, emit: { type: "computer", payload: { control: "keyboard", activeApp: "File Explorer", apps: [{ name: "File Explorer", state: "active" }] } } },
      { wait: 0, emit: act("a1", "application", "Opening File Explorer", "running") },
      ...run(t, "Open Documents", { start: 500, finish: 800 }),
      { wait: 0, emit: act("a1", "application", "File Explorer opened", "done") },
      { wait: 0, emit: act("a2", "file", "Searching Research", "running") },
      ...run(t, "Search the Research folder", { finish: 1100, done: "Searched the Research folder" }),
      { wait: 0, emit: act("a2", "file", "Found 3 PDFs", "done", "Research · modified this week") },
      ...run(t, "Compare modification dates", { start: 300, finish: 800, done: "Selected hierarchical-memory.pdf" }),
      { wait: 0, emit: { type: "computer", payload: { control: "reading", activeApp: "Acrobat Reader", apps: [{ name: "File Explorer", state: "open" }, { name: "Acrobat Reader", state: "active" }] } } },
      { wait: 0, emit: act("a3", "screen", "Reading document", "running", "24 pages") },
      ...run(t, "Read the document", { start: 400, finish: 2000, done: "Read 24 pages" }),
      { wait: 0, emit: act("a3", "screen", "Document read", "done", "24 pages") },
      { wait: 0, emit: act("a4", "system", "Summarising", "running") },
      ...run(t, "Write the summary", { start: 300, finish: 1600, done: "Summary ready" }),
      { wait: 0, emit: act("a4", "system", "Summary ready", "done") },
      { wait: 200, emit: { type: "task_completed", payload: { taskId: t, status: "completed" } } },
      { wait: 0, emit: { type: "computer", payload: { control: null } } },
      { wait: 300, emit: state("speaking") },
      {
        wait: 0,
        emit: {
          type: "assistant_message",
          payload: {
            text: "Your most recent paper is on hierarchical memory for long-context models. It argues that retrieval over a fixed window loses structure, and proposes a two-tier store: a fast episodic buffer and a slower consolidated index. The evaluation section is the weakest part — only one benchmark. Want me to add the key points to your research notes?",
          },
        },
      },
      { wait: 5200, emit: state("idle") },
    ];
  },
};

const vscode: Scenario = {
  id: "vscode",
  utterance: "Open VS Code and open my Orbit project.",
  label: "Open my Orbit project in VS Code",
  match: /(vs ?code|editor|orbit project)/i,
  title: "Open Orbit project",
  build: () => {
    const t = uid("task");
    return [
      { wait: 300, emit: state("thinking") },
      { wait: 700, emit: { type: "title", payload: { title: "Open Orbit project" } } },
      { wait: 0, emit: { type: "assistant_message", payload: { text: "Opening it now." } } },
      { wait: 300, emit: state("working") },
      { wait: 0, emit: { type: "task_started", payload: { task: task(t, "Open the Orbit project") } } },
      { wait: 0, emit: { type: "computer", payload: { control: "keyboard", activeApp: "VS Code", apps: [{ name: "VS Code", state: "launching" }] } } },
      { wait: 0, emit: act("b1", "application", "Launching VS Code", "running") },
      ...run(t, "Launch VS Code", { start: 400, finish: 1300, done: "Launched VS Code" }),
      { wait: 0, emit: act("b1", "application", "VS Code launched", "done") },
      { wait: 0, emit: { type: "computer", payload: { apps: [{ name: "VS Code", state: "active" }] } } },
      { wait: 0, emit: act("b2", "file", "Opening C:\\dev\\orbit", "running") },
      ...run(t, "Open the project folder", { start: 300, finish: 1000, done: "Opened C:\\dev\\orbit" }),
      { wait: 0, emit: act("b2", "file", "Project folder opened", "done") },
      { wait: 0, emit: { type: "computer", payload: { control: "waiting" } } },
      ...run(t, "Wait for the workspace to load", { start: 200, finish: 1200, done: "Workspace ready" }),
      { wait: 100, emit: { type: "task_completed", payload: { taskId: t, status: "completed" } } },
      { wait: 0, emit: { type: "computer", payload: { control: null } } },
      { wait: 200, emit: state("speaking") },
      { wait: 0, emit: { type: "assistant_message", payload: { text: "VS Code is open on the Orbit project. You're on the main branch with two uncommitted files." } } },
      { wait: 3000, emit: state("idle") },
    ];
  },
};

const dependencies: Scenario = {
  id: "install",
  utterance: "Install the project dependencies.",
  label: "Install project dependencies",
  match: /(install|dependenc|npm)/i,
  title: "Install dependencies",
  build: () => {
    const t = uid("task");
    const after: Step[] = [
      { wait: 0, emit: { type: "computer", payload: { control: "keyboard", activeApp: "Terminal", apps: [{ name: "VS Code", state: "open" }, { name: "Terminal", state: "active" }] } } },
      { wait: 0, emit: act("c1", "terminal", "Running npm install", "running", "C:\\dev\\orbit") },
      { wait: 200, emit: state("working") },
      ...run(t, "Run npm install", { start: 300, finish: 2600, done: "Installed 214 packages" }),
      { wait: 0, emit: act("c1", "terminal", "npm install finished", "done", "214 packages") },
      { wait: 100, emit: { type: "task_completed", payload: { taskId: t, status: "completed" } } },
      { wait: 0, emit: { type: "computer", payload: { control: null } } },
      { wait: 200, emit: state("speaking") },
      { wait: 0, emit: { type: "assistant_message", payload: { text: "Dependencies installed. 214 packages, no vulnerabilities reported." } } },
      { wait: 2600, emit: state("idle") },
    ];
    return [
      { wait: 300, emit: state("thinking") },
      { wait: 600, emit: { type: "title", payload: { title: "Install dependencies" } } },
      { wait: 0, emit: { type: "task_started", payload: { task: task(t, "Install project dependencies") } } },
      ...run(t, "Locate the project", { start: 300, finish: 700, done: "Found C:\\dev\\orbit" }),
      { wait: 200, emit: state("waiting") },
      {
        wait: 0,
        gate: {
          request: {
            id: uid("perm"),
            title: "Run a command?",
            summary: "Install the dependencies listed in package.json.",
            literal: "npm install",
            consequence: "Runs in C:\\dev\\orbit and writes to node_modules.",
            risk: "elevated",
            confirmLabel: "Run",
          },
          granted: after,
          denied: [
            { wait: 0, emit: { type: "task_completed", payload: { taskId: t, status: "cancelled" } } },
            { wait: 0, emit: { type: "notice", payload: { text: "Command not run. Nothing was changed.", tone: "neutral" } } },
            { wait: 200, emit: state("idle") },
          ],
        },
      },
    ];
  },
};

const cleanup: Scenario = {
  id: "cleanup",
  utterance: "Clear the old installers out of my Downloads folder.",
  label: "Clear old installers from Downloads",
  match: /(download|clean|clear|tidy|delete)/i,
  title: "Tidy Downloads",
  build: () => {
    const t = uid("task");
    const after: Step[] = [
      { wait: 200, emit: state("working") },
      { wait: 0, emit: act("d2", "file", "Moving 3 files to Recycle Bin", "running") },
      ...run(t, "Move the files to the Recycle Bin", { start: 300, finish: 1400, done: "Moved 3 files to the Recycle Bin" }),
      { wait: 0, emit: act("d2", "file", "3 files moved", "done", "Recoverable from the Recycle Bin") },
      { wait: 100, emit: { type: "task_completed", payload: { taskId: t, status: "completed" } } },
      { wait: 0, emit: { type: "computer", payload: { control: null } } },
      { wait: 200, emit: state("speaking") },
      { wait: 0, emit: { type: "assistant_message", payload: { text: "Done. Three installers are in the Recycle Bin and Downloads is 1.4 gigabytes lighter. I left the PDFs alone." } } },
      { wait: 3200, emit: state("idle") },
    ];
    return [
      { wait: 300, emit: state("thinking") },
      { wait: 600, emit: { type: "title", payload: { title: "Tidy Downloads" } } },
      { wait: 0, emit: { type: "assistant_message", payload: { text: "Let me look at what's in there first." } } },
      { wait: 300, emit: state("working") },
      { wait: 0, emit: { type: "task_started", payload: { task: task(t, "Clear old installers from Downloads") } } },
      { wait: 0, emit: { type: "computer", payload: { control: "keyboard", activeApp: "File Explorer", apps: [{ name: "File Explorer", state: "active" }] } } },
      { wait: 0, emit: act("d1", "file", "Scanning Downloads", "running") },
      ...run(t, "Scan Downloads", { start: 400, finish: 1300, done: "Scanned 128 files" }),
      { wait: 0, emit: act("d1", "file", "128 files scanned", "done") },
      ...run(t, "Identify installers older than 90 days", { start: 300, finish: 1000, done: "Found 3 installers, 1.4 GB" }),
      { wait: 200, emit: state("waiting") },
      {
        wait: 0,
        gate: {
          request: {
            id: uid("perm"),
            title: "Delete 3 files?",
            summary: "Three installers in Downloads, last opened over 90 days ago.",
            literal: "node-v20.11.0-x64.msi\npython-3.11.4-amd64.exe\nVSCodeUserSetup-x64-1.85.exe",
            consequence: "They go to the Recycle Bin, so you can still get them back.",
            risk: "destructive",
            confirmLabel: "Delete files",
          },
          granted: after,
          denied: [
            { wait: 0, emit: { type: "task_completed", payload: { taskId: t, status: "cancelled" } } },
            { wait: 0, emit: { type: "notice", payload: { text: "Nothing deleted. The files are untouched.", tone: "neutral" } } },
            { wait: 200, emit: state("idle") },
          ],
        },
      },
    ];
  },
};

const chrome: Scenario = {
  id: "chrome",
  utterance: "Open Chrome and search for papers on long-context memory.",
  label: "Search the web in Chrome",
  match: /(chrome|browser|search the web|google)/i,
  title: "Search for papers",
  build: () => {
    const t = uid("task");
    return [
      { wait: 300, emit: state("thinking") },
      { wait: 600, emit: { type: "title", payload: { title: "Search for papers" } } },
      { wait: 0, emit: { type: "assistant_message", payload: { text: "Opening Chrome." } } },
      { wait: 300, emit: state("working") },
      { wait: 0, emit: { type: "task_started", payload: { task: task(t, "Search for papers on long-context memory") } } },
      { wait: 0, emit: act("e1", "application", "Launching Chrome", "running") },
      ...run(t, "Launch Chrome", { start: 400, finish: 1500 }),
      { wait: 0, emit: act("e1", "application", "Chrome not found", "failed") },
      {
        wait: 200,
        emit: {
          type: "task_completed",
          payload: {
            taskId: t,
            status: "failed",
            error: {
              title: "Chrome isn't installed on this computer",
              detail: "I checked Program Files and the Start menu. Edge and Firefox are available.",
              retryable: true,
            },
          },
        },
      },
      { wait: 0, emit: { type: "computer", payload: { control: null, activeApp: null, apps: [] } } },
      { wait: 100, emit: state("error") },
    ];
  },
};

const notes: Scenario = {
  id: "notes",
  utterance: "Add the key points to my research notes.",
  label: "Add key points to my notes",
  match: /(note|add the|write down|remind)/i,
  title: "Update research notes",
  build: () => {
    const t = uid("task");
    return [
      { wait: 300, emit: state("thinking") },
      { wait: 600, emit: { type: "assistant_message", payload: { text: "Adding them under today's date." } } },
      { wait: 300, emit: state("working") },
      { wait: 0, emit: { type: "task_started", payload: { task: task(t, "Update research notes") } } },
      { wait: 0, emit: { type: "computer", payload: { control: "keyboard", activeApp: "Obsidian", apps: [{ name: "Obsidian", state: "active" }] } } },
      { wait: 0, emit: act("f1", "application", "Opening notes", "running", "research.md") },
      ...run(t, "Open research.md", { start: 400, finish: 900, done: "Opened research.md" }),
      { wait: 0, emit: act("f1", "application", "Notes opened", "done", "research.md") },
      { wait: 0, emit: act("f2", "keyboard", "Typing", "running", "4 bullet points") },
      ...run(t, "Write four bullet points", { start: 300, finish: 1500, done: "Wrote four bullet points" }),
      { wait: 0, emit: act("f2", "keyboard", "Typed 4 bullet points", "done") },
      ...run(t, "Save the file", { start: 200, finish: 600, done: "Saved" }),
      { wait: 100, emit: { type: "task_completed", payload: { taskId: t, status: "completed" } } },
      { wait: 0, emit: { type: "computer", payload: { control: null } } },
      { wait: 200, emit: state("speaking") },
      { wait: 0, emit: { type: "assistant_message", payload: { text: "Added under today's date, with a link back to the PDF." } } },
      { wait: 2600, emit: state("idle") },
    ];
  },
};

export const scenarios: Scenario[] = [research, vscode, cleanup, dependencies, chrome, notes];

export function matchScenario(text: string): Scenario | null {
  return scenarios.find((s) => s.match.test(text)) ?? null;
}

/** Anything Orbit can't route to a scripted task. */
export function fallback(text: string): Step[] {
  return [
    { wait: 300, emit: state("thinking") },
    { wait: 900, emit: state("speaking") },
    {
      wait: 0,
      emit: {
        type: "assistant_message",
        payload: {
          text: `I don't have a tool for that yet. Right now I can find and summarise documents, open applications, tidy folders and run commands you approve.`,
        },
      },
    },
    { wait: 2600, emit: state("idle") },
  ];
}
