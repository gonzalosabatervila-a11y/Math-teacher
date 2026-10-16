// Speech synthesis and recognition utilities for the oral math class

export interface SpeechSettings {
  rate: number;
  pitch: number;
  volume: number;
  autoSpeak: boolean;
  voiceName?: string;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }
}

export function speakInSpanish(
  text: string,
  settings: SpeechSettings = { rate: 1.0, pitch: 1.0, volume: 1.0, autoSpeak: true },
  onEnd?: () => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Clean text of markdown characters or raw symbols for spoken clarity
  const cleanedText = text
    .replace(/\$\$(.*?)\$\$/g, ' la expresión matemática $1 ')
    .replace(/\$(.*?)\$/g, ' $1 ')
    .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, '$1 sobre $2')
    .replace(/\\sqrt\{(.*?)\}/g, 'raíz de $1')
    .replace(/\\cdot/g, ' por ')
    .replace(/\\times/g, ' por ')
    .replace(/\\pm/g, ' más o menos ')
    .replace(/\\infty/g, ' infinito ')
    .replace(/\\lim_\{(.*?)\}/g, ' límite cuando $1 ')
    .replace(/[*#_`]/g, '');

  const utterance = new SpeechSynthesisUtterance(cleanedText);
  utterance.rate = settings.rate || 1.0;
  utterance.pitch = settings.pitch || 1.0;
  utterance.volume = settings.volume || 1.0;
  utterance.lang = 'es-ES';

  const voices = window.speechSynthesis.getVoices();
  const spanishVoice =
    voices.find((v) => v.name === settings.voiceName) ||
    voices.find((v) => v.lang.startsWith('es-ES') || v.lang.startsWith('es')) ||
    voices[0];

  if (spanishVoice) {
    utterance.voice = spanishVoice;
  }

  utterance.onend = () => {
    activeUtterance = null;
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    console.warn('SpeechSynthesis error:', e);
    activeUtterance = null;
  };

  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function getSpanishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  return voices.filter((v) => v.lang.startsWith('es'));
}
