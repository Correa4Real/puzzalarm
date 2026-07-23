// internal — absolute paths
import type { SoundId, CustomSound } from '@/types'
import { loadJSON } from '@/storage'

// internal — relative
import { playRingtone, setRingtoneVolume, stopRingtone, boostSystemVolumes, restoreSystemVolumes } from './ringtones'

// ===== CONFIGURATIONS =====
const CUSTOM_SOUND_KEY = 'customSound'
const RAMP_STEP_MS = 500
const START_VOLUME = 0.06
const PREVIEW_VOLUME = 0.8
const PREVIEW_DURATION_MS = 2200
const SUCCESS_NOTES = [659.25, 783.99, 987.77, 1318.5]
const ERROR_NOTES = [220, 174.6]

interface SoundOptions {
  ramp: boolean
  rampSeconds: number
  maxVolume: number
  ringtoneUri?: string
  boostSystem?: boolean
}

// ===== SERVICE =====
class AlarmSoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private timer: number | null = null
  private rampTimer: number | null = null
  private audioElement: HTMLAudioElement | null = null
  private ringtonePlaying = false
  private running = false
  private boosted = false
  private session = 0

  start(sound: SoundId, opts: SoundOptions) {
    this.stop()
    if (opts.boostSystem) {
      this.boosted = true
      boostSystemVolumes()
    }
    if (sound === 'custom') {
      this.startCustom(opts, this.session)
      return
    }
    if (sound === 'ringtone') {
      this.startRingtone(opts)
      return
    }
    const ctx = new AudioContext()
    this.ctx = ctx
    const master = ctx.createGain()
    master.connect(ctx.destination)
    const startVolume = opts.ramp ? START_VOLUME : opts.maxVolume
    master.gain.setValueAtTime(startVolume, ctx.currentTime)
    if (opts.ramp) {
      master.gain.linearRampToValueAtTime(opts.maxVolume, ctx.currentTime + opts.rampSeconds)
    }
    this.master = master
    this.running = true
    this.loop(sound)
  }

  private async startCustom(opts: SoundOptions, session: number) {
    this.running = true
    const stored = await loadJSON<CustomSound>(CUSTOM_SOUND_KEY)
    if (session !== this.session || !this.running) return
    if (!stored?.dataUrl) {
      this.start('panel', opts)
      return
    }
    const element = new Audio(stored.dataUrl)
    element.loop = true
    element.volume = opts.ramp ? START_VOLUME : opts.maxVolume
    this.audioElement = element
    element.play().catch(() => {
      element.pause()
      if (session === this.session && this.running) this.start('panel', opts)
    })
    if (opts.ramp && opts.rampSeconds > 0) {
      const step = (opts.maxVolume - START_VOLUME) / ((opts.rampSeconds * 1000) / RAMP_STEP_MS)
      this.rampTimer = window.setInterval(() => {
        if (!this.audioElement) return
        this.audioElement.volume = Math.min(opts.maxVolume, this.audioElement.volume + step)
        if (this.audioElement.volume >= opts.maxVolume && this.rampTimer !== null) {
          clearInterval(this.rampTimer)
          this.rampTimer = null
        }
      }, RAMP_STEP_MS)
    }
  }

  private startRingtone(opts: SoundOptions) {
    if (!opts.ringtoneUri) {
      this.start('panel', opts)
      return
    }
    this.running = true
    this.ringtonePlaying = true
    const startVolume = opts.ramp ? START_VOLUME : opts.maxVolume
    playRingtone(opts.ringtoneUri, startVolume)
    if (opts.ramp && opts.rampSeconds > 0) {
      let volume = startVolume
      const step = (opts.maxVolume - START_VOLUME) / ((opts.rampSeconds * 1000) / RAMP_STEP_MS)
      this.rampTimer = window.setInterval(() => {
        volume = Math.min(opts.maxVolume, volume + step)
        setRingtoneVolume(volume)
        if (volume >= opts.maxVolume && this.rampTimer !== null) {
          clearInterval(this.rampTimer)
          this.rampTimer = null
        }
      }, RAMP_STEP_MS)
    }
  }

  private loop(sound: SoundId) {
    if (!this.running || !this.ctx || !this.master) return
    const ctx = this.ctx
    const now = ctx.currentTime

    const beep = (freq: number, at: number, dur: number, type: OscillatorType = 'sine', gain = 0.5) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, now + at)
      g.gain.linearRampToValueAtTime(gain, now + at + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, now + at + dur)
      osc.connect(g)
      g.connect(this.master!)
      osc.start(now + at)
      osc.stop(now + at + dur + 0.05)
    }

    let cycle = 2
    switch (sound) {
      case 'panel': {
        const notes = [523.25, 659.25, 783.99, 1046.5]
        notes.forEach((freq, i) => beep(freq, i * 0.16, 0.3, 'triangle', 0.6))
        beep(1046.5, 0.8, 0.5, 'sine', 0.5)
        cycle = 1.8
        break
      }
      case 'bells': {
        beep(880, 0, 0.9, 'sine', 0.6)
        beep(1108.7, 0.05, 0.9, 'sine', 0.3)
        beep(880, 1.0, 0.9, 'sine', 0.6)
        beep(1318.5, 1.05, 0.9, 'sine', 0.25)
        cycle = 2.2
        break
      }
      case 'pulse': {
        for (let i = 0; i < 4; i++) beep(740, i * 0.28, 0.16, 'square', 0.35)
        cycle = 1.7
        break
      }
      case 'choir': {
        ;[261.6, 329.6, 392.0, 523.25].forEach(freq => beep(freq, 0, 1.6, 'sawtooth', 0.16))
        ;[293.7, 370.0, 440.0].forEach(freq => beep(freq, 1.7, 1.6, 'sawtooth', 0.16))
        cycle = 3.6
        break
      }
    }

    this.timer = window.setTimeout(() => this.loop(sound), cycle * 1000)
  }

  preview(sound: SoundId, ringtoneUri?: string) {
    this.start(sound, { ramp: false, rampSeconds: 0, maxVolume: PREVIEW_VOLUME, ringtoneUri })
    const session = this.session
    window.setTimeout(() => {
      if (session === this.session) this.stop()
    }, PREVIEW_DURATION_MS)
  }

  playSuccess() {
    const ctx = this.ctx && this.ctx.state !== 'closed' ? this.ctx : new AudioContext()
    const now = ctx.currentTime
    SUCCESS_NOTES.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, now + i * 0.09)
      g.gain.linearRampToValueAtTime(0.4, now + i * 0.09 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.8)
      osc.connect(g)
      g.connect(ctx.destination)
      osc.start(now + i * 0.09)
      osc.stop(now + i * 0.09 + 0.9)
    })
  }

  playError() {
    const ctx = this.ctx && this.ctx.state !== 'closed' ? this.ctx : new AudioContext()
    const now = ctx.currentTime
    ERROR_NOTES.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, now + i * 0.12)
      g.gain.linearRampToValueAtTime(0.35, now + i * 0.12 + 0.015)
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3)
      osc.connect(g)
      g.connect(ctx.destination)
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.35)
    })
  }

  stop() {
    this.session++
    this.running = false
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.rampTimer !== null) {
      clearInterval(this.rampTimer)
      this.rampTimer = null
    }
    if (this.audioElement) {
      this.audioElement.pause()
      this.audioElement = null
    }
    if (this.ringtonePlaying) {
      this.ringtonePlaying = false
      stopRingtone()
    }
    if (this.boosted) {
      this.boosted = false
      restoreSystemVolumes()
    }
    if (this.ctx) {
      const ctx = this.ctx
      this.ctx = null
      this.master = null
      ctx.close().catch(() => undefined)
    }
  }
}

const alarmSound = new AlarmSoundEngine()

// ===== EXPORT =====
export { alarmSound }
