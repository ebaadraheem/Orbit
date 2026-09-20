import { AlertTriangle, Check, Minus, RotateCcw, Square, X } from "lucide-react";
import type { Task, TaskStep as Step } from "../../types/orbit";
import { Button, cn } from "../ui";

const statusWord: Record<Task["status"], string> = {
  pending: "Queued",
  running: "Working",
  completed: "Done",
  failed: "Stopped",
  cancelled: "Cancelled",
};

function StepMark({ status }: { status: Step["status"] }) {
  if (status === "completed")
    return <Check size={13} className="text-[var(--accent)]" strokeWidth={2.5} />;
  if (status === "failed") return <X size={13} className="text-[var(--clay)]" strokeWidth={2.5} />;
  if (status === "skipped") return <Minus size={13} className="text-[var(--text-mute)]" />;
  if (status === "running")
    return (
      <span className="relative flex h-3 w-3 items-center justify-center">
        <span
          className="absolute h-3 w-3 rounded-full bg-[var(--accent)] opacity-30"
          style={{ animation: "orbit-breathe 1.8s ease-in-out infinite" }}
        />
        <span className="h-[5px] w-[5px] rounded-full bg-[var(--accent)]" />
      </span>
    );
  return <span className="h-[7px] w-[7px] rounded-full border border-[#3a3f48]" />;
}

export function TaskStep({ step }: { step: Step }) {
  return (
    <li className="flex items-start gap-2.5 py-[3px] ">
      <span className="mt-[5px] flex h-3 w-3 shrink-0 items-center justify-center">
        <StepMark status={step.status} />
      </span>
      <span
        className={cn(
          "text-[13px] leading-[19px]",
          step.status === "pending" && "text-[var(--text-mute)]",
          step.status === "running" && "text-[var(--text)]",
          step.status === "completed" && "text-[var(--text-dim)]",
          step.status === "failed" && "text-[var(--clay)]",
          step.status === "skipped" && "text-[var(--text-mute)] line-through decoration-[#3a3f48]",
        )}
      >
        {step.label}
        {step.detail && (
          <span className="ml-2 text-[12px] text-[var(--text-mute)]">{step.detail}</span>
        )}
      </span>
    </li>
  );
}

interface Props {
  task: Task;
  onStop(): void;
  onRetry(): void;
}

export function ActiveTask({ task, onStop, onRetry }: Props) {
  const running = task.status === "running";
  const done = task.steps.filter((s) => s.status === "completed").length;

  return (
    <section
      aria-label={`Task: ${task.title}`}
      className={cn(
        "animate-rise relative my-3 rounded-lg border bg-[var(--surface)] ",
        task.status === "failed" ? "border-[#4a322d]" : "border-[var(--line)] ",
      )}
    >
      {/* A rail rather than a header bar: the task reads as one continuous thread. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-3 bottom-3 w-[2px] rounded-full",
          running
            ? "bg-[var(--accent-dim)]"
            : task.status === "completed"
              ? "bg-[var(--accent-dim)] opacity-40"
              : task.status === "failed"
                ? "bg-[var(--clay)] opacity-60"
                : "bg-[#2e323a]",
        )}
      />
      <div className="flex items-start gap-3 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[11.5px] font-medium",
                running
                  ? "text-[var(--accent)]"
                  : task.status === "failed"
                    ? "text-[var(--clay)]"
                    : "text-[var(--text-mute)]",
              )}
            >
              {statusWord[task.status]}
            </span>
            <span className="text-[11.5px] text-[var(--text-mute)]">
              {done} of {task.steps.length} steps
            </span>
          </div>
          <h3 className="mt-0.5 truncate text-[14px] text-[var(--text)]" data-selectable>
            {task.title}
          </h3>
        </div>
        {running && (
          <Button size="sm" variant="ghost" icon={<Square size={11} fill="currentColor" />} onClick={onStop}>
            Stop
          </Button>
        )}
      </div>

      <ul className="px-4 pb-3.5 pt-2.5">
        {task.steps.map((step) => (
          <TaskStep key={step.id} step={step} />
        ))}
      </ul>

      {task.error && (
        <div className="mx-4 mb-4 rounded-md border border-[#4a322d] bg-[#1e1614] p-3.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={15} className="mt-[2px] shrink-0 text-[var(--clay)]" />
            <div className="min-w-0">
              <p className="text-[13.5px] text-[var(--text)]" data-selectable>
                {task.error.title}
              </p>
              <p className="mt-1 text-[12.5px] text-[var(--text-dim)]" data-selectable>
                {task.error.detail}
              </p>
            </div>
          </div>
          {task.error.retryable && (
            <div className="mt-3 flex gap-2 pl-[26px]">
              <Button size="sm" variant="neutral" icon={<RotateCcw size={12} />} onClick={onRetry}>
                Try again
              </Button>
              <Button size="sm" variant="ghost" onClick={onStop}>
                Leave it
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
