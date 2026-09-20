/// <reference types="vite/client" />

/** Exposed by electron/preload.cjs. Present only inside the desktop app. */
interface Window {
  orbit?: {
    platform: string;
    minimize(): void;
    toggleMaximize(): void;
    close(): void;
    onEvent(callback: (event: unknown) => void): () => void;
    send(command: string, payload?: unknown): void;
  };
}
