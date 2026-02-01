import { useState } from 'react'
import './SettingsPanel.css'

function SettingsPanel({ apiKey, setApiKey, onClose }) {
  const [tempApiKey, setTempApiKey] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)

  const handleSave = () => {
    setApiKey(tempApiKey)
    onClose()
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-content">
          <div className="setting-group">
            <label>ElevenLabs API Key</label>
            <p className="setting-description">
              Required for AI voice generation. Get your API key from{' '}
              <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer">
                elevenlabs.io
              </a>
            </p>
            <div className="api-key-input">
              <input
                type={showKey ? 'text' : 'password'}
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <button
                className="toggle-visibility"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div className="setting-group">
            <label>Voice Recommendations</label>
            <p className="setting-description">
              For best results, clone or find voices that match Peter and Stewie's characteristics:
            </p>
            <ul className="voice-tips">
              <li><strong>Peter:</strong> Deep, nasal, slightly dopey voice</li>
              <li><strong>Stewie:</strong> British accent, sophisticated, slightly menacing baby voice</li>
            </ul>
          </div>

          <div className="setting-group">
            <label>Keyboard Shortcuts</label>
            <div className="shortcuts-list">
              <div className="shortcut">
                <span className="key">Tab</span>
                <span>Switch speaker</span>
              </div>
              <div className="shortcut">
                <span className="key">⌘ + Enter</span>
                <span>Add new dialogue</span>
              </div>
              <div className="shortcut">
                <span className="key">Space</span>
                <span>Play/pause preview</span>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
