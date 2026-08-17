import React, { useState, useEffect } from 'react';
import { Mail, Clock, Sparkles, CheckCircle2, Send, AlertCircle, X, Key, Info, ExternalLink, Loader2, Layers, CheckCheck } from 'lucide-react';
import { PetRecord, MatchPair } from '../types';
import { checkPetColorMatch, formatPetColorDisplay, hasValidPetPhoto } from '../data/colombiaData';
import {
  getResendApiKey,
  setResendApiKey,
  sendEmailViaResend,
  generateMatchEmailHtml,
  generateConsolidatedDailyDigestEmailHtml,
  ConsolidatedMatchItem
} from '../services/emailService';

interface DailyEmailDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  pets: PetRecord[];
}

export const DailyEmailDigestModal: React.FC<DailyEmailDigestModalProps> = ({
  isOpen,
  onClose,
  pets
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('tumascotaperdidacol@gmail.com');
  const [statusLog, setStatusLog] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [dispatchResults, setDispatchResults] = useState<{
    sentCount: number;
    failedCount: number;
    details: string[];
  } | null>(null);

  useEffect(() => {
    setApiKeyInput(getResendApiKey());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveApiKey = () => {
    setResendApiKey(apiKeyInput);
    setStatusLog({
      type: 'success',
      text: '¡Clave de API de Resend guardada correctamente!'
    });
  };

  // Calculate matching stats for active pets in last 24h (requieren fotografía real)
  const activePets = pets.filter((p) => p.estado !== 'RESUELTO');
  const lostActive = activePets.filter((p) => p.tipo === 'PERDIDO' && hasValidPetPhoto(p));
  const foundActive = activePets.filter((p) => p.tipo === 'ENCONTRADO' && hasValidPetPhoto(p));

  // Compute matches
  const matchPairs: Array<{
    lost: PetRecord;
    found: PetRecord;
    score: number;
  }> = [];

  lostActive.forEach((lost) => {
    foundActive.forEach((found) => {
      if (
        (found.ciudad || '').trim().toLowerCase() === (lost.ciudad || '').trim().toLowerCase() &&
        found.especie === lost.especie
      ) {
        let score = 70;
        const colorMatch = checkPetColorMatch(lost.color, lost.subColores, found.color, found.subColores);
        if (colorMatch.isMatch) score += 15;
        if (found.tamano === lost.tamano) score += 15;
        matchPairs.push({ lost, found, score });
      }
    });
  });

  // Prepare structured consolidated items
  const consolidatedItems: ConsolidatedMatchItem[] = matchPairs.map((pair) => ({
    lostPet: {
      nombre: pair.lost.nombre || 'Sin nombre especificado',
      especie: pair.lost.especie,
      raza: pair.lost.raza,
      color: formatPetColorDisplay(pair.lost.color, pair.lost.subColores),
      tamano: pair.lost.tamano,
      ciudad: pair.lost.ciudad,
      departamento: pair.lost.departamento,
      barrioSector: pair.lost.ubicacion,
      fechaEvento: pair.lost.fechaEvento || pair.lost.fecha,
      fotoUrl: pair.lost.foto,
      contactoNombre: pair.lost.contacto,
      contactoTelefono: pair.lost.telefono,
      contactoCorreo: pair.lost.correo
    },
    foundPet: {
      nombre: pair.found.nombre || 'Mascota Encontrada',
      especie: pair.found.especie,
      raza: pair.found.raza,
      color: formatPetColorDisplay(pair.found.color, pair.found.subColores),
      tamano: pair.found.tamano,
      ciudad: pair.found.ciudad,
      departamento: pair.found.departamento,
      barrioSector: pair.found.ubicacion,
      fechaEvento: pair.found.fechaEvento || pair.found.fecha,
      fotoUrl: pair.found.foto,
      contactoNombre: pair.found.contacto,
      contactoTelefono: pair.found.telefono,
      contactoCorreo: pair.found.correo,
      detalles: pair.found.detalles
    },
    matchPercentage: pair.score
  }));

  // Send Consolidated Daily Digest (All Matches in ONE single email)
  const handleSendConsolidatedDigest = async () => {
    if (!testEmailAddress) {
      setStatusLog({ type: 'error', text: 'Por favor ingresa un correo de destino.' });
      return;
    }

    if (consolidatedItems.length === 0) {
      setStatusLog({
        type: 'info',
        text: 'No hay cruces activos para generar el reporte consolidado en este momento.'
      });
      return;
    }

    setIsSending(true);
    setStatusLog({
      type: 'info',
      text: `Generando y enviando resumen consolidado con ${consolidatedItems.length} coincidencias a ${testEmailAddress}...`
    });

    const consolidatedHtml = generateConsolidatedDailyDigestEmailHtml(
      'Equipo Encontremos Tu Mascota',
      consolidatedItems
    );

    const result = await sendEmailViaResend(
      testEmailAddress,
      `🐾 [RESUMEN DIARIO 6:00 AM] ${consolidatedItems.length} Coincidencia(s) Detectada(s) en Colombia`,
      consolidatedHtml,
      apiKeyInput
    );

    setIsSending(false);
    if (result.success) {
      setStatusLog({
        type: 'success',
        text: `🎉 ¡Resumen consolidado enviado con éxito a ${testEmailAddress}! Contiene todos los ${consolidatedItems.length} cruces en un solo correo con fotos y WhatsApp.`
      });
    } else {
      setStatusLog({
        type: 'error',
        text: `❌ Error al enviar resumen consolidado: ${result.message}`
      });
    }
  };

  // Real Test Email Dispatcher
  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      setStatusLog({ type: 'error', text: 'Por favor ingresa un correo de destino para la prueba.' });
      return;
    }

    setIsSending(true);
    setStatusLog({ type: 'info', text: `Enviando correo de prueba a ${testEmailAddress} vía Resend...` });

    const samplePhoto =
      pets.find((p) => p.foto && p.foto.startsWith('http'))?.foto ||
      pets.find((p) => p.foto)?.foto ||
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80';

    const dummyHtml = generateMatchEmailHtml({
      to: testEmailAddress,
      recipientName: 'Administrador Encontremos Tu Mascota',
      recipientRole: 'DUEÑO',
      petName: 'Prueba de Sistema',
      petSpecies: 'Perro',
      petColor: 'Dorado / Caramelo',
      petCity: 'Pereira, Risaralda',
      matchPetName: 'Encontrado en Sector Centro',
      matchPetPhoto: samplePhoto,
      matchSector: 'Parque El Lago',
      matchContactPhone: '3001234567',
      matchContactName: 'Equipo de Soporte',
      matchDetails: 'Este es un correo de prueba en vivo para verificar la conexión con Resend API y el formato de la foto y enlaces.',
      matchPercentage: 95
    });

    const result = await sendEmailViaResend(
      testEmailAddress,
      '🧪 [PRUEBA] Verificación de Envío de Alertas - Encontremos Tu Mascota',
      dummyHtml,
      apiKeyInput
    );

    setIsSending(false);
    if (result.success) {
      setStatusLog({
        type: 'success',
        text: `✅ ${result.message}. Revisa la bandeja de entrada de ${testEmailAddress}.`
      });
    } else {
      setStatusLog({
        type: 'error',
        text: `❌ Error al enviar: ${result.message}`
      });
    }
  };

  // Real Dispatch of Individual Matches to Families
  const handleDispatchAllMatches = async () => {
    if (matchPairs.length === 0) {
      setStatusLog({
        type: 'info',
        text: 'No hay coincidencias activas pendientes por despachar en este momento.'
      });
      return;
    }

    setIsSending(true);
    setStatusLog({ type: 'info', text: `Iniciando despacho individual de ${matchPairs.length} alertas vía Resend...` });

    let sent = 0;
    let failed = 0;
    const details: string[] = [];

    for (const pair of matchPairs) {
      if (pair.lost.correo) {
        const html = generateMatchEmailHtml({
          to: pair.lost.correo,
          recipientName: pair.lost.contacto || 'Familia',
          recipientRole: 'DUEÑO',
          petName: pair.lost.nombre || 'tu mascota',
          petSpecies: pair.lost.especie,
          petColor: pair.lost.color,
          petCity: pair.lost.ciudad,
          matchPetName: pair.found.nombre || 'Mascota Encontrada',
          matchPetPhoto: pair.found.foto,
          matchSector: pair.found.ubicacion,
          matchContactPhone: pair.found.telefono,
          matchContactName: pair.found.contacto,
          matchDetails: pair.found.detalles,
          matchPercentage: pair.score
        });

        const res = await sendEmailViaResend(
          pair.lost.correo,
          `🚨 [URGENTE] Posible coincidencia para ${pair.lost.nombre || 'tu mascota'} en ${pair.lost.ciudad}`,
          html,
          apiKeyInput
        );

        if (res.success) {
          sent++;
          details.push(`Enviado a dueño: ${pair.lost.correo} (${pair.lost.nombre})`);
        } else {
          failed++;
          details.push(`Fallo a dueño ${pair.lost.correo}: ${res.message}`);
        }
      }
    }

    setIsSending(false);
    setDispatchResults({
      sentCount: sent,
      failedCount: failed,
      details
    });

    if (sent > 0) {
      setStatusLog({
        type: 'success',
        text: `🎉 ¡Proceso completado! Se enviaron ${sent} correos individuales exitosamente.`
      });
    } else if (failed > 0) {
      setStatusLog({
        type: 'error',
        text: `Se intentaron enviar ${failed} correos pero Resend reportó un aviso. Revisa el detalle abajo.`
      });
    }
  };

  return (
    <div
      id="digest-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="digest-modal-box"
        className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-stone-200 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-red-100 text-red-700">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Despacho de Alertas por Correo Electrónico (Resend)
              </h3>
              <p className="text-xs text-stone-500">
                Cruce y notificación automática para dueños y rescatistas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* API Key Configuration Card */}
        <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2 border border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
              <Key className="w-4 h-4" />
              Clave API de Resend (RESEND_API_KEY):
            </label>
            <a
              href="https://resend.com/api-keys"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-blue-300 hover:underline flex items-center gap-1"
            >
              Obtener en Resend.com <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="re_xxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-yellow-400"
            />
            <button
              onClick={handleSaveApiKey}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition"
            >
              Guardar Clave
            </button>
          </div>
        </div>

        {/* Status log notification */}
        {statusLog && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2 ${
              statusLog.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : statusLog.type === 'error'
                ? 'bg-red-50 text-red-900 border border-red-200'
                : 'bg-blue-50 text-blue-900 border border-blue-200'
            }`}
          >
            {statusLog.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : statusLog.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{statusLog.text}</span>
          </div>
        )}

        {/* Match Statistics */}
        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl space-y-2">
          <h4 className="font-bold text-amber-950 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-700" />
              Coincidencias Detectadas en la Plataforma:
            </span>
            <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold text-[11px]">
              {matchPairs.length} cruces activos
            </span>
          </h4>
          <p className="text-[11px] text-amber-900/80 leading-relaxed">
            El sistema cruza en tiempo real mascotas perdidas vs encontradas en la misma ciudad y especie.
          </p>
        </div>

        {/* Email Recipient Input */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-blue-700" />
            Correo de destino para pruebas y resúmenes:
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              placeholder="tu-correo@gmail.com"
              className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSendTestEmail}
              disabled={isSending}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 whitespace-nowrap transition"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Test 1 Caso
            </button>
          </div>
        </div>

        {/* PRIMARY ACTION: SEND ALL MATCHES IN 1 CONSOLIDATED EMAIL */}
        <div className="border-2 border-blue-500 bg-blue-50/70 rounded-xl p-4 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-blue-950 text-sm flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-700" />
              1. Enviar TODOS los Cruces en 1 Solo Correo Consolidado (Recomendado)
            </h4>
            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              1 Solo Correo
            </span>
          </div>
          <p className="text-[11px] text-blue-900/80 leading-relaxed">
            Genera un único informe estructurado con <strong>todos los {matchPairs.length} casos coincidentes de Colombia</strong> con sus fotos comparativas (perdido vs encontrado), datos de ubicación y botones directos de WhatsApp para cada uno.
          </p>

          <button
            onClick={handleSendConsolidatedDigest}
            disabled={isSending || matchPairs.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-md"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando y enviando resumen consolidado...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                📥 Enviar Resumen Consolidado con los {matchPairs.length} Cruces en 1 Solo Correo
              </>
            )}
          </button>
        </div>

        {/* SECONDARY ACTION: DISPATCH INDIVIDUAL ALERTS TO EACH PET OWNER */}
        <div className="border border-stone-200 bg-stone-50 rounded-xl p-3.5 space-y-2">
          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <CheckCheck className="w-4 h-4 text-stone-600" />
            2. Despachar Alertas Individuales a los Correos de Cada Dueño
          </h4>
          <p className="text-[11px] text-stone-600 leading-relaxed">
            Envía a cada familia el correo individual de su respectiva mascota.
          </p>

          <button
            onClick={handleDispatchAllMatches}
            disabled={isSending || matchPairs.length === 0}
            className="w-full bg-stone-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition"
          >
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Despachando alertas individuales...
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" />
                Despachar {matchPairs.length} Alertas Individuales a Dueños
              </>
            )}
          </button>

          {/* Details list */}
          {dispatchResults && (
            <div className="bg-white border border-stone-200 rounded-lg p-3 text-[11px] space-y-1.5 mt-2">
              <p className="font-bold text-slate-900">
                Resultado: {dispatchResults.sentCount} enviados con éxito, {dispatchResults.failedCount} avisos.
              </p>
              <div className="max-h-32 overflow-y-auto font-mono text-[10px] text-stone-600 space-y-1 bg-stone-50 p-2 rounded">
                {dispatchResults.details.map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Important Notice regarding Resend Domain Verification */}
        <div className="bg-stone-100 border border-stone-200 rounded-xl p-3 text-[11px] text-stone-700 space-y-1">
          <p className="font-bold flex items-center gap-1 text-stone-800">
            <Info className="w-3.5 h-3.5 text-stone-600" />
            Nota sobre entrega en Resend:
          </p>
          <p className="leading-relaxed text-stone-600">
            En el plan gratuito inicial de Resend, el resumen consolidado llega directamente a tu correo de administrador (<code>tumascotaperdidacol@gmail.com</code>). Para enviar automáticamente a correos externos de cualquier ciudadano, puedes registrar tu dominio en <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="underline font-bold text-blue-600">Resend.com/domains</a>.
          </p>
        </div>

        {/* Footer actions */}
        <div className="pt-1 flex justify-end">
          <button
            onClick={onClose}
            className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold py-2.5 px-6 rounded-xl text-xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

