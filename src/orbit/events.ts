// Data Types of messages sent from the Orbit backend to the frontend. 
// These are used in the OrbitBackend.subscribe() callback.

import type {
  Activity,
  ComputerState,
  InputChannel,
  OrbitState,
  PermissionRequest,
  Task,
  TaskError,
  TaskStatus,
  TaskStep
} from '../types/orbit'

export type OrbitEvent =
  | { type: 'state_changed'; payload: { state: OrbitState } }
  | { type: 'transcript'; payload: { text: string; final: boolean } }
  | { type: 'user_message'; payload: { text: string; via: InputChannel } }
  | { type: 'assistant_message'; payload: { text: string } }
  | { type: 'task_started'; payload: { task: Task } }
  | { type: 'task_step'; payload: { taskId: string; step: TaskStep } }
  | {
      type: 'task_completed'
      payload: { taskId: string; status: TaskStatus; error?: TaskError }
    }
  | { type: 'activity'; payload: Activity }
  | { type: 'computer'; payload: Partial<ComputerState> }
  | { type: 'permission_required'; payload: PermissionRequest }
  | { type: 'permission_resolved'; payload: { id: string; granted: boolean } }
  | { type: 'title'; payload: { title: string } }
  | { type: 'notice'; payload: { text: string; tone: 'neutral' | 'error' } }

// The interface for the Orbit backend. The frontend uses this interface to communicate with the backend.

export interface OrbitBackend {
  subscribe(listener: (event: OrbitEvent) => void): () => void

  submit(text: string, via: InputChannel): void
  /** `phrase` exists only so the mock can simulate dictation; the real STT ignores it. */
  startListening(phrase?: string): void
  stopListening(): void
  /** Esc / Stop: halt whatever is in flight. */
  cancel(): void
  resolvePermission(id: string, granted: boolean): void
  retry(): void
  reset(): void
  dispose(): void
}
