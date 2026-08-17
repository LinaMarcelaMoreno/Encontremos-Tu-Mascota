import React, { useState } from 'react';
import { Lightbulb, Send, HeartHandshake, CheckCircle2, MessageSquareHeart, Sparkles } from 'lucide-react';
import { SuggestionRecord } from '../types';

interface SuggestionsViewProps {
  onSubmitSuggestion: (
    suggestion: Omit<SuggestionRecord, 'id' | 'createdAt' | 'fecha' | 'atendido'>
  ) => Promise<boolean>;
}

export const SuggestionsView: React.FC<SuggestionsViewProps> = ({ onSubmitSuggestion }) => {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [tipo, setTipo] = useState<SuggestionRecord['tipo']>('MEJORA');
  const [mensaje, setMensaje] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!nombre.trim() || !telefono.trim() || !mensaje.trim()) {
      setErrorMessage('Por favor completa tu nombre, número de WhatsApp y tu sugerencia.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSubmitSuggestion({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        correo: correo.trim().toLowerCase(),
        tipo,
        mensaje: mensaje.trim()
      });

      if (success) {
        setIsSuccess(true);
        setNombre('');
        setTelefono('');
        setCorreo('');
        setMensaje('');
      }
    } catch {
      setErrorMessage('No se pudo enviar la sugerencia. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-blue-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
            <Lightbulb className="w-4 h-4 text-blue-950" />
            <span>Tu Sugerencia Importa</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Construyamos juntos la mejor red de rescate en Colombia 🇨🇴
          </h2>
          <p className="text-blue-100 text-xs sm:text-sm leading-relaxed max-w-2xl">
            ¿Tienes una idea para hacer más fácil el reencuentro de mascotas? ¿Eres rescatista, veterinario o familia y notas algo que podemos mejorar? Déjanos tus datos de contacto para escribirte y seguir haciendo crecer este proyecto solidario.
          </p>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-stone-200">
        {isSuccess ? (
          <div className="text-center py-10 space-y-4 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">¡Muchas Gracias por tu Aporte!</h3>
              <p className="text-stone-600 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                Hemos recibido tu recomendación. El equipo administrador la revisará y te contactará a través de tu WhatsApp para contarte sobre los avances.
              </p>
            </div>
            <button
              onClick={() => setIsSuccess(false)}
              className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Enviar otra sugerencia
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 text-xs sm:text-sm">
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-xs text-red-700 font-medium">
                {errorMessage}
              </div>
            )}

            {/* Form Fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tu Nombre Completo *
                </label>
                <input
                  type="text"
                  id="suggestion-nombre"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Carlos Martínez"
                  className="w-full border border-stone-300 rounded-xl p-2.5 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-blue-900 outline-none text-xs sm:text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Número de WhatsApp de Contacto *
                </label>
                <input
                  type="tel"
                  id="suggestion-telefono"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 312 345 6789"
                  className="w-full border border-stone-300 rounded-xl p-2.5 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-blue-900 outline-none text-xs sm:text-sm font-semibold"
                />
                <span className="text-[10px] text-stone-500 mt-0.5 block">
                  Te escribiremos directamente a WhatsApp para darte respuesta.
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  id="suggestion-correo"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full border border-stone-300 rounded-xl p-2.5 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-blue-900 outline-none text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tipo de Aporte *
                </label>
                <select
                  id="suggestion-tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as SuggestionRecord['tipo'])}
                  className="w-full border border-stone-300 rounded-xl p-2.5 bg-white font-medium text-xs sm:text-sm"
                >
                  <option value="MEJORA">✨ Mejora de Usabilidad / Facilidad</option>
                  <option value="NUEVA_FUNCION">🚀 Nueva Función / Idea Innovadora</option>
                  <option value="ERROR">🐛 Reportar un Fallo o Error</option>
                  <option value="ALIANZA">🤝 Alianza / Voluntariado / Refugios</option>
                  <option value="OTRO">💬 Otro Comentario</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tu Idea o Recomendación Detallada *
              </label>
              <textarea
                id="suggestion-mensaje"
                required
                rows={4}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Cuéntanos con detalle qué te gustaría que tuviera la aplicación, qué te gustaría cambiar o qué funcionalidad ayudaría a tu ciudad o municipio..."
                className="w-full border border-stone-300 rounded-xl p-3 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-blue-900 outline-none text-xs sm:text-sm"
              />
            </div>

            <button
              type="submit"
              id="suggestion-submit-btn"
              disabled={isSubmitting}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-md text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Enviando sugerencia...' : '💡 Enviar Sugerencia al Administrador'}</span>
              {!isSubmitting && <Send className="w-4 h-4 text-yellow-400" />}
            </button>
          </form>
        )}
      </div>

      {/* Community spirit card */}
      <div className="bg-stone-100 rounded-2xl p-5 border border-stone-200 flex items-center gap-4 text-xs text-stone-600">
        <div className="w-10 h-10 rounded-xl bg-yellow-400 text-blue-950 flex items-center justify-center shrink-0 shadow-sm">
          <HeartHandshake className="w-6 h-6" />
        </div>
        <p className="leading-relaxed">
          Cada aporte y comentario ayuda a que menos mascotas pasen noches en la calle y más familias colombianas vuelvan a abrazar a sus peludos. <strong>¡Gracias por ser parte de esta red solidaria!</strong>
        </p>
      </div>
    </div>
  );
};
