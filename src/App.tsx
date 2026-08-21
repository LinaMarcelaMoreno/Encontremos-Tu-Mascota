import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, getDocs, increment } from 'firebase/firestore';
import { db } from './lib/firebase';
import { PetRecord, ActiveTab, GalleryViewMode, PetStatus, SuggestionRecord, UserRole } from './types';
import { Navbar } from './components/Navbar';
import { LostPetForm } from './components/LostPetForm';
import { FoundPetForm } from './components/FoundPetForm';
import { GalleryAndMatches } from './components/GalleryAndMatches';
import { SuggestionsView } from './components/SuggestionsView';
import { ImageLightboxModal } from './components/ImageLightboxModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ResolvePetModal } from './components/ResolvePetModal';
import { EditPetModal } from './components/EditPetModal';
import { AdminDashboard } from './components/AdminDashboard';
import { DailyEmailDigestModal } from './components/DailyEmailDigestModal';
import { SuccessStories } from './components/SuccessStories';
import { COLOMBIAN_DEPARTMENTS, checkPetColorMatch, evaluatePetMatch } from './data/colombiaData';
import { mapPetDoc } from './lib/petMapper';

export default function App() {
  const [pets, setPets] = useState<PetRecord[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('gallery');
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('app_auth_role') as UserRole;
    return saved === 'admin' || saved === 'editor' ? saved : 'public';
  });

  // Filter state (default: all to avoid blocking view on initial load)
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [viewMode, setViewMode] = useState<GalleryViewMode>('all');

  // Modals
  const [lightboxPet, setLightboxPet] = useState<PetRecord | null>(null);
  const [resolvePet, setResolvePet] = useState<PetRecord | null>(null);
  const [editPet, setEditPet] = useState<PetRecord | null>(null);
  const [confirmationPet, setConfirmationPet] = useState<PetRecord | null>(null);
  const [matchingCount, setMatchingCount] = useState<number>(0);
  const [exactMatchCount, setExactMatchCount] = useState<number>(0);
  const [showDigestModal, setShowDigestModal] = useState<boolean>(false);
  const [traitSearchPet, setTraitSearchPet] = useState<PetRecord | null>(null);

  // Reset all filters helper
  const handleResetFilters = () => {
    setSelectedDept('all');
    setSelectedCity('all');
    setSelectedSpecies('all');
    setSelectedColor('all');
    setSelectedSize('all');
    setTraitSearchPet(null);
  };

  // Check URL parameters for secret admin trigger (e.g. ?admin=1 or #admin)
  useEffect(() => {
    const checkAdminParam = () => {
      const currentUrl = window.location.href.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (
        hash.includes('admin') ||
        search.includes('admin') ||
        currentUrl.includes('admin')
      ) {
        setActiveTab('admin');
      }
    };

    checkAdminParam();
    window.addEventListener('hashchange', checkAdminParam);
    window.addEventListener('popstate', checkAdminParam);

    // Keyboard shortcut (Ctrl + Shift + A)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setActiveTab('admin');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('hashchange', checkAdminParam);
      window.removeEventListener('popstate', checkAdminParam);
    };
  }, []);

  // Helper to invalidate server-side RAM cache in background
  const triggerServerCacheInvalidate = () => {
    fetch('/api/pets/invalidate', { method: 'POST' }).catch(() => {});
  };

  // Real-time Firestore sync with server RAM cache and optimistic local storage
  useEffect(() => {
    // 1. Instant optimistic load from localStorage cache if available
    try {
      const cached = localStorage.getItem('rescate_pets_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPets(parsed);
          setLoading(false);
        }
      }
    } catch (e) {
      console.warn('Cache read warning:', e);
    }

    // 2. Fetch directly from ultra-fast server RAM cache (0 Firestore reads)
    fetch('/api/pets')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.pets && Array.isArray(data.pets) && data.pets.length > 0) {
          setPets(data.pets);
          setLoading(false);
          try {
            localStorage.setItem('rescate_pets_cache', JSON.stringify(data.pets));
          } catch (e) {}
        }
      })
      .catch((err) => {
        console.warn('Server RAM cache fetch notice:', err);
      });

    // 3. Keep Firestore listener active with IndexedDB persistent local cache
    try {
      const petsCol = collection(db, 'pets');

      const unsubscribePets = onSnapshot(
        petsCol,
        (snapshot) => {
          const loadedPets: PetRecord[] = [];
          snapshot.forEach((docSnap) => {
            loadedPets.push(mapPetDoc(docSnap.data(), docSnap.id));
          });

          // Sort in memory by newest first
          loadedPets.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

          if (loadedPets.length > 0) {
            setPets(loadedPets);
          }
          setLoading(false);

          // Save backup to localStorage
          try {
            localStorage.setItem('rescate_pets_cache', JSON.stringify(loadedPets));
          } catch (storageErr) {
            // Ignore quota errors on local storage
          }
        },
        (error) => {
          console.warn('Firestore live listener notice (checking server cache):', error);
          // Fallback to server API if live client listener has quota backoff
          fetch('/api/pets?forceRefresh=true')
            .then((r) => r.json())
            .then((d) => {
              if (d?.pets && Array.isArray(d.pets)) {
                setPets(d.pets);
              }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
        }
      );

      return () => {
        unsubscribePets();
      };
    } catch (err) {
      console.warn('Firestore initialization fallback:', err);
      setLoading(false);
    }
  }, []);

  // Suggestions listener (ONLY active when in Admin tab to save 50%+ read quota)
  useEffect(() => {
    if (activeTab !== 'admin') return;

    try {
      const sugCol = collection(db, 'suggestions');
      const sugQ = query(sugCol, orderBy('createdAt', 'desc'));
      const unsubscribeSuggestions = onSnapshot(
        sugQ,
        (snapshot) => {
          const loadedSugs: SuggestionRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            loadedSugs.push({
              id: docSnap.id,
              nombre: data.nombre || 'Anónimo',
              telefono: data.telefono || '',
              correo: data.correo || '',
              tipo: data.tipo || 'MEJORA',
              mensaje: data.mensaje || '',
              fecha: data.fecha || new Date().toLocaleDateString('es-CO'),
              createdAt: data.createdAt || Date.now(),
              atendido: data.atendido || false
            });
          });
          setSuggestions(loadedSugs);
        },
        (err) => {
          console.warn('Suggestions listener notice:', err);
        }
      );

      return () => {
        unsubscribeSuggestions();
      };
    } catch (err) {
      console.warn('Suggestions listener error:', err);
    }
  }, [activeTab]);

  // Manual refresh function for admin
  const handleRefreshData = async () => {
    try {
      const petsCol = collection(db, 'pets');
      const snapshot = await getDocs(petsCol);
      const loaded: PetRecord[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push(mapPetDoc(docSnap.data(), docSnap.id));
      });
      setPets(loaded);

      const sugCol = collection(db, 'suggestions');
      const sugSnap = await getDocs(sugCol);
      const loadedSugs: SuggestionRecord[] = [];
      sugSnap.forEach((docSnap) => {
        const data = docSnap.data();
        loadedSugs.push({
          id: docSnap.id,
          nombre: data.nombre,
          telefono: data.telefono,
          correo: data.correo,
          tipo: data.tipo,
          mensaje: data.mensaje,
          fecha: data.fecha,
          createdAt: data.createdAt,
          atendido: data.atendido
        });
      });
      setSuggestions(loadedSugs);
    } catch (e) {
      console.error('Error refreshing Firestore data:', e);
    }
  };

  // Set of existing keys for anti-duplicate verification in lost pets
  const existingKeys = useMemo(() => {
    const keys = new Set<string>();
    pets.forEach((p) => {
      if (p.tipo === 'PERDIDO' && p.estado !== 'RESUELTO' && p.llave) {
        keys.add(p.llave);
      }
    });
    return keys;
  }, [pets]);

  // Helper to safely clean data objects for Firestore (removing any undefined values)
  const sanitizeFirestoreData = (data: Record<string, any>) => {
    const clean: Record<string, any> = {};
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined) {
        clean[k] = v;
      }
    });
    return clean;
  };

  // Handler: Submit Lost Pet
  const handleCreateLostPet = async (
    petData: Omit<PetRecord, 'id' | 'createdAt' | 'estado' | 'resolveToken'>
  ): Promise<boolean> => {
    try {
      if (!petData.foto || !petData.foto.trim()) {
        throw new Error('La fotografía de la mascota es obligatoria.');
      }
      const resolveToken = Math.random().toString(36).substring(2, 10);
      const cleanPayload = sanitizeFirestoreData({
        ...petData,
        subColores: Array.isArray(petData.subColores) ? petData.subColores : [],
        telefonoSecundario: petData.telefonoSecundario || '',
        estado: 'ACTIVO',
        createdAt: Date.now(),
        resolveToken
      });

      let newId = '';
      try {
        const newDocRef = await addDoc(collection(db, 'pets'), cleanPayload);
        newId = newDocRef.id;
      } catch (firestoreErr) {
        console.warn('Direct Firestore write encountered an error, trying server fallback:', firestoreErr);
        // Fallback to server API POST /api/pets
        const res = await fetch('/api/pets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-client': 'tumascota-web-spa'
          },
          body: JSON.stringify(cleanPayload)
        });
        const resData = await res.json();
        if (!res.ok || !resData?.success) {
          throw new Error(resData?.error || 'Error al guardar en el servidor. Por favor intenta nuevamente.');
        }
        newId = resData.pet?.id || `pet_${Date.now()}`;
      }

      const fullRecord: PetRecord = {
        ...petData,
        id: newId,
        estado: 'ACTIVO',
        createdAt: Date.now(),
        resolveToken
      };

      // Optimistically add to local state
      setPets((prev) => [fullRecord, ...prev.filter((p) => p.id !== newId)]);

      // Calculate matches against active found pets
      let exacts = 0;
      let candidates = 0;
      pets.forEach((p) => {
        if (p.tipo !== 'ENCONTRADO' || p.estado === 'RESUELTO') return;
        const evalResult = evaluatePetMatch(fullRecord, p);
        if (evalResult.isExactMatch) {
          exacts += 1;
        }
        if (evalResult.isMatch) {
          candidates += 1;
        }
      });

      setExactMatchCount(exacts);
      setMatchingCount(candidates);
      setConfirmationPet(fullRecord);
      setTraitSearchPet(fullRecord);

      // Reset all filters to avoid stuck state and take user directly to Modo Cruce
      handleResetFilters();
      setViewMode('matches');
      triggerServerCacheInvalidate();

      return true;
    } catch (error) {
      console.error('Error saving lost pet to Firestore:', error);
      throw error;
    }
  };

  // Handler: Submit Found Pet
  const handleCreateFoundPet = async (
    petData: Omit<PetRecord, 'id' | 'createdAt' | 'estado' | 'resolveToken'>
  ): Promise<boolean> => {
    try {
      if (!petData.foto || !petData.foto.trim()) {
        throw new Error('La fotografía de la mascota es obligatoria.');
      }

      // Guarda anti-duplicado: si este mismo hallazgo (mismo teléfono + misma foto)
      // ya está publicado y activo, no se crea otra ficha; se muestra la que existe.
      // Cubre el caso real observado: el guardado SÍ entra a Firestore pero el usuario
      // ve un error y reintenta. Para entonces el listener onSnapshot ya trajo la ficha,
      // así que aquí se detecta y el reenvío deja de crear copias.
      const yaPublicada = petData.llave
        ? pets.find((p) => p.llave === petData.llave && p.estado === 'ACTIVO')
        : undefined;
      if (yaPublicada) {
        setConfirmationPet(yaPublicada);
        setTraitSearchPet(yaPublicada);
        handleResetFilters();
        setViewMode('matches');
        return true;
      }

      const resolveToken = Math.random().toString(36).substring(2, 10);
      const cleanPayload = sanitizeFirestoreData({
        ...petData,
        subColores: Array.isArray(petData.subColores) ? petData.subColores : [],
        telefonoSecundario: petData.telefonoSecundario || '',
        estado: 'ACTIVO',
        createdAt: Date.now(),
        resolveToken
      });

      let newId = '';
      try {
        const newDocRef = await addDoc(collection(db, 'pets'), cleanPayload);
        newId = newDocRef.id;
      } catch (firestoreErr) {
        console.warn('Direct Firestore write encountered an error, trying server fallback:', firestoreErr);
        // Fallback to server API POST /api/pets
        const res = await fetch('/api/pets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-client': 'tumascota-web-spa'
          },
          body: JSON.stringify(cleanPayload)
        });
        const resData = await res.json();
        if (!res.ok || !resData?.success) {
          throw new Error(resData?.error || 'Error al guardar en el servidor. Por favor intenta nuevamente.');
        }
        newId = resData.pet?.id || `pet_${Date.now()}`;
      }

      const fullRecord: PetRecord = {
        ...petData,
        id: newId,
        estado: 'ACTIVO',
        createdAt: Date.now(),
        resolveToken
      };

      // Optimistically add to local state
      setPets((prev) => [fullRecord, ...prev.filter((p) => p.id !== newId)]);

      // Calculate matches against active lost pets
      let exacts = 0;
      let candidates = 0;
      pets.forEach((p) => {
        if (p.tipo !== 'PERDIDO' || p.estado === 'RESUELTO') return;
        const evalResult = evaluatePetMatch(p, fullRecord);
        if (evalResult.isExactMatch) {
          exacts += 1;
        }
        if (evalResult.isMatch) {
          candidates += 1;
        }
      });

      setExactMatchCount(exacts);
      setMatchingCount(candidates);
      setConfirmationPet(fullRecord);
      setTraitSearchPet(fullRecord);

      // Reset all filters to avoid stuck state and open Modo Cruce
      handleResetFilters();
      setViewMode('matches');
      triggerServerCacheInvalidate();

      return true;
    } catch (error) {
      console.error('Error saving found pet to Firestore:', error);
      throw error;
    }
  };

  // Handler: Submit Suggestion / Recommendation
  const handleCreateSuggestion = async (
    suggestionData: Omit<SuggestionRecord, 'id' | 'createdAt' | 'fecha' | 'atendido'>
  ): Promise<boolean> => {
    try {
      await addDoc(collection(db, 'suggestions'), {
        ...suggestionData,
        fecha: new Date().toLocaleDateString('es-CO'),
        createdAt: Date.now(),
        atendido: false
      });
      return true;
    } catch (error) {
      console.error('Error saving suggestion to Firestore:', error);
      throw error;
    }
  };

  // Handler: Admin toggle suggestion attended
  const handleToggleSuggestionAttended = async (suggestionId: string, attended: boolean) => {
    try {
      const docRef = doc(db, 'suggestions', suggestionId);
      await updateDoc(docRef, { atendido: attended });
    } catch (error) {
      console.error('Error updating suggestion status:', error);
    }
  };

  // Handler: Admin delete suggestion
  const handleDeleteSuggestion = async (suggestionId: string) => {
    try {
      const docRef = doc(db, 'suggestions', suggestionId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting suggestion:', error);
    }
  };

  // Handler: Resolve pet
  const handleConfirmResolve = async (petId: string, inputAuth: string): Promise<boolean> => {
    const target = pets.find((p) => p.id === petId);
    if (!target) return false;

    // Verify identity using phone digits, email, or legacy cedula
    const cleanInputPhone = inputAuth.replace(/\D/g, '');
    const cleanTargetPhone = (target.telefono || '').replace(/\D/g, '');
    const inputMail = inputAuth.trim().toLowerCase();
    const targetMail = (target.correo || '').trim().toLowerCase();
    const targetCedula = (target.cedula || '').trim().toLowerCase();

    let isAuthorized = false;

    // Direct phone matching
    if (cleanInputPhone && cleanTargetPhone && cleanTargetPhone.includes(cleanInputPhone)) {
      isAuthorized = true;
    }
    // Direct email matching
    if (inputMail && targetMail && inputMail === targetMail) {
      isAuthorized = true;
    }
    // Legacy cedula matching
    if (inputAuth.trim() && targetCedula && inputAuth.trim().toLowerCase() === targetCedula) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return false;
    }

    try {
      const petDocRef = doc(db, 'pets', petId);
      await updateDoc(petDocRef, {
        estado: 'RESUELTO'
      });
      triggerServerCacheInvalidate();
      return true;
    } catch (error) {
      console.error('Error updating status in Firestore:', error);
      return false;
    }
  };

  // Handler: Update pet from Edit modal
  const handleUpdatePetData = async (petId: string, updatedData: Partial<PetRecord>): Promise<boolean> => {
    try {
      const cleanData: Record<string, any> = {};
      Object.entries(updatedData).forEach(([key, val]) => {
        if (val !== undefined) {
          cleanData[key] = val;
        }
      });

      const petDocRef = doc(db, 'pets', petId);
      await updateDoc(petDocRef, cleanData);
      setPets((prev) => prev.map((p) => (p.id === petId ? { ...p, ...cleanData } : p)));
      triggerServerCacheInvalidate();
      return true;
    } catch (error) {
      console.error('Error updating pet in Firestore:', error);
      return false;
    }
  };

  // Handler: Mark as resolved directly from Edit modal
  const handleMarkResolvedDirect = async (petId: string): Promise<boolean> => {
    try {
      const petDocRef = doc(db, 'pets', petId);
      await updateDoc(petDocRef, {
        estado: 'RESUELTO'
      });
      triggerServerCacheInvalidate();
      return true;
    } catch (error) {
      console.error('Error marking resolved in Firestore:', error);
      return false;
    }
  };

  // Handler: Admin toggle status
  const handleUpdateStatus = async (petId: string, newStatus: PetStatus) => {
    try {
      const petDocRef = doc(db, 'pets', petId);
      await updateDoc(petDocRef, {
        estado: newStatus
      });
      triggerServerCacheInvalidate();
    } catch (error) {
      console.error('Error updating pet status from admin:', error);
    }
  };

  // Handler: Admin delete pet
  const handleDeletePet = async (petId: string) => {
    try {
      const petDocRef = doc(db, 'pets', petId);
      await deleteDoc(petDocRef);
      triggerServerCacheInvalidate();
    } catch (error) {
      console.error('Error deleting pet from Firestore:', error);
      throw error;
    }
  };

  // Handler: Descartar / Reincorporar mascota encontrada para un registro de mascota perdida
  const handleToggleDescarte = async (lostPetId: string, foundPetId: string) => {
    try {
      const lostPet = pets.find((p) => p.id === lostPetId);
      if (!lostPet) return;

      const currentDescartados = lostPet.descartados || [];
      const isAlreadyDescartado = currentDescartados.includes(foundPetId);
      const newDescartados = isAlreadyDescartado
        ? currentDescartados.filter((id) => id !== foundPetId)
        : [...currentDescartados, foundPetId];

      // Actualización optimista inmediata en estado local
      setPets((prev) =>
        prev.map((p) => (p.id === lostPetId ? { ...p, descartados: newDescartados } : p))
      );

      const petDocRef = doc(db, 'pets', lostPetId);
      await updateDoc(petDocRef, {
        descartados: newDescartados
      });
      triggerServerCacheInvalidate();
    } catch (error) {
      console.error('Error toggling descarte in Firestore:', error);
    }
  };

  // Handler: Marcar / desmarcar una ficha como posible duplicado (accion publica)
  //
  // Solo levanta una bandera para revision manual: NUNCA oculta ni borra la ficha. El
  // contador usa increment() para que dos personas marcando a la vez no se pisen; el flag
  // 'duplicado' se calcula desde el estado local, asi que puede quedar momentaneamente
  // desfasado bajo concurrencia y el listener en vivo lo corrige. Es una pista para
  // priorizar la curaduria, no un dato duro.
  const handleToggleDuplicado = async (petId: string, marcar: boolean) => {
    const pet = pets.find((p) => p.id === petId);
    const votosActuales = pet?.duplicadoVotos || 0;
    const votosEstimados = marcar ? votosActuales + 1 : Math.max(0, votosActuales - 1);

    // Actualizacion optimista para que el boton responda de inmediato
    setPets((prev) =>
      prev.map((p) =>
        p.id === petId
          ? { ...p, duplicado: votosEstimados > 0, duplicadoVotos: votosEstimados }
          : p
      )
    );

    try {
      const petDocRef = doc(db, 'pets', petId);
      await updateDoc(petDocRef, {
        duplicado: votosEstimados > 0,
        duplicadoVotos: increment(marcar ? 1 : -1),
        duplicadoUltimoAt: Date.now()
      });
      triggerServerCacheInvalidate();
    } catch (error) {
      console.error('Error marcando duplicado in Firestore:', error);
      // Revertir el optimismo y avisar al boton para que restaure su propio estado
      setPets((prev) =>
        prev.map((p) =>
          p.id === petId
            ? { ...p, duplicado: votosActuales > 0, duplicadoVotos: votosActuales }
            : p
        )
      );
      throw error;
    }
  };

  // Handler: Navegar y cruzar automáticamente en Modo Cruce por los rasgos de una mascota
  const handleSearchByTraits = (pet: PetRecord) => {
    setTraitSearchPet(pet);
    const deptObj = COLOMBIAN_DEPARTMENTS.find(
      (d) =>
        d.name.toLowerCase() === pet.departamento.toLowerCase() ||
        d.id.toLowerCase() === pet.departamento.toLowerCase()
    );
    setSelectedDept(deptObj ? deptObj.id : 'all');
    setSelectedCity(pet.ciudad);
    setSelectedSpecies(pet.especie);
    setSelectedColor(pet.color);
    setSelectedSize(pet.tamano);
    setViewMode('matches');
    setActiveTab('gallery');
    setLightboxPet(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activePetsCount = useMemo(() => pets.filter((p) => p.estado !== 'RESUELTO').length, [pets]);

  return (
    <div className="bg-[#FAF9F6] text-slate-800 font-sans min-h-screen flex flex-col antialiased">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        activeCount={activePetsCount}
        currentRole={currentRole}
        onLogout={() => {
          localStorage.removeItem('app_auth_role');
          setCurrentRole('public');
        }}
      />

      {/* Main App Body */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-blue-900 border-t-yellow-400 rounded-full animate-spin" />
            <p className="text-stone-500 text-xs font-medium">Conectando con la base de datos comunitaria...</p>
          </div>
        ) : (
          <>
            {/* Tab 1: Perdí mi Mascota */}
            {activeTab === 'lost' && (
              <LostPetForm
                onSubmitLostPet={handleCreateLostPet}
                existingKeys={existingKeys}
              />
            )}

            {/* Tab 2: Encontré una Mascota */}
            {activeTab === 'found' && (
              <FoundPetForm onSubmitFoundPet={handleCreateFoundPet} />
            )}

            {/* Tab 3: Coincidencias & Galería */}
            {activeTab === 'gallery' && (
              <GalleryAndMatches
                pets={pets}
                selectedDept={selectedDept}
                onChangeDept={setSelectedDept}
                selectedCity={selectedCity}
                onChangeCity={setSelectedCity}
                selectedSpecies={selectedSpecies}
                onChangeSpecies={setSelectedSpecies}
                selectedColor={selectedColor}
                onChangeColor={setSelectedColor}
                selectedSize={selectedSize}
                onChangeSize={setSelectedSize}
                onResetFilters={handleResetFilters}
                viewMode={viewMode}
                onChangeViewMode={setViewMode}
                onOpenLightbox={(pet) => setLightboxPet(pet)}
                onOpenResolveModal={(pet) => setResolvePet(pet)}
                onOpenEditModal={(pet) => setEditPet(pet)}
                onReportLostClick={() => setActiveTab('lost')}
                onToggleDescarte={handleToggleDescarte}
                onToggleDuplicado={handleToggleDuplicado}
                traitSearchPet={traitSearchPet}
                onClearTraitPet={() => setTraitSearchPet(null)}
              />
            )}

            {/* Tab 4: Reencuentros Exitosos (Pública) */}
            {activeTab === 'success' && (
              <SuccessStories
                pets={pets}
                onOpenLightbox={(pet) => setLightboxPet(pet)}
                onNavigateToGallery={() => setActiveTab('gallery')}
              />
            )}

            {/* Tab 5: Tu Sugerencia Importa */}
            {activeTab === 'suggestions' && (
              <SuggestionsView onSubmitSuggestion={handleCreateSuggestion} />
            )}

            {/* Tab 5: Admin Dashboard / Editor Portal */}
            {activeTab === 'admin' && (
              <AdminDashboard
                pets={pets}
                suggestions={suggestions}
                onUpdatePetStatus={handleUpdateStatus}
                onDeletePet={handleDeletePet}
                onOpenLightbox={(pet) => setLightboxPet(pet)}
                onOpenDigestModal={() => setShowDigestModal(true)}
                onRefreshData={handleRefreshData}
                onToggleSuggestionStatus={handleToggleSuggestionAttended}
                onDeleteSuggestion={handleDeleteSuggestion}
                onSearchByTraits={handleSearchByTraits}
                onOpenEditPet={(pet) => setEditPet(pet)}
                currentRole={currentRole}
                onRoleChange={(role) => setCurrentRole(role)}
              />
            )}
          </>
        )}
      </main>

      {/* Lightbox High-Resolution Zoom Modal */}
      <ImageLightboxModal
        pet={lightboxPet ? pets.find((p) => p.id === lightboxPet.id) || lightboxPet : null}
        onClose={() => setLightboxPet(null)}
        onSearchByTraits={handleSearchByTraits}
        onToggleDuplicado={handleToggleDuplicado}
      />

      {/* Confirmation Relief Modal */}
      <ConfirmationModal
        isOpen={Boolean(confirmationPet)}
        pet={confirmationPet}
        matchingCount={matchingCount}
        exactMatchCount={exactMatchCount}
        onClose={() => {
          setConfirmationPet(null);
          setActiveTab('gallery');
          setViewMode('matches');
        }}
        onGoToMatches={() => {
          setConfirmationPet(null);
          setActiveTab('gallery');
          setViewMode('matches');
        }}
      />

      {/* Resolve / Reunited Pet Modal */}
      <ResolvePetModal
        pet={resolvePet}
        onClose={() => setResolvePet(null)}
        onConfirmResolve={handleConfirmResolve}
      />

      {/* Edit Pet Modal (Protected by Cedula/Phone + Correo or Editor/Admin Key) */}
      <EditPetModal
        pet={editPet}
        isOpen={Boolean(editPet)}
        isAdmin={currentRole === 'admin'}
        isEditor={currentRole === 'editor'}
        onClose={() => setEditPet(null)}
        onUpdatePet={handleUpdatePetData}
        onMarkAsResolved={handleMarkResolvedDirect}
      />

      {/* 6:00 AM Daily Email Digest Simulator Modal */}
      <DailyEmailDigestModal
        isOpen={showDigestModal}
        onClose={() => setShowDigestModal(false)}
        pets={pets}
      />

      {/* Footer */}
      <footer className="bg-slate-900 text-stone-400 text-xs py-8 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-stone-200 font-semibold text-sm">
            <span>🐾 Encontremos Tu Mascota - Red Solidaria Colombia</span>
            <span className="inline-flex w-4 h-3 overflow-hidden rounded-[2px] shadow-sm border border-white/20 flex-shrink-0 flex-col">
              <span className="bg-[#FCD116] h-[50%] w-full" />
              <span className="bg-[#003893] h-[25%] w-full" />
              <span className="bg-[#CE1126] h-[25%] w-full" />
            </span>
          </div>

          <p className="text-stone-400 text-[11px] max-w-2xl mx-auto leading-relaxed">
            Plataforma comunitaria para la búsqueda y reagrupación de mascotas en Colombia. Conexión directa en tiempo real con base de datos Firestore y compresión de fotos en alta definición.
          </p>

          <p className="text-[10px] text-stone-500">
            Tus datos de contacto se muestran exclusivamente para facilitar el reencuentro de las mascotas con sus familias.
          </p>

          <div className="pt-2 flex justify-center items-center gap-4 text-[11px] text-stone-400 border-t border-slate-800/80">
            <span>© {new Date().getFullYear()} Encontremos Tu Mascota Colombia (encontremostumascota.co). Red Solidaria.</span>
            <span>•</span>
            <button
              onClick={() => setActiveTab('suggestions')}
              className="text-yellow-400 hover:text-yellow-300 font-bold"
            >
              💡 Tu Sugerencia Importa
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
