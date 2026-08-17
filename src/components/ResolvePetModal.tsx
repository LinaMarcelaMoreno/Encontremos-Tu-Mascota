import React, { useState } from 'react';
import { CheckCircle, Heart, X, Lock } from 'lucide-react';
import { PetRecord } from '../types';

interface ResolvePetModalProps {
  pet: PetRecord | null;
  onClose: () => void;
  onConfirmResolve: (petId: string, inputAuth: string) => Promise<boolean>;
}

export const ResolvePetModal: React.FC<ResolvePetModalProps> = ({
  pet,
  onClose,
  onConfirmResolve
}) => {
  const [authInput, setAuthInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!pet) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const success = await onConfirmResolve(pet.id, authInput.trim());
      if (!success) {
        setErrorMessage('El número de teléfono o correo no coincide con el registrado originalmente.');
      } else {
        onClose();
      }
    } catch {
      setErrorMessage('Ocurrió un error al actualizar el estado. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="resolve-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="resolve-modal-box"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-stone-200"
      >
        <div className="flex items-start justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <Heart className="w-5 h-5 fill-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">Marcar como Reencontrado</h3>
          </div>
          <button
            id="close-resolve-btn"
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-950 space-y-1">
            <p className="font-bold text-sm">¿Tu mascota {pet.nombre} ya regresó a casa?</p>
            <p className="text-stone-600 text-[11px] leading-relaxed">
              ¡Nos alegra inmensamente! Al confirmar, la publicación se marcará como <strong>RESUELTA</strong>, se retirará de las alertas activas y ya no recibirás correos automáticos.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-stone-500" />
                Ingresa tu Celular / WhatsApp o Correo para verificar:
              </label>
              <input
                type="text"
                required
                value={authInput}
                onChange={(e) => setAuthInput(e.target.value)}
                placeholder="Ej. 300 123 4567 o tu@correo.com"
                className="w-full border border-stone-300 rounded-xl p-2.5 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none text-xs"
              />
              <span className="text-[10px] text-stone-400">
                Verificamos que seas quien creó el reporte original para cerrar el caso.
              </span>
            </div>

            {errorMessage && (
              <p className="text-red-600 text-xs font-medium bg-red-50 p-2 rounded-lg border border-red-200">
                {errorMessage}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                id="submit-resolve-btn"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {loading ? 'Confirmando...' : 'Confirmar Reencuentro 🎉'}
              </button>
              <button
                type="button"
                id="cancel-resolve-btn"
                onClick={onClose}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2.5 px-4 rounded-xl text-xs transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
