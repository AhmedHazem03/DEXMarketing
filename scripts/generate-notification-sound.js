// Generates a WAV notification chime and writes it to public/sounds/notification.wav
const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const totalSecs = 0.6;
const numSamples = Math.floor(sampleRate * totalSecs);
const dataBytes = numSamples * 2;
const fileBytes = 44 + dataBytes;
const buf = Buffer.alloc(fileBytes);

// RIFF header
buf.write('RIFF', 0);
buf.writeUInt32LE(fileBytes - 8, 4);
buf.write('WAVE', 8);

// fmt chunk
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);       // chunk size
buf.writeUInt16LE(1, 20);        // PCM format
buf.writeUInt16LE(1, 22);        // mono
buf.writeUInt32LE(sampleRate, 24);
buf.writeUInt32LE(sampleRate * 2, 28);  // byte rate
buf.writeUInt16LE(2, 32);        // block align
buf.writeUInt16LE(16, 34);       // bits per sample

// data chunk
buf.write('data', 36);
buf.writeUInt32LE(dataBytes, 40);

// Two-tone ascending chime: 880 Hz → 1175 Hz (A5 → D6)
// with a warm harmonic overtone for richness
for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    // Tone 1: 880 Hz, fades in first half
    const env1 = t < 0.28
        ? Math.exp(-t * 6) * 0.35
        : Math.exp(-t * 12) * 0.1;
    const tone1 = Math.sin(2 * Math.PI * 880 * t) * env1;

    // Tone 2: 1175 Hz, kicks in at ~120ms
    const env2 = t > 0.12
        ? Math.exp(-(t - 0.12) * 7) * 0.32
        : 0;
    const tone2 = Math.sin(2 * Math.PI * 1175 * t) * env2;

    // Subtle harmonic at 1760 Hz for brightness
    const env3 = Math.exp(-t * 14) * 0.08;
    const tone3 = Math.sin(2 * Math.PI * 1760 * t) * env3;

    const mixed = tone1 + tone2 + tone3;
    const pcm = Math.round(mixed * 32767);
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, pcm)), 44 + i * 2);
}

// Ensure directory exists
const outDir = path.join(__dirname, '..', 'public', 'sounds');
fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, 'notification.wav');
fs.writeFileSync(outFile, buf);
console.log('Generated:', outFile, '(' + fileBytes + ' bytes)');
