import { useState, useRef } from 'react'
import { generateVoice, getVoices } from '../services/elevenlabs'
import './VoiceGenerator.css'

function VoiceGenerator({
  dialogues,
  audioData,
  setAudioData,
  apiKey,
  isGenerating,
  setIsGenerating,
  onBack,
  onNext
}) {
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' })
  const [error, setError] = useState(null)
  const [voices, setVoices] = useState(null)
  const [selectedVoices, setSelectedVoices] = useState({
    stewie: '',
    peter: ''
  })
  const audioRefs = useRef({})

  const loadVoices = async () => {
    if (!apiKey) {
      setError('Please add your ElevenLabs API key in Settings')
      return
    }

    try {
      setError(null)
      const voiceList = await getVoices(apiKey)
      setVoices(voiceList)

      // Try to auto-select voices that might match
      const stewieVoice = voiceList.find(v =>
        v.name.toLowerCase().includes('stewie') ||
        v.name.toLowerCase().includes('child') ||
        v.name.toLowerCase().includes('british')
      )
      const peterVoice = voiceList.find(v =>
        v.name.toLowerCase().includes('peter') ||
        v.name.toLowerCase().includes('adam')
      )

      setSelectedVoices({
        stewie: stewieVoice?.voice_id || voiceList[0]?.voice_id || '',
        peter: peterVoice?.voice_id || voiceList[1]?.voice_id || voiceList[0]?.voice_id || ''
      })
    } catch (err) {
      setError(err.message)
    }
  }

  const generateAllVoices = async () => {
    if (!apiKey) {
      setError('Please add your ElevenLabs API key in Settings')
      return
    }

    if (!selectedVoices.stewie || !selectedVoices.peter) {
      setError('Please select voices for both characters')
      return
    }

    const dialoguesWithText = dialogues.filter(d => d.text.trim())
    if (dialoguesWithText.length === 0) {
      setError('No dialogue text to generate')
      return
    }

    setIsGenerating(true)
    setError(null)
    setProgress({ current: 0, total: dialoguesWithText.length, status: 'Starting...' })

    const newAudioData = []

    try {
      for (let i = 0; i < dialoguesWithText.length; i++) {
        const dialogue = dialoguesWithText[i]
        setProgress({
          current: i + 1,
          total: dialoguesWithText.length,
          status: `Generating ${dialogue.speaker}'s voice (${i + 1}/${dialoguesWithText.length})...`
        })

        const voiceId = selectedVoices[dialogue.speaker]
        const result = await generateVoice(apiKey, dialogue.text, voiceId)

        newAudioData.push({
          id: dialogue.id,
          speaker: dialogue.speaker,
          text: dialogue.text,
          audioUrl: result.audioUrl,
          audioBlob: result.audioBlob,
          duration: result.duration,
          wordTimings: result.wordTimings
        })
      }

      setAudioData(newAudioData)
      setProgress({ current: dialoguesWithText.length, total: dialoguesWithText.length, status: 'Complete!' })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const playAudio = (id) => {
    // Stop all other audio
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    })
    // Play selected
    if (audioRefs.current[id]) {
      audioRefs.current[id].play()
    }
  }

  const totalDuration = audioData.reduce((sum, a) => sum + (a.duration || 0), 0)

  return (
    <div className="voice-generator section">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <span>🎙️</span> Generate Voice
          </h2>
          <p className="section-subtitle">
            Select voices and generate AI speech for each dialogue line
          </p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️</span> {error}
        </div>
      )}

      {!apiKey && (
        <div className="warning-banner">
          <span>🔑</span> No API key found. Please add your ElevenLabs API key in Settings.
        </div>
      )}

      {/* Voice Selection */}
      <div className="voice-selection">
        <h3>Select Voices</h3>
        {!voices ? (
          <button className="btn btn-secondary" onClick={loadVoices} disabled={!apiKey}>
            Load Available Voices
          </button>
        ) : (
          <div className="voice-selectors">
            <div className="voice-selector stewie">
              <label>
                <span className="voice-label-icon">👶</span> Stewie's Voice
              </label>
              <select
                value={selectedVoices.stewie}
                onChange={(e) => setSelectedVoices(v => ({ ...v, stewie: e.target.value }))}
              >
                {voices.map(voice => (
                  <option key={voice.voice_id} value={voice.voice_id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="voice-selector peter">
              <label>
                <span className="voice-label-icon">👨</span> Peter's Voice
              </label>
              <select
                value={selectedVoices.peter}
                onChange={(e) => setSelectedVoices(v => ({ ...v, peter: e.target.value }))}
              >
                {voices.map(voice => (
                  <option key={voice.voice_id} value={voice.voice_id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <div className="generate-section">
        <button
          className="btn btn-primary generate-btn"
          onClick={generateAllVoices}
          disabled={isGenerating || !apiKey || !voices}
        >
          {isGenerating ? (
            <>
              <span className="spinner"></span>
              Generating...
            </>
          ) : (
            <>
              <span>🎤</span>
              Generate Audio Script
            </>
          )}
        </button>

        {isGenerating && (
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <div className="progress-text">{progress.status}</div>
          </div>
        )}
      </div>

      {/* Generated Audio List */}
      {audioData.length > 0 && (
        <div className="audio-list">
          <div className="audio-list-header">
            <h3>Generated Audio</h3>
            <span className="total-duration">
              Total: {totalDuration.toFixed(1)}s
            </span>
          </div>
          {audioData.map((audio, index) => (
            <div key={audio.id} className={`audio-item ${audio.speaker}`}>
              <div className="audio-index">{index + 1}</div>
              <div className={`audio-speaker ${audio.speaker}`}>
                {audio.speaker === 'stewie' ? '👶' : '👨'}
              </div>
              <div className="audio-text">{audio.text}</div>
              <div className="audio-duration">{audio.duration?.toFixed(1)}s</div>
              <button
                className="play-btn"
                onClick={() => playAudio(audio.id)}
              >
                ▶
              </button>
              <audio
                ref={el => audioRefs.current[audio.id] = el}
                src={audio.audioUrl}
              />
            </div>
          ))}
        </div>
      )}

      <div className="nav-buttons">
        <button className="btn btn-secondary" onClick={onBack}>
          <span>←</span> Back
        </button>
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={audioData.length === 0}
        >
          Select Format <span>→</span>
        </button>
      </div>
    </div>
  )
}

export default VoiceGenerator
