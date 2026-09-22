import { useId } from "react";
import type { OrbitState } from "../../types/orbit";
import { useReducedMotion } from "../../lib/hooks";

export const stateColor: Record<OrbitState, string> = {
  idle: "var(--text-mute)",
  listening: "var(--accent)",
  thinking: "var(--accent)",
  working: "var(--accent)",
  speaking: "var(--accent)",
  waiting: "var(--amber)",
  error: "var(--clay)",
};

export const stateLabel: Record<OrbitState, string> = {
  idle: "Ready",
  listening: "Listening",
  thinking: "Thinking",
  working: "Working",
  speaking: "Speaking",
  waiting: "Waiting for you",
  error: "Stuck",
};

interface Props {
  state: OrbitState;
  size?: number;
}

/**
 * One body, six behaviours:
 *   idle      a still core
 *   listening a breathing halo
 *   thinking  a satellite crossing the ring quickly
 *   working   the ring drawn in, satellite tracking slowly
 *   speaking  the core resolved into a waveform
 *   waiting   an amber core, ring held
 *   error     the ring broken
 */
export function OrbitLogo({ state, size = 120 }: Props) {
  const id = useId().replace(/:/g, "");
  const still = useReducedMotion();
  const colour = stateColor[state];

  const ringPath = "M 100 100 m -66 0 a 66 25 0 1 0 132 0 a 66 25 0 1 0 -132 0";
  const orbiting = state === "thinking" || state === "working";
  const ringOpacity =
    state === "idle" ? 0.22 : orbiting ? 0.75 : state === "error" ? 0.4 : 0.34;
  const duration = state === "thinking" ? "2.6s" : "5.2s";

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        <path id={`${id}-ring`} d={ringPath} />
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor={colour} stopOpacity="0.30" />
          <stop offset="65%" stopColor={colour} stopOpacity="0.06" />
          <stop offset="100%" stopColor={colour} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="100" cy="100" r="74" fill={`url(#${id}-glow)`} />

      {/* Breathing halo, listening only. */}
      {state === "listening" && (
        <g style={{ transformOrigin: "100px 100px" }}>
          {[0, 1].map((i) => (
            <circle
              key={i}
              cx="100"
              cy="100"
              r={26 + i * 13}
              fill="none"
              stroke={colour}
              strokeWidth="1"
              opacity={0.5}
              style={
                still
                  ? { opacity: 0.25 }
                  : {
                      transformOrigin: "100px 100px",
                      animation: `orbit-breathe ${2.9 + i * 0.5}s ease-in-out ${i * 0.45}s infinite`,
                    }
              }
            />
          ))}
        </g>
      )}

      {/* The orbital ring. Broken when Orbit is stuck. */}
      <g transform="rotate(-17 100 100)">
        <use
          href={`#${id}-ring`}
          fill="none"
          stroke={colour}
          strokeWidth="1.25"
          opacity={ringOpacity}
          strokeDasharray={state === "error" ? "54 22" : undefined}
          strokeLinecap="round"
        />

        {/* A lit arc sweeping the ring while Orbit works. */}
        {state === "working" && !still && (
          <use
            href={`#${id}-ring`}
            fill="none"
            stroke={colour}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="34 260"
            opacity="0.9"
            style={{ animation: "orbit-sweep 5.2s linear infinite" }}
          />
        )}

        {/* The satellite. */}
        {orbiting &&
          (still ? (
            <circle cx="166" cy="100" r="3.4" fill={colour} />
          ) : (
            <circle r="3.4" fill={colour}>
              <animateMotion dur={duration} repeatCount="indefinite" rotate="auto">
                <mpath href={`#${id}-ring`} />
              </animateMotion>
            </circle>
          ))}
      </g>

      {/* The core, or its waveform while speaking. */}
      {state === "speaking" ? (
        <g>
          {[0, 1, 2, 3, 4].map((i) => {
            const height = [11, 20, 27, 18, 10][i];
            return (
              <rect
                key={i}
                x={83 + i * 8.5}
                y={100 - height / 2}
                width="3.2"
                height={height}
                rx="1.6"
                fill={colour}
                style={
                  still
                    ? undefined
                    : {
                        transformOrigin: `${84.6 + i * 8.5}px 100px`,
                        animation: `orbit-wave ${0.62 + i * 0.09}s ease-in-out ${i * 0.07}s infinite`,
                      }
                }
              />
            );
          })}
        </g>
      ) : (
        <g
          style={
            still || state !== "idle"
              ? undefined
              : { animation: "orbit-drift 6s ease-in-out infinite" }
          }
        >
          <circle
            cx="100"
            cy="100"
            r={state === "listening" ? 12 : 10}
            fill={colour}
            opacity={state === "idle" ? 0.62 : 1}
            style={{ transition: "r 260ms ease, opacity 260ms ease" }}
          />
          {state === "waiting" && !still && (
            <circle cx="100" cy="100" r="18" fill="none" stroke={colour} strokeWidth="1">
              <animate
                attributeName="opacity"
                values="0.65;0.12;0.65"
                dur="2.2s"
                repeatCount="indefinite"
              />
            </circle>
          )}
        </g>
      )}
    </svg>
  );
}
