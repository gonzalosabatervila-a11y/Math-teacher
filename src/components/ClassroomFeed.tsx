import React, { useRef, useEffect, useState } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Camera,
  Lightbulb,
  HelpCircle,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  Check,
  AlertCircle,
} from 'lucide-react';
import { ChatMessage } from '../types/tutor';
import { MathView } from './MathView';
import { speakInSpanish, stopSpeaking, SpeechSettings } from '../utils/speech';

interface ClassroomFeedProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, image?: string) => void;
  isLoading: boolean;
  currentPaperSnapshot: string | null;
  speechSettings: SpeechSettings;
  onUpdateSpeechSettings: (settings: Partial<SpeechSettings>) => void;
  onRequestTutorReview: () => void;
  error?: string | null;
  onRetry?: () => void;
}

export const ClassroomFeed: React.FC<ClassroomFeedProps> = ({
  messages,
  onSendMessage,
  isLoading,
  currentPaperSnapshot,
  speechSettings,
  onUpdateSpeechSettings,
  onRequestTutorReview,
  error,
  onRetry,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle Speech Recognition setup (Web Speech API)
  useEffect(() => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRec) {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Permiso de micrófono denegado en el navegador.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      setSpeechError('Tu navegador no soporta reconocimiento de voz nativo.');
      return;
    }

    setSpeechError(null);
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || isLoading) return;
    const textToSend = inputText.trim();
    setInputText('');
    stopSpeaking();
    onSendMessage(textToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSpeakMessage = (msg: ChatMessage) => {
    if (currentlySpeakingId === msg.id) {
      stopSpeaking();
      setCurrentlySpeakingId(null);
    } else {
      setCurrentlySpeakingId(msg.id);
      speakInSpanish(msg.content, speechSettings, () => {
        setCurrentlySpeakingId(null);
      });
    }
  };

  const sendQuickPrompt = (prompt: string) => {
    stopSpeaking();
    onSendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xl">
      {/* Feed Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-stone-950 border-b border-stone-800 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-amber-400 font-bold">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-stone-200">Clase Oral con el Profesor</span>
            <span className="text-[10px] text-stone-500 ml-2">Diálogo Socrático en Tiempo Real</span>
          </div>
        </div>

        {/* Audio Output Settings */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (speechSettings.autoSpeak) {
                stopSpeaking();
                setCurrentlySpeakingId(null);
              }
              onUpdateSpeechSettings({ autoSpeak: !speechSettings.autoSpeak });
            }}
            className={`px-2 py-1 rounded flex items-center gap-1.5 text-xs transition-colors ${
              speechSettings.autoSpeak
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                : 'bg-stone-800 text-stone-500 hover:text-stone-300'
            }`}
            title="Activar o desactivar que el profesor dicte sus respuestas en voz alta"
          >
            {speechSettings.autoSpeak ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold">Voz Activa</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Voz Silenciada</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mx-3 mt-3 flex items-center justify-between gap-3 rounded-lg border border-red-700/60 bg-red-950/50 px-3 py-2 text-xs text-red-100">
          <span>{error}</span>
          <button type="button" onClick={onRetry} className="rounded bg-red-800 px-2 py-1 font-semibold hover:bg-red-700">
            Reintentar
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-950/40">
        {messages.map((msg) => {
          const isProf = msg.role === 'assistant';
          const isSpeakingThis = currentlySpeakingId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isProf ? 'justify-start' : 'justify-end'}`}
            >
              {isProf && (
                <div className="w-7 h-7 rounded-lg bg-amber-600/20 border border-amber-500/40 flex-shrink-0 flex items-center justify-center text-amber-400 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-md text-xs sm:text-sm ${
                  isProf
                    ? 'bg-stone-900 border border-stone-800 text-stone-100 rounded-tl-sm'
                    : 'bg-amber-700/80 border border-amber-600/50 text-white rounded-tr-sm'
                }`}
              >
                {/* Paper snapshot attached */}
                {msg.imageSnapshot && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-stone-700 max-h-48">
                    <img
                      src={msg.imageSnapshot}
                      alt="Papel examinado"
                      className="w-full h-auto object-cover"
                    />
                    <div className="px-2 py-0.5 bg-black/60 text-[10px] text-stone-300 font-mono">
                      📸 Papel manuscrito mostrado al profesor
                    </div>
                  </div>
                )}

                {/* Math & text content */}
                <MathView content={msg.content} />

                {/* Bottom row: timestamp and audio play button */}
                <div className="flex items-center justify-between gap-3 mt-1.5 pt-1 border-t border-white/10 text-[10px] text-stone-400">
                  <span className="font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  {isProf && (
                    <button
                      onClick={() => handleSpeakMessage(msg)}
                      className={`flex items-center gap-1 hover:text-amber-300 transition-colors ${
                        isSpeakingThis ? 'text-amber-400 font-bold animate-pulse' : ''
                      }`}
                      title="Escuchar dictado del profesor"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>{isSpeakingThis ? 'Detener voz' : 'Repetir dictado'}</span>
                    </button>
                  )}
                </div>
              </div>

              {!isProf && (
                <div className="w-7 h-7 rounded-lg bg-stone-800 border border-stone-700 flex-shrink-0 flex items-center justify-center text-stone-300 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-stone-400 text-xs italic p-2 bg-stone-900/60 rounded-lg max-w-xs border border-stone-800">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>El profesor está observando tu papel y pensando la pregunta...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Socratic Prompt Chips */}
      <div className="px-3 py-1.5 bg-stone-950/80 border-t border-stone-800/80 flex items-center space-x-1.5 overflow-x-auto text-[11px] scrollbar-none">
        <span className="text-[10px] font-semibold text-stone-500 uppercase flex-shrink-0">
          Atajos:
        </span>
        <button
          onClick={onRequestTutorReview}
          className="flex-shrink-0 px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 flex items-center gap-1"
        >
          <Camera className="w-3 h-3" />
          <span>Mira mi papel</span>
        </button>
        <button
          onClick={() => sendQuickPrompt('Me he atascado. Hazme una pregunta para orientar mi razonamiento sin darme la solución.')}
          className="flex-shrink-0 px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-750 flex items-center gap-1"
        >
          <HelpCircle className="w-3 h-3 text-cyan-400" />
          <span>Pregunta socrática</span>
        </button>
        <button
          onClick={() => sendQuickPrompt('Sigo bloqueado tras intentarlo. Dame una pista mínima, solo el principio.')}
          className="flex-shrink-0 px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-750 flex items-center gap-1"
        >
          <Lightbulb className="w-3 h-3 text-yellow-400" />
          <span>Pista mínima</span>
        </button>
        <button
          onClick={() => sendQuickPrompt('¿Cómo comprobarías tú este paso que acabo de escribir? Intenta destruir mi hipótesis.')}
          className="flex-shrink-0 px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-750 flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Verificar / Destruir solución</span>
        </button>
        <button
          onClick={() => sendQuickPrompt('¿Cómo se conecta este concepto matemático con opciones financieras sobre el SPX o gestión de riesgo?')}
          className="flex-shrink-0 px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-750 flex items-center gap-1"
        >
          <TrendingUp className="w-3 h-3 text-purple-400" />
          <span>Transferencia SPX</span>
        </button>
      </div>

      {/* Input bar */}
      <div className="p-2.5 bg-stone-950 border-t border-stone-800">
        {speechError && (
          <div className="text-[11px] text-red-400 mb-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>{speechError}</span>
          </div>
        )}

        <div className="flex items-center space-x-2">
          {/* Mic Toggle Button for oral dialogue */}
          <button
            onClick={toggleMic}
            className={`p-2.5 rounded-xl border transition-all ${
              isListening
                ? 'bg-red-600 border-red-500 text-white animate-pulse shadow-lg shadow-red-500/20'
                : 'bg-stone-800 hover:bg-stone-750 border-stone-700 text-stone-300'
            }`}
            title={isListening ? 'Detener micrófono' : 'Hablar por micrófono (Español oral)'}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Escuchando tu voz en español...'
                : 'Escribe o dicta tu respuesta, duda o hipótesis...'
            }
            className="flex-1 bg-stone-900 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none transition-colors"
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-xl shadow-md transition-all active:scale-95"
            title="Enviar al profesor"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
