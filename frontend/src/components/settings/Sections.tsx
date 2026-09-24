import { useState } from 'react'
import { KeyCap, Toggle } from '../ui'
import { BaseSectionProps } from './Settings'
import { cn } from '../ui'

// --- Shared UI Helpers ---

function Row ({
  title,
  description,
  children,
  tone
}: {
  title: string
  description?: string
  children: React.ReactNode
  tone?: 'warn'
}) {
  return (
    <div className='flex items-start justify-between gap-6 border-b border-[var(--line)] py-3.5 last:border-b-0'>
      <div className='min-w-0'>
        <p
          className={cn(
            'text-[13.5px]',
            tone === 'warn' ? 'text-[var(--amber)]' : 'text-[var(--text)]'
          )}
        >
          {title}
        </p>
        {description && (
          <p className='mt-0.5 max-w-[52ch] text-[12.5px] text-[var(--text-mute)]'>
            {description}
          </p>
        )}
      </div>
      <div className='shrink-0 pt-0.5'>{children}</div>
    </div>
  )
}

function Select ({
  value,
  options,
  onChange,
  label
}: {
  value: string
  options: string[]
  onChange(value: string): void
  label: string
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={e => onChange(e.target.value)}
      className='no-drag cursor-pointer h-8 rounded-md border border-[var(--line-strong)] bg-[var(--raised)] px-2 text-[13px] text-[var(--text-dim)] hover:border-[#3a3f48] focus:outline-none'
    >
      {options.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

function Group ({
  title,
  note,
  children
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className='mb-8'>
      <h3 className='text-[14.5px] font-medium text-[var(--text)]'>{title}</h3>
      {note && (
        <p className='mt-1 max-w-[60ch] text-[12.5px] text-[var(--text-mute)]'>
          {note}
        </p>
      )}
      <div className='mt-2'>{children}</div>
    </section>
  )
}

// --- Settings Sections ---

export function GeneralSection ({ settings, onChange }: BaseSectionProps) {
  return (
    <Group title='General'>
      <Row
        title='Start Orbit with Windows'
        description='Orbit sits in the tray and is ready when you sign in.'
      >
        <Toggle
          checked={settings.startWithWindows}
          onChange={v => onChange('startWithWindows', v)}
          label='Start Orbit with Windows'
        />
      </Row>
      <Row
        title='Default way to talk to Orbit'
        description='What happens when you open Orbit or start a new task.'
      >
        <Select
          label='Default interaction mode'
          value={settings.defaultMode === 'voice' ? 'Voice' : 'Text'}
          options={['Voice', 'Text']}
          onChange={v =>
            onChange('defaultMode', v === 'Voice' ? 'voice' : 'text')
          }
        />
      </Row>
      <Row title='Appearance' description='Orbit is built for low light.'>
        <Select
          label='Appearance'
          value={settings.appearance === 'dark' ? 'Dark' : 'Match system'}
          options={['Dark', 'Match system']}
          onChange={v =>
            onChange('appearance', v === 'Dark' ? 'dark' : 'system')
          }
        />
      </Row>
    </Group>
  )
}

export function VoiceSection ({ settings, onChange }: BaseSectionProps) {
  return (
    <Group title='Voice'>
      <Row
        title='Microphone'
        description='Used for everything you say to Orbit.'
      >
        <Select
          label='Microphone'
          value={settings.microphone}
          options={[
            'Headset microphone',
            'Laptop microphone',
            'Webcam microphone'
          ]}
          onChange={v => onChange('microphone', v)}
        />
      </Row>
      <Row
        title="Orbit's voice"
        description='How Orbit sounds when it speaks back.'
      >
        <Select
          label='Voice'
          value={settings.voice}
          options={['Calm (default)', 'Neutral', 'Warm', 'Brisk']}
          onChange={v => onChange('voice', v)}
        />
      </Row>
      <Row
        title='Speech speed'
        description={`${settings.speechRate.toFixed(1)}× normal speed.`}
      >
        <input
          type='range'
          min={0.5}
          max={2}
          step={0.1}
          value={settings.speechRate}
          aria-label='Speech speed'
          onChange={e => onChange('speechRate', Number(e.target.value))}
          className='no-drag h-1.5 w-[140px] cursor-pointer appearance-none rounded-full bg-[#2b2f36] accent-[var(--accent)]'
        />
      </Row>
      <Row
        title='Push to talk'
        description='Hold Ctrl + Space to speak. Release and Orbit starts working.'
      >
        <Toggle
          checked={settings.pushToTalk}
          onChange={v => onChange('pushToTalk', v)}
          label='Push to talk'
        />
      </Row>
      <Row
        title='Continuous listening'
        description="Orbit re-opens the microphone after each reply so you can keep talking. The microphone indicator stays visible while it's on."
      >
        <Toggle
          checked={settings.continuousListening}
          onChange={v => onChange('continuousListening', v)}
          label='Continuous listening'
        />
      </Row>
    </Group>
  )
}

export function ComputerSection ({ settings, onChange }: BaseSectionProps) {
  return (
    <Group
      title='Computer control'
      note='What Orbit is allowed to do on this machine. Orbit asks before anything that changes or deletes your files, and before running commands.'
    >
      <Row
        title='Keyboard control'
        description='Type and use keyboard shortcuts while carrying out a task.'
      >
        <Toggle
          checked={settings.allowKeyboard}
          onChange={v => onChange('allowKeyboard', v)}
          label='Keyboard control'
        />
      </Row>
      <Row
        title='Mouse control'
        description='Move the pointer and click on things.'
      >
        <Toggle
          checked={settings.allowMouse}
          onChange={v => onChange('allowMouse', v)}
          label='Mouse control'
        />
      </Row>
      <Row
        title='Open applications'
        description='Launch programs such as File Explorer, VS Code or a browser.'
      >
        <Toggle
          checked={settings.allowLaunch}
          onChange={v => onChange('allowLaunch', v)}
          label='Open applications'
        />
      </Row>
      <Row
        title='File operations'
        description='Read, move, rename and copy files in the folders you work in.'
      >
        <Toggle
          checked={settings.allowFiles}
          onChange={v => onChange('allowFiles', v)}
          label='File operations'
        />
      </Row>
      <Row
        title='Terminal commands'
        description='Run commands in a shell. Each command is shown to you before it runs.'
        tone='warn'
      >
        <Toggle
          checked={settings.allowTerminal}
          onChange={v => onChange('allowTerminal', v)}
          label='Terminal commands'
        />
      </Row>
      <Row
        title='Screen reading'
        description="Look at what's on screen to check whether an action worked."
        tone='warn'
      >
        <Toggle
          checked={settings.allowScreen}
          onChange={v => onChange('allowScreen', v)}
          label='Screen reading'
        />
      </Row>
      <Row
        title='Always confirm deletions'
        description="Ask before anything is deleted, even when you've allowed file operations."
      >
        <Toggle
          checked={settings.confirmDestructive}
          onChange={v => onChange('confirmDestructive', v)}
          label='Always confirm deletions'
        />
      </Row>
      <p className='mt-4 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[12px] text-[var(--text-mute)]'>
        These switches are part of the interface only. Nothing enforces them
        yet, because Orbit can't control the computer at this stage.
      </p>
    </Group>
  )
}

export function PrivacySection ({ settings, onChange }: BaseSectionProps) {
  return (
    <Group
      title='Privacy'
      note='Orbit is built to work on this computer first. You decide what, if anything, leaves it.'
    >
      <Row
        title='Local-first mode'
        description='Speech, transcripts and task history are kept on this computer.'
      >
        <Toggle
          checked={settings.localFirst}
          onChange={v => onChange('localFirst', v)}
          label='Local-first mode'
        />
      </Row>
      <Row
        title='Use a cloud model'
        description='Send harder questions to a hosted model. Your words leave this computer when this is on.'
        tone='warn'
      >
        <Toggle
          checked={settings.cloudModel}
          onChange={v => onChange('cloudModel', v)}
          label='Use a cloud model'
        />
      </Row>
      <Row
        title='Screen observation'
        description='Let Orbit take a look at the screen during a task.'
        tone='warn'
      >
        <Toggle
          checked={settings.allowScreen}
          onChange={v => onChange('allowScreen', v)}
          label='Screen observation'
        />
      </Row>
      <Row
        title='Keep conversation history'
        description='Sessions stay in the sidebar. Turn this off and each session is forgotten when you close it.'
      >
        <Toggle
          checked={settings.storeHistory}
          onChange={v => onChange('storeHistory', v)}
          label='Keep conversation history'
        />
      </Row>
    </Group>
  )
}

export function ShortcutsSection () {
  const [shortcutEditing, setShortcutEditing] = useState<string | null>(null)

  const shortcutsList = [
    { keys: ['Ctrl', 'Space'], label: 'Hold to talk', id: 'ptt' },
    { keys: ['Ctrl', 'K'], label: 'Commands and search', id: 'palette' },
    { keys: ['Esc'], label: "Stop Orbit, or close what's open", id: 'esc' },
    { keys: ['Enter'], label: 'Send a typed message', id: 'send' },
    { keys: ['Shift', 'Enter'], label: 'New line while typing', id: 'newline' },
    { keys: ['Ctrl', 'N'], label: 'New task', id: 'new' },
    { keys: ['Ctrl', 'B'], label: 'Show or hide sessions', id: 'sidebar' },
    { keys: ['Ctrl', 'J'], label: 'Show or hide computer activity', id: 'rail' }
  ]

  return (
    <Group
      title='Shortcuts'
      note="Chosen so they don't get in the way of normal typing."
    >
      {shortcutsList.map(shortcut => (
        <Row key={shortcut.id} title={shortcut.label}>
          <button
            type='button'
            onClick={() =>
              setShortcutEditing(
                shortcutEditing === shortcut.id ? null : shortcut.id
              )
            }
            className='no-drag flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-[var(--raised)]'
          >
            {shortcutEditing === shortcut.id ? (
              <span className='text-[12.5px] text-[var(--accent)]'>
                Press new keys…
              </span>
            ) : (
              shortcut.keys.map(key => <KeyCap key={key}>{key}</KeyCap>)
            )}
          </button>
        </Row>
      ))}
    </Group>
  )
}
