import React from 'react';
import { CheckCircle2, Clock, MapPin, Eye, Sparkles, AlertCircle } from 'lucide-react';
import { PetRecord } from '../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  pet: PetRecord | null;
  matchingCount: number;
  exactMatchCount?: number;
  onClose: () => void;
  onGoToMatches: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  pet,
  matchingCount,
  exactMatchCount = 0,
  onClose,
  onGoToMatches
}) => {
  if (!isOpen || !pet) return null;

  const isPerdido = pet.tipo === 'PERDIDO';
  const hasExact = exactMatchCount > 0;

  return (
    <div
      id="confirm-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="confirm-modal-box"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-stone-200"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {isPerdido ? '¡Alerta de Búsqueda Registrada!' : '¡Mascota Encontrada Registrada!'}
          </h3>
          <p className="text-xs text-stone-500">
            Código oficial del caso: <strong className="text-blue-900 font-mono">{pet.id}</strong>
          </p>
        </div>

        {/* Status of Exact Match & Candidate Matches */}
        <div className="space-y-3 text-xs">
          {hasExact ? (
            <div className="bg-emerald-50 border-2 border-emerald-500 p-4 rounded-xl text-emerald-950 space-y-1.5 shadow-sm">
              <div className="flex items-center gap-1.5 font-black text-sm text-emerald-800">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>🎯 ¡COINCIDENCIA EXACTA ENCONTRADA!</span>
              </div>
              <p className="text-stone-700 text-xs leading-relaxed">
                Hemos localizado <strong>{exactMatchCount} {exactMatchCount === 1 ? 'reporte' : 'reportes'}</strong> con exactamente el mismo departamento ({pet.departamento}), municipio ({pet.ciudad}), especie ({pet.especie}), raza ({pet.raza}) y color idéntico.
              </p>
            </div>
          ) : matchingCount > 0 ? (
            <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-blue-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-xs text-blue-900">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Sin coincidencia 100% exacta inmediata</span>
              </p>
              <p className="text-stone-600 text-[11px] leading-relaxed">
                Sin embargo, encontramos <strong>{matchingCount} posible(s) coincidencia(s) compatible(s) (&gt;65% de afinidad)</strong> en {pet.departamento} que coinciden en especie, características físicas y zona.
              </p>
            </div>
          ) : (
            <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl text-slate-800 space-y-1">
              <p className="font-bold text-xs flex items-center gap-1.5 text-slate-900">
                <AlertCircle className="w-4 h-4 text-stone-500 shrink-0" />
                <span>Sin coincidencia exacta por el momento</span>
              </p>
              <p className="text-stone-600 text-[11px] leading-relaxed">
                Tu reporte ha quedado <strong>100% ACTIVO</strong> en la red. El sistema continuará cruzando datos en tiempo real cada vez que ingrese un nuevo reporte.
              </p>
            </div>
          )}

          {isPerdido && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-950 flex items-start gap-2 text-[11px]">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Resumen Diario a las 6:00 AM:</strong>
                <p className="text-stone-600 mt-0.5">
                  Si un rescatista o vecino publica un animal coincidente en las próximas 24 horas, recibirás un correo prioritario a <strong>{pet.correo}</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            id="view-matches-btn"
            onClick={onGoToMatches}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <Eye className="w-4 h-4" /> Ver Cruces con IA
          </button>
          <button
            id="close-confirm-btn"
            onClick={onClose}
            className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2.5 px-4 rounded-xl text-xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

