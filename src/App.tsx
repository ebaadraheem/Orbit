import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { Stage } from './components/agent/Stage'
import { VoiceControl } from './components/chat/VoiceControl'
import { ConversationView } from './components/chat/ConversationView'
import { ComputerPanel } from './components/layout/ComputerPanel'
import { CommandPalette } from './components/commands/CommandBox'
import {
  Settings,
  defaultSettings,
  type OrbitSettings,
  type SettingsSection
} from './components/settings/Settings'
import { stateLabel } from './components/agent/OrbitLogo'
import { mockConversations } from './data/mockConversations'
import { useOrbit } from './orbit/useOrbit'
import type { PrivacyMode } from './types/orbit'

export default function App () {
  const orbit = useOrbit()
  const { session } = orbit

  const [settings, setSettings] = useState<OrbitSettings>(defaultSettings)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [railOpen, setRailOpen] = useState(true)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsSection, setSettingsSection] =
    useState<SettingsSection>('general')
  const [activeConversation, setActiveConversation] = useState<string | null>(
    null
  )
  const talking = useRef(false)

  const started = session.timeline.length > 0

  const privacy: PrivacyMode = useMemo(() => {
    if (!settings.cloudModel) return 'local'
    return settings.localFirst ? 'mixed' : 'cloud'
  }, [settings.cloudModel, settings.localFirst])

  const model =
    settings.cloudModel && !settings.localFirst ? 'Hosted model' : 'Qwen 3 8B'

  const change = useCallback(
    <K extends keyof OrbitSettings>(key: K, value: OrbitSettings[K]) => {
      setSettings(current => ({ ...current, [key]: value }))
      if (key === 'continuousListening') orbit.setContinuous(value as boolean)
      if (key === 'allowScreen') orbit.setScreenAwareness(value as boolean)
    },
    [orbit]
  )

  const setContinuous = useCallback(
    (on: boolean) => {
      orbit.setContinuous(on)
      setSettings(current => ({ ...current, continuousListening: on }))
    },
    [orbit]
  )

  const setScreenAwareness = useCallback(
    (on: boolean) => {
      orbit.setScreenAwareness(on)
      setSettings(current => ({ ...current, allowScreen: on }))
    },
    [orbit]
  )

  const newTask = useCallback(() => {
    orbit.newSession()
    setActiveConversation(null)
    setSettingsOpen(false)
  }, [orbit])

  const openSettings = useCallback((section: SettingsSection = 'general') => {
    setSettingsSection(section)
    setSettingsOpen(true)
  }, [])

  /** Esc is the universal way out: close what's open, otherwise stop Orbit. */
  const escape = useCallback(() => {
    if (paletteOpen) return setPaletteOpen(false)
    if (settingsOpen) return setSettingsOpen(false)
    if (session.state !== 'idle') orbit.cancel()
  }, [paletteOpen, settingsOpen, session.state, orbit])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')

      if (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setPaletteOpen(open => !open)
        return
      }
      if (e.key === 'Escape') {
        escape()
        return
      }
      if (typing) return

      if (e.code === 'Space' && e.ctrlKey && settings.pushToTalk) {
        e.preventDefault()
        if (!talking.current) {
          talking.current = true
          orbit.listen()
        }
        return
      }
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 'n') {
        e.preventDefault()
        newTask()
      } else if (key === 'b') {
        e.preventDefault()
        setSidebarOpen(open => !open)
      } else if (key === 'j') {
        e.preventDefault()
        setRailOpen(open => !open)
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.key === 'Control') && talking.current) {
        talking.current = false
        orbit.stopListening()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [escape, newTask, orbit, settings.pushToTalk])

  // Narrow windows give the conversation the room instead of the panels.
  useEffect(() => {
    const onResize = () => {
      setRailOpen(window.innerWidth >= 1180)
      setSidebarOpen(window.innerWidth >= 1000)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const title = started
    ? session.title
    : mockConversations.find(c => c.id === activeConversation)?.title ??
      'New task'

  const paletteActions = useMemo(
    () => ({
      listen: (phrase?: string) => orbit.listen(phrase),
      stop: () => (session.state === 'idle' ? undefined : orbit.cancel()),
      newTask,
      openSettings: () => openSettings('general'),
      openPrivacy: () => openSettings('privacy'),
      toggleContinuous: () => setContinuous(!orbit.continuous),
      toggleRail: () => setRailOpen(open => !open),
      selectConversation: (id: string) => {
        setActiveConversation(id)
        newTask()
        setActiveConversation(id)
      }
    }),
    [newTask, openSettings, orbit, session.state, setContinuous]
  )

  return (
    <div className='flex h-screen flex-col overflow-hidden bg-[var(--void)]'>
      <p className='sr-only' role='status' aria-live='polite'>
        Orbit: {stateLabel[session.state]}
      </p>

      <Header
        title={title}
        state={session.state}
        privacy={privacy}
        model={model}
        storeHistory={settings.storeHistory}
        sidebarOpen={sidebarOpen}
        railOpen={railOpen}
        onToggleSidebar={() => setSidebarOpen(open => !open)}
        onToggleRail={() => setRailOpen(open => !open)}
        onSearch={() => setPaletteOpen(true)}
        // onSettings={() => openSettings('general')}
        onPrivacy={() => openSettings('privacy')}
      />

      {settingsOpen ? (
        <Settings
          settings={settings}
          onChange={change}
          onClose={() => setSettingsOpen(false)}
          section={settingsSection}
          onSection={setSettingsSection}
        />
      ) : (
        <div className='flex min-h-0 flex-1'>
          <Sidebar
            collapsed={!sidebarOpen}
            conversations={mockConversations}
            activeId={activeConversation}
            state={session.state}
            onSelect={paletteActions.selectConversation}
            onNew={newTask}
            onSearch={() => setPaletteOpen(true)}
            onSettings={() => openSettings('general')}
            onPrivacy={() => openSettings('privacy')}
          />

          <main className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            <div className='min-h-0 flex-1 overflow-y-auto'>
              <Stage
                state={session.state}
                transcript={session.transcript}
                compact={started}
                busy={orbit.busy}
                onStop={orbit.cancel}
              />

              <ConversationView
                session={session}
                onStop={orbit.cancel}
                onRetry={orbit.retry}
                onResolve={orbit.resolvePermission}
                onSuggestion={text => orbit.listen(text)}
              />
            </div>

            <VoiceControl
              state={session.state}
              busy={orbit.busy}
              continuous={orbit.continuous}
              onContinuous={setContinuous}
              onListen={() => orbit.listen()}
              onStopListening={orbit.stopListening}
              onStop={orbit.cancel}
              onSend={text => orbit.send(text, 'text')}
              onRetry={orbit.retry}
            />
          </main>

          {railOpen && (
            <ComputerPanel
              computer={session.computer}
              activity={session.activityFeed}
              history={session.history}
              onScreenAwareness={setScreenAwareness}
            />
          )}
        </div>
      )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        conversations={mockConversations}
        busy={orbit.busy}
        continuous={orbit.continuous}
        actions={paletteActions}
      />
    </div>
  )
}
