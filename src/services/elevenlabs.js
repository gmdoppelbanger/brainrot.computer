const API_BASE = 'https://api.elevenlabs.io/v1'

export async function getVoices(apiKey) {
  const response = await fetch(`${API_BASE}/voices`, {
    headers: {
      'xi-api-key': apiKey
    }
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your ElevenLabs API key.')
    }
    throw new Error(`Failed to fetch voices: ${response.statusText}`)
  }

  const data = await response.json()
  return data.voices || []
}

export async function generateVoice(apiKey, text, voiceId) {
  // Request audio with timestamps
  const response = await fetch(
    `${API_BASE}/text-to-speech/${voiceId}/with-timestamps`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    }
  )

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key')
    }
    if (response.status === 429) {
      throw new Error('Rate limited. Please wait and try again.')
    }
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail?.message || `Voice generation failed: ${response.statusText}`)
  }

  const data = await response.json()

  // Convert base64 audio to blob
  const audioBytes = atob(data.audio_base64)
  const audioArray = new Uint8Array(audioBytes.length)
  for (let i = 0; i < audioBytes.length; i++) {
    audioArray[i] = audioBytes.charCodeAt(i)
  }
  const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' })
  const audioUrl = URL.createObjectURL(audioBlob)

  // Calculate duration from audio
  const duration = await getAudioDuration(audioUrl)

  // Process word timings from alignment data
  const wordTimings = processWordTimings(data.alignment, text)

  return {
    audioUrl,
    audioBlob,
    duration,
    wordTimings
  }
}

function getAudioDuration(audioUrl) {
  return new Promise((resolve) => {
    const audio = new Audio(audioUrl)
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration)
    })
    audio.addEventListener('error', () => {
      resolve(3) // Default fallback
    })
  })
}

function processWordTimings(alignment, originalText) {
  if (!alignment || !alignment.characters || !alignment.character_start_times_seconds) {
    // Fallback: create estimated timings based on text
    return estimateWordTimings(originalText)
  }

  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment

  // Group characters into words
  const words = []
  let currentWord = ''
  let wordStart = null
  let wordEnd = null

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i]
    const startTime = character_start_times_seconds[i]
    const endTime = character_end_times_seconds[i]

    if (char === ' ' || char === '\n' || char === '\t') {
      if (currentWord) {
        words.push({
          word: currentWord,
          start: wordStart,
          end: wordEnd
        })
        currentWord = ''
        wordStart = null
        wordEnd = null
      }
    } else {
      if (wordStart === null) {
        wordStart = startTime
      }
      wordEnd = endTime
      currentWord += char
    }
  }

  // Don't forget the last word
  if (currentWord) {
    words.push({
      word: currentWord,
      start: wordStart,
      end: wordEnd
    })
  }

  return words
}

function estimateWordTimings(text, totalDuration = 3) {
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const avgDuration = totalDuration / words.length

  return words.map((word, index) => ({
    word,
    start: index * avgDuration,
    end: (index + 1) * avgDuration
  }))
}

// Alternative: Generate voice without timestamps (simpler endpoint)
export async function generateVoiceSimple(apiKey, text, voiceId) {
  const response = await fetch(
    `${API_BASE}/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Voice generation failed: ${response.statusText}`)
  }

  const audioBlob = await response.blob()
  const audioUrl = URL.createObjectURL(audioBlob)
  const duration = await getAudioDuration(audioUrl)
  const wordTimings = estimateWordTimings(text, duration)

  return {
    audioUrl,
    audioBlob,
    duration,
    wordTimings
  }
}
