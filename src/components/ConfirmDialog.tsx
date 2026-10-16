import { Dialog } from './Dialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({ open, title, description, confirmLabel, destructive, onConfirm, onCancel }: ConfirmDialogProps) {
  return <Dialog open={open} title={title} onClose={onCancel} className="w-full max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-6 text-stone-100 shadow-2xl">
    <h2 className="text-lg font-bold">{title}</h2>
    <p className="mt-2 text-sm text-stone-300">{description}</p>
    <div className="mt-5 flex justify-end gap-2">
      <button type="button" onClick={onCancel} className="rounded-lg bg-stone-800 px-4 py-2 text-sm">Cancelar</button>
      <button type="button" onClick={onConfirm} className={`rounded-lg px-4 py-2 text-sm font-bold ${destructive ? 'bg-red-600 text-white' : 'bg-amber-500 text-stone-950'}`}>{confirmLabel}</button>
    </div>
  </Dialog>;
}
