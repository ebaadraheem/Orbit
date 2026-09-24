// Central State Management for Orbit. The reducer takes the current session state and an event from the backend, 
// and returns a new session state. It is used in the `useOrbit` hook to update the session state when events are 
// received from the backend.

import type { OrbitEvent } from './events'
import type { OrbitSession, Task, TimelineItem } from '../types/orbit'

export const initialSession: OrbitSession = {
  state: 'idle',
  transcript: '',
  timeline: [],
  activeTaskId: null,
  pendingPermission: null,
  computer: {
    activeApp: null,
    apps: [],
    control: null,
    screenAwareness: false
  },
  activityFeed: [],
  history: [
    {
      id: 'h1',
      title: 'Organised Downloads',
      status: 'completed',
      at: Date.now() - 1000 * 60 * 42
    },
    {
      id: 'h2',
      title: 'Summarised memory paper',
      status: 'completed',
      at: Date.now() - 1000 * 60 * 96
    },
    {
      id: 'h3',
      title: 'Found latest SOP',
      status: 'completed',
      at: Date.now() - 1000 * 60 * 180
    }
  ],
  title: 'New task',
  continuous: false
}

let seq = 0
const nextId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`

function mapTask (
  timeline: TimelineItem[],
  taskId: string,
  fn: (task: Task) => Task
): TimelineItem[] {
  return timeline.map(item =>
    item.kind === 'task' && item.task.id === taskId
      ? { ...item, task: fn(item.task) }
      : item
  )
}

/** Renderer-local actions that never come from the backend. */
export type LocalAction = { type: 'session_reset' }

export function reduce (
  session: OrbitSession,
  event: OrbitEvent | LocalAction
): OrbitSession {
  switch (event.type) {
    case 'session_reset':
      return {
        ...initialSession,
        history: session.history,
        computer: {
          ...initialSession.computer,
          screenAwareness: session.computer.screenAwareness
        }
      }

    case 'state_changed':
      return {
        ...session,
        state: event.payload.state,
        transcript:
          event.payload.state === 'listening' ? session.transcript : ''
      }

    case 'transcript':
      return {
        ...session,
        transcript: event.payload.final ? '' : event.payload.text
      }

    case 'user_message': {
      const at = Date.now()
      return {
        ...session,
        transcript: '',
        timeline: [
          ...session.timeline,
          {
            kind: 'message',
            id: nextId('m'),
            at,
            message: {
              id: nextId('msg'),
              role: 'user',
              text: event.payload.text,
              at,
              via: event.payload.via
            }
          }
        ]
      }
    }

    case 'assistant_message': {
      const at = Date.now()
      return {
        ...session,
        timeline: [
          ...session.timeline,
          {
            kind: 'message',
            id: nextId('m'),
            at,
            message: {
              id: nextId('msg'),
              role: 'orbit',
              text: event.payload.text,
              at,
              via: 'voice'
            }
          }
        ]
      }
    }

    case 'task_started':
      return {
        ...session,
        activeTaskId: event.payload.task.id,
        timeline: [
          ...session.timeline,
          {
            kind: 'task',
            id: nextId('t'),
            at: Date.now(),
            task: event.payload.task
          }
        ]
      }

    case 'task_step': {
      const { taskId, step } = event.payload
      return {
        ...session,
        timeline: mapTask(session.timeline, taskId, task => {
          const existing = task.steps.findIndex(s => s.id === step.id)
          const steps =
            existing >= 0
              ? task.steps.map((s, i) =>
                  i === existing ? { ...s, ...step } : s
                )
              : [...task.steps, step]
          return { ...task, steps }
        })
      }
    }

    case 'task_completed': {
      const { taskId, status, error } = event.payload
      let finished: Task | null = null
      const timeline = mapTask(session.timeline, taskId, task => {
        finished = {
          ...task,
          status,
          error,
          endedAt: Date.now(),
          // Anything still running is resolved so no step is left spinning.
          steps: task.steps.map(s =>
            s.status === 'running'
              ? {
                  ...s,
                  status: status === 'completed' ? 'completed' : 'skipped'
                }
              : s
          )
        }
        return finished
      })
      const done = finished as Task | null
      return {
        ...session,
        activeTaskId:
          session.activeTaskId === taskId ? null : session.activeTaskId,
        timeline,
        history:
          done && status !== 'pending' && status !== 'running'
            ? [
                { id: done.id, title: done.title, status, at: Date.now() },
                ...session.history
              ].slice(0, 12)
            : session.history
      }
    }

    case 'activity': {
      const incoming = event.payload
      const known = session.activityFeed.findIndex(a => a.id === incoming.id)
      const activityFeed =
        known >= 0
          ? session.activityFeed.map((a, i) =>
              i === known ? { ...a, ...incoming } : a
            )
          : [...session.activityFeed, incoming].slice(-40)
      return { ...session, activityFeed }
    }

    case 'computer':
      return { ...session, computer: { ...session.computer, ...event.payload } }

    case 'permission_required':
      return {
        ...session,
        pendingPermission: event.payload,
        timeline: [
          ...session.timeline,
          {
            kind: 'permission',
            id: nextId('p'),
            at: Date.now(),
            request: event.payload
          }
        ]
      }

    case 'permission_resolved': {
      const { id, granted } = event.payload
      return {
        ...session,
        pendingPermission: null,
        timeline: session.timeline.map(item =>
          item.kind === 'permission' && item.request.id === id
            ? {
                ...item,
                request: {
                  ...item.request,
                  resolution: granted ? 'granted' : 'denied'
                }
              }
            : item
        )
      }
    }

    case 'title':
      return { ...session, title: event.payload.title }

    case 'notice':
      return {
        ...session,
        timeline: [
          ...session.timeline,
          {
            kind: 'notice',
            id: nextId('n'),
            at: Date.now(),
            text: event.payload.text,
            tone: event.payload.tone
          }
        ]
      }

    default:
      return session
  }
}
