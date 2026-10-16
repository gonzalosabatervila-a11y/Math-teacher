import React, { useState } from 'react';
import {
  Download,
  Github,
  Terminal,
  FolderArchive,
  Check,
  Copy,
  ExternalLink,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'zip' | 'github' | 'terminal'>('zip');
  const [repoUrl, setRepoUrl] = useState('');
  const [token, setToken] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<{
    success?: boolean;
    message?: string;
    details?: string;
  } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const terminalCommands = `# 1. Clona o añade el remoto de tu repositorio
git remote add origin ${repoUrl || 'https://github.com/TU_USUARIO/TU_REPO.git'}

# 2. Sube todos los archivos a la rama main
git branch -M main
git push -u origin main`;

  const handleCopyTerminal = () => {
    navigator.clipboard.writeText(terminalCommands);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handlePushGitHub = async () => {
    if (!repoUrl.trim()) {
      setPushStatus({ success: false, message: 'Por favor introduce la URL del repositorio de GitHub.' });
      return;
    }

    setIsPushing(true);
    setPushStatus(null);

    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          token: token.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al conectar con GitHub');
      }

      setPushStatus({
        success: true,
        message: data.message || '¡Código subido a GitHub con éxito!',
        details: data.output,
      });
    } catch (err: any) {
      setPushStatus({
        success: false,
        message: err.message || 'Error al hacer push',
      });
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-stone-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100">
                Descargar Código y Exportar a GitHub
              </h2>
              <p className="text-xs text-stone-400">
                Descarga el proyecto completo en tu ordenador o súbelo directamente a tu cuenta de GitHub.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
          <button
            onClick={() => setActiveTab('zip')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'zip'
                ? 'bg-amber-600 text-white shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Descarga ZIP Directa</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'github'
                ? 'bg-amber-600 text-white shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>Subir a GitHub (1 Clic)</span>
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'terminal'
                ? 'bg-amber-600 text-white shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Comandos Git</span>
          </button>
        </div>

        {/* TAB 1: Direct ZIP / tar.gz Download */}
        {activeTab === 'zip' && (
          <div className="space-y-3 pt-1 text-xs">
            <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <FolderArchive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-100">
                    Archivo ZIP con todo el código fuente
                  </h3>
                  <p className="text-stone-400 text-xs mt-0.5">
                    Incluye todos los componentes React, el servidor Express, el soporte para cámara móvil, KaTeX y el temario completo de 13 semanas.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <a
                  href="/api/download-zip"
                  download="profesor-matematicas-preuniversitarias.zip"
                  className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 text-center"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar .ZIP Ahora</span>
                </a>

                <a
                  href="/profesor-matematicas-preuniversitarias.tar.gz"
                  download="profesor-matematicas-preuniversitarias.tar.gz"
                  className="py-2.5 px-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium text-xs rounded-xl border border-stone-700 flex items-center justify-center gap-1.5 transition-all text-center"
                >
                  <span>Descargar .tar.gz</span>
                </a>
              </div>
            </div>

            <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800/80 text-[11px] text-stone-400 space-y-1">
              <span className="font-semibold text-stone-300 block">Archivos incluidos en el paquete:</span>
              <ul className="grid grid-cols-2 gap-1 text-[10px] font-mono text-stone-400 pl-1">
                <li>• server.ts (Express + Gemini)</li>
                <li>• src/App.tsx</li>
                <li>• src/components/CameraPaperView.tsx</li>
                <li>• src/components/MobileCamView.tsx</li>
                <li>• src/components/ClassroomFeed.tsx</li>
                <li>• src/components/SessionTimeline.tsx</li>
                <li>• src/components/SyllabusSelector.tsx</li>
                <li>• src/components/PostmortemModal.tsx</li>
                <li>• src/components/MathView.tsx</li>
                <li>• src/data/syllabus.ts (Doc 3 & 4)</li>
                <li>• package.json & vite.config.ts</li>
                <li>• .env.example & metadata.json</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: Direct Push to GitHub */}
        {activeTab === 'github' && (
          <div className="space-y-3 pt-1 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-stone-300 flex items-center gap-1">
                <span>URL de tu repositorio de GitHub (creado en blanco):</span>
              </label>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/tu-usuario/mi-profesor-matematicas.git"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2.5 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-300 flex items-center justify-between">
                <span>GitHub Personal Access Token (PAT):</span>
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline text-[10px] flex items-center gap-0.5"
                >
                  <span>Crear token en GitHub</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (con permiso 'repo')"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2.5 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
              <span className="text-[10px] text-stone-500 block">
                El token se usa únicamente para autorizar el git push hacia tu repositorio.
              </span>
            </div>

            {pushStatus && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  pushStatus.success
                    ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                    : 'bg-red-950/70 border-red-800 text-red-200'
                }`}
              >
                {pushStatus.success ? (
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-bold">{pushStatus.message}</div>
                  {pushStatus.details && (
                    <pre className="text-[10px] font-mono mt-1 opacity-80 overflow-x-auto whitespace-pre-wrap">
                      {pushStatus.details}
                    </pre>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handlePushGitHub}
              disabled={isPushing}
              className="w-full py-2.5 bg-stone-100 hover:bg-white text-stone-950 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
            >
              <Github className="w-4 h-4" />
              <span>{isPushing ? 'Subiendo archivos a GitHub...' : 'Subir Repositorio a GitHub'}</span>
            </button>
          </div>
        )}

        {/* TAB 3: Terminal Commands */}
        {activeTab === 'terminal' && (
          <div className="space-y-3 pt-1 text-xs">
            <p className="text-stone-400 text-xs leading-relaxed">
              El repositorio Git ya ha sido inicializado localmente con todos los archivos comprometidos en la rama <code className="text-amber-300 font-mono">main</code>. Para sincronizarlo con tu GitHub por terminal:
            </p>

            <div className="relative bg-stone-950 border border-stone-800 rounded-xl p-3 font-mono text-[11px] text-stone-300">
              <pre className="overflow-x-auto whitespace-pre-wrap">{terminalCommands}</pre>
              <button
                onClick={handleCopyTerminal}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white"
                title="Copiar comandos"
              >
                {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-stone-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
