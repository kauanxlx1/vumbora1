let audioContext: AudioContext | null = null;

export function playSyntheticChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioContextClass();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const now = audioContext.currentTime;

    const playNote = (frequency: number, startTime: number, duration: number) => {
      if (!audioContext) return;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05); // Fade in
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Fade out natural

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    // Toca tríade ascendente brilhante (C5 -> E5 -> G5)
    playNote(523.25, now, 0.6);
    playNote(659.25, now + 0.12, 0.6);
    playNote(783.99, now + 0.24, 0.8);
  } catch (err) {
    console.warn('Erro ao tocar som sintetizado:', err);
  }
}

export function playAlertSound(customUrl?: string) {
  const defaultUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav';
  const audio = new Audio(customUrl || defaultUrl);
  audio.volume = 0.5;

  audio.play()
    .catch(() => {
      // Fallback robusto se o navegador bloquear ou faltar rede
      playSyntheticChime();
    });
}
