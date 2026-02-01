import { useState, useEffect, useRef, useCallback } from 'react'
import { ASPECT_RATIOS } from './AspectRatioSelector'
import './VideoPreview.css'

// Import assets
import peterImg from '../assets/peter.png'
import stewieImg from '../assets/stewie.png'

function VideoPreview({ dialogues, audioData, aspectRatio }) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0)

  // Calculate video dimensions
  const ratioConfig = ASPECT_RATIOS.find(r => r.id === aspectRatio) || ASPECT_RATIOS[2]
  const previewScale = 0.4
  const canvasWidth = ratioConfig.width * previewScale
  const canvasHeight = ratioConfig.height * previewScale

  // Calculate total duration and dialogue timings
  const dialogueTimings = useRef([])

  useEffect(() => {
    let accumulatedTime = 0
    dialogueTimings.current = audioData.map(audio => {
      const timing = {
        id: audio.id,
        speaker: audio.speaker,
        text: audio.text,
        start: accumulatedTime,
        end: accumulatedTime + (audio.duration || 2),
        duration: audio.duration || 2,
        wordTimings: audio.wordTimings || []
      }
      accumulatedTime += audio.duration || 2
      return timing
    })
  }, [audioData])

  const totalDuration = audioData.reduce((sum, a) => sum + (a.duration || 2), 0)

  // Load images
  const [images, setImages] = useState({ peter: null, stewie: null, bgNether: null, bgDesert: null })

  useEffect(() => {
    const loadImage = (src) => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = src
      })
    }

    Promise.all([
      loadImage(peterImg),
      loadImage(stewieImg)
    ]).then(([peter, stewie]) => {
      setImages(prev => ({ ...prev, peter, stewie }))
    })
  }, [])

  // Draw frame
  const drawFrame = useCallback((time) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    // Find current dialogue
    const currentDialogue = dialogueTimings.current.find(
      d => time >= d.start && time < d.end
    ) || dialogueTimings.current[0]

    if (currentDialogue) {
      const idx = dialogueTimings.current.indexOf(currentDialogue)
      if (idx !== currentDialogueIndex) {
        setCurrentDialogueIndex(idx)
      }
    }

    // Clear canvas
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, width, height)

    // Draw animated background gradient based on speaker
    const isStewie = currentDialogue?.speaker === 'stewie'
    const gradient = ctx.createLinearGradient(0, 0, 0, height)

    if (isStewie) {
      // Desert/sand colors for Stewie
      gradient.addColorStop(0, '#87CEEB')
      gradient.addColorStop(0.3, '#C2B280')
      gradient.addColorStop(1, '#8B7355')
    } else {
      // Nether colors for Peter
      gradient.addColorStop(0, '#2d1f1f')
      gradient.addColorStop(0.5, '#4a1f1f')
      gradient.addColorStop(1, '#1a0a0a')
    }
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Draw some "Minecraft blocks" pattern
    ctx.fillStyle = isStewie ? 'rgba(139, 115, 85, 0.3)' : 'rgba(139, 0, 0, 0.2)'
    const blockSize = 20
    for (let x = 0; x < width; x += blockSize) {
      for (let y = 0; y < height; y += blockSize) {
        if (Math.random() > 0.7) {
          ctx.fillRect(x, y, blockSize - 1, blockSize - 1)
        }
      }
    }

    // Draw character
    const characterImg = isStewie ? images.stewie : images.peter
    if (characterImg) {
      const charHeight = height * 0.5
      const charWidth = (characterImg.width / characterImg.height) * charHeight
      const charX = (width - charWidth) / 2
      const charY = height - charHeight - 20

      ctx.drawImage(characterImg, charX, charY, charWidth, charHeight)
    } else {
      // Fallback: draw placeholder
      ctx.fillStyle = isStewie ? '#FBBF24' : '#22C55E'
      ctx.beginPath()
      ctx.arc(width / 2, height * 0.65, 50, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = '30px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(isStewie ? '👶' : '👨', width / 2, height * 0.65 + 10)
    }

    // Draw karaoke caption
    if (currentDialogue && currentDialogue.text) {
      const relativeTime = time - currentDialogue.start
      drawKaraokeCaption(ctx, currentDialogue, relativeTime, width, height)
    }
  }, [images, currentDialogueIndex])

  const drawKaraokeCaption = (ctx, dialogue, relativeTime, width, height) => {
    const words = dialogue.text.split(/\s+/)
    const wordTimings = dialogue.wordTimings || []

    // Find current word index based on timing
    let currentWordIndex = 0
    for (let i = 0; i < wordTimings.length; i++) {
      if (relativeTime >= wordTimings[i].start) {
        currentWordIndex = i
      }
    }

    // If no word timings, estimate based on time
    if (wordTimings.length === 0) {
      const wordsPerSecond = words.length / dialogue.duration
      currentWordIndex = Math.min(
        Math.floor(relativeTime * wordsPerSecond),
        words.length - 1
      )
    }

    // Setup text style
    const fontSize = Math.min(width * 0.08, 36)
    ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Calculate text layout (word wrap)
    const maxWidth = width * 0.85
    const lines = []
    let currentLine = []
    let currentLineWidth = 0

    words.forEach((word, idx) => {
      const wordWidth = ctx.measureText(word + ' ').width
      if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
        lines.push([...currentLine])
        currentLine = [{ word, idx }]
        currentLineWidth = wordWidth
      } else {
        currentLine.push({ word, idx })
        currentLineWidth += wordWidth
      }
    })
    if (currentLine.length > 0) {
      lines.push(currentLine)
    }

    // Only show 2 lines at a time centered around current word
    const currentLineIndex = lines.findIndex(line =>
      line.some(w => w.idx === currentWordIndex)
    )
    const startLine = Math.max(0, currentLineIndex - 1)
    const visibleLines = lines.slice(startLine, startLine + 2)

    // Draw lines
    const lineHeight = fontSize * 1.4
    const startY = height * 0.15

    visibleLines.forEach((line, lineIdx) => {
      const y = startY + lineIdx * lineHeight
      let x = width / 2

      // Calculate total line width for centering
      const lineText = line.map(w => w.word).join(' ')
      const totalWidth = ctx.measureText(lineText).width
      x = (width - totalWidth) / 2

      line.forEach((wordObj, wordIdx) => {
        const isHighlighted = wordObj.idx <= currentWordIndex
        const isCurrent = wordObj.idx === currentWordIndex

        // Draw word shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillText(wordObj.word, x + ctx.measureText(wordObj.word).width / 2 + 2, y + 2)

        // Draw word
        if (isCurrent) {
          ctx.fillStyle = '#4ADE80' // Green for current word
        } else if (isHighlighted) {
          ctx.fillStyle = '#FFFFFF' // White for spoken words
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)' // Dim for upcoming words
        }
        ctx.fillText(wordObj.word, x + ctx.measureText(wordObj.word).width / 2, y)

        x += ctx.measureText(wordObj.word + ' ').width
      })
    })
  }

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      const startTime = performance.now() - currentTime * 1000

      const animate = (now) => {
        const elapsed = (now - startTime) / 1000
        if (elapsed >= totalDuration) {
          setIsPlaying(false)
          setCurrentTime(0)
          return
        }
        setCurrentTime(elapsed)
        drawFrame(elapsed)
        animationRef.current = requestAnimationFrame(animate)
      }

      animationRef.current = requestAnimationFrame(animate)

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }
    } else {
      drawFrame(currentTime)
    }
  }, [isPlaying, drawFrame, totalDuration])

  // Play/pause controls
  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false)
      // Stop all audio
      audioData.forEach(audio => {
        const audioEl = document.getElementById(`audio-${audio.id}`)
        if (audioEl) {
          audioEl.pause()
          audioEl.currentTime = 0
        }
      })
    } else {
      setIsPlaying(true)
      // Play audio sequentially
      playAudioSequence(currentTime)
    }
  }

  const playAudioSequence = (startTime) => {
    dialogueTimings.current.forEach(timing => {
      if (timing.start >= startTime) {
        const audio = audioData.find(a => a.id === timing.id)
        if (audio) {
          setTimeout(() => {
            const audioEl = document.getElementById(`audio-${audio.id}`)
            if (audioEl && isPlaying) {
              audioEl.currentTime = 0
              audioEl.play().catch(() => {})
            }
          }, (timing.start - startTime) * 1000)
        }
      }
    })
  }

  const restart = () => {
    setCurrentTime(0)
    setIsPlaying(false)
    audioData.forEach(audio => {
      const audioEl = document.getElementById(`audio-${audio.id}`)
      if (audioEl) {
        audioEl.pause()
        audioEl.currentTime = 0
      }
    })
    drawFrame(0)
  }

  // Initial draw
  useEffect(() => {
    drawFrame(0)
  }, [drawFrame])

  return (
    <div className="video-preview">
      <div className="preview-header">
        <h3>Preview</h3>
        <span className="preview-ratio">{aspectRatio}</span>
      </div>

      <div className="preview-container">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="preview-canvas"
        />
      </div>

      <div className="preview-controls">
        <button className="control-btn" onClick={restart}>
          ⟲
        </button>
        <button className="control-btn play-btn" onClick={togglePlayback}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div className="time-display">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </div>
      </div>

      <div className="progress-bar-container" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percent = x / rect.width
        const newTime = percent * totalDuration
        setCurrentTime(newTime)
        drawFrame(newTime)
      }}>
        <div
          className="progress-bar-fill"
          style={{ width: `${(currentTime / totalDuration) * 100}%` }}
        />
      </div>

      {/* Hidden audio elements */}
      {audioData.map(audio => (
        <audio key={audio.id} id={`audio-${audio.id}`} src={audio.audioUrl} />
      ))}
    </div>
  )
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default VideoPreview
