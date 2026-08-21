import React, { useState } from 'react';
import { Copy, Check, Loader2 } from 'lucide-react';
import { PetRecord } from '../types';
import { hasVotedDuplicado, markVotedDuplicado, unmarkVotedDuplicado } from '../lib/duplicadoVotes';

interface MarcarDuplicadoButtonProps {
  pet: PetRecord;
  onToggleDuplicado?: (petId: string, marcar: boolean) => Promise<void>;
  /** 'card' = ancho completo al pie de una tarjeta. 'inline' = chip compacto. */
  variant?: 'card' | 'inline';
  className?: string;
}

/**
 * Boton publico para que cualquier visitante senale una ficha como posible repetida.
 *
 * NO oculta ni borra nada: solo levanta una bandera (duplicado / duplicadoVotos) para que
 * la revisemos a mano despues. La decision de borrar sigue siendo humana y con foto a la
 * vista, porque los afiches suelen traer varios animales y el criterio automatico falla.
 */
export const MarcarDuplicadoButton: React.FC<MarcarDuplicadoButtonProps> = ({
  pet,
  onToggleDuplicado,
  variant = 'card',
  className = ''
}) => {
  const [yaVote, setYaVote] = useState(() => hasVotedDuplicado(pet.id));
  const [enviando, setEnviando] = useState(false);

  if (!onToggleDuplicado) return null;

  const votos = pet.duplicadoVotos || 0;
  const marcadoPorAlguien = Boolean(pet.duplicado) || votos > 0;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (enviando) return;

    const marcar = !yaVote;
    setEnviando(true);
    // Optimista: el registro local se ajusta ya, y se revierte si Firestore falla.
    setYaVote(marcar);
    if (marcar) markVotedDuplicado(pet.id);
    else unmarkVotedDuplicado(pet.id);

    try {
      await onToggleDuplicado(pet.id, marcar);
    } catch {
      setYaVote(!marcar);
      if (marcar) unmarkVotedDuplicado(pet.id);
      else markVotedDuplicado(pet.id);
    } finally {
      setEnviando(false);
    }
  };

  const etiqueta = yaVote
    ? 'Marcaste esta ficha como repetida. Toca para deshacer.'
    : 'Si esta mascota ya esta publicada en otra ficha, marcala para que la revisemos.';

  const base =
    variant === 'inline'
      ? 'text-[10px] px-2 py-1 gap-1 rounded-lg'
      : 'w-full text-[11px] px-2 py-1.5 gap-1.5 rounded-xl';

  const tono = yaVote
    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
    : 'bg-transparent text-stone-400 border-stone-200 hover:text-amber-700 hover:border-amber-200 hover:bg-amber-50/60';

  return (
    <button
      type="button"
      id={`btn-marcar-duplicado-${pet.id}`}
      onClick={handleClick}
      disabled={enviando}
      title={etiqueta}
      aria-pressed={yaVote}
      aria-label={etiqueta}
      className={`inline-flex items-center justify-center font-semibold border transition disabled:opacity-60 active:scale-[0.99] ${base} ${tono} ${className}`}
    >
      {enviando ? (
        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
      ) : yaVote ? (
        <Check className="w-3 h-3 shrink-0" />
      ) : (
        <Copy className="w-3 h-3 shrink-0" />
      )}
      <span className="truncate">{yaVote ? 'Marcada como repetida' : 'Marcar duplicado'}</span>
      {marcadoPorAlguien && votos > 0 && (
        <span
          className={`shrink-0 tabular-nums px-1.5 rounded-full text-[9px] font-black ${
            yaVote ? 'bg-amber-200/80 text-amber-900' : 'bg-stone-200 text-stone-600'
          }`}
          title={`${votos} ${votos === 1 ? 'persona la marco' : 'personas la marcaron'}`}
        >
          {votos}
        </span>
      )}
    </button>
  );
};
