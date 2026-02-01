import { useState, useCallback } from 'react'
import ScriptEditor from './components/ScriptEditor'
import VoiceGenerator from './components/VoiceGenerator'
import AspectRatioSelector from './components/AspectRatioSelector'
import VideoPreview from './components/VideoPreview'
import ExportPanel from './components/ExportPanel'
import SettingsPanel from './components/SettingsPanel'
import './App.css'

const STEPS = [
  { id: 1, title: 'Write Script', icon: '✍️' },
  { id: 2, title: 'Generate Voice', icon: '🎙️' },
  { id: 3, title: 'Select Format', icon: '📐' },
  { id: 4, title: 'Preview & Export', icon: '🎬' }
]

function App() {
  const [currentStep, setCurrentStep] = useState(1)
  const [dialogues, setDialogues] = useState([
    { id: 1, speaker: 'stewie', text: '' },
    { id: 2, speaker: 'peter', text: '' }
  ])
  const [audioData, setAudioData] = useState([]) // Array of { id, speaker, audioUrl, duration, wordTimings }
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [isGenerating, setIsGenerating] = useState(false)
  const [apiKey, setApiKey] = useState(localStorage.getItem('elevenlabs_api_key') || '')
  const [showSettings, setShowSettings] = useState(false)

  const handleApiKeyChange = useCallback((key) => {
    setApiKey(key)
    localStorage.setItem('elevenlabs_api_key', key)
  }, [])

  const canProceedToStep = (step) => {
    switch (step) {
      case 2:
        return dialogues.some(d => d.text.trim() !== '')
      case 3:
        return audioData.length > 0
      case 4:
        return aspectRatio !== null
      default:
        return true
    }
  }

  const goToStep = (step) => {
    if (step <= currentStep || canProceedToStep(step)) {
      setCurrentStep(step)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">🎬</span>
          <span className="logo-text">Clipper Studio</span>
          <span className="logo-badge">Brainrot Edition</span>
        </div>
        <button className="settings-btn" onClick={() => setShowSettings(true)}>
          ⚙️ Settings
        </button>
      </header>

      <div className="steps-nav">
        {STEPS.map((step) => (
          <button
            key={step.id}
            className={`step-btn ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
            onClick={() => goToStep(step.id)}
            disabled={step.id > currentStep && !canProceedToStep(step.id)}
          >
            <span className="step-icon">{step.icon}</span>
            <span className="step-title">{step.title}</span>
            <span className="step-number">{step.id}</span>
          </button>
        ))}
      </div>

      <main className="main-content">
        {currentStep === 1 && (
          <ScriptEditor
            dialogues={dialogues}
            setDialogues={setDialogues}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <VoiceGenerator
            dialogues={dialogues}
            audioData={audioData}
            setAudioData={setAudioData}
            apiKey={apiKey}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 3 && (
          <AspectRatioSelector
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 4 && (
          <div className="export-step">
            <VideoPreview
              dialogues={dialogues}
              audioData={audioData}
              aspectRatio={aspectRatio}
            />
            <ExportPanel
              dialogues={dialogues}
              audioData={audioData}
              aspectRatio={aspectRatio}
              onBack={() => setCurrentStep(3)}
            />
          </div>
        )}
      </main>

      {showSettings && (
        <SettingsPanel
          apiKey={apiKey}
          setApiKey={handleApiKeyChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

export default App
