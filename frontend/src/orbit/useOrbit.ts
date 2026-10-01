// Main hook for Orbit. It manages the state of the session, handles events from the backend, 
// and provides an API for interacting with Orbit. It uses React hooks to manage state and side effects.

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createMockBackend } from "./mockBackend";
import {createIpcBackend} from "./ipcBackend";
import { initialSession, reduce } from "./reducer";
import type { OrbitEvent } from "./events";
import type { InputChannel, OrbitSession } from "../types/orbit";

export interface OrbitApi {
  session: OrbitSession;
  busy: boolean;
  continuous: boolean;
  setContinuous(on: boolean): void;
  listen(phrase?: string): void;
  stopListening(): void;
  send(text: string, via?: InputChannel): void;
  cancel(): void;
  retry(): void;
  resolvePermission(id: string, granted: boolean): void;
  setScreenAwareness(on: boolean): void;
  newSession(): void;
}

export function useOrbit(): OrbitApi {
  const backend = useMemo(() => createIpcBackend(), []);
  const [session, dispatch] = useReducer(reduce, initialSession);
  const [continuous, setContinuous] = useState(false);
  const previous = useRef(session.state);

  // Continuously listening the events from the backend and dispatching them to the reducer to update the session state.
  useEffect(() => {
    const unsubscribe = backend.subscribe((event: OrbitEvent) => dispatch(event));
    return () => {
      unsubscribe();
      backend.dispose();
    };
  }, [backend]);

  // Continuous conversation: once Orbit finishes speaking it re-opens the mic
  // instead of making the user press anything.
  useEffect(() => {
    const was = previous.current;
    previous.current = session.state;
    if (!continuous) return;
    if (was === "speaking" && session.state === "idle") {
      const id = setTimeout(() => backend.startListening(), 900);
      return () => clearTimeout(id);
    }
  }, [session.state, continuous, backend]);

  const busy =
    session.state === "thinking" ||
    session.state === "working" ||
    session.state === "speaking" ||
    session.state === "waiting";

  const newSession = useCallback(() => {
    backend.reset();
    dispatch({ type: "session_reset" });
  }, [backend]);

  return {
    session,
    busy,
    continuous,
    setContinuous,
    listen: useCallback((phrase?: string) => backend.startListening(phrase), [backend]),
    stopListening: useCallback(() => backend.stopListening(), [backend]),
    send: useCallback(
      (text: string, via: InputChannel = "text") => backend.submit(text, via),
      [backend],
    ),
    cancel: useCallback(() => backend.cancel(), [backend]),
    retry: useCallback(() => backend.retry(), [backend]),
    resolvePermission: useCallback(
      (id: string, granted: boolean) => backend.resolvePermission(id, granted),
      [backend],
    ),
    setScreenAwareness: useCallback(
      (on: boolean) => dispatch({ type: "computer", payload: { screenAwareness: on } }),
      [],
    ),
    newSession,
  };
}
