import React, { useState, useMemo, useEffect } from 'react';
import { PetRecord } from '../types';
import {
  COLOMBIAN_DEPARTMENTS,
  formatPetColorDisplay,
  filterMatchesColorStrict,
  ALL_SPECIES,
  ALL_COLORS,
  SUB_COLORS,
  isCompoundColor
} from '../data/colombiaData';
import {
  Heart,
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  MapPin,
  Filter,
  RotateCcw,
  Share2,
  Phone,
  ShieldCheck,
  TrendingUp,
  Award,
  Eye,
  Smile,
  PartyPopper,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SuccessStoriesProps {
  pets: PetRecord[];
  onOpenLightbox?: (pet: PetRecord) => void;
  onNavigateToGallery?: () => void;
}

const ITEMS_PER_PAGE = 12;

export const SuccessStories: React.FC<SuccessStoriesProps> = ({
  pets,
  onOpenLightbox,
  onNavigateToGallery
}) => {
  // Global totals
  const totalPets = pets.length;
  const totalLost = pets.filter((p) => p.tipo === 'PERDIDO').length;
  const totalFound = pets.filter((p) => p.tipo === 'ENCONTRADO').length;

  const totalResolved = pets.filter((p) => p.estado === 'RESUELTO').length;
  const lostResolved = pets.filter((p) => p.tipo === 'PERDIDO' && p.estado === 'RESUELTO').length;
  const foundResolved = pets.filter((p) => p.tipo === 'ENCONTRADO' && p.estado === 'RESUELTO').length;

  const overallSuccessRate = totalPets > 0 ? Math.round((totalResolved / totalPets) * 100) : 0;
  const lostSuccessRate = totalLost > 0 ? Math.round((lostResolved / totalLost) * 100) : 0;
  const foundSuccessRate = totalFound > 0 ? Math.round((foundResolved / totalFound) * 100) : 0;

  // Filter state for the success gallery
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedSpecies, setSelectedSpecies] = useState('all');
  const [selectedType, setSelectedType] = useState<'all' | 'PERDIDO' | 'ENCONTRADO'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'month' | 'quarter' | 'year'>('all');

  // Color multi-selection filter
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [compoundPattern, setCompoundPattern] = useState<'all' | 'Bicolor' | 'Atigrado' | 'Tricolor'>('all');
  const [filterSubColor1, setFilterSubColor1] = useState<string>('all');
  const [filterSubColor2, setFilterSubColor2] = useState<string>('all');
  const [filterSubColor3, setFilterSubColor3] = useState<string>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);

  const currentDeptObj = useMemo(() => {
    return COLOMBIAN_DEPARTMENTS.find((d) => d.id === selectedDept);
  }, [selectedDept]);

  const handleDeptChange = (deptId: string) => {
    setSelectedDept(deptId);
    setSelectedCity('all');
    setCurrentPage(1);
  };

  const handleToggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedDept('all');
    setSelectedCity('all');
    setSelectedSpecies('all');
    setSelectedType('all');
    setSearchTerm('');
    setDateFilter('all');
    setSelectedColors([]);
    setCompoundPattern('all');
    setFilterSubColor1('all');
    setFilterSubColor2('all');
    setFilterSubColor3('all');
    setCurrentPage(1);
  };

  // Filtered resolved pets for the showcase
  const resolvedPets = useMemo(() => {
    const subList = [filterSubColor1, filterSubColor2, filterSubColor3].filter((s) => s && s !== 'all');

    return pets.filter((p) => {
      // Must be resolved
      if (p.estado !== 'RESUELTO') return false;

      // Type filter
      if (selectedType !== 'all' && p.tipo !== selectedType) return false;

      // Department & City
      if (selectedDept !== 'all' && p.departamento !== currentDeptObj?.name) return false;
      if (selectedCity !== 'all' && p.ciudad !== selectedCity) return false;

      // Species
      if (selectedSpecies !== 'all' && p.especie !== selectedSpecies) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const mName = (p.nombre || '').toLowerCase().includes(term);
        const mId = (p.id || '').toLowerCase().includes(term);
        const mCity = (p.ciudad || '').toLowerCase().includes(term);
        const mBreed = (p.raza || '').toLowerCase().includes(term);
        if (!mName && !mId && !mCity && !mBreed) return false;
      }

      // Color strict AND matching
      if (
        selectedColors.length > 0 ||
        compoundPattern !== 'all' ||
        subList.length > 0
      ) {
        const matches = filterMatchesColorStrict(
          { color: p.color, subColores: p.subColores },
          selectedColors,
          subList,
          compoundPattern
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [
    pets,
    selectedType,
    selectedDept,
    currentDeptObj,
    selectedCity,
    selectedSpecies,
    searchTerm,
    selectedColors,
    compoundPattern,
    filterSubColor1,
    filterSubColor2,
    filterSubColor3
  ]);

  // Reset page when resolved results change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedType,
    selectedDept,
    selectedCity,
    selectedSpecies,
    searchTerm,
    selectedColors,
    compoundPattern,
    filterSubColor1,
    filterSubColor2,
    filterSubColor3
  ]);

  // Total pages and paginated items
  const totalPages = Math.ceil(resolvedPets.length / ITEMS_PER_PAGE) || 1;
  const paginatedPets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return resolvedPets.slice(start, start + ITEMS_PER_PAGE);
  }, [resolvedPets, currentPage]);

  const hasActiveFilters =
    selectedDept !== 'all' ||
    selectedCity !== 'all' ||
    selectedSpecies !== 'all' ||
    selectedType !== 'all' ||
    searchTerm.trim() !== '' ||
    dateFilter !== 'all' ||
    selectedColors.length > 0 ||
    compoundPattern !== 'all' ||
    filterSubColor1 !== 'all' ||
    filterSubColor2 !== 'all' ||
    filterSubColor3 !== 'all';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Banner Celebrating Returns */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-slate-900 to-emerald-950 text-white p-6 sm:p-10 shadow-lg border border-blue-900/50">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-sm">
            <PartyPopper className="w-4 h-4" />
            <span>Historias de Esperanza y Solidaridad</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Reencuentros Exitosos en Colombia 🎉
          </h1>

          <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
            Cada registro resuelto representa una familia que recuperó a su compañero de cuatro patas o un animal rescatado que encontró un hogar seguro. Celebramos el impacto comunitario de la plataforma ciudadana.
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute right-4 bottom-2 opacity-10 sm:opacity-20 pointer-events-none text-8xl">
          🐾
        </div>
      </div>

      {/* Metrics Section: 3 Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Global vs Resueltos */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Total Casos vs Resueltos
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{totalResolved}</span>
              <span className="text-xs font-semibold text-stone-400">/ {totalPets} registrados</span>
            </div>
            <p className="text-xs font-bold text-blue-900 mt-1">
              {overallSuccessRate}% de efectividad general
            </p>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-900 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, overallSuccessRate)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Perdidos vs Resueltos */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-800 uppercase tracking-wider">
              Perdidos que Volvieron a Casa
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-800 flex items-center justify-center font-bold">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-red-950">{lostResolved}</span>
              <span className="text-xs font-semibold text-stone-400">/ {totalLost} reportados</span>
            </div>
            <p className="text-xs font-bold text-red-700 mt-1">
              {lostSuccessRate}% casos de extravío resueltos
            </p>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-red-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, lostSuccessRate)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Encontrados vs Resueltos */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Rescatados Entregados / Acogidos
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-950">{foundResolved}</span>
              <span className="text-xs font-semibold text-stone-400">/ {totalFound} reportados</span>
            </div>
            <p className="text-xs font-bold text-emerald-700 mt-1">
              {foundSuccessRate}% de rescatados reubicados
            </p>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, foundSuccessRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-900" />
            <h2 className="text-sm font-bold text-slate-900">
              Explorar Reencuentros ({resolvedPets.length})
            </h2>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-stone-600 hover:text-stone-900 font-bold flex items-center gap-1 transition self-start sm:self-auto bg-stone-100 px-3 py-1.5 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar Filtros</span>
            </button>
          )}
        </div>

        {/* Search Bar & General Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Keyword search */}
          <div className="relative">
            <label className="block font-bold text-slate-700 mb-1">Buscar por nombre o ID:</label>
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Nombre, ID, raza..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Origen del Caso:</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs"
            >
              <option value="all">Todos los Casos Resueltos</option>
              <option value="PERDIDO">Mascotas que estaban Perdidas</option>
              <option value="ENCONTRADO">Animales que fueron Rescatados</option>
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Departamento:</label>
            <select
              value={selectedDept}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs"
            >
              <option value="all">Todos los Departamentos</option>
              {COLOMBIAN_DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Municipality */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Municipio / Ciudad:</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              disabled={selectedDept === 'all'}
              className="w-full border border-stone-300 rounded-xl p-2 bg-stone-50 text-xs disabled:opacity-50"
            >
              <option value="all">
                {selectedDept === 'all' ? 'Todos (Elige Depto)' : 'Todos los Municipios'}
              </option>
              {currentDeptObj?.municipalities.map((m) => (
                <option key={m} value={m}>
                  {m}
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

          {/* Compound pattern dropdown */}
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

            {/* Dynamic sub-colors selectors */}
            {(compoundPattern === 'Bicolor' || compoundPattern === 'Atigrado') && (
              <>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sub-color 1:</label>
                  <select
                    value={filterSubColor1}
                    onChange={(e) => setFilterSubColor1(e.target.value)}
                    className="w-full border border-amber-300 bg-amber-50/50 rounded-xl p-2 text-xs"
                  >
                    <option value="all">Cualquiera</option>
                    {SUB_COLORS.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sub-color 2:</label>
                  <select
                    value={filterSubColor2}
                    onChange={(e) => setFilterSubColor2(e.target.value)}
                    className="w-full border border-amber-300 bg-amber-50/50 rounded-xl p-2 text-xs"
                  >
                    <option value="all">Cualquiera</option>
                    {SUB_COLORS.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {compoundPattern === 'Tricolor' && (
              <>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Color 1:</label>
                  <select
                    value={filterSubColor1}
                    onChange={(e) => setFilterSubColor1(e.target.value)}
                    className="w-full border border-amber-300 bg-amber-50/50 rounded-xl p-2 text-xs"
                  >
                    <option value="all">Cualquiera</option>
                    {SUB_COLORS.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Color 2:</label>
                  <select
                    value={filterSubColor2}
                    onChange={(e) => setFilterSubColor2(e.target.value)}
                    className="w-full border border-amber-300 bg-amber-50/50 rounded-xl p-2 text-xs"
                  >
                    <option value="all">Cualquiera</option>
                    {SUB_COLORS.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Color 3:</label>
                  <select
                    value={filterSubColor3}
                    onChange={(e) => setFilterSubColor3(e.target.value)}
                    className="w-full border border-amber-300 bg-amber-50/50 rounded-xl p-2 text-xs"
                  >
                    <option value="all">Cualquiera</option>
                    {SUB_COLORS.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Showcase Grid of Resolved Pets */}
      {resolvedPets.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400 text-2xl">
            🐾
          </div>
          <h3 className="font-bold text-slate-900 text-base">
            No se encontraron reencuentros con estos filtros
          </h3>
          <p className="text-stone-500 text-xs">
            Intenta cambiar o limpiar los filtros seleccionados para ver más casos resueltos en otras ciudades o colores.
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="bg-blue-900 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-blue-800 transition"
            >
              Ver todos los reencuentros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedPets.map((p) => {
              const isLost = p.tipo === 'PERDIDO';
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col group relative"
                >
                  {/* Badge top */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span className="bg-blue-900 text-yellow-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-blue-800">
                      <CheckCircle2 className="w-3 h-3 text-yellow-300" />
                      <span>¡Reencontrado!</span>
                    </span>
                  </div>

                  {/* Pet Image Container */}
                  <div
                    className="w-full aspect-[4/3] bg-slate-900 overflow-hidden cursor-pointer relative"
                    onClick={() => onOpenLightbox && onOpenLightbox(p)}
                    title="Ver foto y ficha completa"
                  >
                    {p.foto ? (
                      <img
                        src={p.foto}
                        alt={p.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-stone-600">
                        🐾
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-3">
                      <span className="text-white text-xs font-bold flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Ver ficha completa
                      </span>
                    </div>
                  </div>

                  {/* Pet Details */}
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between text-xs">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-stone-400">{p.id}</span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            isLost ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isLost ? 'Estaba Perdido' : 'Fue Rescatado'}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm truncate">{p.nombre}</h3>

                      <p className="text-stone-600 text-[11px]">
                        <span>{p.especie}</span> • <span>{formatPetColorDisplay(p.color, p.subColores)}</span>
                      </p>

                      <div className="flex items-center gap-1 text-stone-500 text-[11px] pt-0.5">
                        <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                        <span className="truncate">
                          {p.ciudad}, {p.departamento}
                        </span>
                      </div>

                      {p.fecha && (
                        <div className="flex items-center gap-1 text-stone-400 text-[10px]">
                          <Calendar className="w-3 h-3 text-stone-400 shrink-0" />
                          <span>Fecha reporte: {p.fecha}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer button */}
                    <div className="pt-2 border-t border-stone-100">
                      <button
                        onClick={() => onOpenLightbox && onOpenLightbox(p)}
                        className="w-full bg-stone-100 hover:bg-blue-900 hover:text-white text-slate-800 font-bold py-1.5 px-3 rounded-xl transition text-[11px] flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Historia / Detalles</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-stone-500 font-medium">
                Mostrando{' '}
                <span className="font-bold text-slate-900">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                </span>{' '}
                -{' '}
                <span className="font-bold text-slate-900">
                  {Math.min(currentPage * ITEMS_PER_PAGE, resolvedPets.length)}
                </span>{' '}
                de <span className="font-bold text-slate-900">{resolvedPets.length}</span> reencuentros
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setCurrentPage((prev) => Math.max(1, prev - 1));
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-slate-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    // Show first, last, current, and adjacent pages
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - currentPage) <= 1
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            setCurrentPage(pageNum);
                            window.scrollTo({ top: 400, behavior: 'smooth' });
                          }}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                            currentPage === pageNum
                              ? 'bg-blue-900 text-white shadow-sm'
                              : 'text-stone-600 hover:bg-stone-100 border border-stone-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      pageNum === currentPage - 2 ||
                      pageNum === currentPage + 2
                    ) {
                      return (
                        <span key={pageNum} className="text-stone-400 text-xs px-0.5">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => {
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-slate-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
                  title="Página siguiente"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
