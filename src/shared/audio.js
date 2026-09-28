/* =========================================================
   SHARED AUDIO SYNTHESIZER - GRIMOIRE ARZ
   Magical Chime & Forest Ambience
   ========================================================= */

let audioCtx = null;
let isAudioPlaying = false;
let ambientGain = null;
let ambientOscillators = [];

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Efek Suara Lonceng Sihir saat Tombol Masuk Diklik
function playMagicChime() {
  try {
    initAudioContext();
    const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C E G C E arpeggio
    freqs.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0, audioCtx.currentTime + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + idx * 0.08 + 1.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(audioCtx.currentTime + idx * 0.08);
      osc.stop(audioCtx.currentTime + idx * 0.08 + 1.8);
    });
  } catch (err) {
    console.log("Audio not allowed yet:", err);
  }
}

// Suara Ambien Angin Hutan & Dengung Damai
function toggleForestAmbience() {
  initAudioContext();
  const btnAudioToggle = document.getElementById('btnAudioToggle');
  const audioIcon = document.getElementById('audioIcon');

  if (isAudioPlaying) {
    // Matikan Ambien
    if (ambientGain) {
      ambientGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
      setTimeout(() => {
        ambientOscillators.forEach(osc => { try { osc.stop(); } catch(e){} });
        ambientOscillators = [];
      }, 900);
    }
    isAudioPlaying = false;
    if (audioIcon) audioIcon.className = "fa-solid fa-volume-xmark";
    if (btnAudioToggle) btnAudioToggle.classList.remove('active');
  } else {
    // Nyalakan Ambien Hutan Damai
    ambientGain = audioCtx.createGain();
    ambientGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    ambientGain.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 1.5);
    ambientGain.connect(audioCtx.destination);

    // Warm chord drone (Frequencies simulating deep wind & harmony)
    const droneFreqs = [110, 164.81, 220, 329.63];
    droneFreqs.forEach(freq => {
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, audioCtx.currentTime);

      osc.connect(filter);
      filter.connect(ambientGain);
      osc.start();
      ambientOscillators.push(osc);
    });

    isAudioPlaying = true;
    if (audioIcon) audioIcon.className = "fa-solid fa-volume-high";
    if (btnAudioToggle) btnAudioToggle.classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btnAudioToggle = document.getElementById('btnAudioToggle');
  if (btnAudioToggle) {
    btnAudioToggle.addEventListener('click', toggleForestAmbience);
  }
});
