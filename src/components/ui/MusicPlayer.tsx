import { useEffect, useRef, useState } from 'react'
import ElasticSlider from './ElasticSlider'

/** Bandas de frequência lidas do analyser (graves → agudos), uma por barra. */
const BANDS = [2, 5, 9, 14, 20]

/** volume inicial (0–100) */
const DEFAULT_VOLUME = 30

const VolumeDownIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
    <path d="M15.5 9.5a4 4 0 0 1 0 5" />
  </svg>
)

const VolumeUpIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
    <path d="M15.5 9.5a4 4 0 0 1 0 5" />
    <path d="M18 7.5a7 7 0 0 1 0 9" />
  </svg>
)

/** Player fixo no canto inferior direito.
    Tocando: as barras dançam com o espectro real da música (Web Audio API).
    Pausado: vira um risco parado.
    A faixa vive em `public/music.mp3` e toca em loop; sem o arquivo, as barras
    dançam em modo demonstração. */
export default function MusicPlayer() {
  const [playing, setPlaying] = useState(false)
  const [fake, setFake] = useState(false)
  const [prompt, setPrompt] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef(0)
  const barsRef = useRef<HTMLSpanElement[]>([])
  const dataRef = useRef(new Uint8Array(32))
  // volume atual (0–100) num ref: ensureAudio lê sem closure velha
  const volumeRef = useRef(DEFAULT_VOLUME)

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      audioRef.current?.pause()
      ctxRef.current?.close().catch(() => {})
    }
  }, [])

  // convite estilo tutorial, apontando para o player
  useEffect(() => {
    const id = window.setTimeout(() => setPrompt(true), 2200)
    return () => clearTimeout(id)
  }, [])

  function ensureAudio() {
    if (audioRef.current) return audioRef.current
    const audio = new Audio('/music.mp3')
    audio.loop = true
    audio.volume = volumeRef.current / 100
    audioRef.current = audio
    try {
      const ctx = new AudioContext()
      const source = ctx.createMediaElementSource(audio)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      analyser.connect(ctx.destination)
      ctxRef.current = ctx
      analyserRef.current = analyser
    } catch {
      // sem Web Audio: o áudio toca mesmo assim, barras em modo demo
    }
    return audio
  }

  function loop() {
    const analyser = analyserRef.current
    if (analyser) {
      analyser.getByteFrequencyData(dataRef.current)
      barsRef.current.forEach((bar, i) => {
        if (!bar) return
        const v = dataRef.current[BANDS[i]] / 255
        bar.style.height = `${3 + v * 17}px`
      })
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  async function toggle() {
    if (playing) {
      audioRef.current?.pause()
      cancelAnimationFrame(rafRef.current)
      barsRef.current.forEach((b) => {
        if (b) b.style.height = ''
      })
      setPlaying(false)
      setFake(false)
      return
    }

    const audio = ensureAudio()
    try {
      await ctxRef.current?.resume()
      await audio.play()
      if (analyserRef.current) loop()
      else setFake(true)
    } catch {
      // arquivo ainda não existe — modo demonstração
      setFake(true)
    }
    setPlaying(true)
  }

  function acceptPrompt() {
    setPrompt(false)
    void toggle()
  }

  function handleVolume(v: number) {
    volumeRef.current = v
    if (audioRef.current) audioRef.current.volume = v / 100
  }

  return (
    <>
      {prompt && (
        <div className="music-prompt" role="dialog" aria-label="Convite para ouvir música">
          <div className="music-prompt__title">Uma trilha para navegar? 🎧</div>
          <p className="music-prompt__text">
            Quer ouvir uma música enquanto explora o portfólio?
          </p>
          <div className="music-prompt__actions">
            <button className="music-prompt__no" onClick={() => setPrompt(false)}>
              Agora não
            </button>
            <button className="music-prompt__yes" onClick={acceptPrompt}>
              Sim, tocar
            </button>
          </div>
          <span className="music-prompt__arrow" aria-hidden="true" />
        </div>
      )}

      <div className="player-wrap">
        {/* volume: aparece no hover do player */}
        <div className="player-volume">
          <ElasticSlider
            defaultValue={DEFAULT_VOLUME}
            startingValue={0}
            maxValue={100}
            leftIcon={VolumeDownIcon}
            rightIcon={VolumeUpIcon}
            onChange={handleVolume}
          />
        </div>

        <button
          className={`player${playing ? ' player--on' : ''}${fake ? ' player--fake' : ''}`}
          onClick={toggle}
          aria-label={playing ? 'Pausar música' : 'Tocar música'}
        >
          <span className="player__bars">
            {BANDS.map((_, i) => (
              <span
                key={i}
                ref={(el) => {
                  if (el) barsRef.current[i] = el
                }}
              />
            ))}
          </span>
        </button>
      </div>
    </>
  )
}
