// Mock Backend file for Orbit. It simulates the behavior of the backend for testing and development purposes.

import type { OrbitBackend, OrbitEvent } from "./events";
import type { InputChannel } from "../types/orbit";
import { fallback, matchScenario, scenarios, type Step } from "./scenarios";

/**
 * Stands in for the agent process until it exists.
 *
 * Nothing above this file knows the difference: swap this for an IPC client
 * that forwards `OrbitEvent`s from Python and the UI is unchanged.
 */
export function createMockBackend(): OrbitBackend & {
  startListening(phrase?: string): void;
} {
  const listeners = new Set<(e: OrbitEvent) => void>();
  let timers: ReturnType<typeof setTimeout>[] = [];
  let queue: Step[] = [];
  let gate: { granted: Step[]; denied: Step[] } | null = null;
  let activeTaskId: string | null = null;
  let lastUtterance = "";
  let rotation = 0;
  let dictating = "";

  const emit = (event: OrbitEvent) => {
    if (event.type === "task_started") activeTaskId = event.payload.task.id;
    if (event.type === "task_completed") activeTaskId = null;
    listeners.forEach((l) => l(event));
  };

  const later = (ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      timers = timers.filter((t) => t !== id);
      fn();
    }, ms);
    timers.push(id);
    return id;
  };

  const clear = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  function drain() {
    const next = queue.shift();
    if (!next) return;
    later(next.wait, () => {
      if ("gate" in next) {
        gate = { granted: next.gate.granted, denied: next.gate.denied };
        emit({ type: "permission_required", payload: next.gate.request });
        return; // wait for the user
      }
      emit(next.emit);
      drain();
    });
  }

  function play(steps: Step[]) {
    queue = steps;
    drain();
  }

  function run(text: string) {
    const scenario = matchScenario(text);
    play(scenario ? scenario.build() : fallback(text));
  }

  function submit(text: string, via: InputChannel) {
    clear();
    lastUtterance = text;
    emit({ type: "user_message", payload: { text, via } });
    run(text);
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    startListening(phrase?: string) {
      clear();
      queue = [];
      emit({ type: "state_changed", payload: { state: "listening" } });

      // Simulated dictation: stream the phrase in as if speech were arriving.
      const utterance = phrase ?? scenarios[rotation++ % scenarios.length].utterance;
      dictating = "";
      const words = utterance.split(" ");
      words.forEach((word, i) => {
        later(420 + i * 115, () => {
          dictating = dictating ? `${dictating} ${word}` : word;
          emit({ type: "transcript", payload: { text: dictating, final: false } });
          if (i === words.length - 1) {
            later(520, () => {
              const said = dictating;
              dictating = "";
              emit({ type: "transcript", payload: { text: said, final: true } });
              submit(said, "voice");
            });
          }
        });
      });
    },

    stopListening() {
      clear();
      const said = dictating.trim();
      dictating = "";
      emit({ type: "transcript", payload: { text: "", final: true } });
      if (said.length > 8) {
        submit(said, "voice");
      } else {
        emit({ type: "state_changed", payload: { state: "idle" } });
      }
    },

    submit,

    cancel() {
      clear();
      queue = [];
      const wasGated = gate !== null;
      gate = null;
      if (activeTaskId) {
        emit({ type: "task_completed", payload: { taskId: activeTaskId, status: "cancelled" } });
      }
      emit({ type: "computer", payload: { control: null } });
      emit({
        type: "notice",
        payload: {
          text: wasGated ? "Stopped. Nothing was changed." : "Stopped. The task is paused where it was.",
          tone: "neutral",
        },
      });
      emit({ type: "state_changed", payload: { state: "idle" } });
    },

    resolvePermission(id: string, granted: boolean) {
      const branch = gate;
      gate = null;
      emit({ type: "permission_resolved", payload: { id, granted } });
      if (branch) play(granted ? branch.granted : branch.denied);
    },

    retry() {
      if (lastUtterance) submit(lastUtterance, "voice");
    },

    reset() {
      clear();
      queue = [];
      gate = null;
      activeTaskId = null;
      dictating = "";
    },

    dispose() {
      clear();
      listeners.clear();
    },
  };
}
