import React, { useEffect } from 'react';
import { X, ZoomIn, MapPin, Tag, Calendar, User, Phone, Share2, Sparkles } from 'lucide-react';
import { PetRecord } from '../types';

interface ImageLightboxModalProps {
  pet: PetRecord | null;
  onClose: () => void;
  onSearchByTraits?: (pet: PetRecord) => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({ pet, onClose, onSearchByTraits }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (pet) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pet, onClose]);

  if (!pet) return null;

  const isPerdido = pet.tipo === 'PERDIDO';
  const waMessage = encodeURIComponent(
    `🚨 *REPORTE RESCATE ANIMAL COLOMBIA*\n\n` +
    `🐾 *Estado:* ${pet.tipo}\n` +
    `🐶 *Mascota:* ${pet.nombre}\n` +
    `📍 *Municipio:* ${pet.ciudad}, ${pet.departamento}\n` +
    `📌 *Sector:* ${pet.ubicacion}\n` +
    `👤 *Contacto:* ${pet.contacto} (${pet.telefono})\n\n` +
    `Ayúdanos a difundir para que regrese a casa 🇨🇴`
  );
  const waUrl = `https://api.whatsapp.com/send?text=${waMessage}`;

  return (
    <div
      id="image-lightbox-overlay"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="image-lightbox-content"
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl border border-slate-700/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón flotante de cierre siempre visible en móviles */}
        <button
          id="mobile-lightbox-floating-close-btn"
          onClick={onClose}
          className="absolute top-3 right-3 z-30 md:hidden p-2.5 rounded-full bg-slate-900/90 text-white hover:bg-slate-800 shadow-xl border border-white/20 active:scale-95 transition"
          aria-label="Cerrar modal"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Visual Box */}
        <div className="relative md:w-3/5 bg-slate-950 flex items-center justify-center min-h-[260px] sm:min-h-[300px] md:min-h-[450px]">
          {pet.foto ? (
            <img
              src={pet.foto}
              alt={pet.nombre}
              className="w-full h-full max-h-[55vh] md:max-h-[70vh] object-contain select-none"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-stone-400 gap-2 p-8">
              <span className="text-5xl">🐾</span>
              <span className="text-xs text-stone-300">Fotografía no disponible</span>
            </div>
          )}
          <span
            className={`absolute top-4 left-4 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full text-white shadow-lg ${
              isPerdido ? 'bg-red-600' : 'bg-emerald-600'
            }`}
          >
            {pet.tipo}
          </span>
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white/80 text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Foto de alta definición</span>
          </div>
        </div>

        {/* Info Column */}
        <div className="md:w-2/5 p-6 flex flex-col justify-between overflow-y-auto bg-stone-50">
          <div>
            <div className="flex items-start justify-between border-b border-stone-200 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                  {pet.id}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{pet.nombre}</h3>
                <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" /> Registrado el {pet.fecha}
                </p>
              </div>
              <button
                id="close-lightbox-btn"
                onClick={onClose}
                className="p-1.5 rounded-full bg-stone-200 text-stone-700 hover:bg-stone-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-stone-700">
              <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-stone-500">Especie:</span>
                  <span className="font-bold text-slate-900">{pet.especie}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Raza:</span>
                  <span className="font-bold text-slate-900">{pet.raza || 'Mestizo / Sin especificar'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Color principal:</span>
                  <span className="font-bold text-slate-900">{pet.color}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Tamaño:</span>
                  <span className="font-bold text-slate-900">{pet.tamano}</span>
                </div>
              </div>

              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200/60 space-y-1">
                <p className="font-bold text-blue-950 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-800" />
                  {pet.ciudad}, {pet.departamento}
                </p>
                <p className="text-stone-600 text-[11px]">
                  <strong>Sector/Barrio:</strong> {pet.ubicacion}
                </p>
              </div>

              {pet.detalles && (
                <div className="bg-white p-3 rounded-xl border border-stone-200">
                  <p className="text-[11px] font-bold text-stone-700 mb-0.5">Señas o detalles particulares:</p>
                  <p className="text-stone-600 text-[11px] italic leading-relaxed">{pet.detalles}</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-200 space-y-2 mt-4">
            <div className="bg-white p-3 rounded-xl border border-stone-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-stone-500 flex items-center gap-1">
                  <User className="w-3 h-3" /> {isPerdido ? 'Dueño(a)' : 'Rescatista'}
                </p>
                <p className="font-bold text-slate-900 text-xs">{pet.contacto}</p>
              </div>
              <a
                id="lightbox-call-btn"
                href={`tel:${pet.telefono}`}
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
              >
                <Phone className="w-3.5 h-3.5" /> Llamar
              </a>
            </div>

            {onSearchByTraits && (
              <button
                id="lightbox-search-traits-btn"
                onClick={() => {
                  onSearchByTraits(pet);
                  onClose();
                }}
                className="w-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm border border-amber-300 active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4 text-blue-950" />
                <span>Buscar por rasgos</span>
              </button>
            )}

            <a
              id="lightbox-wa-btn"
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm"
            >
              <Share2 className="w-4 h-4" /> Difundir en WhatsApp
            </a>

            <button
              onClick={onClose}
              className="w-full md:hidden bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              <X className="w-4 h-4" /> Cerrar Detalle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
