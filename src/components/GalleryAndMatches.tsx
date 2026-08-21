import React, { useState, useMemo, useEffect } from 'react';
import { PetRecord, GalleryViewMode, MatchPair } from '../types';
import {
  COLOMBIAN_DEPARTMENTS,
  ALL_COLORS,
  SUB_COLORS,
  isCompoundColor,
  ALL_SIZES,
  ALL_SPECIES,
  formatPetColorDisplay,
  checkPetColorMatch,
  filterMatchesColor,
  filterMatchesColorStrict,
  evaluatePetMatch,
  hasValidPetPhoto
} from '../data/colombiaData';
import { MarcarDuplicadoButton } from './MarcarDuplicadoButton';
import {
  Search,
  Sparkles,
  Phone,
  Share2,
  MapPin,
  Calendar,
  Filter,
  Eye,
  Heart,
  ZoomIn,
  RotateCcw,
  UserCheck,
  Mail,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  Edit3,
  EyeOff,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Brain,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bot,
  Layers,
  AlertTriangle,
  PawPrint
} from 'lucide-react';

interface GalleryAndMatchesProps {
  pets: PetRecord[];
  selectedDept: string;
  onChangeDept: (dept: string) => void;
  selectedCity: string;
  onChangeCity: (city: string) => void;
  selectedSpecies: string;
  onChangeSpecies: (species: string) => void;
  selectedColor: string;
  onChangeColor: (color: string) => void;
  selectedSize: string;
  onChangeSize: (size: string) => void;
  onResetFilters: () => void;
  viewMode: GalleryViewMode;
  onChangeViewMode: (mode: GalleryViewMode) => void;
  onOpenLightbox: (pet: PetRecord) => void;
  onOpenResolveModal: (pet: PetRecord) => void;
  onOpenEditModal: (pet: PetRecord) => void;
  onReportLostClick: () => void;
  onToggleDescarte?: (lostPetId: string, foundPetId: string) => Promise<void>;
  onToggleDuplicado?: (petId: string, marcar: boolean) => Promise<void>;
  traitSearchPet?: PetRecord | null;
  onClearTraitPet?: () => void;
}

export const GalleryAndMatches: React.FC<GalleryAndMatchesProps> = ({
  pets,
  selectedDept,
  onChangeDept,
  selectedCity,
  onChangeCity,
  selectedSpecies,
  onChangeSpecies,
  selectedColor,
  onChangeColor,
  selectedSize,
  onChangeSize,
  onResetFilters,
  viewMode,
  onChangeViewMode,
  onOpenLightbox,
  onOpenResolveModal,
  onOpenEditModal,
  onReportLostClick,
  onToggleDescarte,
  onToggleDuplicado,
  traitSearchPet,
  onClearTraitPet
}) => {
  // Free text search keyword
  const [searchTerm, setSearchTerm] = useState('');

  // Color multi-selection and compound pattern filter
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [compoundPattern, setCompoundPattern] = useState<'all' | 'Bicolor' | 'Atigrado' | 'Tricolor'>('all');
  const [filterSubColor1, setFilterSubColor1] = useState<string>('all');
  const [filterSubColor2, setFilterSubColor2] = useState<string>('all');
  const [filterSubColor3, setFilterSubColor3] = useState<string>('all');

  // Mode Cruce Sub-Filters
  const [crossOwnerPhone, setCrossOwnerPhone] = useState('');
  const [crossOwnerPetName, setCrossOwnerPetName] = useState('');
  const [crossRescuerEmail, setCrossRescuerEmail] = useState('');
  const [selectedRescuedPetId, setSelectedRescuedPetId] = useState<string | null>(null);
  const [showDescartados, setShowDescartados] = useState(false);

  // Pagination states
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [crossCurrentPage, setCrossCurrentPage] = useState<number>(1);
  const crossPageSize = 4;

  const currentDeptObj =
    COLOMBIAN_DEPARTMENTS.find((d) => d.id === selectedDept) || COLOMBIAN_DEPARTMENTS[0];

  // Active (non-resolved) pets
  const activePets = useMemo(() => pets.filter((p) => p.estado !== 'RESUELTO'), [pets]);

  // Is any filter active?
  const hasActiveFilters =
    selectedDept !== 'all' ||
    selectedCity !== 'all' ||
    selectedSpecies !== 'all' ||
    selectedColor !== 'all' ||
    selectedSize !== 'all' ||
    searchTerm.trim() !== '' ||
    selectedColors.length > 0 ||
    compoundPattern !== 'all' ||
    filterSubColor1 !== 'all' ||
    filterSubColor2 !== 'all' ||
    filterSubColor3 !== 'all';

  const handleDeptChange = (deptId: string) => {
    onChangeDept(deptId);
    onChangeCity('all');
  };

  const handleToggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const handleResetAllFilters = () => {
    onResetFilters();
    setSearchTerm('');
    setSelectedColors([]);
    setCompoundPattern('all');
    setFilterSubColor1('all');
    setFilterSubColor2('all');
    setFilterSubColor3('all');
  };

  // Reset pagination when filters or viewMode change
  useEffect(() => {
    setCurrentPage(1);
    setCrossCurrentPage(1);
  }, [
    viewMode,
    selectedDept,
    selectedCity,
    selectedSpecies,
    selectedColor,
    selectedSize,
    searchTerm,
    pageSize,
    selectedColors,
    compoundPattern,
    filterSubColor1,
    filterSubColor2,
    filterSubColor3
  ]);

  // General Strict Cross-Match (Modo Cruce Estricto) pairs with percentages
  const strictMatchPairs = useMemo(() => {
    const pairs: Array<{
      lost: PetRecord;
      found: PetRecord;
      matchScore: string;
      affinityPercentage: number;
      isExactMatch: boolean;
      reasons: string[];
      matchedAt: string;
    }> = [];

    const lostList = activePets.filter((p) => {
      if (p.tipo !== 'PERDIDO') return false;
      if (!hasValidPetPhoto(p)) return false; // Excluir registros sin foto
      if (traitSearchPet) {
        if (traitSearchPet.tipo === 'PERDIDO' && p.id !== traitSearchPet.id) return false;
      }
      if (selectedDept !== 'all' && p.departamento !== currentDeptObj?.name) return false;
      if (selectedCity !== 'all' && p.ciudad !== selectedCity) return false;
      if (selectedSpecies !== 'all' && p.especie !== selectedSpecies) return false;
      if (selectedColor !== 'all' && !filterMatchesColor(p.color, p.subColores, selectedColor)) return false;
      if (selectedSize !== 'all' && p.tamano !== selectedSize) return false;
      return true;
    });

    const foundList = activePets.filter((p) => {
      if (p.tipo !== 'ENCONTRADO') return false;
      if (!hasValidPetPhoto(p)) return false; // Excluir registros sin foto
      if (traitSearchPet) {
        if (traitSearchPet.tipo === 'ENCONTRADO' && p.id !== traitSearchPet.id) return false;
      }
      if (selectedDept !== 'all' && p.departamento !== currentDeptObj?.name) return false;
      if (selectedCity !== 'all' && p.ciudad !== selectedCity) return false;
      if (selectedSpecies !== 'all' && p.especie !== selectedSpecies) return false;
      if (selectedColor !== 'all' && !filterMatchesColor(p.color, p.subColores, selectedColor)) return false;
      if (selectedSize !== 'all' && p.tamano !== selectedSize) return false;
      return true;
    });

    lostList.forEach((lost) => {
      foundList.forEach((found) => {
        const evalResult = evaluatePetMatch(lost, found);
        if (evalResult.isMatch) {
          pairs.push({
            lost,
            found,
            matchScore: evalResult.isExactMatch ? 'EXACTO' : 'ALTO',
            affinityPercentage: evalResult.affinityPercentage,
            isExactMatch: evalResult.isExactMatch,
            reasons: evalResult.reasons,
            matchedAt: new Date().toLocaleDateString('es-CO')
          });
        }
      });
    });

    return pairs.sort((a, b) => b.affinityPercentage - a.affinityPercentage);
  }, [activePets, selectedDept, currentDeptObj, selectedCity, selectedSpecies, selectedColor, selectedSize, traitSearchPet]);

  // High Affinity Pairs (Altos en datos >= 55 pts o Exactos en registro) for Default Modo Cruce View
  const defaultHighAffinityPairs = useMemo(() => {
    return strictMatchPairs.filter((p) => p.affinityPercentage >= 55 || p.isExactMatch);
  }, [strictMatchPairs]);

  const totalCrossPages = Math.max(1, Math.ceil(defaultHighAffinityPairs.length / crossPageSize));
  const safeCrossPage = Math.min(crossCurrentPage, totalCrossPages);
  const startCrossIndex = (safeCrossPage - 1) * crossPageSize;
  const endCrossIndex = Math.min(startCrossIndex + crossPageSize, defaultHighAffinityPairs.length);
  const paginatedCrossPairs = useMemo(() => {
    return defaultHighAffinityPairs.slice(startCrossIndex, endCrossIndex);
  }, [defaultHighAffinityPairs, startCrossIndex, endCrossIndex]);

  // Overall total cross matches count across all active pets (unfiltered)
  const totalModoCruceCount = useMemo(() => {
    let count = 0;
    const lostList = activePets.filter((p) => p.tipo === 'PERDIDO');
    const foundList = activePets.filter((p) => p.tipo === 'ENCONTRADO');
    lostList.forEach((lost) => {
      foundList.forEach((found) => {
        const evalResult = evaluatePetMatch(lost, found);
        if (evalResult.isMatch) {
          count++;
        }
      });
    });
    return count;
  }, [activePets]);

  // OWNER DIRECT MATCH (Celular / WhatsApp + Nombre Mascota)
  const ownerDirectMatchData = useMemo(() => {
    const rawPhone = crossOwnerPhone.trim();
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const name = crossOwnerPetName.trim().toLowerCase();
    if (!rawPhone && !name) return null;

    // Find the lost pet registered by this owner (case-insensitive name & digits-safe phone matching)
    const targetLostPet = activePets.find((p) => {
      if (p.tipo !== 'PERDIDO') return false;
      const petPhoneDigits = (p.telefono || '').replace(/\D/g, '');
      const petSecPhoneDigits = (p.telefonoSecundario || '').replace(/\D/g, '');
      const petName = (p.nombre || '').trim().toLowerCase();
      const petCedula = (p.cedula || '').trim().toLowerCase();

      // Check phone match
      let matchPhone = true;
      if (cleanPhone) {
        matchPhone =
          (petPhoneDigits && petPhoneDigits.includes(cleanPhone)) ||
          (petSecPhoneDigits && petSecPhoneDigits.includes(cleanPhone)) ||
          (rawPhone.toLowerCase() === petCedula);
      } else if (rawPhone) {
        matchPhone =
          (p.telefono || '').toLowerCase().includes(rawPhone.toLowerCase()) ||
          (p.telefonoSecundario || '').toLowerCase().includes(rawPhone.toLowerCase()) ||
          (p.contacto || '').toLowerCase().includes(rawPhone.toLowerCase());
      }

      // Check pet name match (case-insensitive)
      let matchName = true;
      if (name) {
        matchName = petName.includes(name) || name.includes(petName);
      }

      return matchPhone && matchName;
    });

    if (!targetLostPet) {
      return { lostPet: null, candidates: [] };
    }

    if (!hasValidPetPhoto(targetLostPet)) {
      return { lostPet: targetLostPet, candidates: [], noPhoto: true };
    }

    // Find candidate found pets (Species, City and compatible Color via evaluatePetMatch)
    const candidates = activePets
      .filter((p) => {
        if (p.tipo !== 'ENCONTRADO') return false;
        if (!hasValidPetPhoto(p)) return false;
        if (p.especie !== targetLostPet.especie) return false;
        return true;
      })
      .map((found) => {
        const evalResult = evaluatePetMatch(targetLostPet, found);
        return {
          found,
          score: evalResult.affinityPercentage,
          isExact: evalResult.isExactMatch,
          isVetoed: false,
          reasons: evalResult.reasons
        };
      })
      .filter((c) => c.score >= 50 || c.isExact)
      .sort((a, b) => b.score - a.score);

    return { lostPet: targetLostPet, candidates };
  }, [activePets, crossOwnerPhone, crossOwnerPetName]);

  // RESCUER DIRECT MATCH (Correo)
  const rescuerDirectData = useMemo(() => {
    const email = crossRescuerEmail.trim().toLowerCase();
    if (!email) return null;

    const myRescuedPets = activePets.filter(
      (p) => p.tipo === 'ENCONTRADO' && p.correo && p.correo.trim().toLowerCase() === email
    );

    return myRescuedPets;
  }, [activePets, crossRescuerEmail]);

  // If rescuer selected a specific rescued pet to see lost matches:
  const rescuerSelectedPetMatches = useMemo(() => {
    if (!selectedRescuedPetId) return null;
    const foundPet = activePets.find((p) => p.id === selectedRescuedPetId);
    if (!foundPet) return null;

    if (!hasValidPetPhoto(foundPet)) {
      return { foundPet, lostCandidates: [], noPhoto: true };
    }

    // Find matching lost pets (MUST match Species, City and compatible Color)
    const lostCandidates = activePets
      .filter((lost) => {
        if (lost.tipo !== 'PERDIDO') return false;
        if (!hasValidPetPhoto(lost)) return false;
        if (lost.especie !== foundPet.especie) return false;
        return true;
      })
      .map((lost) => {
        const evalResult = evaluatePetMatch(lost, foundPet);
        return {
          lost,
          score: evalResult.affinityPercentage,
          isExact: evalResult.isExactMatch,
          isVetoed: false,
          reasons: evalResult.reasons
        };
      })
      .filter((c) => c.score >= 50 || c.isExact)
      .sort((a, b) => b.score - a.score);

    return { foundPet, lostCandidates };
  }, [activePets, selectedRescuedPetId]);

  // Filtered list for standard gallery view
  const filteredPets = useMemo(() => {
    const subList = [filterSubColor1, filterSubColor2, filterSubColor3].filter((s) => s && s !== 'all');

    return activePets.filter((p) => {
      if (viewMode === 'PERDIDO' && p.tipo !== 'PERDIDO') return false;
      if (viewMode === 'ENCONTRADO' && p.tipo !== 'ENCONTRADO') return false;
      if (selectedDept !== 'all' && p.departamento !== currentDeptObj?.name) return false;
      if (selectedCity !== 'all' && p.ciudad !== selectedCity) return false;
      if (selectedSpecies !== 'all' && p.especie !== selectedSpecies) return false;
      if (selectedSize !== 'all' && p.tamano !== selectedSize) return false;

      // Color strict matching (Multiple selected colors + Pattern sub-colors + Legacy dropdown)
      if (selectedColors.length > 0 || compoundPattern !== 'all' || subList.length > 0) {
        const matches = filterMatchesColorStrict(
          { color: p.color, subColores: p.subColores },
          selectedColors,
          subList,
          compoundPattern
        );
        if (!matches) return false;
      } else if (selectedColor !== 'all') {
        if (!filterMatchesColor(p.color, p.subColores, selectedColor)) return false;
      }

      // Search keyword filter (ID, name, sector, raza, contacto)
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchName = p.nombre.toLowerCase().includes(term);
        const matchId = p.id.toLowerCase().includes(term);
        const matchLocation = p.ubicacion.toLowerCase().includes(term);
        const matchBreed = p.raza.toLowerCase().includes(term);
        const matchContact = p.contacto.toLowerCase().includes(term);
        if (!matchName && !matchId && !matchLocation && !matchBreed && !matchContact) {
          return false;
        }
      }

      return true;
    });
  }, [
    activePets,
    viewMode,
    selectedDept,
    currentDeptObj,
    selectedCity,
    selectedSpecies,
    selectedColor,
    selectedSize,
    searchTerm,
    selectedColors,
    compoundPattern,
    filterSubColor1,
    filterSubColor2,
    filterSubColor3
  ]);

  // Paginated pets slice for high speed and minimal resource consumption
  const totalPages = Math.max(1, Math.ceil(filteredPets.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredPets.length);
  const paginatedPets = useMemo(() => {
    return filteredPets.slice(startIndex, endIndex);
  }, [filteredPets, startIndex, endIndex]);

  const getWaUrl = (p: PetRecord) => {
    const waMessage = encodeURIComponent(
      `🚨 *ENCONTREMOS TU MASCOTA - RED SOLIDARIA (${p.ciudad.toUpperCase()})*\n\n` +
      `🐾 *Estado:* ${p.tipo}\n` +
      `🐶 *Mascota:* ${p.nombre}\n` +
      `📍 *Sector:* ${p.ubicacion}, ${p.ciudad} (${p.departamento})\n` +
      `📞 *Contacto:* ${p.contacto} - ${p.telefono}\n\n` +
      `Ver más detalles en: https://encontremostumascota.co 🇨🇴`
    );
    return `https://api.whatsapp.com/send?text=${waMessage}`;
  };

  // Redireccionar y cruzar automáticamente en Modo Cruce usando los rasgos de la mascota seleccionada
  const handleSearchByTraits = (pet: PetRecord) => {
    const deptObj = COLOMBIAN_DEPARTMENTS.find(
      (d) =>
        d.name.toLowerCase() === pet.departamento.toLowerCase() ||
        d.id.toLowerCase() === pet.departamento.toLowerCase()
    );
    if (deptObj) {
      onChangeDept(deptObj.id);
    } else {
      onChangeDept('all');
    }

    onChangeCity(pet.ciudad);
    onChangeSpecies(pet.especie);
    onChangeColor(pet.color);
    onChangeSize(pet.tamano);
    setSearchTerm('');

    if (pet.tipo === 'PERDIDO') {
      if (pet.telefono) {
        setCrossOwnerPhone(pet.telefono);
      } else {
        setCrossOwnerPhone('');
      }
      if (pet.nombre && pet.nombre !== 'Sin Nombre') {
        setCrossOwnerPetName(pet.nombre);
      } else {
        setCrossOwnerPetName('');
      }
      setCrossRescuerEmail('');
      setSelectedRescuedPetId(null);
    } else if (pet.tipo === 'ENCONTRADO') {
      if (pet.correo) {
        setCrossRescuerEmail(pet.correo);
        setSelectedRescuedPetId(pet.id);
      } else {
        setCrossRescuerEmail('');
        setSelectedRescuedPetId(null);
      }
      setCrossOwnerPhone('');
      setCrossOwnerPetName('');
    }

    onChangeViewMode('matches');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper component to render Pagination Bar (Estilo librito)
  const renderPaginationControls = () => {
    if (filteredPets.length === 0) return null;

    return (
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-700 shadow-sm">
        {/* Info & Page Size Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-800">
            Mostrando <strong>{filteredPets.length === 0 ? 0 : startIndex + 1} - {endIndex}</strong> de <strong>{filteredPets.length}</strong> mascotas
          </span>

          <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-stone-500 font-medium">Ver por página:</span>
            {[10, 20, 30].map((size) => (
              <button
                key={size}
                id={`btn-pagesize-${size}`}
                onClick={() => setPageSize(size)}
                className={`px-2 py-0.5 rounded-lg font-bold transition ${
                  pageSize === size
                    ? 'bg-blue-900 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Book-Style Pagination Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={safeCurrentPage <= 1}
            className="p-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Primera página"
          >
            <ChevronsLeft className="w-4 h-4 text-slate-700" />
          </button>

          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={safeCurrentPage <= 1}
            className="px-2.5 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none font-bold text-slate-700 flex items-center gap-1 transition"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1 px-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // Show first, last, and window around current
                if (page === 1 || page === totalPages) return true;
                if (Math.abs(page - safeCurrentPage) <= 1) return true;
                return false;
              })
              .map((page, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && page - prev > 1;

                return (
                  <React.Fragment key={page}>
                    {showEllipsis && <span className="px-1 text-stone-400 font-bold">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[32px] h-8 rounded-lg font-bold text-xs transition ${
                        safeCurrentPage === page
                          ? 'bg-blue-900 text-white shadow-sm'
                          : 'bg-white border border-stone-300 text-slate-700 hover:bg-stone-100'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
          </div>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={safeCurrentPage >= totalPages}
            className="px-2.5 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none font-bold text-slate-700 flex items-center gap-1 transition"
            title="Página siguiente"
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={safeCurrentPage >= totalPages}
            className="p-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Última página"
          >
            <ChevronsRight className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* FILTER CONTROL PANEL */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-200 space-y-5">
        {/* Header Title */}
        <div className="border-b border-stone-200 pb-4">
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              Base de Datos Comunitaria en Tiempo Real
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {viewMode === 'matches'
              ? 'Cruce con IA de Coincidencias'
              : viewMode === 'PERDIDO'
              ? 'Mascotas Perdidas Buscadas por sus Familias'
              : viewMode === 'ENCONTRADO'
              ? 'Mascotas Encontradas y Rescatadas'
              : 'Todas las Mascotas Reportadas'}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            {viewMode === 'matches'
              ? 'Compara rasgos morfológicos, municipios y análisis visual por IA (Gemini Vision) para reencontrar familias.'
              : 'Filtra por departamento, municipio, especie, color o tamaño para explorar o reportar.'}
          </p>
        </div>

        {/* High-Visibility View Mode Switcher */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 px-1">
            <span>Selecciona la vista o método de exploración:</span>
            <span className="text-[10px] text-stone-400 font-normal">Actualización en vivo</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 p-1.5 sm:p-2 bg-stone-100/90 rounded-2xl border border-stone-200 shadow-inner">
            {/* Tab 1: Todos */}
            <button
              id="tab-view-all"
              type="button"
              onClick={() => onChangeViewMode('all')}
              className={`p-3 rounded-xl font-bold text-xs flex items-center justify-between gap-2 transition-all duration-200 cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-slate-900 text-white shadow-md ring-2 ring-blue-400/40'
                  : 'bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border border-stone-200/80 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className={`w-4 h-4 shrink-0 ${viewMode === 'all' ? 'text-yellow-400' : 'text-slate-500'}`} />
                <span className="font-extrabold text-xs sm:text-sm">Todos</span>
              </div>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  viewMode === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-stone-100 text-stone-600 border border-stone-200'
                }`}
              >
                {activePets.length}
              </span>
            </button>

            {/* Tab 2: Perdidos */}
            <button
              id="tab-view-lost"
              type="button"
              onClick={() => onChangeViewMode('PERDIDO')}
              className={`p-3 rounded-xl font-bold text-xs flex items-center justify-between gap-2 transition-all duration-200 cursor-pointer ${
                viewMode === 'PERDIDO'
                  ? 'bg-[#E11D48] text-white shadow-md ring-2 ring-rose-300'
                  : 'bg-white/90 hover:bg-white text-slate-700 hover:text-red-700 border border-stone-200/80 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 shrink-0 ${viewMode === 'PERDIDO' ? 'text-white' : 'text-red-500'}`} />
                <span className="font-extrabold text-xs sm:text-sm">Perdidos</span>
              </div>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  viewMode === 'PERDIDO'
                    ? 'bg-white/25 text-white'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {activePets.filter((p) => p.tipo === 'PERDIDO').length}
              </span>
            </button>

            {/* Tab 3: Encontrados */}
            <button
              id="tab-view-found"
              type="button"
              onClick={() => onChangeViewMode('ENCONTRADO')}
              className={`p-3 rounded-xl font-bold text-xs flex items-center justify-between gap-2 transition-all duration-200 cursor-pointer ${
                viewMode === 'ENCONTRADO'
                  ? 'bg-[#059669] text-white shadow-md ring-2 ring-emerald-300'
                  : 'bg-white/90 hover:bg-white text-slate-700 hover:text-emerald-700 border border-stone-200/80 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-4 h-4 shrink-0 ${viewMode === 'ENCONTRADO' ? 'text-white' : 'text-emerald-600'}`} />
                <span className="font-extrabold text-xs sm:text-sm">Encontrados</span>
              </div>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  viewMode === 'ENCONTRADO'
                    ? 'bg-white/25 text-white'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {activePets.filter((p) => p.tipo === 'ENCONTRADO').length}
              </span>
            </button>

            {/* Tab 4: Cruce con IA */}
            <button
              id="tab-view-matches"
              type="button"
              onClick={() => onChangeViewMode('matches')}
              className={`p-3 rounded-xl font-bold text-xs flex items-center justify-between gap-2 transition-all duration-200 cursor-pointer ${
                viewMode === 'matches'
                  ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 font-black shadow-md ring-2 ring-amber-400'
                  : 'bg-gradient-to-r from-amber-50 via-yellow-50/70 to-amber-100/60 hover:from-amber-100 hover:to-yellow-100 text-amber-950 border border-amber-300/80 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className={`w-4 h-4 shrink-0 ${viewMode === 'matches' ? 'text-blue-950' : 'text-amber-600'}`} />
                <span className="font-black text-xs sm:text-sm">Cruce con IA</span>
              </div>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  viewMode === 'matches'
                    ? 'bg-slate-950 text-yellow-300 font-extrabold'
                    : 'bg-amber-200/80 text-amber-950 border border-amber-300'
                }`}
              >
                {totalModoCruceCount}
              </span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTERS ROW */}
        {viewMode !== 'matches' && (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, ID, sector, barrio, raza o contacto..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-xs focus:ring-2 focus:ring-blue-900 focus:bg-white outline-none transition"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleResetAllFilters}
                  className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpiar Filtros</span>
                </button>
              )}
            </div>

            {/* Dropdown Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Departamento:</label>
                <select
                  id="filter-dept-select"
                  value={selectedDept}
                  onChange={(e) => handleDeptChange(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs truncate"
                >
                  <option value="all">Todos los Departamentos</option>
                  {COLOMBIAN_DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Municipio / Ciudad:</label>
                <select
                  id="filter-city-select"
                  value={selectedCity}
                  onChange={(e) => onChangeCity(e.target.value)}
                  disabled={selectedDept === 'all'}
                  className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs disabled:opacity-50 truncate"
                >
                  <option value="all">
                    {selectedDept === 'all' ? 'Todos los Municipios (Elige Depto)' : 'Todos los Municipios'}
                  </option>
                  {currentDeptObj?.municipalities.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Especie:</label>
                <select
                  id="filter-species-select"
                  value={selectedSpecies}
                  onChange={(e) => onChangeSpecies(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs"
                >
                  <option value="all">Todas las Especies</option>
                  {ALL_SPECIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tamaño:</label>
                <select
                  id="filter-size-select"
                  value={selectedSize}
                  onChange={(e) => onChangeSize(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs"
                >
                  <option value="all">Todos los Tamaños</option>
                  {ALL_SIZES.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Colors Multi-Select Filter */}
            <div className="pt-2 space-y-2 border-t border-stone-100 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-700">
                  Filtro Múltiple de Colores (coincidencia estricta de todos los colores):
                </span>
                {selectedColors.length > 0 && (
                  <span className="text-[11px] text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    {selectedColors.length} color(es) seleccionado(s)
                  </span>
                )}
              </div>

              {/* Color Chips */}
              <div className="flex flex-wrap gap-1.5">
                {ALL_COLORS.filter((c) => !['Bicolor', 'Atigrado', 'Tricolor'].includes(c)).map((c) => {
                  const isSelected = selectedColors.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleToggleColor(c)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition border ${
                        isSelected
                          ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {isSelected && '✓ '}
                      {c}
                    </button>
                  );
                })}
              </div>

              {/* Compound pattern dropdown & dynamic sub-colors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Patrón de Pelaje Especial:</label>
                  <select
                    value={compoundPattern}
                    onChange={(e) => {
                      setCompoundPattern(e.target.value as any);
                      if (e.target.value === 'all') {
                        setFilterSubColor1('all');
                        setFilterSubColor2('all');
                        setFilterSubColor3('all');
                      }
                    }}
                    className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs"
                  >
                    <option value="all">Sin patrón especial</option>
                    <option value="Bicolor">Bicolor (2 colores)</option>
                    <option value="Atigrado">Atigrado (2 colores)</option>
                    <option value="Tricolor">Tricolor (3 colores)</option>
                  </select>
                </div>

                {/* Dynamic Sub-color 1 */}
                {compoundPattern !== 'all' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Color 1 del Patrón:</label>
                    <select
                      value={filterSubColor1}
                      onChange={(e) => setFilterSubColor1(e.target.value)}
                      className="w-full border border-blue-300 bg-blue-50/40 rounded-xl p-2 text-xs"
                    >
                      <option value="all">Cualquier Color 1</option>
                      {SUB_COLORS.map((sc) => (
                        <option key={sc} value={sc}>
                          {sc}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Dynamic Sub-color 2 */}
                {compoundPattern !== 'all' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Color 2 del Patrón:</label>
                    <select
                      value={filterSubColor2}
                      onChange={(e) => setFilterSubColor2(e.target.value)}
                      className="w-full border border-blue-300 bg-blue-50/40 rounded-xl p-2 text-xs"
                    >
                      <option value="all">Cualquier Color 2</option>
                      {SUB_COLORS.map((sc) => (
                        <option key={sc} value={sc}>
                          {sc}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Dynamic Sub-color 3 */}
                {compoundPattern === 'Tricolor' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Color 3 del Patrón:</label>
                    <select
                      value={filterSubColor3}
                      onChange={(e) => setFilterSubColor3(e.target.value)}
                      className="w-full border border-blue-300 bg-blue-50/40 rounded-xl p-2 text-xs"
                    >
                      <option value="all">Cualquier Color 3</option>
                      {SUB_COLORS.map((sc) => (
                        <option key={sc} value={sc}>
                          {sc}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* VIEW: MODO CRUCE INTELIGENTE Y DIRECTO */}
      {viewMode === 'matches' && (
        <div className="space-y-6">
          {/* TOP NOTICE: BÚSQUEDA MANUAL ALTERNATIVA */}
          <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs text-amber-950 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              💡 <strong>Consejo de búsqueda:</strong> Puedes también hacer la búsqueda manual desde la sección de <strong>Todo, Perdidos o Encontrados</strong> aplicando los filtros.
            </span>
          </div>

          {/* BANNER & ORIENTATION MESSAGE */}
          <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-blue-800 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-yellow-400 text-blue-950 shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5 font-bold" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base sm:text-lg text-yellow-300">
                  Cruce Inteligente de Coincidencias y Análisis por IA
                </h3>
                <p className="text-blue-100 text-xs leading-relaxed max-w-3xl">
                  <strong>¿Eres dueño?</strong> Ingresa tu Celular / WhatsApp o el Nombre de tu mascota para filtrar los animales encontrados más compatibles con porcentajes de afinidad y análisis visual. <br />
                  <strong>¿Eres rescatista?</strong> Ingresa tu Correo para ver tus rescatados y desplegar sus coincidencias directas con mascotas buscadas.
                </p>
              </div>
            </div>

            {/* TWO DIRECT SUB-FILTERS */}
            <div className="grid md:grid-cols-2 gap-4 pt-2">
              {/* Option A: Soy Dueño */}
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-300">
                  <UserCheck className="w-4 h-4" />
                  <span>1. Si buscas a tu mascota (Dueño):</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    value={crossOwnerPhone}
                    onChange={(e) => setCrossOwnerPhone(e.target.value)}
                    placeholder="Tu Celular Principal o Secundario..."
                    className="w-full p-2 rounded-lg bg-white text-slate-900 text-xs placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <input
                    type="text"
                    value={crossOwnerPetName}
                    onChange={(e) => setCrossOwnerPetName(e.target.value)}
                    placeholder="Nombre mascota (ej: Bruno)..."
                    className="w-full p-2 rounded-lg bg-white text-slate-900 text-xs placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                {(crossOwnerPhone || crossOwnerPetName) && (
                  <button
                    onClick={() => {
                      setCrossOwnerPhone('');
                      setCrossOwnerPetName('');
                    }}
                    className="text-[11px] text-yellow-200 hover:text-white underline block"
                  >
                    Borrar búsqueda de dueño
                  </button>
                )}
              </div>

              {/* Option B: Soy Rescatista */}
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <Mail className="w-4 h-4" />
                  <span>2. Si encontraste/rescataste (Rescatista):</span>
                </div>
                <input
                  type="email"
                  value={crossRescuerEmail}
                  onChange={(e) => {
                    setCrossRescuerEmail(e.target.value);
                    setSelectedRescuedPetId(null);
                  }}
                  placeholder="Tu correo registrado (ej: usuario@gmail.com)..."
                  className="w-full p-2 rounded-lg bg-white text-slate-900 text-xs placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-emerald-400"
                />
                {crossRescuerEmail && (
                  <button
                    onClick={() => {
                      setCrossRescuerEmail('');
                      setSelectedRescuedPetId(null);
                    }}
                    className="text-[11px] text-emerald-200 hover:text-white underline block"
                  >
                    Borrar búsqueda de rescatista
                  </button>
                )}
              </div>
            </div>

            {/* Daily 6:00 AM reassurance note */}
            <div className="bg-blue-950/80 border border-blue-700/60 p-2.5 rounded-xl flex items-center gap-2 text-[11px] text-blue-200">
              <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
              <span>
                💡 <strong>Tranquilidad comunitaria:</strong> Si aún no hay coincidencias exactas, recuerda que recibirás un correo diario a las <strong>6:00 AM</strong> con los reportes que coincidan y hayan ingresado en las últimas 24 horas.
              </span>
            </div>
          </div>

          {/* SECTION A: OWNER DIRECT RESULT IF ACTIVE */}
          {ownerDirectMatchData && (
            <div className="bg-white rounded-2xl border-2 border-yellow-400 p-5 shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-yellow-400 text-blue-950 text-xs font-black px-2.5 py-1 rounded-md uppercase">
                    Búsqueda Personalizada de Dueño
                  </span>
                  <span className="text-xs text-stone-600">
                    Celular: <strong>{crossOwnerPhone || 'Cualquiera'}</strong> • Mascota: <strong>{crossOwnerPetName || 'Cualquiera'}</strong>
                  </span>
                </div>
                <button
                  onClick={() => {
                    setCrossOwnerPhone('');
                    setCrossOwnerPetName('');
                  }}
                  className="text-xs text-stone-500 hover:text-slate-900 flex items-center gap-1 font-bold"
                >
                  <X className="w-3.5 h-3.5" /> Limpiar búsqueda
                </button>
              </div>

              {!ownerDirectMatchData.lostPet ? (
                <div className="p-8 text-center text-xs text-stone-500 space-y-2">
                  <p className="font-bold text-slate-800 text-sm">
                    No encontramos una mascota perdida con el celular "{crossOwnerPhone}" o nombre "{crossOwnerPetName}".
                  </p>
                  <p>Verifica que el número de WhatsApp o el nombre coincidan con los que ingresaste en tu reporte.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* TOP BANNER: ANALYZED PET */}
                  <div className="bg-gradient-to-r from-red-50 to-amber-50 p-4 rounded-2xl border-2 border-red-300 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-sm">
                    {ownerDirectMatchData.lostPet.foto ? (
                      <img
                        src={ownerDirectMatchData.lostPet.foto}
                        alt={ownerDirectMatchData.lostPet.nombre}
                        className="w-24 h-24 rounded-xl object-contain bg-slate-900 cursor-pointer shrink-0 shadow border border-red-200"
                        onClick={() => onOpenLightbox(ownerDirectMatchData.lostPet!)}
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-xl bg-slate-900 flex items-center justify-center text-white text-2xl shrink-0 shadow">
                        🐾
                      </div>
                    )}
                    <div className="text-xs space-y-1.5 flex-1 text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded shadow-sm">
                          Mascota en Análisis
                        </span>
                        <span className="font-mono text-stone-500 text-[11px]">ID: {ownerDirectMatchData.lostPet.id}</span>
                      </div>
                      <h4 className="font-black text-slate-900 text-base sm:text-lg">
                        {ownerDirectMatchData.lostPet.nombre}
                      </h4>
                      <p className="text-stone-700 text-xs">
                        <strong>{ownerDirectMatchData.lostPet.especie}</strong> • Raza: <strong>{ownerDirectMatchData.lostPet.raza}</strong> • {formatPetColorDisplay(ownerDirectMatchData.lostPet.color, ownerDirectMatchData.lostPet.subColores)} • Tamaño {ownerDirectMatchData.lostPet.tamano}
                      </p>
                      <p className="text-stone-600 text-[11px]">
                        📍 <strong>{ownerDirectMatchData.lostPet.ciudad} ({ownerDirectMatchData.lostPet.departamento})</strong> • Sector: {ownerDirectMatchData.lostPet.ubicacion} • Perdido el {ownerDirectMatchData.lostPet.fecha}
                      </p>
                      <p className="text-stone-600 text-[11px]">
                        Dueño(a): <strong>{ownerDirectMatchData.lostPet.contacto}</strong> • Tel: {ownerDirectMatchData.lostPet.telefono}
                      </p>
                    </div>
                  </div>

                  {/* CANDIDATES LIST (>65% AFFINITY) */}
                  {(() => {
                    const lostPet = ownerDirectMatchData.lostPet;
                    const descartadosList = lostPet.descartados || [];
                    const allCandidates = ownerDirectMatchData.candidates;
                    const activeCandidates = allCandidates.filter((c) => !descartadosList.includes(c.found.id));
                    const dismissedCandidates = allCandidates.filter((c) => descartadosList.includes(c.found.id));
                    const visibleCandidates = showDescartados ? dismissedCandidates : activeCandidates;

                    return (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2">
                          <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span>
                              {showDescartados
                                ? `Candidatos descartados (${dismissedCandidates.length})`
                                : `Mascotas candidatas encontradas (>65% afinidad) (${activeCandidates.length}):`}
                            </span>
                          </h5>

                          {descartadosList.length > 0 && (
                            <button
                              onClick={() => setShowDescartados(!showDescartados)}
                              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 border ${
                                showDescartados
                                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                                  : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                              }`}
                            >
                              {showDescartados ? (
                                <>
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Volver a activos ({activeCandidates.length})</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5 text-stone-500" />
                                  <span>Mostrar descartados ({descartadosList.length})</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {visibleCandidates.length === 0 ? (
                          <div className="bg-stone-50 p-8 rounded-2xl text-center text-xs text-stone-500 space-y-2 border border-dashed border-stone-300">
                            {showDescartados ? (
                              <p>No tienes candidatos en tu lista de descartados.</p>
                            ) : !hasValidPetPhoto(lostPet) ? (
                              <div className="space-y-1.5 text-amber-800 bg-amber-50 p-4 rounded-xl border border-amber-200">
                                <p className="font-bold text-sm">📸 Registro sin fotografía</p>
                                <p>Para calcular coincidencias y el cruce con IA, la mascota debe tener una fotografía clara. Puedes editar este reporte para adjuntarla.</p>
                              </div>
                            ) : descartadosList.length > 0 ? (
                              <>
                                <p className="font-bold text-slate-700">Has descartado todos los candidatos actuales ({descartadosList.length}).</p>
                                <button
                                  onClick={() => setShowDescartados(true)}
                                  className="text-xs text-blue-600 hover:underline font-bold"
                                >
                                  Ver candidatos descartados
                                </button>
                              </>
                            ) : (
                              <>
                                <p className="font-bold text-slate-800 text-sm">
                                  Aún no hay reportes de animales encontrados con afinidad superior al 55% para {lostPet.nombre}.
                                </p>
                                <p className="max-w-md mx-auto">
                                  Nuestro sistema analiza continuamente nuevos rescates y te enviará un reporte automático a tu correo registrado a las <strong>6:00 AM</strong> en cuanto ingrese una coincidencia con foto.
                                </p>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="grid sm:grid-cols-2 gap-4">
                            {visibleCandidates.map(({ found, score, isExact, reasons }) => {
                              const isDismissed = descartadosList.includes(found.id);
                              const combinedScore = score;
                              const effectiveExact = isExact;
                              const isVetoed = false;

                              return (
                                <div
                                  key={`cand-${found.id}`}
                                  className={`p-4 rounded-2xl border flex flex-col justify-between shadow-sm transition ${
                                    isDismissed
                                      ? 'bg-stone-100 border-stone-300 opacity-80'
                                      : effectiveExact
                                      ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400'
                                      : isVetoed || combinedScore === 0
                                      ? 'bg-rose-50/40 border-rose-200'
                                      : 'bg-white border-stone-200 hover:border-blue-300'
                                  }`}
                                >
                                  <div className="space-y-3">
                                    <div className="flex gap-3 items-start">
                                      {found.foto ? (
                                        <img
                                          src={found.foto}
                                          alt="Animal encontrado"
                                          className="w-20 h-20 rounded-xl object-contain bg-slate-900 cursor-pointer shrink-0 mt-0.5 shadow-sm border border-stone-200"
                                          onClick={() => onOpenLightbox(found)}
                                        />
                                      ) : (
                                        <div className="w-20 h-20 rounded-xl bg-slate-900 flex items-center justify-center text-white text-xl shrink-0 mt-0.5 shadow-sm">
                                          🐾
                                        </div>
                                      )}
                                      <div className="space-y-1 text-xs flex-1">
                                        <div className="flex items-center justify-between">
                                          <span
                                            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded shadow-sm ${
                                              isDismissed
                                                ? 'bg-stone-500 text-white'
                                                : effectiveExact
                                                ? 'bg-emerald-600 text-white'
                                                : isVetoed || combinedScore === 0
                                                ? 'bg-rose-700 text-white'
                                                : combinedScore >= 80
                                                ? 'bg-blue-900 text-white'
                                                : 'bg-amber-600 text-white'
                                            }`}
                                          >
                                            {isDismissed
                                              ? 'Descartado'
                                              : effectiveExact
                                              ? `${combinedScore}% Compatibilidad`
                                              : isVetoed || combinedScore === 0
                                              ? '0% Incompatible'
                                              : `${combinedScore}% Compatibilidad`}
                                          </span>
                                          <span className="text-[10px] text-stone-500 font-mono">{found.id}</span>
                                        </div>
                                        <p className="font-bold text-slate-900 text-sm">Rescatado en {found.ciudad} ({found.departamento})</p>
                                        <p className="text-[11px] text-stone-600">
                                          {found.especie} • Raza: <strong>{found.raza}</strong> • {formatPetColorDisplay(found.color, found.subColores)} • {found.tamano}
                                        </p>
                                        <p className="text-[10px] text-stone-500">Sector: {found.ubicacion} • Fecha: {found.fecha}</p>
                                      </div>
                                    </div>

                                    {/* Match reasons breakdown */}
                                    {reasons && reasons.length > 0 && (
                                      <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-[10px] text-stone-600 space-y-0.5">
                                        <span className="font-bold text-slate-800">Factores coincidentes:</span> {reasons.join(' • ')}
                                      </div>
                                    )}
                                  </div>

                                  <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/60 mt-3">
                                    <div className="flex items-center gap-2">
                                      <a
                                        href={`tel:${found.telefono}`}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                                      >
                                        <Phone className="w-3.5 h-3.5" /> Llamar
                                      </a>
                                      <a
                                        href={getWaUrl(found)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 border border-emerald-300 transition"
                                        title="Compartir por WhatsApp"
                                      >
                                        <Share2 className="w-3.5 h-3.5" />
                                      </a>
                                      <MarcarDuplicadoButton pet={found} onToggleDuplicado={onToggleDuplicado} variant="inline" />
                                    </div>

                                    {onToggleDescarte && (
                                      <button
                                        onClick={() => onToggleDescarte(lostPet.id, found.id)}
                                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition ${
                                          isDismissed
                                            ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                                            : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300'
                                        }`}
                                        title={isDismissed ? 'Reincorporar a candidatos activos' : 'Descartar candidato'}
                                      >
                                        {isDismissed ? (
                                          <>
                                            <RotateCcw className="w-3 h-3 text-blue-600" />
                                            <span>Reincorporar</span>
                                          </>
                                        ) : (
                                          <>
                                            <X className="w-3 h-3 text-rose-600" />
                                            <span>No es mi mascota</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* SECTION B: RESCUER DIRECT RESULT IF ACTIVE */}
          {rescuerDirectData && !ownerDirectMatchData && (
            <div className="bg-white rounded-2xl border-2 border-emerald-400 p-5 shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-md uppercase">
                    Tus Mascotas Rescatadas
                  </span>
                  <span className="text-xs text-stone-600 font-mono">
                    {crossRescuerEmail}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setCrossRescuerEmail('');
                    setSelectedRescuedPetId(null);
                  }}
                  className="text-xs text-stone-500 hover:text-slate-900 flex items-center gap-1 font-bold"
                >
                  <X className="w-3.5 h-3.5" /> Limpiar búsqueda
                </button>
              </div>

              {rescuerDirectData.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500">
                  No encontramos animales reportados como encontrados con el correo "{crossRescuerEmail}".
                </div>
              ) : (
                <div className="space-y-5">
                  <p className="text-xs text-stone-600">
                    Selecciona uno de tus animales rescatados para desplegar el análisis con <strong>familias que buscan animales con más del 65% de afinidad</strong>:
                  </p>

                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {rescuerDirectData.map((foundPet) => (
                      <div
                        key={foundPet.id}
                        onClick={() => setSelectedRescuedPetId(foundPet.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition text-xs space-y-2.5 ${
                          selectedRescuedPetId === foundPet.id
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400 shadow'
                            : 'bg-stone-50 hover:bg-stone-100 border-stone-200'
                        }`}
                      >
                        <div className="flex gap-3 items-center">
                          {foundPet.foto ? (
                            <img
                              src={foundPet.foto}
                              alt="Rescatado"
                              className="w-14 h-14 rounded-xl object-contain bg-slate-900 shrink-0 shadow-sm"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-white text-sm shrink-0 shadow-sm">
                              🐾
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900">{foundPet.nombre} (ID: {foundPet.id})</p>
                            <p className="text-stone-600 text-[11px]">
                              {foundPet.especie} • Raza: {foundPet.raza} • {formatPetColorDisplay(foundPet.color, foundPet.subColores)} • {foundPet.tamano}
                            </p>
                            <p className="text-[10px] text-stone-500">📍 {foundPet.ciudad}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Sparkles className="w-3 h-3" /> Analizar coincidencias
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Deployed matches for selected rescued pet */}
                  {rescuerSelectedPetMatches && (
                    <div className="bg-emerald-50/60 p-4 sm:p-5 rounded-2xl border border-emerald-300 space-y-4 pt-4">
                      {/* TOP BANNER FOR RESCUED PET */}
                      <div className="bg-white p-3.5 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-center gap-3">
                        {rescuerSelectedPetMatches.foundPet.foto ? (
                          <img
                            src={rescuerSelectedPetMatches.foundPet.foto}
                            alt="Rescatado"
                            className="w-16 h-16 rounded-xl object-contain bg-slate-900 shrink-0"
                            onClick={() => onOpenLightbox(rescuerSelectedPetMatches.foundPet)}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-900 flex items-center justify-center text-white text-lg shrink-0">
                            🐾
                          </div>
                        )}
                        <div className="text-xs space-y-1 flex-1 text-center sm:text-left">
                          <h5 className="font-bold text-slate-900 text-sm">
                            Analizando Mascota Rescatada: {rescuerSelectedPetMatches.foundPet.nombre} (ID: {rescuerSelectedPetMatches.foundPet.id})
                          </h5>
                          <p className="text-stone-600 text-[11px]">
                            {rescuerSelectedPetMatches.foundPet.especie} • Raza: {rescuerSelectedPetMatches.foundPet.raza} • {formatPetColorDisplay(rescuerSelectedPetMatches.foundPet.color, rescuerSelectedPetMatches.foundPet.subColores)} • {rescuerSelectedPetMatches.foundPet.tamano} • 📍 {rescuerSelectedPetMatches.foundPet.ciudad} ({rescuerSelectedPetMatches.foundPet.departamento})
                          </p>
                        </div>
                      </div>

                      <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        Familias buscando un animal coincidente (&gt;65% de afinidad) ({rescuerSelectedPetMatches.lostCandidates.length}):
                      </h5>

                      {rescuerSelectedPetMatches.lostCandidates.length === 0 ? (
                        <div className="bg-white p-6 rounded-xl text-center text-xs text-stone-500 border border-stone-200">
                          {!hasValidPetPhoto(rescuerSelectedPetMatches.foundPet) ? (
                            <div className="space-y-1 text-amber-800">
                              <p className="font-bold text-sm">📸 Registro sin fotografía</p>
                              <p>Para activar las coincidencias y el cotejo visual por IA, este animal rescatado requiere una fotografía clara. Puedes editar este reporte para adjuntarla.</p>
                            </div>
                          ) : (
                            <p>Aún no hay familias que hayan reportado una mascota perdida con afinidad coincidente en {rescuerSelectedPetMatches.foundPet.ciudad}.</p>
                          )}
                        </div>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-4">
                          {rescuerSelectedPetMatches.lostCandidates.map(({ lost, score, isExact, reasons }) => {
                            const combinedScore = score;
                            const effectiveExact = isExact;
                            const isVetoed = false;

                            return (
                              <div
                                key={`lost-cand-${lost.id}`}
                                className={`p-4 rounded-2xl border flex flex-col justify-between shadow-sm space-y-3 transition ${
                                  effectiveExact
                                    ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400'
                                    : isVetoed || combinedScore === 0
                                    ? 'bg-rose-50/40 border-rose-200'
                                    : 'bg-white border-stone-200 hover:border-blue-300'
                                }`}
                              >
                                <div className="space-y-2.5">
                                  <div className="flex gap-3 items-start">
                                    {lost.foto ? (
                                      <img
                                        src={lost.foto}
                                        alt={lost.nombre}
                                        className="w-20 h-20 rounded-xl object-contain bg-slate-900 cursor-pointer shrink-0"
                                        onClick={() => onOpenLightbox(lost)}
                                      />
                                    ) : (
                                      <div className="w-20 h-20 rounded-xl bg-slate-900 flex items-center justify-center text-white text-xl shrink-0">
                                        🐾
                                      </div>
                                    )}
                                    <div className="space-y-1 text-xs flex-1">
                                      <div className="flex items-center justify-between">
                                        <span
                                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded shadow-sm ${
                                            effectiveExact
                                              ? 'bg-emerald-600 text-white'
                                              : isVetoed || combinedScore === 0
                                              ? 'bg-rose-700 text-white'
                                              : combinedScore >= 80
                                              ? 'bg-blue-900 text-white'
                                              : 'bg-amber-600 text-white'
                                          }`}
                                        >
                                          {effectiveExact
                                            ? `${combinedScore}% Compatibilidad`
                                            : isVetoed || combinedScore === 0
                                            ? '0% Incompatible'
                                            : `${combinedScore}% Compatibilidad`}
                                        </span>
                                        <span className="text-[10px] text-stone-500 font-mono">{lost.id}</span>
                                      </div>
                                      <h6 className="font-bold text-slate-900 text-sm">Mascota: {lost.nombre}</h6>
                                      <p className="text-[11px] text-stone-600">
                                        Dueño(a): {lost.contacto}
                                      </p>
                                      <p className="text-[10px] text-stone-500">Perdido en: {lost.ubicacion} ({lost.departamento})</p>
                                    </div>
                                  </div>

                                  {reasons && reasons.length > 0 && (
                                    <div className="bg-stone-50 p-2 rounded-lg border border-stone-200 text-[10px] text-stone-600">
                                      <span className="font-bold text-slate-800">Coincidencias:</span> {reasons.join(' • ')}
                                    </div>
                                  )}
                                </div>

                              <div className="pt-2 flex gap-2 border-t border-stone-100">
                                <a
                                  href={`tel:${lost.telefono}`}
                                  className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5"
                                >
                                  <Phone className="w-3 h-3" /> Contactar a la Familia
                                </a>
                                <MarcarDuplicadoButton pet={lost} onToggleDuplicado={onToggleDuplicado} variant="inline" />
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION C: DEFAULT VIEW (WHEN NO ACTIVE SEARCH) -> PAGINATION OF DOUBLE-CARDS >85% */}
          {!ownerDirectMatchData && !rescuerDirectData && (
            <div className="space-y-5">
              {traitSearchPet && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    {traitSearchPet.foto ? (
                      <img
                        src={traitSearchPet.foto}
                        alt={traitSearchPet.nombre || 'Mascota'}
                        className="w-12 h-12 rounded-xl object-cover border border-amber-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-lg shrink-0">
                        🐾
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-blue-950">
                          Búsqueda Específica de Cruce
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {traitSearchPet.tipo === 'PERDIDO' ? 'Mascota Perdida' : 'Mascota Encontrada'}: {traitSearchPet.nombre || 'Sin nombre'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5">
                        Mostrando únicamente los cruces correspondientes a este registro ({traitSearchPet.especie}, {traitSearchPet.raza}, {traitSearchPet.tamano}, {traitSearchPet.departamento}).
                      </p>
                    </div>
                  </div>
                  {onClearTraitPet && (
                    <button
                      onClick={onClearTraitPet}
                      className="bg-white hover:bg-stone-100 text-slate-800 border border-stone-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      <span>Ver todos los cruces</span>
                    </button>
                  )}
                </div>
              )}

              {/* PAGINATION TOOLBAR FOR HIGH AFFINITY PAIRS (>85%) */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-700 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-900 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-md">
                    Cruces Destacados (&gt;85% Afinidad)
                  </span>
                  <span className="font-semibold text-slate-800 text-xs">
                    Mostrando <strong>{defaultHighAffinityPairs.length === 0 ? 0 : startCrossIndex + 1} - {endCrossIndex}</strong> de <strong>{defaultHighAffinityPairs.length}</strong> parejas
                  </span>
                </div>

                {defaultHighAffinityPairs.length > crossPageSize && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCrossCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCrossPage <= 1}
                      className="px-3 py-1.5 rounded-xl border border-stone-300 font-bold bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4" /> Anterior
                    </button>
                    <span className="px-3 py-1.5 font-bold text-slate-900 bg-white border border-stone-300 rounded-xl shadow-inner text-xs">
                      Página {safeCrossPage} de {totalCrossPages}
                    </span>
                    <button
                      onClick={() => setCrossCurrentPage((p) => Math.min(totalCrossPages, p + 1))}
                      disabled={safeCrossPage >= totalCrossPages}
                      className="px-3 py-1.5 rounded-xl border border-stone-300 font-bold bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 shadow-sm"
                    >
                      Siguiente <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {defaultHighAffinityPairs.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-stone-300 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-900 mx-auto flex items-center justify-center">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    No hay cruces directos simultáneos con afinidad superior al 85%
                  </h3>
                  <p className="text-stone-500 text-xs max-w-md mx-auto leading-relaxed">
                    El sistema compara en tiempo real animales perdidos vs encontrados que compartan departamento, especie, raza, tamaño y colores compatibles. Realiza una búsqueda directa arriba o consulta la galería general.
                  </p>
                  <div className="pt-2 flex justify-center gap-2">
                    <button
                      onClick={onResetFilters}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Limpiar filtros de ubicación</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {paginatedCrossPairs.map((pair, index) => {
                    const combinedAffinity = pair.affinityPercentage;
                    const isEffectiveExact = pair.isExactMatch;
                    const isVetoed = false;

                    return (
                      <div
                        key={`match-${pair.lost.id}-${pair.found.id}-${index}`}
                        className={`bg-white rounded-2xl border-2 shadow-md p-4 sm:p-5 space-y-4 transition ${
                          isEffectiveExact
                            ? 'border-emerald-400 ring-2 ring-emerald-300'
                            : isVetoed || combinedAffinity === 0
                            ? 'border-rose-200 bg-rose-50/20'
                            : combinedAffinity >= 80
                            ? 'border-blue-400 ring-1 ring-blue-300'
                            : 'border-stone-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md shadow-sm ${
                                combinedAffinity >= 80
                                  ? 'bg-emerald-600 text-white'
                                  : combinedAffinity >= 60
                                  ? 'bg-blue-900 text-white'
                                  : 'bg-amber-600 text-white'
                              }`}
                            >
                              {`${combinedAffinity}% Compatibilidad`}
                            </span>
                            <span className="font-bold text-xs text-slate-800">
                              📍 {pair.lost.ciudad}, {pair.lost.departamento}
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-500 font-mono">
                            {pair.lost.especie} • Raza: {pair.lost.raza} • {formatPetColorDisplay(pair.lost.color, pair.lost.subColores)} • Tamaño {pair.lost.tamano}
                          </span>
                        </div>

                      {/* Cara a Cara Grid */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Left: Perdido */}
                        <div className="bg-red-50/60 rounded-xl p-3.5 border border-red-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                              Buscado por su Familia
                            </span>
                            <span className="text-[10px] text-stone-500 font-mono">{pair.lost.id}</span>
                          </div>

                          <div className="flex gap-3 items-center">
                            <div
                              className="relative w-24 h-24 rounded-lg overflow-hidden bg-slate-900 cursor-pointer shrink-0 group flex items-center justify-center"
                              onClick={() => onOpenLightbox(pair.lost)}
                              title="Clic para ampliar foto"
                            >
                              {pair.lost.foto ? (
                                <img
                                  src={pair.lost.foto}
                                  alt={pair.lost.nombre}
                                  className="w-full h-full object-contain group-hover:scale-105 transition"
                                />
                              ) : (
                                <span className="text-2xl text-white">🐾</span>
                              )}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                                <ZoomIn className="w-5 h-5" />
                              </div>
                            </div>

                            <div className="space-y-1 text-xs">
                              <h4 className="font-bold text-slate-900 text-sm">{pair.lost.nombre}</h4>
                              <p className="text-stone-600 text-[11px]">
                                <strong>Raza:</strong> {pair.lost.raza}
                              </p>
                              <p className="text-stone-600 text-[11px]">
                                <strong>Sector:</strong> {pair.lost.ubicacion}
                              </p>
                              <p className="text-[10px] text-stone-500">Perdido el {pair.lost.fecha}</p>
                            </div>
                          </div>

                          <div className="bg-white p-2.5 rounded-lg border border-red-100 flex items-center justify-between text-xs">
                            <span className="text-stone-700">
                              Dueño(a): <strong>{pair.lost.contacto}</strong>
                            </span>
                            <a
                              href={`tel:${pair.lost.telefono}`}
                              className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1 rounded-md text-[11px] flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" /> Llamar
                            </a>
                          </div>

                          <div className="flex justify-end">
                            <MarcarDuplicadoButton pet={pair.lost} onToggleDuplicado={onToggleDuplicado} variant="inline" />
                          </div>
                        </div>

                        {/* Right: Encontrado */}
                        <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                              Rescatado / Encontrado
                            </span>
                            <span className="text-[10px] text-stone-500 font-mono">{pair.found.id}</span>
                          </div>

                          <div className="flex gap-3 items-center">
                            <div
                              className="relative w-24 h-24 rounded-lg overflow-hidden bg-slate-900 cursor-pointer shrink-0 group flex items-center justify-center"
                              onClick={() => onOpenLightbox(pair.found)}
                              title="Clic para ampliar foto"
                            >
                              {pair.found.foto ? (
                                <img
                                  src={pair.found.foto}
                                  alt="Animal Encontrado"
                                  className="w-full h-full object-contain group-hover:scale-105 transition"
                                />
                              ) : (
                                <span className="text-2xl text-white">🐾</span>
                              )}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                                <ZoomIn className="w-5 h-5" />
                              </div>
                            </div>

                            <div className="space-y-1 text-xs">
                              <h4 className="font-bold text-slate-900 text-sm">Animal Rescatado</h4>
                              <p className="text-stone-600 text-[11px]">
                                <strong>Raza aprox:</strong> {pair.found.raza}
                              </p>
                              <p className="text-stone-600 text-[11px]">
                                <strong>Ubicación:</strong> {pair.found.ubicacion}
                              </p>
                              <p className="text-[10px] text-stone-500">Hallazgo el {pair.found.fecha}</p>
                            </div>
                          </div>

                          <div className="bg-white p-2.5 rounded-lg border border-emerald-100 flex items-center justify-between text-xs">
                            <span className="text-stone-700">
                              Rescatista: <strong>{pair.found.contacto}</strong>
                            </span>
                            <a
                              href={`tel:${pair.found.telefono}`}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-md text-[11px] flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" /> Llamar
                            </a>
                          </div>

                          <div className="flex justify-end">
                            <MarcarDuplicadoButton pet={pair.found} onToggleDuplicado={onToggleDuplicado} variant="inline" />
                          </div>
                        </div>
                      </div>

                      {/* Actions bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <p className="text-stone-500 text-[11px] italic">
                          {pair.found.detalles ? `Observaciones del rescate: "${pair.found.detalles}"` : ''}
                        </p>
                        <a
                          href={getWaUrl(pair.found)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition text-[11px]"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Compartir Cruce en WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW: FULL STOCK GALLERY CARDS WITH PAGINATION */}
      {viewMode !== 'matches' && (
        <div className="space-y-4">
          {/* Top Pagination Toolbar */}
          {filteredPets.length > 0 && renderPaginationControls()}

          {filteredPets.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-stone-300 space-y-3">
              <span className="text-4xl">🐾</span>
              <h3 className="font-bold text-slate-900 text-base">Aún no hay publicaciones con estos filtros</h3>
              <p className="text-stone-500 text-xs max-w-md mx-auto">
                Los nuevos reportes ingresados por la comunidad aparecerán aquí en tiempo real.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <button
                  onClick={onResetFilters}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Limpiar Filtros
                </button>
                <button
                  onClick={onReportLostClick}
                  className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition"
                >
                  🚨 Publicar Mascota Perdida
                </button>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPets.map((p) => {
                const isPerdido = p.tipo === 'PERDIDO';
                const waUrl = getWaUrl(p);

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition"
                  >
                    <div>
                      {/* Photo Container with Zoom Feature */}
                      <div
                        className="relative h-52 bg-slate-950 cursor-pointer overflow-hidden group flex items-center justify-center"
                        onClick={() => onOpenLightbox(p)}
                        title="Haz clic para ampliar la foto"
                      >
                        {p.foto ? (
                          <>
                            {/* Soft ambient background fill */}
                            <img
                              src={p.foto}
                              alt=""
                              aria-hidden="true"
                              className="absolute inset-0 w-full h-full object-cover blur-md opacity-35 scale-110"
                            />
                            {/* Sharp centered subject */}
                            <img
                              src={p.foto}
                              alt={p.nombre}
                              className="relative z-10 w-full h-full object-contain group-hover:scale-105 transition duration-300"
                            />
                          </>
                        ) : (
                          <span className="text-4xl text-white">🐾</span>
                        )}
                        <span
                          className={`absolute z-20 top-3 left-3 text-[10px] font-black uppercase px-2.5 py-1 rounded-full text-white shadow ${
                            isPerdido ? 'bg-red-600' : 'bg-emerald-600'
                          }`}
                        >
                          {p.tipo}
                        </span>
                        <span className="absolute z-20 top-3 right-3 text-[10px] font-bold bg-slate-950/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-yellow-400" /> {p.ciudad}
                        </span>

                        <div className="absolute z-20 bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <ZoomIn className="w-3 h-3" /> Ampliar
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-base">{p.nombre}</h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenEditModal(p);
                              }}
                              className="text-stone-400 hover:text-blue-900 p-1 rounded hover:bg-stone-100 transition"
                              title="Editar este reporte o marcar como reencontrado (requiere cédula y correo)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-[11px] text-stone-500 flex items-center gap-1 font-medium" title={isPerdido ? 'Fecha de pérdida' : 'Fecha de hallazgo'}>
                            <Calendar className="w-3 h-3 text-blue-900" /> {p.fechaEvento ? `${isPerdido ? 'Perdido:' : 'Hallado:'} ${p.fechaEvento}` : p.fecha}
                          </span>
                        </div>

                        {/* Physical Tags */}
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-stone-600 font-medium bg-stone-50 p-2.5 rounded-xl border border-stone-200/60">
                          <p>
                            🐾 Especie: <strong className="text-slate-900">{p.especie}</strong>
                          </p>
                          <p>
                            🎨 Color: <strong className="text-slate-900">{formatPetColorDisplay(p.color, p.subColores)}</strong>
                          </p>
                          <p>
                            📐 Tamaño: <strong className="text-slate-900">{p.tamano}</strong>
                          </p>
                          <p>
                            🏷️ Raza: <strong className="text-slate-900">{p.raza}</strong>
                          </p>
                        </div>

                        <p className="text-xs text-stone-700">
                          <strong>Sector/Ubicación:</strong> {p.ubicacion} ({p.departamento})
                        </p>

                        {p.detalles && (
                          <p className="text-[11px] text-stone-600 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                            "{p.detalles}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-4 pt-0 space-y-2">
                      <div className="bg-blue-50 p-2.5 rounded-xl text-xs text-blue-950 font-semibold flex justify-between items-center border border-blue-100">
                        <span className="truncate pr-2">👤 {p.contacto}</span>
                        <a
                          href={`tel:${p.telefono}`}
                          className="bg-blue-900 hover:bg-blue-800 text-white text-[11px] px-3 py-1 rounded-lg font-bold flex items-center gap-1 shrink-0 transition"
                        >
                          <Phone className="w-3 h-3" /> Llamar
                        </a>
                      </div>

                      {/* Botón Buscar por rasgos -> Direcciona a Cruce con IA */}
                      <button
                        id={`btn-buscar-rasgos-${p.id}`}
                        onClick={() => handleSearchByTraits(p)}
                        className="w-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm border border-amber-300/80 active:scale-[0.99]"
                        title="Ir a la sección de Cruce con IA con los rasgos de esta mascota"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-950" />
                        <span>Buscar por rasgos en Cruce con IA</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-2 rounded-xl text-[11px] transition flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Share2 className="w-3.5 h-3.5" /> WhatsApp
                        </a>

                        <button
                          onClick={() => onOpenEditModal(p)}
                          className="bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 font-semibold py-2 px-2 rounded-xl text-[11px] transition flex items-center justify-center gap-1 border border-stone-200"
                          title="Editar reporte o marcar como reencontrado con tu cédula y correo"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-900" />
                          <span>Editar / Cerrar</span>
                        </button>
                      </div>

                      <MarcarDuplicadoButton pet={p} onToggleDuplicado={onToggleDuplicado} variant="card" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Pagination Controls */}
          {filteredPets.length > pageSize && renderPaginationControls()}
        </div>
      )}
    </div>
  );
};
