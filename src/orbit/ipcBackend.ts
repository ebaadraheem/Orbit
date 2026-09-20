// It acts as a bridge between the Orbit frontend and the Orbit backend, which may be running in a 
// separate process. It uses the `window.orbit` API to send commands to the backend and receive events from it.

import type { OrbitBackend, OrbitEvent } from './events'
import type { InputChannel } from '../types/orbit'

/**
 * The real backend, for when the agent process exists.
 *
 * Swap it in by changing one line in `useOrbit.ts`:
 *
 *   const backend = useMemo(() => createIpcBackend(), []);
 *
 * Nothing else in the UI changes.
 */
export function createIpcBackend (): OrbitBackend {
  // All listeners that have subscribed to Orbit events. When an event is received from the backend, 
  // it is dispatched to all listeners.

  const listeners = new Set<(event: OrbitEvent) => void>()
  let detach: (() => void) | null = null

  const bridge = typeof window !== 'undefined' ? window.orbit : undefined

  if (bridge) {
    detach = bridge.onEvent(payload => {
      // The agent is trusted, but a malformed frame shouldn't take the UI down.
      if (!payload || typeof payload !== 'object' || !('type' in payload))
        return
      listeners.forEach(listener => listener(payload as OrbitEvent))
    })
  }

  const send = (command: string, payload?: unknown) =>
    bridge?.send(command, payload)

  return {
    subscribe (listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    submit: (text: string, via: InputChannel) => send('submit', { text, via }),
    startListening: () => send('listen'),
    stopListening: () => send('stop_listening'),
    cancel: () => send('cancel'),
    resolvePermission: (id: string, granted: boolean) =>
      send('resolve_permission', { id, granted }),
    retry: () => send('retry'),
    reset: () => send('reset'),
    dispose () {
      detach?.()
      listeners.clear()
    }
  }
}
