'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  /** Texto del botón de confirmación (por defecto "Confirmar") */
  confirmText?: string;
  /** Texto del botón de cancelación (por defecto "Cancelar") */
  cancelText?: string;
  /** Variante de color: 'danger' (rojo) para acciones destructivas, 'primary' (azul) para el resto */
  variant?: 'danger' | 'primary';
  /** Si se está procesando la acción, deshabilita los botones y muestra el estado */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmación genérico y reutilizable.
 * Reemplaza al window.confirm nativo para mantener un estilo coherente con la app
 * y obligar a que toda acción (especialmente destructiva) pida aprobación explícita.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Cabecera */}
        <div className="flex items-start gap-3 p-5 border-b border-slate-100">
          <div
            className={`p-2.5 rounded-xl flex-shrink-0 ${
              isDanger ? 'bg-red-50 text-red-600' : 'bg-primary/5 text-primary'
            }`}
          >
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Botones */}
        <div className="flex items-center justify-end gap-2 p-4 bg-slate-50">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 text-white shadow-lg ${
              isDanger
                ? 'bg-red-600 hover:bg-red-500 active:bg-red-700 shadow-red-600/10'
                : 'bg-primary hover:bg-primary/90 active:bg-primary-dark shadow-primary/10'
            }`}
          >
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}