import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  CheckCircle2,
  RefreshCw,
  Zap,
  ZapOff,
  Sliders,
  Send,
  Eye,
  Smartphone,
  AlertCircle,
} from 'lucide-react';

interface MobileCamViewProps {
  sessionId: string;
}

export const MobileCamView: React.FC<MobileCamViewProps> = ({ sessionId }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [framesSent, setFramesSent] = useState(0);
  const [lastSentTime, setLastSentTime] = useState<number | null>(null);
  const [isHighResSending, setIsHighResSending] = useState(false);
  const [contrastBoost, setContrastBoost] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const transmitIntervalRef = useRef<any>(null);

  // Keep phone screen awake
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock error:', err);
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock) wakeLock.release();
    };
  }, []);

  // Initialize camera with back lens
  const startCamera = useCallback(async () => {
    setErrorMsg(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Check for flashlight / torch support
      const track = mediaStream.getVideoTracks()[0];
      const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        setHasTorch(true);
      }
    } catch (err: any) {
      console.error('Camera access error on mobile:', err);
      setErrorMsg('No se pudo acceder a la cámara trasera. Por favor permite el acceso en el navegador.');
      setIsCameraActive(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (transmitIntervalRef.current) {
        clearInterval(transmitIntervalRef.current);
      }
    };
  }, []);

  // Toggle flashlight / torch
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      const next = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: next }],
      });
      setTorchOn(next);
    } catch (e) {
      console.warn('Torch toggle failed', e);
    }
  };

  // Capture frame and send to server
  const captureAndSend = useCallback(
    async (isHighRes = false) => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) return;

      const canvas = canvasRef.current || document.createElement('canvas');
      const width = isHighRes ? video.videoWidth : Math.min(video.videoWidth, 1280);
      const scale = width / video.videoWidth;
      const height = video.videoHeight * scale;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (contrastBoost) {
        ctx.filter = 'contrast(1.5) brightness(1.05) grayscale(0.2)';
      }
      ctx.drawImage(video, 0, 0, width, height);

      const jpegQuality = isHighRes ? 0.92 : 0.75;
      const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);

      try {
        await fetch(`/api/cam-session/${sessionId}/frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frame: dataUrl }),
        });
        setFramesSent((c) => c + 1);
        setLastSentTime(Date.now());
      } catch (err) {
        console.warn('Failed sending frame to server:', err);
      }
    },
    [sessionId, contrastBoost]
  );

  // Set up live stream interval (every 1.5s for paper monitoring)
  useEffect(() => {
    if (isCameraActive) {
      transmitIntervalRef.current = setInterval(() => {
        captureAndSend(false);
      }, 1500);
    }
    return () => {
      if (transmitIntervalRef.current) {
        clearInterval(transmitIntervalRef.current);
      }
    };
  }, [isCameraActive, captureAndSend]);

  const handleManualCapture = async () => {
    setIsHighResSending(true);
    await captureAndSend(true);
    setTimeout(() => {
      setIsHighResSending(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-stone-950 text-stone-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Top Bar */}
      <div className="px-4 py-3 bg-stone-900 border-b border-stone-800 flex items-center justify-between z-20">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs sm:text-sm text-stone-100">Cámara de Folio Móvil</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[11px] text-stone-400">
              Sesión: <span className="font-mono text-amber-400 font-bold">{sessionId}</span>
            </div>
          </div>
        </div>

        {/* Torch & Contrast Controls */}
        <div className="flex items-center space-x-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-lg border transition-all ${
                torchOn
                  ? 'bg-amber-500 border-amber-400 text-stone-950 font-bold shadow-lg shadow-amber-500/30'
                  : 'bg-stone-800 border-stone-700 text-stone-300'
              }`}
              title="Linterna / Flash para iluminar el papel"
            >
              {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => setContrastBoost(!contrastBoost)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1 ${
              contrastBoost
                ? 'bg-amber-600/20 border-amber-500 text-amber-300 font-medium'
                : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{contrastBoost ? 'Realce ON' : 'Normal'}</span>
          </button>
        </div>
      </div>

      {/* Main Viewfinder */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {errorMsg && (
          <div className="absolute inset-4 z-30 flex flex-col items-center justify-center text-center p-6 bg-stone-900/95 rounded-2xl border border-red-800/80 space-y-3">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-xs text-red-200">{errorMsg}</p>
            <button
              onClick={startCamera}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold"
            >
              Reintentar Cámara
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            filter: contrastBoost ? 'contrast(1.4) brightness(1.05)' : 'none',
          }}
          className="w-full h-full object-contain"
        />

        {/* Framing Box for notebook / paper */}
        <div className="absolute inset-6 pointer-events-none border-2 border-dashed border-amber-500/40 rounded-2xl flex flex-col justify-between p-3">
          <div className="flex justify-between items-center text-[11px] text-amber-300 font-mono">
            <span className="bg-black/70 px-2 py-0.5 rounded backdrop-blur">
              [ ÁREA DEL FOLIO / CUADERNO ]
            </span>
            <span className="bg-black/70 px-2 py-0.5 rounded backdrop-blur text-emerald-400 font-bold">
              ● EN DIRECTO
            </span>
          </div>

          <div className="text-center">
            <span className="bg-black/80 px-3 py-1 rounded-full text-xs text-stone-200 font-medium backdrop-blur">
              Apoya el móvil en una taza, atril o soporte apuntando al papel
            </span>
          </div>

          <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono">
            <span>Transmitidos: {framesSent} fotogramas</span>
            <span>
              {lastSentTime ? `Último: ${new Date(lastSentTime).toLocaleTimeString()}` : ''}
            </span>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom Floating Action Bar */}
      <div className="p-4 bg-stone-900 border-t border-stone-800 flex flex-col space-y-2 z-20">
        <button
          onClick={handleManualCapture}
          disabled={isHighResSending}
          className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-98 text-white font-bold text-sm rounded-xl shadow-xl shadow-amber-600/30 flex items-center justify-center gap-2 transition-all"
        >
          <Camera className="w-5 h-5" />
          <span>
            {isHighResSending ? 'Enviando foto nítida al profesor...' : '📸 ENVIAR CAPTURA NÍTIDA AL PROFESOR'}
          </span>
        </button>

        <p className="text-[11px] text-center text-stone-400">
          Tu ordenador recibe este vídeo automáticamente. Puedes seguir hablando con el profesor desde el portátil.
        </p>
      </div>
    </div>
  );
};
