import {
  Keyboard,
  Monitor,
  Mic,
  Shield,
  SlidersHorizontal,
  X
} from 'lucide-react'
import { IconButton, cn } from '../ui'
import {
  ComputerSection,
  GeneralSection,
  VoiceSection,
  PrivacySection,
  ShortcutsSection
} from './Sections'

// --- Types & Constants ---

export interface OrbitSettings {
  startWithWindows: boolean
  defaultMode: 'voice' | 'text'
  appearance: 'dark' | 'system'
  microphone: string
  voice: string
  speechRate: number
  pushToTalk: boolean
  continuousListening: boolean
  allowKeyboard: boolean
  allowMouse: boolean
  allowLaunch: boolean
  allowTerminal: boolean
  allowFiles: boolean
  allowScreen: boolean
  confirmDestructive: boolean
  localFirst: boolean
  cloudModel: boolean
  storeHistory: boolean
}

export const defaultSettings: OrbitSettings = {
  startWithWindows: true,
  defaultMode: 'voice',
  appearance: 'dark',
  microphone: 'Headset microphone',
  voice: 'Calm (default)',
  speechRate: 1,
  pushToTalk: true,
  continuousListening: false,
  allowKeyboard: true,
  allowMouse: true,
  allowLaunch: true,
  allowTerminal: false,
  allowFiles: true,
  allowScreen: false,
  confirmDestructive: true,
  localFirst: true,
  cloudModel: false,
  storeHistory: true
}

export type SettingsSection =
  | 'general'
  | 'voice'
  | 'computer'
  | 'privacy'
  | 'shortcuts'

const sections: { id: SettingsSection; label: string; icon: typeof Mic }[] = [
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'computer', label: 'Computer control', icon: Monitor },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard }
]

export interface BaseSectionProps {
  settings: OrbitSettings
  onChange<K extends keyof OrbitSettings>(key: K, value: OrbitSettings[K]): void
}

interface Props extends BaseSectionProps {
  onClose(): void
  section: SettingsSection
  onSection(section: SettingsSection): void
}

// --- Main Settings Component ---

export function Settings ({
  settings,
  onChange,
  onClose,
  section,
  onSection
}: Props) {
  return (
    <div className='flex flex-1 overflow-hidden bg-[var(--void)]'>
      <nav
        aria-label='Settings sections'
        className='w-[196px] shrink-0 border-r border-[var(--line)] bg-[var(--shell)] p-2.5'
      >
        <p className='px-2.5 pb-2 pt-1 text-[11px] text-[var(--text-mute)]'>
          Settings
        </p>
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type='button'
            onClick={() => onSection(id)}
            aria-current={section === id ? 'page' : undefined}
            className={cn(
              'no-drag mb-0.5 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-150',
              section === id
                ? 'bg-[var(--raised)] text-[var(--text)]'
                : 'text-[var(--text-dim)] hover:bg-[#1b1e23]'
            )}
          >
            <Icon
              size={14}
              className={section === id ? 'text-[var(--accent)]' : undefined}
            />
            {label}
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <div className='flex min-w-0 flex-1 flex-col'>
        <div className='drag flex h-11 shrink-0 items-center justify-end border-b border-[var(--line)] px-3'>
          <IconButton label='Close settings' onClick={onClose} size='sm'>
            <X size={15} />
          </IconButton>
        </div>

        <div className='flex-1 overflow-y-auto px-8 py-7'>
          <div className='max-w-[640px]'>
            {section === 'general' && (
              <GeneralSection settings={settings} onChange={onChange} />
            )}
            {section === 'voice' && (
              <VoiceSection settings={settings} onChange={onChange} />
            )}
            {section === 'computer' && (
              <ComputerSection settings={settings} onChange={onChange} />
            )}
            {section === 'privacy' && (
              <PrivacySection settings={settings} onChange={onChange} />
            )}
            {section === 'shortcuts' && <ShortcutsSection />}
          </div>
        </div>
      </div>
    </div>
  )
}
