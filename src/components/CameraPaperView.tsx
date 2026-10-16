import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  Smartphone,
  Laptop,
  RotateCw,
  Eye,
  Sliders,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Video,
  VideoOff,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface CameraPaperViewProps {
  onCaptureSnapshot: (dataUrl: string) => void;
  onRequestTutorReview: (dataUrl: string, note?: string) => void;
  isInspecting?: boolean;
}

type SourceType = 'mobile' | 'webcam';

export const CameraPaperView: React.FC<CameraPaperViewProps> = ({
  onCaptureSnapshot,
  onRequestTutorReview,
  isInspecting = false,
}) => {
  const [sourceType, setSourceType] = useState<SourceType>('mobile');

  // Mobile pairing state
  const [sessionId, setSessionId] = useState<string>(() => {
    const saved = localStorage.getItem('math_cam_session_id');
    return saved || Math.random().toString(36).substring(2, 8).toUpperCase();
  });
  const [mobileConnected, setMobileConnected] = useState(false);
  const [mobileFrame, setMobileFrame] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [lastFrameTime, setLastFrameTime] = useState<number | null>(null);

  // Local Webcam state
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Visual enhancements for paper
  const [highContrast, setHighContrast] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270 degrees

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Save session ID
  useEffect(() => {
    localStorage.setItem('math_cam_session_id', sessionId);
  }, [sessionId]);

  // Construct mobile URL
  const mobileUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?cam=${sessionId}`
    : '';

  // Initialize session on server and connect SSE stream
  useEffect(() => {
    let isMounted = true;

    const initAndListen = async () => {
      try {
        await fetch('/api/cam-session/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        // Close previous SSE if any
        if (sseRef.current) {
          sseRef.current.close();
        }

        const sse = new EventSource(`/api/cam-session/${sessionId}/stream`);
        sseRef.current = sse;

        sse.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.frame) {
              setMobileFrame(data.frame);
              setLastFrameTime(data.timestamp || Date.now());
              onCaptureSnapshot(data.frame);
            }
            if (data.mobileConnected !== undefined) {
              setMobileConnected(Boolean(data.mobileConnected));
            }
          } catch (e) {
            console.warn('Error parsing SSE cam event', e);
          }
        };

        sse.onerror = () => {
          // SSE reconnects automatically
        };
      } catch (err) {
        console.warn('Error setting up cam session:', err);
      }
    };

    initAndListen();

    return () => {
      isMounted = false;
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [sessionId, onCaptureSnapshot]);

  // WebCam setup
  const stopWebcam = useCallback(() => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
      setIsWebcamActive(false);
    }
  }, [webcamStream]);

  const startWebcam = useCallback(
    async (devId?: string) => {
      stopWebcam();
      setWebcamError(null);
      try {
        const constraints: MediaStreamConstraints = {
          video: devId
            ? { deviceId: { exact: devId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
            : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        };
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setWebcamStream(mediaStream);
        setIsWebcamActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        setWebcamError('No se pudo acceder a la cámara del ordenador.');
        setIsWebcamActive(false);
      }
    },
    [stopWebcam]
  );

  useEffect(() => {
    if (sourceType === 'webcam') {
      startWebcam(selectedDeviceId);
    } else {
      stopWebcam();
    }
  }, [sourceType, startWebcam, stopWebcam, selectedDeviceId]);

  // Copy mobile link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Capture current paper snapshot with rotation applied
  const getSnapshot = (): string | null => {
    let sourceElement: HTMLImageElement | HTMLVideoElement | null = null;
    let originalWidth = 0;
    let originalHeight = 0;

    if (sourceType === 'mobile' && mobileFrame) {
      const img = new Image();
      img.src = mobileFrame;
      sourceElement = img;
      originalWidth = img.naturalWidth || 1280;
      originalHeight = img.naturalHeight || 720;
    } else if (videoRef.current && videoRef.current.videoWidth) {
      sourceElement = videoRef.current;
      originalWidth = videoRef.current.videoWidth;
      originalHeight = videoRef.current.videoHeight;
    }

    if (!sourceElement || !originalWidth || !originalHeight) {
      return mobileFrame || null;
    }

    // If no rotation and highContrast default, return or composite
    const canvas = document.createElement('canvas');
    const isTransposed = rotation === 90 || rotation === 270;
    canvas.width = isTransposed ? originalHeight : originalWidth;
    canvas.height = isTransposed ? originalWidth : originalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return mobileFrame || null;

    if (highContrast) {
      ctx.filter = 'contrast(1.6) brightness(1.1) grayscale(0.2)';
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(sourceElement, -originalWidth / 2, -originalHeight / 2);

    return canvas.toDataURL('image/jpeg', 0.92);
  };

  const handleManualReview = () => {
    const snapshot = getSnapshot();
    if (snapshot) {
      onCaptureSnapshot(snapshot);
      onRequestTutorReview(
        snapshot,
        'Profesor, examina mi folio en este paso. He escrito el desarrollo en papel; dime si la deducción es correcta o si detectas algún fallo conceptual.'
      );
    } else {
      onRequestTutorReview(
        '',
        'Profesor, por favor revisa mi razonamiento en el papel. (Conecta la cámara de tu móvil escaneando el código QR).'
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Header & Mode Tabs */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-stone-950 border-b border-stone-800 text-xs">
        <div className="flex items-center space-x-1 bg-stone-900 p-0.5 rounded-lg border border-stone-800">
          <button
            onClick={() => setSourceType('mobile')}
            className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              sourceType === 'mobile'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Móvil como Cámara de Folio (Recomendado)</span>
          </button>

          <button
            onClick={() => setSourceType('webcam')}
            className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              sourceType === 'webcam'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Webcam del Portátil</span>
          </button>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center space-x-2">
          {sourceType === 'mobile' && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${
                mobileConnected
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-700/60 text-amber-300 animate-pulse'
              }`}
            >
              {mobileConnected ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>Móvil Conectado en Directo</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span>Esperando móvil...</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Display Area */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[360px]">
        {/* Mode 1: Mobile Camera Feed */}
        {sourceType === 'mobile' && (
          <>
            {mobileConnected && mobileFrame ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <img
                  src={mobileFrame}
                  alt="Folio transmitido desde el móvil"
                  style={{
                    transform: `rotate(${rotation}deg) scale(${zoomLevel})`,
                    filter: highContrast ? 'contrast(1.4) brightness(1.05)' : 'none',
                  }}
                  className="w-full h-full object-contain transition-transform duration-200"
                />

                {/* Framing Box for alignment */}
                <div className="absolute inset-4 pointer-events-none border border-dashed border-amber-500/40 rounded-xl flex flex-col justify-between p-3">
                  <div className="flex justify-between items-center text-[10px] text-amber-300 font-mono">
                    <span className="bg-black/70 px-2 py-0.5 rounded backdrop-blur">
                      [ CÁMARA MÓVIL EN MESA ]
                    </span>
                    <span className="bg-black/70 px-2 py-0.5 rounded backdrop-blur text-emerald-400 font-bold">
                      ● TRANSMITIENDO EN TIEMPO REAL
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono">
                    <span>Sesión: {sessionId}</span>
                    <span>
                      {lastFrameTime
                        ? `Recibido: ${new Date(lastFrameTime).toLocaleTimeString()}`
                        : ''}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* QR Code & Mobile Instructions Card */
              <div className="p-6 max-w-md w-full text-center space-y-4 bg-stone-900/90 border border-stone-800 rounded-2xl shadow-2xl m-4">
                <div className="flex items-center justify-center space-x-2 text-amber-400 font-bold text-sm">
                  <Smartphone className="w-5 h-5 text-amber-500" />
                  <span>Pon tu móvil como cámara fija de papel</span>
                </div>

                <p className="text-xs text-stone-300 leading-relaxed">
                  Escanea este código con la cámara de tu teléfono móvil o abre el enlace. Apoya el teléfono en un atril, soporte o taza apuntando hacia tu folio:
                </p>

                {/* QR Code */}
                <div className="bg-white p-3 rounded-xl inline-block shadow-lg mx-auto border-4 border-stone-800">
                  <QRCodeSVG value={mobileUrl} size={160} level="M" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2 bg-stone-950 px-3 py-2 rounded-lg border border-stone-800 text-xs font-mono text-amber-300">
                    <span className="truncate max-w-[260px]">{mobileUrl}</span>
                    <button
                      onClick={handleCopyLink}
                      className="p-1 rounded hover:bg-stone-800 text-stone-300 hover:text-white"
                      title="Copiar enlace para el móvil"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="text-[11px] text-stone-400">
                    Código de sesión: <span className="font-bold text-amber-400">{sessionId}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-800 text-[11px] text-stone-400 text-left space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tu móvil transmitirá el papel en vivo sin escribir en el PC.</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tú conversas y escuchas al profesor cómodamente desde el ordenador.</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Mode 2: Computer Webcam */}
        {sourceType === 'webcam' && (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {webcamError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center text-xs text-red-300 bg-stone-950/90 space-y-2">
                <span>{webcamError}</span>
                <button
                  onClick={() => startWebcam(selectedDeviceId)}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded font-bold"
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
                transform: `scale(${zoomLevel})`,
                filter: highContrast ? 'contrast(1.5) brightness(1.1) grayscale(0.35)' : 'none',
              }}
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="p-2.5 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 text-xs">
          {/* Rotate 90° button */}
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded flex items-center gap-1"
            title="Girar imagen 90 grados"
          >
            <RotateCw className="w-3 h-3 text-amber-400" />
            <span>Girar {rotation !== 0 ? `${rotation}°` : ''}</span>
          </button>

          {/* Quick 180° Invert button */}
          <button
            onClick={() => setRotation((r) => (r + 180) % 360)}
            className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] transition-colors ${
              rotation === 180
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50 font-bold'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
            }`}
            title="Invertir 180° si el móvil está al revés en la mesa"
          >
            <span>180°</span>
          </button>

          {/* High Contrast Toggle */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`px-2.5 py-1 rounded flex items-center gap-1 text-xs transition-colors ${
              highContrast
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50 font-semibold'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-400'
            }`}
            title="Realzar contraste de tinta y lápiz en papel blanco"
          >
            <Sliders className="w-3 h-3 text-amber-400" />
            <span>{highContrast ? 'Contraste ✓' : 'Contraste'}</span>
          </button>

          {/* Zoom */}
          <button
            onClick={() => setZoomLevel((z) => (z === 1 ? 1.35 : z === 1.35 ? 1.7 : 1))}
            className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded flex items-center gap-1"
            title="Lupa para ampliar fórmulas pequeñas"
          >
            {zoomLevel > 1 ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            <span>{zoomLevel}x</span>
          </button>

          {sourceType === 'mobile' && !mobileConnected && (
            <button
              onClick={handleCopyLink}
              className="px-2.5 py-1 bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 rounded border border-amber-500/30 flex items-center gap-1 text-xs"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedLink ? 'Copiado' : 'Link Móvil'}</span>
            </button>
          )}
        </div>

        {/* Primary Review Call */}
        <button
          onClick={handleManualReview}
          disabled={isInspecting}
          className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-amber-500/25 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Eye className="w-4 h-4 text-white" />
          <span>{isInspecting ? 'Examinando tu folio...' : '📸 Mirar mi papel ahora'}</span>
        </button>
      </div>
    </div>
  );
};
