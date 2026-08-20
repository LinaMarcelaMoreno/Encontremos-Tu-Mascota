import React, { useState } from 'react';
import { PetRecord, PetSpecies, PetColor, PetSize, SubColor } from '../types';
import {
  COLOMBIAN_DEPARTMENTS,
  ALL_COLORS,
  SUB_COLORS,
  ALL_SIZES,
  ALL_SPECIES,
  POPULAR_DOG_BREEDS,
  POPULAR_CAT_BREEDS,
  isCompoundColor,
  getCompoundSubColorsCount
} from '../data/colombiaData';
import { compressImage } from '../lib/imageCompression';
import { Camera, Sparkles, AlertCircle, ArrowRight, Check, X, Loader2, Image as ImageIcon, Trash2, Calendar, Palette } from 'lucide-react';

interface LostPetFormProps {
  onSubmitLostPet: (pet: Omit<PetRecord, 'id' | 'createdAt' | 'estado' | 'resolveToken'>) => Promise<boolean>;
  existingKeys: Set<string>;
}

export const LostPetForm: React.FC<LostPetFormProps> = ({ onSubmitLostPet, existingKeys }) => {
  const [nombre, setNombre] = useState('');
  const [especie, setEspecie] = useState<PetSpecies>('Perro');
  const [selectedBreed, setSelectedBreed] = useState('Criollo / Mestizo');
  const [customBreed, setCustomBreed] = useState('');
  const [color, setColor] = useState<PetColor>('Café');
  const [subColor1, setSubColor1] = useState<SubColor>('Negro');
  const [subColor2, setSubColor2] = useState<SubColor>('Blanco');
  const [subColor3, setSubColor3] = useState<SubColor>('Café');
  const [tamano, setTamano] = useState<PetSize>('Mediano');
  const [selectedDept, setSelectedDept] = useState('quindio');
  const [ciudad, setCiudad] = useState('Armenia');
  const [ubicacion, setUbicacion] = useState('');
  const [fechaEvento, setFechaEvento] = useState(() => new Date().toISOString().split('T')[0]);
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [telefonoSecundario, setTelefonoSecundario] = useState('');
  const [correo, setCorreo] = useState('');
  const [detalles, setDetalles] = useState('');

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Color chromatic suggestion state
  const [colorSuggestion, setColorSuggestion] = useState<{
    show: boolean;
    detectedColors: string[];
  }>({ show: false, detectedColors: [] });

  const currentDeptObj = COLOMBIAN_DEPARTMENTS.find((d) => d.id === selectedDept) || COLOMBIAN_DEPARTMENTS[0];

  const breedList =
    especie === 'Perro'
      ? POPULAR_DOG_BREEDS
      : especie === 'Gato'
      ? POPULAR_CAT_BREEDS
      : ['Criollo / Mestizo'];

  const handleDeptChange = (deptId: string) => {
    setSelectedDept(deptId);
    const targetDept = COLOMBIAN_DEPARTMENTS.find((d) => d.id === deptId);
    if (targetDept && targetDept.municipalities.length > 0) {
      setCiudad(targetDept.municipalities[0]);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input value so re-selecting triggers correctly
    e.target.value = '';

    try {
      setIsProcessingPhoto(true);
      setCompressionInfo('Comprimiendo y optimizando fotografía en alta resolución...');
      setErrorMessage(null);

      const result = await compressImage(file, 640, 0.65);
      setPhotoDataUrl(result.dataUrl);
      setCompressionInfo(`⚡ Foto procesada exitosamente: ${result.originalSizeKb} KB → ${result.compressedSizeKb} KB`);

      // Chromatic analysis on animal subject
      if (result.colorAnalysis.isLikelyBicolor && color !== 'Bicolor' && color !== 'Atigrado' && color !== 'Tricolor') {
        setColorSuggestion({
          show: true,
          detectedColors: result.colorAnalysis.detectedDominantColors
        });
      } else {
        setColorSuggestion({ show: false, detectedColors: [] });
      }
    } catch (err: any) {
      console.error('Error procesando imagen:', err);
      setCompressionInfo(null);
      setErrorMessage(err?.message || 'Error al procesar la fotografía. Por favor intenta con otra imagen.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoDataUrl(null);
    setCompressionInfo(null);
    setColorSuggestion({ show: false, detectedColors: [] });
  };

  const handleAcceptBicolor = () => {
    setColor('Bicolor');
    setColorSuggestion({ show: false, detectedColors: [] });
  };

  const handleDismissSuggestion = () => {
    setColorSuggestion({ show: false, detectedColors: [] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate anti-duplicate key: nombre + telefono
    const cleanPhone = telefono.trim().replace(/\D/g, '');
    const normalizedKey = `${nombre.trim().toLowerCase()}_${cleanPhone}`;
    if (cleanPhone && existingKeys.has(normalizedKey)) {
      setErrorMessage(`⚠️ Ya existe un reporte activo para la mascota "${nombre}" vinculada a tu número de teléfono. Para no saturar la base de datos no es necesario duplicarlo.`);
      return;
    }

    if (!nombre.trim()) {
      setErrorMessage('Por favor ingresa el nombre de la mascota perdida.');
      return;
    }

    if (!photoDataUrl) {
      setErrorMessage('Por favor sube una fotografía clara de la mascota. La foto es obligatoria para poder identificarla y cruzarla.');
      return;
    }

    if (!contacto.trim()) {
      setErrorMessage('Por favor ingresa el nombre de la persona o contacto responsable.');
      return;
    }

    if (!telefono.trim() || cleanPhone.length < 7) {
      setErrorMessage('Por favor ingresa un número de celular / WhatsApp válido (mínimo 7 dígitos).');
      return;
    }

    if (!ciudad || !currentDeptObj.name) {
      setErrorMessage('Por favor selecciona el departamento y municipio donde se extravió.');
      return;
    }

    const finalRaza = selectedBreed === 'Otro'
      ? (customBreed.trim() || 'Criollo / Mestizo')
      : selectedBreed;

    let subColores: string[] = [];
    if (color === 'Bicolor' || color === 'Atigrado') {
      subColores = Array.from(new Set([subColor1, subColor2].filter(Boolean)));
    } else if (color === 'Tricolor') {
      subColores = Array.from(new Set([subColor1, subColor2, subColor3].filter(Boolean)));
    }

    setIsSubmitting(true);
    try {
      const success = await onSubmitLostPet({
        tipo: 'PERDIDO',
        nombre: nombre.trim(),
        cedula: '',
        llave: normalizedKey,
        especie,
        raza: finalRaza,
        color,
        subColores: subColores.length > 0 ? subColores : [],
        tamano,
        departamento: currentDeptObj.name,
        ciudad,
        ubicacion: ubicacion.trim(),
        contacto: contacto.trim(),
        telefono: telefono.trim(),
        telefonoSecundario: telefonoSecundario.trim() || '',
        correo: correo.trim().toLowerCase(),
        foto: photoDataUrl,
        detalles: detalles.trim(),
        fecha: new Date().toLocaleDateString('es-CO'),
        fechaEvento: fechaEvento || new Date().toISOString().split('T')[0]
      });

      if (success) {
        // Reset form
        setNombre('');
        setSelectedBreed('Criollo / Mestizo');
        setCustomBreed('');
        setUbicacion('');
        setContacto('');
        setTelefono('');
        setTelefonoSecundario('');
        setCorreo('');
        setDetalles('');
        setPhotoDataUrl(null);
        setCompressionInfo(null);
        setColorSuggestion({ show: false, detectedColors: [] });
      }
    } catch (err: any) {
      console.error('Error submitting lost pet:', err);
      setErrorMessage(err?.message || 'Error al enviar el reporte a la base de datos. Por favor revisa tu conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-stone-200">
        <div className="border-b border-stone-200 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="bg-red-100 text-red-800 text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
              Reporte de Búsqueda
            </span>
            <span className="bg-blue-50 text-blue-900 text-[11px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Cruce automático activo
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-2 flex items-center gap-2">
            🚨 Reportar Mascota Perdida
          </h2>
          <p className="text-stone-500 text-xs sm:text-sm mt-1">
            Completa los datos de tu mascota. El sistema registrará tu alerta en la base de datos y la cotejará en tiempo real contra los animales encontrados en tu municipio.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* Identificación de la Mascota */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nombre de la Mascota *
            </label>
            <input
              type="text"
              id="lost-pet-nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Bruno, Maya, Pelusa, Lucas..."
              className="w-full border border-stone-300 rounded-xl p-3 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-blue-900 outline-none text-xs sm:text-sm font-semibold text-slate-900 shadow-sm"
            />
            <span className="text-[10px] text-stone-500 mt-1 block">
              Tu número de WhatsApp / celular servirá como llave para gestionar o cerrar tu reporte cuando regrese a casa.
            </span>
          </div>

          {/* Características Físicas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50/80 p-4 rounded-xl border border-stone-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Especie *</label>
              <select
                id="lost-pet-especie"
                required
                value={especie}
                onChange={(e) => {
                  const newSp = e.target.value as PetSpecies;
                  setEspecie(newSp);
                  setSelectedBreed(newSp === 'Perro' ? 'Criollo / Mestizo' : newSp === 'Gato' ? 'Criollo / Mestizo / Común Europeo' : 'Criollo / Mestizo');
                  setCustomBreed('');
                }}
                className="w-full border border-stone-300 rounded-xl p-2 bg-white font-medium text-xs sm:text-sm"
              >
                {ALL_SPECIES.map((s) => (
                  <option key={s} value={s}>
                    {s} {s === 'Perro' ? '🐶' : s === 'Gato' ? '🐱' : '🐾'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Raza *</label>
              <select
                id="lost-pet-raza-select"
                required
                value={selectedBreed}
                onChange={(e) => setSelectedBreed(e.target.value)}
                className="w-full border border-stone-300 rounded-xl p-2 bg-white text-xs sm:text-sm font-medium"
              >
                {breedList.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value="Otro">Otro (Escribir manualmente)</option>
              </select>

              {selectedBreed === 'Otro' && (
                <input
                  type="text"
                  id="lost-pet-custom-breed"
                  value={customBreed}
                  onChange={(e) => setCustomBreed(e.target.value)}
                  placeholder="Escribe la raza exacta..."
                  className="w-full border border-amber-300 bg-amber-50/50 rounded-xl p-2 text-xs sm:text-sm mt-1.5 outline-none focus:ring-2 focus:ring-blue-900"
                  required
                />
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Color *</label>
              <select
                id="lost-pet-color"
                required
                value={color}
                onChange={(e) => {
                  setColor(e.target.value as PetColor);
                  if (colorSuggestion.show) setColorSuggestion({ show: false, detectedColors: [] });
                }}
                className="w-full border border-stone-300 rounded-xl p-2 bg-white font-medium text-xs sm:text-sm"
              >
                {ALL_COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tamaño *</label>
              <select
                id="lost-pet-tamano"
                required
                value={tamano}
                onChange={(e) => setTamano(e.target.value as PetSize)}
                className="w-full border border-stone-300 rounded-xl p-2 bg-white font-medium text-xs sm:text-sm"
              >
                {ALL_SIZES.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sub-selectores dinámicos para Bicolor, Atigrado (2 colores) o Tricolor (3 colores) */}
          {(color === 'Bicolor' || color === 'Atigrado') && (
            <div className="bg-amber-50/70 border border-amber-300/80 p-3.5 rounded-xl space-y-2 animate-fadeIn">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                <Palette className="w-4 h-4 text-amber-600" />
                <span>Colores que componen el pelaje {color.toLowerCase()} (Selecciona 2):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Color 1 *</label>
                  <select
                    id="lost-pet-subcolor-1"
                    value={subColor1}
                    onChange={(e) => setSubColor1(e.target.value as SubColor)}
                    className="w-full border border-amber-300 rounded-xl p-2 bg-white font-medium text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  >
                    {SUB_COLORS.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Color 2 *</label>
                  <select
                    id="lost-pet-subcolor-2"
                    value={subColor2}
                    onChange={(e) => setSubColor2(e.target.value as SubColor)}
                    className="w-full border border-amber-300 rounded-xl p-2 bg-white font-medium text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  >
                    {SUB_COLORS.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-amber-800">
                Selecciona los dos colores predominantes en las manchas o rayas de tu mascota.
              </p>
            </div>
          )}

          {color === 'Tricolor' && (
            <div className="bg-amber-50/70 border border-amber-300/80 p-3.5 rounded-xl space-y-2 animate-fadeIn">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                <Palette className="w-4 h-4 text-amber-600" />
                <span>Colores que componen el pelaje tricolor (Selecciona 3):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Color 1 *</label>
                  <select
                    id="lost-pet-subcolor-1"
                    value={subColor1}
                    onChange={(e) => setSubColor1(e.target.value as SubColor)}
                    className="w-full border border-amber-300 rounded-xl p-2 bg-white font-medium text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  >
                    {SUB_COLORS.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Color 2 *</label>
                  <select
                    id="lost-pet-subcolor-2"
                    value={subColor2}
                    onChange={(e) => setSubColor2(e.target.value as SubColor)}
                    className="w-full border border-amber-300 rounded-xl p-2 bg-white font-medium text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  >
                    {SUB_COLORS.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Color 3 *</label>
                  <select
                    id="lost-pet-subcolor-3"
                    value={subColor3}
                    onChange={(e) => setSubColor3(e.target.value as SubColor)}
                    className="w-full border border-amber-300 rounded-xl p-2 bg-white font-medium text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  >
                    {SUB_COLORS.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-amber-800">
                Selecciona los tres colores presentes en el pelaje de tu mascota.
              </p>
            </div>
          )}

          {/* Fecha en que se extravió */}
          <div className="bg-red-50/60 p-3.5 rounded-xl border border-red-200/70">
            <label className="block font-bold text-red-950 mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-red-600" /> Fecha en que se extravió la mascota *
            </label>
            <input
              type="date"
              id="lost-pet-fecha-evento"
              required
              value={fechaEvento}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setFechaEvento(e.target.value)}
              className="w-full border border-stone-300 rounded-xl p-2 bg-white font-semibold text-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-red-600 outline-none"
            />
            <span className="text-[10px] text-stone-500 mt-1 block">
              Indica la fecha real en que ocurrió la pérdida.
            </span>
          </div>

          {/* Ubicación: Departamento y Municipio en Cascada */}
          <div className="grid sm:grid-cols-3 gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-200/60">
            <div>
              <label className="block font-bold text-blue-950 mb-1">Departamento *</label>
              <select
                id="lost-pet-departamento"
                required
                value={selectedDept}
                onChange={(e) => handleDeptChange(e.target.value)}
                className="w-full border border-stone-300 rounded-xl p-2 bg-white text-xs sm:text-sm"
              >
                {COLOMBIAN_DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-blue-950 mb-1">Municipio / Ciudad *</label>
              <select
                id="lost-pet-ciudad"
                required
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                className="w-full border border-stone-300 rounded-xl p-2 bg-white font-bold text-blue-900 text-xs sm:text-sm"
              >
                {currentDeptObj.municipalities.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Barrio o Sector *</label>
              <input
                type="text"
                id="lost-pet-ubicacion"
                required
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Ej. Barrio Granada, Parque..."
                className="w-full border border-stone-300 rounded-xl p-2 bg-white text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Datos de Contacto del Dueño */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nombre del Dueño(a) *</label>
              <input
                type="text"
                id="lost-pet-contacto"
                required
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="Tu Nombre Completo"
                className="w-full border border-stone-300 rounded-xl p-2.5 bg-stone-50 text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block font-bold text-blue-950 mb-1 flex items-center justify-between">
                <span>Teléfono / WhatsApp PRINCIPAL *</span>
              </label>
              <input
                type="tel"
                id="lost-pet-telefono"
                required
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Principal (ej: 300 123 4567)"
                className="w-full border border-blue-300 bg-blue-50/40 rounded-xl p-2.5 text-xs sm:text-sm focus:bg-white font-medium"
              />
              <span className="text-[10px] text-blue-800 font-medium mt-0.5 block">
                Llave única de tu reporte
              </span>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Teléfono / WhatsApp Secundario
              </label>
              <input
                type="tel"
                id="lost-pet-telefono-secundario"
                value={telefonoSecundario}
                onChange={(e) => setTelefonoSecundario(e.target.value)}
                placeholder="Opcional (otro contacto)"
                className="w-full border border-stone-300 rounded-xl p-2.5 bg-stone-50 text-xs sm:text-sm focus:bg-white"
              />
              <span className="text-[10px] text-stone-500 mt-0.5 block">
                Número alternativo
              </span>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Correo Electrónico *</label>
              <input
                type="email"
                id="lost-pet-correo"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full border border-stone-300 rounded-xl p-2.5 bg-stone-50 text-xs sm:text-sm"
              />
              <span className="text-[10px] text-stone-500 mt-0.5 block">
                Para alertas y edición
              </span>
            </div>
          </div>

          {/* Fotografía con Aviso de Centrar el Rostro y Sugerencia Cromática */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="block font-bold text-slate-800">
                Fotografía de la Mascota *
              </label>
              <p className="text-[11px] text-blue-900 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                📸 <u>Por favor centra bien el rostro y cuerpo de la mascota</u> para mejor identificación.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="file"
                id="lost-pet-foto-input"
                accept="image/*"
                required={!photoDataUrl}
                disabled={isProcessingPhoto}
                onChange={handlePhotoUpload}
                className="w-full text-stone-500 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-100 file:text-blue-900 hover:file:bg-blue-200 cursor-pointer disabled:opacity-50"
              />
            </div>

            {isProcessingPhoto && (
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 bg-blue-50 p-2.5 rounded-lg border border-blue-200 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                <span>Optimizando y procesando fotografía...</span>
              </div>
            )}

            {compressionInfo && !isProcessingPhoto && (
              <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                {compressionInfo}
              </div>
            )}

            {/* Smart Chromatic Suggestion Banner */}
            {colorSuggestion.show && (
              <div className="bg-amber-50 border-2 border-amber-400 p-3.5 rounded-xl space-y-2 text-xs text-amber-950 animate-fadeIn">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-900">
                      💡 En tu foto se identifican varios colores o manchas en la mascota.
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Actualmente tienes seleccionado <strong>"{color}"</strong>. Si tu mascota tiene dos o más colores (ej: blanco con manchas negras o café), seleccionando <strong>"Bicolor"</strong>, <strong>"Atigrado"</strong> o <strong>"Tricolor"</strong> podrás indicar los colores exactos y aumentarás la efectividad del cruce automático.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAcceptBicolor}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm transition"
                  >
                    <Check className="w-3.5 h-3.5" /> Cambiar a "Bicolor"
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissSuggestion}
                    className="bg-white hover:bg-stone-100 text-stone-700 font-semibold px-3 py-1.5 rounded-lg text-xs border border-stone-300 transition"
                  >
                    Mantener como "{color}"
                  </button>
                </div>
              </div>
            )}

            {Boolean(photoDataUrl && photoDataUrl.trim()) && !isProcessingPhoto && (
              <div className="flex items-start gap-3 mt-2 bg-white p-3 rounded-xl border border-stone-200 shadow-sm">
                <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-slate-950 border border-stone-200 shadow-sm shrink-0">
                  <img
                    src={photoDataUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-sm opacity-35 scale-110"
                  />
                  <img
                    src={photoDataUrl}
                    alt="Vista previa"
                    className="relative z-10 w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <Check className="w-4 h-4" />
                    <span>Fotografía lista para publicar</span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Se procesó en alta definición lista para sincronizar con la galería y el cruce de alertas.
                  </p>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-[11px] text-red-600 hover:text-red-800 font-bold flex items-center gap-1 hover:underline"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Quitar / Cambiar foto
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Detalles Adicionales */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Detalles Adicionales o Señales Particulares
            </label>
            <textarea
              id="lost-pet-detalles"
              rows={2}
              value={detalles}
              onChange={(e) => setDetalles(e.target.value)}
              placeholder="Ej. Lleva collar rojo, cicatriz en oreja izquierda, responde al silbido..."
              className="w-full border border-stone-300 rounded-xl p-2.5 bg-stone-50 text-xs sm:text-sm outline-none focus:bg-white"
            />
          </div>

          <button
            type="submit"
            id="lost-pet-submit-btn"
            disabled={isSubmitting}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-md text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Guardando en Base de Datos...' : '🚀 Guardar Alerta y Buscar Coincidencias'}</span>
            {!isSubmitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
