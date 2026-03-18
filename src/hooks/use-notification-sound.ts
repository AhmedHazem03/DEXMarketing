'use client'

import { useCallback, useEffect } from 'react'

// ─── Module-level singleton (shared across ALL component instances) ───────────
// This ensures the audio element is created ONCE and persists.

let audio: HTMLAudioElement | null = null
let primed = false

function getAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null
    if (!audio) {
        audio = new Audio('/sounds/notification.wav')
        audio.preload = 'auto'
        audio.volume = 0.6
    }
    return audio
}

/**
 * Silently play + pause the audio to satisfy autoplay policies.
 * Must be called from within a user-gesture (click/keydown/touch).
 * Once primed, all subsequent `.play()` calls will work programmatically.
 */
function primeAudio() {
    if (primed) return
    const el = getAudio()
    if (!el) return

    const prev = el.volume
    el.volume = 0
    el.play()
        .then(() => {
            el.pause()
            el.currentTime = 0
            el.volume = prev
            primed = true
        })
        .catch(() => {
            // Not yet allowed — will retry on next interaction
        })
}

// Auto-prime on the first user interaction anywhere on the page.
// Registered once at module load (not per-component).
if (typeof document !== 'undefined') {
    const handler = () => {
        primeAudio()
        if (primed) {
            document.removeEventListener('click', handler, true)
            document.removeEventListener('keydown', handler, true)
            document.removeEventListener('touchstart', handler, true)
        }
    }
    // `capture: true` ensures this fires before any stopPropagation
    document.addEventListener('click', handler, { capture: true, passive: true })
    document.addEventListener('keydown', handler, { capture: true, passive: true })
    document.addEventListener('touchstart', handler, { capture: true, passive: true })
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useNotificationSound() {
    // Eagerly create the Audio element on first render
    useEffect(() => { getAudio() }, [])

    const play = useCallback(() => {
        const el = getAudio()
        if (!el) return
        el.currentTime = 0
        el.volume = 0.6
        el.play().catch(() => {
            // Still blocked — user hasn't interacted yet. Silent fail.
        })
    }, [])

    const prime = useCallback(() => {
        primeAudio()
    }, [])

    return { play, prime }
}

