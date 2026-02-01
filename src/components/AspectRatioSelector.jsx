import './AspectRatioSelector.css'

const ASPECT_RATIOS = [
  {
    id: '9:16',
    label: '9:16',
    description: 'Shorts, Reels, TikToks',
    icon: '📱',
    width: 1080,
    height: 1920
  },
  {
    id: '16:9',
    label: '16:9',
    description: 'YouTube',
    icon: '🖥️',
    width: 1920,
    height: 1080
  },
  {
    id: '1:1',
    label: '1:1',
    description: 'LinkedIn, Instagram',
    icon: '⬜',
    width: 1080,
    height: 1080
  }
]

function AspectRatioSelector({ aspectRatio, setAspectRatio, onBack, onNext }) {
  return (
    <div className="aspect-ratio-selector section">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <span>📐</span> Select Aspect Ratio
          </h2>
          <p className="section-subtitle">
            Choose the video format for your target platform
          </p>
        </div>
      </div>

      <div className="ratio-grid">
        {ASPECT_RATIOS.map((ratio) => (
          <button
            key={ratio.id}
            className={`ratio-card ${aspectRatio === ratio.id ? 'selected' : ''}`}
            onClick={() => setAspectRatio(ratio.id)}
          >
            <div className="ratio-preview-container">
              <div
                className="ratio-preview"
                style={{
                  aspectRatio: ratio.id.replace(':', ' / ')
                }}
              >
                <span className="ratio-icon">{ratio.icon}</span>
              </div>
            </div>
            <div className="ratio-info">
              <div className="ratio-label">{ratio.label}</div>
              <div className="ratio-description">{ratio.description}</div>
              <div className="ratio-dimensions">{ratio.width} × {ratio.height}</div>
            </div>
            {aspectRatio === ratio.id && (
              <div className="selected-badge">✓</div>
            )}
          </button>
        ))}
      </div>

      <div className="nav-buttons">
        <button className="btn btn-secondary" onClick={onBack}>
          <span>←</span> Back
        </button>
        <button className="btn btn-primary" onClick={onNext}>
          Preview & Export <span>→</span>
        </button>
      </div>
    </div>
  )
}

export default AspectRatioSelector
export { ASPECT_RATIOS }
