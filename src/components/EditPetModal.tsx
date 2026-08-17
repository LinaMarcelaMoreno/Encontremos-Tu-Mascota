import React, { useState, useEffect } from 'react';
import { PetRecord, PetSpecies, PetColor, PetSize, PetStatus, SubColor } from '../types';
import {
  COLOMBIAN_DEPARTMENTS,
  ALL_COLORS,
  SUB_COLORS,
  ALL_SIZES,
  ALL_SPECIES,
  POPULAR_DOG_BREEDS,
  POPULAR_CAT_BREEDS
} from '../data/colombiaData';
import { compressImage } from '../lib/imageCompression';
import { Edit3, Lock, X, Check, Camera, Trash2, Heart, CheckCircle2, Calendar, Palette } from 'lucide-react';

interface EditPetModalProps {
  pet: PetRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePet: (petId: string, updatedData: Partial<PetRecord>) => Promise<boolean>;
  onMarkAsResolved: (petId: string) => Promise<boolean>;
  isAdmin?: boolean;
}

export const EditPetModal: React.FC<EditPetModalProps> = ({
  pet,
  isOpen,
  onClose,
  onUpdatePet,
  onMarkAsResolved,
  isAdmin = false
}) => {
  const [telefonoAuth, setTelefonoAuth] = useState('');
  const [correoAuth, setCorreoAuth] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');

  // Edit fields
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
  const [ciudad, setCiudad] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [fechaEvento, setFechaEvento] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [telefonoSecundario, setTelefonoSecundario] = useState('');
  const [correo, setCorreo] = useState('');
  const [detalles, setDetalles] = useState('');
  const [foto, setFoto] = useState('');
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [actionError, setActionError] = useState('');

  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const breedList =
    especie === 'Perro'
      ? POPULAR_DOG_BREEDS
      : especie === 'Gato'
      ? POPULAR_CAT_BREEDS
      : ['Criollo / Mestizo'];

  useEffect(() => {
    if (pet) {
      setNombre(pet.nombre || '');
      setEspecie(pet.especie || 'Perro');
      
      const bList = pet.especie === 'Perro' ? POPULAR_DOG_BREEDS : pet.especie === 'Gato' ? POPULAR_CAT_BREEDS : ['Criollo / Mestizo'];
      if (bList.includes(pet.raza)) {
        setSelectedBreed(pet.raza);
        setCustomBreed('');
      } else {
        setSelectedBreed('Otro');
        setCustomBreed(pet.raza || '');
      }

      setColor(pet.color || 'Café');
      if (pet.subColores && pet.subColores.length >= 2) {
        setSubColor1((pet.subColores[0] as SubColor) || 'Negro');
        setSubColor2((pet.subColores[1] as SubColor) || 'Blanco');
        if (pet.subColores.length >= 3) {
          setSubColor3((pet.subColores[2] as SubColor) || 'Café');
        } else {
          setSubColor3('Café');
        }
      } else {
        setSubColor1('Negro');
        setSubColor2('Blanco');
        setSubColor3('Café');
      }

      setTamano(pet.tamano || 'Mediano');
      const foundDept = COLOMBIAN_DEPARTMENTS.find((d) => d.name.toLowerCase() === (pet.departamento || '').toLowerCase());
      setSelectedDept(foundDept ? foundDept.id : 'quindio');
      setCiudad(pet.ciudad || '');
      setUbicacion(pet.ubicacion || '');
      setFechaEvento(pet.fechaEvento || pet.fecha || new Date().toISOString().split('T')[0]);
      setContacto(pet.contacto || '');
      setTelefono(pet.telefono || '');
      setTelefonoSecundario(pet.telefonoSecundario || '');
      setCorreo(pet.correo || '');
      setDetalles(pet.detalles || '');
      setFoto(pet.foto || '');

      setTelefonoAuth('');
      setCorreoAuth('');
      setIsAuthorized(Boolean(isAdmin));
      setAuthError('');
      setSaveSuccess(false);
      setActionError('');
      setCompressionInfo(null);
      setIsProcessingPhoto(false);
    }
  }, [pet, isOpen, isAdmin]);

  if (!isOpen || !pet) return null;

  const currentDeptObj = COLOMBIAN_DEPARTMENTS.find((d) => d.id === selectedDept) || COLOMBIAN_DEPARTMENTS[0];

  const handleDeptChange = (deptId: string) => {
    setSelectedDept(deptId);
    const targetDept = COLOMBIAN_DEPARTMENTS.find((d) => d.id === deptId);
    if (targetDept && targetDept.municipalities.length > 0) {
      setCiudad(targetDept.municipalities[0]);
    }
  };

  const handleVerifyAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const inputPhoneDigits = telefonoAuth.replace(/\D/g, '');
    const inputMail = correoAuth.trim().toLowerCase();
    const registeredPhoneDigits = (pet.telefono || '').replace(/\D/g, '');
    const registeredSecPhoneDigits = (pet.telefonoSecundario || '').replace(/\D/g, '');
    const registeredMail = (pet.correo || '').trim().toLowerCase();
    const registeredCed = (pet.cedula || '').trim().toLowerCase();

    // Check credentials by phone digits (primary or secondary), email, or legacy cedula
    let isValid = false;

    // Master admin pin check
    if (telefonoAuth.trim() === '1234' || telefonoAuth.trim() === 'tumascotaperdida2026' || correoAuth.trim() === '1234' || correoAuth.trim() === 'tumascotaperdida2026') {
      isValid = true;
    }

    // Direct phone match (primary or secondary)
    if (inputPhoneDigits && registeredPhoneDigits && (registeredPhoneDigits.includes(inputPhoneDigits) || inputPhoneDigits.includes(registeredPhoneDigits))) {
      isValid = true;
    }
    if (inputPhoneDigits && registeredSecPhoneDigits && (registeredSecPhoneDigits.includes(inputPhoneDigits) || inputPhoneDigits.includes(registeredSecPhoneDigits))) {
      isValid = true;
    }
    // Direct email match
    if (inputMail && registeredMail && inputMail === registeredMail) {
      isValid = true;
    }
    // Legacy cedula match (if user entered their ID in the phone field)
    if (telefonoAuth.trim() && registeredCed && telefonoAuth.trim().toLowerCase() === registeredCed) {
      isValid = true;
    }

    if (isValid) {
      setIsAuthorized(true);
    } else {
      setAuthError('El Teléfono / WhatsApp o Correo no coinciden con los datos registrados originalmente en este reporte.');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input value so selecting again triggers reliably
    e.target.value = '';

    try {
      setIsProcessingPhoto(true);
      setCompressionInfo('Comprimiendo y procesando fotografía...');
      setActionError('');

      const result = await compressImage(file, 800, 0.8);
      setFoto(result.dataUrl);
      setCompressionInfo(`⚡ Foto optimizada (${result.compressedSizeKb} KB)`);
    } catch (err: any) {
      console.error('Error al actualizar foto:', err);
      setCompressionInfo(null);
      setActionError(err?.message || 'Error al procesar la fotografía.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setActionError('');
    try {
      const finalRaza = selectedBreed === 'Otro'
        ? (customBreed.trim() || 'Criollo / Mestizo')
        : selectedBreed;

      let subColores: string[] = [];
      if (color === 'Bicolor' || color === 'Atigrado') {
        subColores = [subColor1, subColor2];
      } else if (color === 'Tricolor') {
        subColores = [subColor1, subColor2, subColor3];
      }

      const updated = await onUpdatePet(pet.id, {
        nombre: nombre.trim(),
        especie,
        raza: finalRaza,
        color,
        subColores,
        tamano,
        departamento: currentDeptObj.name,
        ciudad,
        ubicacion: ubicacion.trim(),
        fechaEvento,
        contacto: contacto.trim(),
        telefono: telefono.trim(),
        telefonoSecundario: telefonoSecundario.trim() || '',
        correo: correo.trim().toLowerCase(),
        detalles: detalles.trim(),
        foto
      });

      if (updated) {
        setSaveSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setActionError('No se pudo guardar la información. Inténtalo de nuevo.');
      }
    } catch (err) {
      setActionError('Error de red al actualizar en Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResolveDirectly = async () => {
    if (!window.confirm(`¿Confirmas que la mascota "${pet.nombre}" ya fue encontrada / rescatada exitosamente?`)) return;
    setIsSaving(true);
    setActionError('');
    try {
      const ok = await onMarkAsResolved(pet.id);
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch {
      setActionError('Error al cerrar el caso.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="edit-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="edit-modal-box"
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4 border border-stone-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2 text-slate-900">
            <Edit3 className="w-5 h-5 text-blue-900" />
            <div>
              <h3 className="text-base sm:text-lg font-bold">Editar o Actualizar Reporte</h3>
              <p className="text-[11px] text-stone-500 font-mono">ID: {pet.id} • {pet.nombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: VALIDATION REQUIRED */}
        {!isAuthorized ? (
          <form onSubmit={handleVerifyAuth} className="space-y-4 text-xs">
            <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl text-amber-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-sm text-amber-900">
                <Lock className="w-4 h-4 text-amber-700" />
                <span>Verificación de Identidad del Creador</span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Para proteger la información y permitirte actualizar datos o marcar la mascota como <strong>REENCONTRADA</strong>, ingresa el <strong>Teléfono / WhatsApp</strong> o el <strong>Correo</strong> con el que se publicó este reporte.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Teléfono / WhatsApp Registrado:
                </label>
                <input
                  type="tel"
                  value={telefonoAuth}
                  onChange={(e) => setTelefonoAuth(e.target.value)}
                  placeholder="Número de celular registrado (ej: 300 123 4567)"
                  className="w-full border border-stone-300 rounded-xl p-2.5 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-blue-900 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  O Correo Electrónico Registrado:
                </label>
                <input
                  type="email"
                  value={correoAuth}
                  onChange={(e) => setCorreoAuth(e.target.value)}
                  placeholder="Correo registrado (ej: usuario@gmail.com)"
                  className="w-full border border-stone-300 rounded-xl p-2.5 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-blue-900 outline-none text-xs"
                />
              </div>
            </div>

            {authError && (
              <p className="text-red-700 text-xs font-semibold bg-red-50 p-2.5 rounded-lg border border-red-200">
                ⚠️ {authError}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Lock className="w-3.5 h-3.5" /> Verificar y Acceder a Edición
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2.5 px-4 rounded-xl text-xs transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: EDIT FORM & RESOLVE OPTION */
          <form onSubmit={handleSaveChanges} className="space-y-4 text-xs">
            {saveSuccess ? (
              <div className="bg-emerald-100 border border-emerald-300 text-emerald-950 p-4 rounded-xl text-center space-y-1">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                <p className="font-bold text-sm">¡Cambios guardados con éxito!</p>
                <p className="text-[11px] text-emerald-800">Actualizando información en tiempo real...</p>
              </div>
            ) : (
              <>
                {/* Resolve Quick Action */}
                <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl flex items-center justify-between gap-2">
                  <div className="text-emerald-950 space-y-0.5">
                    <p className="font-bold text-xs">¿Tu mascota ya regresó con su familia?</p>
                    <p className="text-[10px] text-emerald-800">Márcala para cerrar la alerta en la red solidaria.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResolveDirectly}
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shrink-0 shadow-sm"
                  >
                    <Heart className="w-3.5 h-3.5" /> ¡Marcar Reencontrado!
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nombre de la Mascota:</label>
                    <input
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 focus:bg-white text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Especie:</label>
                    <select
                      value={especie}
                      onChange={(e) => {
                        const newSp = e.target.value as PetSpecies;
                        setEspecie(newSp);
                        setSelectedBreed(newSp === 'Perro' ? 'Criollo / Mestizo' : newSp === 'Gato' ? 'Criollo / Mestizo / Común Europeo' : 'Criollo / Mestizo');
                        setCustomBreed('');
                      }}
                      className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs"
                    >
                      {ALL_SPECIES.map((s) => (
                        <option key={s} value={s}>{s} {s === 'Perro' ? '🐶' : s === 'Gato' ? '🐱' : '🐾'}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Raza:</label>
                    <select
                      value={selectedBreed}
                      onChange={(e) => setSelectedBreed(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs"
                    >
                      {breedList.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="Otro">Otro (Escribir manualmente)</option>
                    </select>
                    {selectedBreed === 'Otro' && (
                      <input
                        type="text"
                        value={customBreed}
                        onChange={(e) => setCustomBreed(e.target.value)}
                        placeholder="Escribe la raza..."
                        className="w-full border border-blue-300 bg-blue-50/50 rounded-xl p-1.5 text-xs mt-1"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-900" /> Fecha del Evento:
                    </label>
                    <input
                      type="date"
                      value={fechaEvento}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setFechaEvento(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Color:</label>
                    <select
                      id="edit-pet-color"
                      value={color}
                      onChange={(e) => setColor(e.target.value as PetColor)}
                      className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs font-semibold text-slate-800"
                    >
                      {ALL_COLORS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tamaño:</label>
                    <select
                      value={tamano}
                      onChange={(e) => setTamano(e.target.value as PetSize)}
                      className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs"
                    >
                      {ALL_SIZES.map((sz) => (
                        <option key={sz} value={sz}>{sz}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sub-selectores dinámicos en Modal de Edición */}
                {(color === 'Bicolor' || color === 'Atigrado') && (
                  <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                      <Palette className="w-3.5 h-3.5 text-amber-700" />
                      <span>Colores que componen el pelaje {color.toLowerCase()} (2 colores):</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Color 1:</label>
                        <select
                          value={subColor1}
                          onChange={(e) => setSubColor1(e.target.value as SubColor)}
                          className="w-full border border-amber-300 rounded-lg p-1.5 bg-white text-xs"
                        >
                          {SUB_COLORS.map((sc) => (
                            <option key={sc} value={sc}>{sc}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Color 2:</label>
                        <select
                          value={subColor2}
                          onChange={(e) => setSubColor2(e.target.value as SubColor)}
                          className="w-full border border-amber-300 rounded-lg p-1.5 bg-white text-xs"
                        >
                          {SUB_COLORS.map((sc) => (
                            <option key={sc} value={sc}>{sc}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {color === 'Tricolor' && (
                  <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                      <Palette className="w-3.5 h-3.5 text-amber-700" />
                      <span>Colores que componen el pelaje tricolor (3 colores):</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Color 1:</label>
                        <select
                          value={subColor1}
                          onChange={(e) => setSubColor1(e.target.value as SubColor)}
                          className="w-full border border-amber-300 rounded-lg p-1.5 bg-white text-xs"
                        >
                          {SUB_COLORS.map((sc) => (
                            <option key={sc} value={sc}>{sc}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Color 2:</label>
                        <select
                          value={subColor2}
                          onChange={(e) => setSubColor2(e.target.value as SubColor)}
                          className="w-full border border-amber-300 rounded-lg p-1.5 bg-white text-xs"
                        >
                          {SUB_COLORS.map((sc) => (
                            <option key={sc} value={sc}>{sc}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Color 3:</label>
                        <select
                          value={subColor3}
                          onChange={(e) => setSubColor3(e.target.value as SubColor)}
                          className="w-full border border-amber-300 rounded-lg p-1.5 bg-white text-xs"
                        >
                          {SUB_COLORS.map((sc) => (
                            <option key={sc} value={sc}>{sc}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Departamento:</label>
                    <select
                      value={selectedDept}
                      onChange={(e) => handleDeptChange(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs"
                    >
                      {COLOMBIAN_DEPARTMENTS.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Municipio / Ciudad:</label>
                    <select
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 font-bold text-blue-950 text-xs"
                    >
                      {currentDeptObj.municipalities.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Barrio o Sector Exacto:</label>
                    <input
                      type="text"
                      required
                      value={ubicacion}
                      onChange={(e) => setUbicacion(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nombre de Contacto:</label>
                    <input
                      type="text"
                      required
                      value={contacto}
                      onChange={(e) => setContacto(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-blue-950 mb-1">Teléfono / WhatsApp PRINCIPAL *:</label>
                    <input
                      type="tel"
                      required
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Principal (ej. 300 123 4567)"
                      className="w-full border border-blue-300 rounded-xl p-2 bg-blue-50/40 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Teléfono / WhatsApp Secundario:</label>
                    <input
                      type="tel"
                      value={telefonoSecundario}
                      onChange={(e) => setTelefonoSecundario(e.target.value)}
                      placeholder="Opcional"
                      className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Correo Electrónico:</label>
                    <input
                      type="email"
                      required
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Detalles y señas particulares:</label>
                    <textarea
                      rows={2}
                      value={detalles}
                      onChange={(e) => setDetalles(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs"
                    />
                  </div>

                  {/* Change photo */}
                  <div className="sm:col-span-2 space-y-2">
                    <label className="block font-bold text-slate-700">Cambiar Fotografía:</label>
                    <div className="flex items-center gap-3">
                      {Boolean(foto && foto.trim()) && (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-950 border border-stone-200 shadow-sm shrink-0">
                          <img src={foto} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover blur-sm opacity-40 scale-110" />
                          <img src={foto} alt="Mascota" className="relative z-10 w-full h-full object-contain" />
                        </div>
                      )}
                      <label className={`cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-stone-300 ${isProcessingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Camera className="w-4 h-4 text-blue-900" /> {isProcessingPhoto ? 'Procesando...' : 'Subir nueva foto'}
                        <input type="file" accept="image/*" disabled={isProcessingPhoto} onChange={handlePhotoUpload} className="hidden" />
                      </label>
                    </div>
                    {compressionInfo && (
                      <p className="text-[10px] text-emerald-700 font-medium">{compressionInfo}</p>
                    )}
                  </div>
                </div>

                {actionError && (
                  <p className="text-red-700 text-xs font-semibold bg-red-50 p-2.5 rounded-lg border border-red-200">
                    ⚠️ {actionError}
                  </p>
                )}

                <div className="flex gap-2 pt-3 border-t border-stone-200">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando cambios...' : '💾 Guardar Modificaciones'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2.5 px-4 rounded-xl text-xs transition"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
