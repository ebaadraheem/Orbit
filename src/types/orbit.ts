/**
 * Orbit domain types for the frontend and backend. These are used in the OrbitBackend.subscribe() callback, and in the OrbitBackend interface itself.
 */

export type OrbitState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'working'
  | 'speaking'
  | 'waiting'
  | 'error'

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'

export type ActivityType =
  | 'application'
  | 'keyboard'
  | 'mouse'
  | 'screen'
  | 'file'
  | 'terminal'
  | 'system'

export type InputChannel = 'voice' | 'text'

export type PrivacyMode = 'local' | 'cloud' | 'mixed' | 'offline'

export interface TaskStep {
  id: string
  label: string
  status: StepStatus
  /** Short user-facing detail. Never internal reasoning. */
  detail?: string
  at: number
}

export interface TaskError {
  title: string
  detail: string
  retryable: boolean
}

export interface Task {
  id: string
  title: string
  status: TaskStatus
  steps: TaskStep[]
  startedAt: number
  endedAt?: number
  error?: TaskError
}

export interface Message {
  id: string
  role: 'user' | 'orbit'
  text: string
  at: number
  via: InputChannel
  /** Set when the user cut Orbit off mid-sentence. */
  interrupted?: boolean
}

export interface Activity {
  id: string
  type: ActivityType
  label: string
  detail?: string
  status: 'running' | 'done' | 'failed'
  at: number
}

export type PermissionRisk = 'normal' | 'elevated' | 'destructive'

export interface PermissionRequest {
  id: string
  title: string
  /** What will happen, in the user's words. */
  summary: string
  /** Verbatim command or file list, shown in mono when present. */
  literal?: string
  consequence?: string
  risk: PermissionRisk
  confirmLabel: string
  resolution?: 'granted' | 'denied'
}

export interface RunningApp {
  name: string
  state: 'active' | 'open' | 'launching'
}

export interface ComputerState {
  activeApp: string | null
  apps: RunningApp[]
  /** What Orbit is doing with the machine right now, if anything. */
  control: 'keyboard' | 'mouse' | 'reading' | 'waiting' | null
  screenAwareness: boolean
}

/** An ordered record of everything that happened in the session. */
export type TimelineItem =
  | { kind: 'message'; id: string; at: number; message: Message }
  | { kind: 'task'; id: string; at: number; task: Task }
  | { kind: 'permission'; id: string; at: number; request: PermissionRequest }
  | {
      kind: 'notice'
      id: string
      at: number
      text: string
      tone: 'neutral' | 'error'
    }

export interface Conversation {
  id: string
  title: string
  preview: string
  updatedAt: number
  group: 'Today' | 'Yesterday' | 'Earlier'
  taskCount: number
}

export interface CompletedTask {
  id: string
  title: string
  status: Extract<TaskStatus, 'completed' | 'failed' | 'cancelled'>
  at: number
}

export interface OrbitSession {
  state: OrbitState
  /** Live speech-to-text, cleared once the utterance is committed. */
  transcript: string
  timeline: TimelineItem[]
  activeTaskId: string | null
  pendingPermission: PermissionRequest | null
  computer: ComputerState
  /** Low-level tool/computer events, newest last. Rendered in the right rail. */
  activityFeed: Activity[]
  history: CompletedTask[]
  title: string
  /** Continuous listening: Orbit re-opens the mic after it finishes speaking. */
  continuous: boolean
}
