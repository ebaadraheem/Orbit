import { Cloud, HardDrive, WifiOff } from 'lucide-react'
import type { PrivacyMode } from '../../types/orbit'
import { Popover, cn } from '../ui'

const modes: Record<
  PrivacyMode,
  { label: string; colour: string; icon: typeof HardDrive; summary: string }
> = {
  local: {
    label: 'Local',
    colour: 'var(--accent)',
    icon: HardDrive,
    summary:
      'Everything you say and everything Orbit does stays on this computer.'
  },
  cloud: {
    label: 'Cloud',
    colour: 'var(--amber)',
    icon: Cloud,
    summary:
      'Requests are sent to a hosted model. Transcripts leave this computer.'
  },
  mixed: {
    label: 'Mixed',
    colour: 'var(--amber)',
    icon: Cloud,
    summary: 'Speech is handled locally; harder questions go to a hosted model.'
  },
  offline: {
    label: 'Offline',
    colour: 'var(--text-mute)',
    icon: WifiOff,
    summary: "No network. Orbit is working from what's on this computer."
  }
}

interface Props {
  mode: PrivacyMode
  model: string
  storeHistory: boolean
  onOpenPrivacy(): void
}

export function StatusIndicator ({
  mode,
  model,
  storeHistory,
  onOpenPrivacy
}: Props) {
  const current = modes[mode]
  const Icon = current.icon

  return (
    <Popover
      label='Privacy status'
      trigger={({ toggle, open }) => (
        <button
          type='button'
          onClick={toggle}
          aria-expanded={open}
          className={cn(
            'no-drag flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] transition-colors duration-150 focus:outline-none',
            open ? 'bg-[var(--raised)]' : 'hover:bg-[var(--raised)]'
          )}
        >
          <span
            className='h-1.5 w-1.5 rounded-full'
            style={{ background: current.colour }}
            aria-hidden='true'
          />
          <span className='text-[var(--text-dim)]'>{current.label}</span>
          <span className='text-[var(--text-mute)]'>{model}</span>
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div className='flex items-start gap-2.5'>
            <span
              className='mt-[2px] flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--raised)]'
              style={{ color: current.colour }}
            >
              <Icon size={14} />
            </span>
            <div>
              <p className='text-[13.5px] font-medium text-[var(--text)]'>
                Running in {current.label.toLowerCase()} mode
              </p>
              <p className='mt-1 text-[12.5px] text-[var(--text-dim)]'>
                {current.summary}
              </p>
            </div>
          </div>
          <dl className='mt-3 space-y-1.5 border-t border-[var(--line)] pt-3 text-[12.5px]'>
            <div className='flex justify-between'>
              <dt className='text-[var(--text-mute)]'>Model</dt>
              <dd className='text-[var(--text-dim)]'>{model}</dd>
            </div>
            <div className='flex justify-between'>
              <dt className='text-[var(--text-mute)]'>Conversation history</dt>
              <dd className='text-[var(--text-dim)]'>
                {storeHistory ? 'Saved here' : 'Not kept'}
              </dd>
            </div>
          </dl>
          <button
            type='button'
            onClick={() => {
              onOpenPrivacy()
              close()
            }}
            className='no-drag mt-3 w-full rounded-md border border-[var(--line-strong)] px-2 py-1.5 text-[12.5px] text-[var(--text-dim)] hover:bg-[var(--raised)] hover:text-[var(--text)]'
          >
            Privacy settings
          </button>
        </>
      )}
    </Popover>
  )
}
