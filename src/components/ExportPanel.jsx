import { useState, useRef } from 'react'
import { ASPECT_RATIOS } from './AspectRatioSelector'
import './ExportPanel.css'

// Import assets
import peterImg from '../assets/peter.png'
import stewieImg from '../assets/stewie.png'

function ExportPanel({ dialogues, audioData, aspectRatio, onBack }) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState({ stage: '', percent: 0 })
  const [exportedUrl, setExportedUrl] = useState(null)
  const canvasRef = useRef(null)

  const ratioConfig = ASPECT_RATIOS.find(r => r.id === aspectRatio) || ASPECT_RATIOS[2]

  // Calculate dialogue timings
  const getDialogueTimings = () => {
    let accumulatedTime = 0
    return audioData.map(audio => {
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
  }

  const totalDuration = audioData.reduce((sum, a) => sum + (a.duration || 2), 0)

  const exportVideo = async () => {
    setIsExporting(true)
    setExportProgress({ stage: 'Initializing...', percent: 0 })

    try {
      // Create canvas for rendering
      const canvas = document.createElement('canvas')
      canvas.width = ratioConfig.width
      canvas.height = ratioConfig.height
      const ctx = canvas.getContext('2d')

      // Load images
      setExportProgress({ stage: 'Loading assets...', percent: 5 })
      const peterImage = await loadImage(peterImg)
      const stewieImage = await loadImage(stewieImg)

      // Create audio context and combine audio
      setExportProgress({ stage: 'Processing audio...', percent: 10 })
      const audioContext = new AudioContext()
      const combinedAudioBuffer = await combineAudioBuffers(audioContext, audioData)

      // Set up MediaRecorder
      setExportProgress({ stage: 'Setting up recorder...', percent: 15 })

      // Create a stream from the canvas
      const canvasStream = canvas.captureStream(60)

      // Create audio stream from combined audio
      const audioDestination = audioContext.createMediaStreamDestination()

      // Combine video and audio streams
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks()
      ])

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000
      })

      const chunks = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      // Render frames
      setExportProgress({ stage: 'Rendering video...', percent: 20 })

      const dialogueTimings = getDialogueTimings()
      const fps = 30
      const totalFrames = Math.ceil(totalDuration * fps)

      mediaRecorder.start()

      // Play combined audio
      const audioSource = audioContext.createBufferSource()
      audioSource.buffer = combinedAudioBuffer
      audioSource.connect(audioDestination)
      audioSource.connect(audioContext.destination)
      audioSource.start()

      // Render loop
      const startTime = performance.now()

      await new Promise((resolve) => {
        const renderFrame = () => {
          const elapsed = (performance.now() - startTime) / 1000

          if (elapsed >= totalDuration) {
            mediaRecorder.stop()
            resolve()
            return
          }

          // Draw frame
          drawExportFrame(ctx, canvas.width, canvas.height, elapsed, dialogueTimings, peterImage, stewieImage)

          const progress = 20 + (elapsed / totalDuration) * 70
          setExportProgress({
            stage: `Rendering... ${Math.floor(elapsed)}s / ${Math.floor(totalDuration)}s`,
            percent: progress
          })

          requestAnimationFrame(renderFrame)
        }
        renderFrame()
      })

      // Wait for recording to finish
      setExportProgress({ stage: 'Finalizing...', percent: 95 })

      await new Promise((resolve) => {
        mediaRecorder.onstop = resolve
      })

      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      setExportedUrl(url)

      setExportProgress({ stage: 'Complete!', percent: 100 })
    } catch (error) {
      console.error('Export error:', error)
      setExportProgress({ stage: `Error: ${error.message}`, percent: 0 })
    } finally {
      setIsExporting(false)
    }
  }

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  const combineAudioBuffers = async (audioContext, audioData) => {
    const dialogueTimings = getDialogueTimings()
    const sampleRate = audioContext.sampleRate
    const totalSamples = Math.ceil(totalDuration * sampleRate)

    const outputBuffer = audioContext.createBuffer(2, totalSamples, sampleRate)

    for (let i = 0; i < audioData.length; i++) {
      const audio = audioData[i]
      const timing = dialogueTimings[i]

      if (audio.audioBlob) {
        const arrayBuffer = await audio.audioBlob.arrayBuffer()
        try {
          const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer)

          const startSample = Math.floor(timing.start * sampleRate)

          for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
            const outputData = outputBuffer.getChannelData(channel)
            const inputData = decodedBuffer.getChannelData(
              Math.min(channel, decodedBuffer.numberOfChannels - 1)
            )

            for (let j = 0; j < inputData.length && startSample + j < totalSamples; j++) {
              outputData[startSample + j] += inputData[j]
            }
          }
        } catch (e) {
          console.warn('Could not decode audio:', e)
        }
      }
    }

    return outputBuffer
  }

  const drawExportFrame = (ctx, width, height, time, dialogueTimings, peterImage, stewieImage) => {
    // Find current dialogue
    const currentDialogue = dialogueTimings.find(
      d => time >= d.start && time < d.end
    ) || dialogueTimings[0]

    const isStewie = currentDialogue?.speaker === 'stewie'

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    if (isStewie) {
      gradient.addColorStop(0, '#87CEEB')
      gradient.addColorStop(0.3, '#C2B280')
      gradient.addColorStop(1, '#8B7355')
    } else {
      gradient.addColorStop(0, '#2d1f1f')
      gradient.addColorStop(0.5, '#4a1f1f')
      gradient.addColorStop(1, '#1a0a0a')
    }
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Draw block pattern
    ctx.fillStyle = isStewie ? 'rgba(139, 115, 85, 0.3)' : 'rgba(139, 0, 0, 0.2)'
    const blockSize = 40
    const seed = Math.floor(time * 2) // Slow animation
    for (let x = 0; x < width; x += blockSize) {
      for (let y = 0; y < height; y += blockSize) {
        const hash = ((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) % 100
        if (hash < 30) {
          ctx.fillRect(x, y, blockSize - 2, blockSize - 2)
        }
      }
    }

    // Draw character
    const characterImg = isStewie ? stewieImage : peterImage
    if (characterImg) {
      const charHeight = height * 0.5
      const charWidth = (characterImg.width / characterImg.height) * charHeight
      const charX = (width - charWidth) / 2
      const charY = height - charHeight - height * 0.05

      ctx.drawImage(characterImg, charX, charY, charWidth, charHeight)
    }

    // Draw karaoke caption
    if (currentDialogue && currentDialogue.text) {
      const relativeTime = time - currentDialogue.start
      drawExportCaption(ctx, currentDialogue, relativeTime, width, height)
    }
  }

  const drawExportCaption = (ctx, dialogue, relativeTime, width, height) => {
    const words = dialogue.text.split(/\s+/)
    const wordTimings = dialogue.wordTimings || []

    let currentWordIndex = 0
    for (let i = 0; i < wordTimings.length; i++) {
      if (relativeTime >= wordTimings[i].start) {
        currentWordIndex = i
      }
    }

    if (wordTimings.length === 0) {
      const wordsPerSecond = words.length / dialogue.duration
      currentWordIndex = Math.min(
        Math.floor(relativeTime * wordsPerSecond),
        words.length - 1
      )
    }

    const fontSize = Math.min(width * 0.06, 72)
    ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

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

    const currentLineIndex = lines.findIndex(line =>
      line.some(w => w.idx === currentWordIndex)
    )
    const startLine = Math.max(0, currentLineIndex - 1)
    const visibleLines = lines.slice(startLine, startLine + 2)

    const lineHeight = fontSize * 1.4
    const startY = height * 0.12

    visibleLines.forEach((line, lineIdx) => {
      const y = startY + lineIdx * lineHeight
      let x = width / 2

      const lineText = line.map(w => w.word).join(' ')
      const totalWidth = ctx.measureText(lineText).width
      x = (width - totalWidth) / 2

      line.forEach((wordObj) => {
        const isHighlighted = wordObj.idx <= currentWordIndex
        const isCurrent = wordObj.idx === currentWordIndex

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fillText(wordObj.word, x + ctx.measureText(wordObj.word).width / 2 + 3, y + 3)

        // Word color
        if (isCurrent) {
          ctx.fillStyle = '#4ADE80'
        } else if (isHighlighted) {
          ctx.fillStyle = '#FFFFFF'
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
        }
        ctx.fillText(wordObj.word, x + ctx.measureText(wordObj.word).width / 2, y)

        x += ctx.measureText(wordObj.word + ' ').width
      })
    })
  }

  const downloadVideo = () => {
    if (exportedUrl) {
      const a = document.createElement('a')
      a.href = exportedUrl
      a.download = `brainrot-video-${Date.now()}.webm`
      a.click()
    }
  }

  return (
    <div className="export-panel">
      <h3>Export Video</h3>

      <div className="export-info">
        <div className="info-item">
          <span className="info-label">Duration</span>
          <span className="info-value">{totalDuration.toFixed(1)}s</span>
        </div>
        <div className="info-item">
          <span className="info-label">Resolution</span>
          <span className="info-value">{ratioConfig.width}×{ratioConfig.height}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Dialogues</span>
          <span className="info-value">{audioData.length}</span>
        </div>
      </div>

      {!exportedUrl ? (
        <>
          <button
            className="btn btn-primary export-btn"
            onClick={exportVideo}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <span className="spinner"></span>
                Exporting...
              </>
            ) : (
              <>
                <span>🎬</span>
                Generate Video
              </>
            )}
          </button>

          {isExporting && (
            <div className="export-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${exportProgress.percent}%` }}
                />
              </div>
              <div className="progress-text">{exportProgress.stage}</div>
            </div>
          )}
        </>
      ) : (
        <div className="export-complete">
          <div className="success-icon">✓</div>
          <p>Video generated successfully!</p>
          <button className="btn btn-primary" onClick={downloadVideo}>
            <span>⬇️</span> Download Video
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setExportedUrl(null)}
          >
            Generate Again
          </button>
        </div>
      )}

      <div className="export-note">
        <strong>Note:</strong> Video is rendered in real-time in your browser.
        Export time ≈ video duration.
      </div>

      <div className="nav-buttons">
        <button className="btn btn-secondary" onClick={onBack}>
          <span>←</span> Back
        </button>
      </div>
    </div>
  )
}

export default ExportPanel
