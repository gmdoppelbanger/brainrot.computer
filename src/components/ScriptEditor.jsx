import { useCallback } from 'react'
import './ScriptEditor.css'

function ScriptEditor({ dialogues, setDialogues, onNext }) {
  const addDialogue = useCallback(() => {
    const lastSpeaker = dialogues[dialogues.length - 1]?.speaker || 'peter'
    const nextSpeaker = lastSpeaker === 'stewie' ? 'peter' : 'stewie'
    setDialogues([
      ...dialogues,
      { id: Date.now(), speaker: nextSpeaker, text: '' }
    ])
  }, [dialogues, setDialogues])

  const updateDialogue = useCallback((id, field, value) => {
    setDialogues(dialogues.map(d =>
      d.id === id ? { ...d, [field]: value } : d
    ))
  }, [dialogues, setDialogues])

  const removeDialogue = useCallback((id) => {
    if (dialogues.length > 2) {
      setDialogues(dialogues.filter(d => d.id !== id))
    }
  }, [dialogues, setDialogues])

  const toggleSpeaker = useCallback((id) => {
    setDialogues(dialogues.map(d =>
      d.id === id ? { ...d, speaker: d.speaker === 'stewie' ? 'peter' : 'stewie' } : d
    ))
  }, [dialogues, setDialogues])

  const hasContent = dialogues.some(d => d.text.trim() !== '')

  return (
    <div className="script-editor section">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <span>✍️</span> Write Your Script
          </h2>
          <p className="section-subtitle">
            Add dialogue lines for Stewie and Peter. Click the avatar to switch speakers.
          </p>
        </div>
        <div className="dialogue-count">
          {dialogues.length} lines
        </div>
      </div>

      <div className="dialogues-container">
        {dialogues.map((dialogue, index) => (
          <div key={dialogue.id} className={`dialogue-row ${dialogue.speaker}`}>
            <div className="dialogue-number">{index + 1}</div>

            <button
              className={`speaker-toggle ${dialogue.speaker}`}
              onClick={() => toggleSpeaker(dialogue.id)}
              title="Click to switch speaker"
            >
              <div className="speaker-avatar">
                {dialogue.speaker === 'stewie' ? '👶' : '👨'}
              </div>
              <span className="speaker-name">
                {dialogue.speaker === 'stewie' ? 'Stewie' : 'Peter'}
              </span>
            </button>

            <div className="dialogue-input-container">
              <textarea
                className="dialogue-input"
                placeholder={`What does ${dialogue.speaker === 'stewie' ? 'Stewie' : 'Peter'} say?`}
                value={dialogue.text}
                onChange={(e) => updateDialogue(dialogue.id, 'text', e.target.value)}
                rows={2}
              />
              <div className="char-count">
                {dialogue.text.length} chars
              </div>
            </div>

            <button
              className="remove-btn"
              onClick={() => removeDialogue(dialogue.id)}
              disabled={dialogues.length <= 2}
              title="Remove this line"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button className="add-dialogue-btn" onClick={addDialogue}>
        <span>+</span> Add Dialogue
      </button>

      <div className="nav-buttons">
        <div></div>
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={!hasContent}
        >
          Generate Voice <span>→</span>
        </button>
      </div>
    </div>
  )
}

export default ScriptEditor
