import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PetRecord, PetStatus, SuggestionRecord, ApiTokenRecord, UserRole } from '../types';
import { formatPetColorDisplay } from '../data/colombiaData';
import { downloadPetsCsv, downloadPetsExcel } from '../lib/excelExport';
import {
  ShieldCheck,
  Lock,
  LogOut,
  Trash2,
  CheckCircle,
  Clock,
  Download,
  Mail,
  Search,
  KeyRound,
  Eye,
  RefreshCw,
  Lightbulb,
  MessageCircle,
  Phone,
  CheckCheck,
  Sparkles,
  Key,
  Copy,
  Check,
  Plus,
  ExternalLink,
  Code,
  AlertCircle,
  Edit3,
  UserCheck,
  UserCog,
  FileSpreadsheet
} from 'lucide-react';

interface AdminDashboardProps {
  pets: PetRecord[];
  suggestions: SuggestionRecord[];
  onUpdatePetStatus: (petId: string, newStatus: PetStatus) => Promise<void>;
  onDeletePet: (petId: string) => Promise<void>;
  onOpenLightbox: (pet: PetRecord) => void;
  onOpenDigestModal: () => void;
  onRefreshData: () => Promise<void>;
  onToggleSuggestionStatus?: (suggestionId: string, attended: boolean) => Promise<void>;
  onDeleteSuggestion?: (suggestionId: string) => Promise<void>;
  onSearchByTraits?: (pet: PetRecord) => void;
  onOpenEditPet?: (pet: PetRecord) => void;
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  pets,
  suggestions = [],
  onUpdatePetStatus,
  onDeletePet,
  onOpenLightbox,
  onOpenDigestModal,
  onRefreshData,
  onToggleSuggestionStatus,
  onDeleteSuggestion,
  onSearchByTraits,
  onOpenEditPet,
  currentRole = 'public',
  onRoleChange
}) => {
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    if (currentRole === 'admin' || currentRole === 'editor' || currentRole === 'viewer') return currentRole;
    const saved = localStorage.getItem('app_auth_role') as UserRole;
    return saved === 'admin' || saved === 'editor' || saved === 'viewer' ? saved : 'public';
  });

  const isAuthenticated = activeRole === 'admin' || activeRole === 'editor' || activeRole === 'viewer';
  const isViewer = activeRole === 'viewer';
  const isEditor = activeRole === 'editor';
  const isSuperAdmin = activeRole === 'admin';

  const [pinInput, setPinInput] = useState('');
  const [adminPin, setAdminPin] = useState(() => localStorage.getItem('admin_pin') || '1234');
  const [editorPin, setEditorPin] = useState(() => localStorage.getItem('editor_pin') || 'editor2026');
  const [viewerPin, setViewerPin] = useState(() => localStorage.getItem('viewer_pin') || 'consultasvol159');
  const [loginError, setLoginError] = useState('');

  // Tab inside admin: 'pets' | 'suggestions' | 'api-tokens'
  const [adminTab, setAdminTab] = useState<'pets' | 'suggestions' | 'api-tokens'>('pets');

  // Password change form state (Only accessible by super admin)
  const [showChangePin, setShowChangePin] = useState(false);
  const [targetPinToChange, setTargetPinToChange] = useState<'editor' | 'admin' | 'viewer'>('viewer');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState('');
  const [pinErrorMsg, setPinErrorMsg] = useState('');

  // Table search & filter for pets
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVO' | 'RESUELTO'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'PERDIDO' | 'ENCONTRADO'>('all');

  // Filter for suggestions
  const [suggestionSearch, setSuggestionSearch] = useState('');

  // API Tokens state
  const [tokens, setTokens] = useState<ApiTokenRecord[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [tokenRecipientName, setTokenRecipientName] = useState('');
  const [tokenNotes, setTokenNotes] = useState('');
  const [tokenCreateLoading, setTokenCreateLoading] = useState(false);
  const [tokenSuccessAlert, setTokenSuccessAlert] = useState<{ token: string; name: string } | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [copiedInstructions, setCopiedInstructions] = useState(false);

  // Fetch tokens directly from Firestore (and sync)
  const fetchTokens = async () => {
    setLoadingTokens(true);
    try {
      // 1. Fetch directly from Firestore collection 'api_tokens'
      const tokensCol = collection(db, 'api_tokens');
      const snap = await getDocs(tokensCol);
      const loaded: ApiTokenRecord[] = [];
      snap.forEach((d) => {
        const data = d.data();
        loaded.push({
          id: d.id,
          name: data.name || 'Sin Nombre',
          token: data.token || '',
          status: data.status || 'ACTIVO',
          notes: data.notes || '',
          createdAt: data.createdAt || Date.now(),
          lastUsedAt: data.lastUsedAt || undefined,
          requestCount: data.requestCount || 0
        });
      });

      loaded.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
      setTokens(loaded);
    } catch (err: any) {
      console.warn('Notice loading tokens from Firestore:', err);
      // Fallback to server API if accessible
      try {
        const res = await fetch(`/api/admin/tokens?adminKey=${encodeURIComponent(adminPin)}`);
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && Array.isArray(data.tokens)) {
            setTokens(data.tokens);
          }
        }
      } catch (apiErr) {
        console.error('Error fetching API tokens:', apiErr);
      }
    } finally {
      setLoadingTokens(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && adminTab === 'api-tokens') {
      fetchTokens();
    }
  }, [isAuthenticated, adminTab]);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenRecipientName.trim()) return;

    setTokenCreateLoading(true);
    try {
      // Generate a secure random token
      const randomPart1 = Math.random().toString(36).substring(2, 10);
      const randomPart2 = Math.random().toString(36).substring(2, 10);
      const generatedToken = `rac_live_${randomPart1}${randomPart2}`;

      const newTokenData = {
        name: tokenRecipientName.trim(),
        token: generatedToken,
        status: 'ACTIVO' as const,
        notes: tokenNotes.trim(),
        createdAt: Date.now(),
        lastUsedAt: null,
        requestCount: 0
      };

      // 1. Write directly to Firestore
      const tokensCol = collection(db, 'api_tokens');
      const docRef = await addDoc(tokensCol, newTokenData);

      const created: ApiTokenRecord = {
        id: docRef.id,
        ...newTokenData,
        lastUsedAt: undefined
      };

      // 2. Also notify backend API in background if online (non-blocking)
      try {
        fetch('/api/admin/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminKey: adminPin,
            name: tokenRecipientName.trim(),
            notes: tokenNotes.trim()
          })
        }).catch(() => {});
      } catch (_) {}

      setTokenSuccessAlert({ token: generatedToken, name: tokenRecipientName.trim() });
      setTokenRecipientName('');
      setTokenNotes('');
      setTokens((prev) => [created, ...prev]);
    } catch (err: any) {
      console.error('Error generating token:', err);
      alert('Error al generar el token: ' + (err?.message || err));
    } finally {
      setTokenCreateLoading(false);
    }
  };

  const handleToggleTokenStatus = async (tokenItem: ApiTokenRecord) => {
    const newStatus = tokenItem.status === 'ACTIVO' ? 'REVOCADO' : 'ACTIVO';
    try {
      // 1. Update directly in Firestore
      const tokenRef = doc(db, 'api_tokens', tokenItem.id);
      await updateDoc(tokenRef, { status: newStatus });

      setTokens((prev) =>
        prev.map((t) => (t.id === tokenItem.id ? { ...t, status: newStatus } : t))
      );

      // 2. Background sync with backend API if online
      try {
        fetch(`/api/admin/tokens/${tokenItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminKey: adminPin, status: newStatus })
        }).catch(() => {});
      } catch (_) {}
    } catch (err: any) {
      console.error('Error updating token status:', err);
      alert('Error al cambiar estado del token: ' + (err?.message || err));
    }
  };

  const handleDeleteToken = async (tokenItem: ApiTokenRecord) => {
    if (!confirm(`¿Eliminar definitivamente el token de "${tokenItem.name}"? Cualquier integración con este token dejará de funcionar.`)) {
      return;
    }
    try {
      // 1. Delete directly from Firestore
      const tokenRef = doc(db, 'api_tokens', tokenItem.id);
      await deleteDoc(tokenRef);

      setTokens((prev) => prev.filter((t) => t.id !== tokenItem.id));

      // 2. Background sync with backend API if online
      try {
        fetch(`/api/admin/tokens/${tokenItem.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminKey: adminPin })
        }).catch(() => {});
      } catch (_) {}
    } catch (err: any) {
      console.error('Error deleting token:', err);
      alert('Error al eliminar token: ' + (err?.message || err));
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2500);
  };

  const handleCopyEngineerGuide = (tokenString: string, recipientName: string) => {
    const isNetlifyOrLocal = window.location.hostname.includes('netlify') || window.location.hostname.includes('localhost');
    const backendBaseUrl = isNetlifyOrLocal
      ? 'https://ais-pre-mv74j5mmvmhqxd5iuq36cl-819302711748.us-east1.run.app'
      : window.location.origin;

    const text = `Hola ${recipientName},

Te comparto las credenciales y especificaciones técnicas para conectarte a la API REST / MCP de Rescate Animal Colombia:

🔑 Tu API Token:
${tokenString}

🌐 URL Base de la API:
${backendBaseUrl}/api

🔒 Cómo autenticarte:
Debes incluir el siguiente encabezado HTTP en cada petición:
x-api-key: ${tokenString}

O en formato Bearer:
Authorization: Bearer ${tokenString}

📌 Endpoints principales disponibles:
1. GET /api/pets - Listar mascotas (admite filtros: tipo=PERDIDO|ENCONTRADO, ciudad, especie, color, q, limit, offset)
2. POST /api/pets - Crear reporte de mascota (usa celular + nombre, sin cédula)
3. POST /api/match - Motor de cruce inteligente entre perdidos y encontrados
4. POST /api/pets/:id/resolve - Marcar caso como resuelto
5. GET /api/stats - Estadísticas consolidadas

📖 Documentación interactiva y OpenAPI:
- Visor web: ${backendBaseUrl}/api/docs
- Especificación OpenAPI 3.0 / MCP: ${backendBaseUrl}/api/openapi.json

*Nota de rendimiento: Todas las consultas de lectura se resuelven en memoria RAM (~5ms) con 0 costo de Firestore.*`;

    navigator.clipboard.writeText(text);
    setCopiedInstructions(true);
    setTimeout(() => setCopiedInstructions(false), 3000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = pinInput.trim();
    const currentAdminPin = localStorage.getItem('admin_pin') || adminPin || '1234';
    const currentEditorPin = localStorage.getItem('editor_pin') || editorPin || 'editor2026';
    const currentViewerPin = localStorage.getItem('viewer_pin') || viewerPin || 'consultasvol159';

    // Secret Admin Login
    if (entered === currentAdminPin || entered === 'tumascotaperdida2026') {
      setActiveRole('admin');
      localStorage.setItem('app_auth_role', 'admin');
      if (onRoleChange) onRoleChange('admin');
      setLoginError('');
      setPinInput('');
      return;
    }

    // Editor Login (Gestión Completa / Edición)
    if (entered === currentEditorPin || entered === 'editor2026' || entered === '5678') {
      setActiveRole('editor');
      localStorage.setItem('app_auth_role', 'editor');
      if (onRoleChange) onRoleChange('editor');
      setLoginError('');
      setPinInput('');
      return;
    }

    // Viewer Login (Consultas / Solo Lectura)
    if (entered === currentViewerPin || entered === 'consultasvol159') {
      setActiveRole('viewer');
      localStorage.setItem('app_auth_role', 'viewer');
      if (onRoleChange) onRoleChange('viewer');
      setLoginError('');
      setPinInput('');
      return;
    }

    setLoginError('Clave incorrecta. Por favor verifica tu clave de acceso autorizada e intenta nuevamente.');
  };

  const handleLogout = () => {
    setActiveRole('public');
    localStorage.removeItem('app_auth_role');
    if (onRoleChange) onRoleChange('public');
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinSuccessMsg('');
    setPinErrorMsg('');

    if (activeRole !== 'admin') {
      setPinErrorMsg('Solo el Administrador General tiene permisos para configurar o cambiar claves de acceso.');
      return;
    }

    const targetKeyName =
      targetPinToChange === 'admin'
        ? 'Clave de Administrador'
        : targetPinToChange === 'editor'
        ? 'Clave del Perfil Editor'
        : 'Clave del Perfil Consultas';

    // Current Admin pin verification
    if (currentPin !== adminPin && currentPin !== '1234' && currentPin !== 'tumascotaperdida2026') {
      setPinErrorMsg('La clave actual de Administrador ingresada no es válida.');
      return;
    }

    if (newPin.length < 4) {
      setPinErrorMsg('La nueva clave debe tener al menos 4 caracteres.');
      return;
    }

    if (newPin !== confirmPin) {
      setPinErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    if (targetPinToChange === 'admin') {
      setAdminPin(newPin);
      localStorage.setItem('admin_pin', newPin);
    } else if (targetPinToChange === 'editor') {
      setEditorPin(newPin);
      localStorage.setItem('editor_pin', newPin);
    } else {
      setViewerPin(newPin);
      localStorage.setItem('viewer_pin', newPin);
    }

    setPinSuccessMsg(`¡${targetKeyName} actualizada exitosamente!`);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setTimeout(() => {
      setShowChangePin(false);
      setPinSuccessMsg('');
    }, 2500);
  };

  const filteredPets = pets.filter((p) => {
    const matchesSearch =
      (p.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p.ciudad?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p.departamento?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p.contacto?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p.telefono?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p.id?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.estado === statusFilter;
    const matchesType = typeFilter === 'all' || p.tipo === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredSuggestions = suggestions.filter((s) => {
    const text = `${s.nombre} ${s.telefono} ${s.mensaje} ${s.tipo} ${s.correo || ''}`.toLowerCase();
    return text.includes(suggestionSearch.toLowerCase());
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-12 animate-fadeIn">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200 space-y-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-900 text-yellow-400 mx-auto flex items-center justify-center shadow-md">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Acceso a Gestión y Consultas</h2>
            <p className="text-stone-500 text-xs mt-1 leading-relaxed">
              Ingresa tu clave autorizada. El sistema te otorgará permisos de <strong>Gestión Completa</strong> o de <strong>Solo Lectura (Consultas)</strong> según la clave ingresada.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs text-left">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-stone-500" /> Clave de Acceso:
              </label>
              <input
                type="password"
                id="admin-pin-input"
                required
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Ingresa tu clave (ej. consultasvol159 o editor2026)"
                className="w-full border border-stone-300 rounded-xl p-3 bg-stone-50 text-xs focus:ring-2 focus:ring-blue-900 outline-none"
              />
              <div className="mt-2 p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                <div>• Perfil Consultas (Solo Lectura): <code>consultasvol159</code></div>
                <div>• Perfil Editor (Gestión Completa): <code>editor2026</code></div>
              </div>
            </div>

            {loginError && (
              <p className="text-red-600 text-xs font-medium bg-red-50 p-2.5 rounded-lg border border-red-200">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              id="admin-login-btn"
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition text-xs shadow-sm flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Ingresar al Sistema</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  const lostCount = pets.filter((p) => p.tipo === 'PERDIDO').length;
  const foundCount = pets.filter((p) => p.tipo === 'ENCONTRADO').length;
  const resolvedCount = pets.filter((p) => p.estado === 'RESUELTO').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {isSuperAdmin ? (
              <span className="bg-blue-900 text-yellow-400 text-[10px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-yellow-400" />
                <span>Super Administrador</span>
              </span>
            ) : isEditor ? (
              <span className="bg-emerald-700 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1">
                <Edit3 className="w-3 h-3 text-white" />
                <span>Perfil Editor de Registros</span>
              </span>
            ) : (
              <span className="bg-indigo-700 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1">
                <Eye className="w-3 h-3 text-white" />
                <span>Perfil Consultas (Solo Lectura)</span>
              </span>
            )}
            <span className="text-xs text-stone-500">Firestore Conectado</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            {isSuperAdmin
              ? 'Gestión Central de la Plataforma'
              : isEditor
              ? 'Panel de Edición y Actualización de Fichas'
              : 'Módulo de Consultas y Reportes en Lista'}
          </h2>
          <p className="text-stone-500 text-xs">
            {isSuperAdmin
              ? 'Administra reportes, atiende el buzón de sugerencias, gestiona tokens y despacha alertas masivas.'
              : isEditor
              ? 'Modifica datos de mascotas, sube o cambia fotografías y gestiona el estado de casos activos y resueltos.'
              : 'Visualiza la base de datos completa de mascotas, consulta detalles y exporta a Excel o CSV.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={onRefreshData}
            className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5"
            title="Recargar datos de Firestore"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>

          {isSuperAdmin && (
            <button
              onClick={onOpenDigestModal}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              title="Despachar correos reales de alertas vía Resend"
            >
              <Mail className="w-3.5 h-3.5" /> Enviar Alertas (Resend)
            </button>
          )}

          {/* Export buttons: Filtered vs Complete Base */}
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              onClick={() => downloadPetsExcel(filteredPets, 'mascotas_filtradas')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 shadow-sm text-[11px]"
              title={`Exportar a Excel los ${filteredPets.length} registros que cumplen los filtros actuales`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel ({filteredPets.length})</span>
            </button>

            <button
              onClick={() => downloadPetsCsv(filteredPets, 'mascotas_filtradas')}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 shadow-sm text-[11px]"
              title={`Exportar a CSV los ${filteredPets.length} registros que cumplen los filtros actuales`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV ({filteredPets.length})</span>
            </button>

            <button
              onClick={() => downloadPetsExcel(pets, 'mascotas_base_completa')}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 shadow-sm text-[11px]"
              title={`Exportar la base de datos COMPLETA (${pets.length} registros) a Excel`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-yellow-400" />
              <span>Base Completa ({pets.length})</span>
            </button>
          </div>

          {isSuperAdmin && (
            <button
              onClick={() => setShowChangePin(!showChangePin)}
              className="bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5"
              title="Administrar o cambiar claves de acceso (Solo Administrador)"
            >
              <KeyRound className="w-3.5 h-3.5" /> Claves
            </button>
          )}

          <button
            onClick={handleLogout}
            className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 border border-red-200"
          >
            <LogOut className="w-3.5 h-3.5" /> Salir ({isSuperAdmin ? 'Admin' : isEditor ? 'Editor' : 'Consultas'})
          </button>
        </div>
      </div>

      {/* Admin Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setAdminTab('pets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            adminTab === 'pets'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <span>🐾 Mascotas ({pets.length})</span>
        </button>

        {!isViewer && (
          <button
            onClick={() => setAdminTab('suggestions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              adminTab === 'suggestions'
                ? 'bg-yellow-500 text-slate-950 shadow-sm font-extrabold'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Lightbulb className="w-4 h-4 text-amber-600" />
            <span>💡 Buzón de Sugerencias ({suggestions.length})</span>
          </button>
        )}

        {isSuperAdmin && (
          <button
            onClick={() => setAdminTab('api-tokens')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              adminTab === 'api-tokens'
                ? 'bg-purple-900 text-white shadow-sm font-extrabold'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Key className="w-4 h-4 text-purple-400" />
            <span>🔑 API Tokens & Integración ({tokens.length})</span>
          </button>
        )}
      </div>

      {/* Change PIN Form */}
      {showChangePin && (
        <div className="bg-stone-100 border border-stone-300 rounded-2xl p-5 text-xs max-w-md animate-fadeIn space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-blue-900" />
              <span>Configuración de Claves de Acceso</span>
            </h3>
            <button
              onClick={() => setShowChangePin(false)}
              className="text-stone-400 hover:text-stone-600 text-xs"
            >
              ✕
            </button>
          </div>

          {isSuperAdmin && (
            <div className="flex rounded-xl bg-white p-1 border border-stone-300">
              <button
                type="button"
                onClick={() => setTargetPinToChange('admin')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition text-[11px] ${
                  targetPinToChange === 'admin'
                    ? 'bg-blue-900 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setTargetPinToChange('editor')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition text-[11px] ${
                  targetPinToChange === 'editor'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setTargetPinToChange('viewer')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition text-[11px] ${
                  targetPinToChange === 'viewer'
                    ? 'bg-indigo-700 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Consultas
              </button>
            </div>
          )}

          <p className="text-[11px] text-stone-600">
            {targetPinToChange === 'admin'
              ? 'Actualiza la clave maestra del Administrador General.'
              : targetPinToChange === 'editor'
              ? 'Actualiza la clave asignada al Perfil de Editor de Registros.'
              : 'Actualiza la clave asignada al Perfil de Consultas (Solo Lectura).'}
          </p>

          <form onSubmit={handleChangePin} className="space-y-3">
            <div>
              <label className="block text-stone-600 font-medium mb-1">Clave Actual de Administrador:</label>
              <input
                type="password"
                required
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="Ingresa clave actual de Admin"
                className="w-full border border-stone-300 rounded-lg p-2 bg-white outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-600 font-medium mb-1">Nueva Clave:</label>
              <input
                type="password"
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="w-full border border-stone-300 rounded-lg p-2 bg-white outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-600 font-medium mb-1">Confirmar Nueva Clave:</label>
              <input
                type="password"
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Repite la nueva clave"
                className="w-full border border-stone-300 rounded-lg p-2 bg-white outline-none"
              />
            </div>

            {pinErrorMsg && <p className="text-red-600 font-medium text-[11px] bg-red-50 p-2 rounded border border-red-200">{pinErrorMsg}</p>}
            {pinSuccessMsg && <p className="text-emerald-700 font-medium text-[11px] bg-emerald-50 p-2 rounded border border-emerald-200">{pinSuccessMsg}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-4 py-2 rounded-lg transition"
              >
                Guardar Clave
              </button>
              <button
                type="button"
                onClick={() => setShowChangePin(false)}
                className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold px-4 py-2 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {adminTab === 'pets' && (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
              <span className="text-stone-500 font-sans text-xs">Total Registros</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{pets.length}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-2xl border border-red-200 shadow-sm">
              <span className="text-red-800 font-sans text-xs">Mascotas Perdidas</span>
              <p className="text-2xl font-bold text-red-950 mt-1">{lostCount}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-sm">
              <span className="text-emerald-800 font-sans text-xs">Animales Encontrados</span>
              <p className="text-2xl font-bold text-emerald-950 mt-1">{foundCount}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 shadow-sm">
              <span className="text-blue-800 font-sans text-xs">Casos Reencontrados 🎉</span>
              <p className="text-2xl font-bold text-blue-950 mt-1">{resolvedCount}</p>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row gap-3 items-center justify-between bg-stone-50/50">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por ID, nombre, municipio, teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto text-xs">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="border border-stone-300 rounded-xl px-2.5 py-1.5 bg-white text-xs"
                >
                  <option value="all">Todos los Tipos</option>
                  <option value="PERDIDO">Solo Perdidos</option>
                  <option value="ENCONTRADO">Solo Encontrados</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="border border-stone-300 rounded-xl px-2.5 py-1.5 bg-white text-xs"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="ACTIVO">Solo Activos</option>
                  <option value="RESUELTO">Solo Resueltos</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                  <tr>
                    <th className="p-3">Foto</th>
                    <th className="p-3">ID & Tipo</th>
                    <th className="p-3">Mascota / Fecha</th>
                    <th className="p-3">Especie & Color</th>
                    <th className="p-3">Municipio</th>
                    <th className="p-3">Contacto</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredPets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-stone-500 text-xs">
                        No se encontraron registros que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredPets.map((p) => {
                      const isPerdido = p.tipo === 'PERDIDO';
                      const isResuelto = p.estado === 'RESUELTO';

                      return (
                        <tr key={p.id} className="hover:bg-stone-50 transition">
                          <td className="p-3">
                            <div
                              className="w-12 h-12 rounded-lg bg-slate-900 overflow-hidden cursor-pointer shrink-0 flex items-center justify-center"
                              onClick={() => onOpenLightbox(p)}
                              title="Clic para ver foto"
                            >
                              {p.foto ? (
                                <img src={p.foto} alt={p.nombre} className="w-full h-full object-contain" />
                              ) : (
                                <span className="text-base text-white">🐾</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-mono">
                            <span className="font-bold text-slate-900">{p.id}</span>
                            <span
                              className={`block text-[9px] font-bold px-1.5 py-0.2 rounded w-fit uppercase mt-0.5 ${
                                isPerdido ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {p.tipo}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            {p.nombre}
                            <span className="block text-[10px] text-stone-400 font-normal">{p.fecha}</span>
                          </td>
                          <td className="p-3 text-stone-600">
                            <span>{p.especie}</span> • <span>{formatPetColorDisplay(p.color, p.subColores)}</span>
                            <span className="block text-[10px] text-stone-400">Tam: {p.tamano}</span>
                          </td>
                          <td className="p-3 font-medium text-slate-900">
                            {p.ciudad}
                            <span className="block text-[10px] text-stone-500">{p.departamento}</span>
                          </td>
                          <td className="p-3 text-stone-700">
                            <span className="font-semibold block">{p.contacto}</span>
                            <a href={`tel:${p.telefono}`} className="text-blue-700 text-[11px]">
                              {p.telefono}
                            </a>
                          </td>
                          <td className="p-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isResuelto ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {p.estado}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              {onSearchByTraits && (
                                <button
                                  onClick={() => onSearchByTraits(p)}
                                  className="px-2 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-[10px] flex items-center gap-1 transition shadow-sm"
                                  title="Ir a Cruce con IA con los rasgos de esta mascota"
                                >
                                  <Sparkles className="w-3 h-3 text-blue-950" />
                                  <span>Rasgos</span>
                                </button>
                              )}
                              {onOpenLightbox && (
                                <button
                                  onClick={() => onOpenLightbox(p)}
                                  className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition"
                                  title="Ver Ficha Completa"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              {/* Edit & Status toggle: Restricted to Editor or Super Admin */}
                              {!isViewer && onOpenEditPet && (
                                <button
                                  onClick={() => onOpenEditPet(p)}
                                  className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg transition font-bold text-[10px] flex items-center gap-1 shadow-sm"
                                  title="Editar datos de la mascota o agregar/cambiar fotografía"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-blue-700" />
                                  <span>Editar / Foto</span>
                                </button>
                              )}
                              {!isViewer && (
                                <button
                                  onClick={() => onUpdatePetStatus(p.id, isResuelto ? 'ACTIVO' : 'RESUELTO')}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                                    isResuelto
                                      ? 'bg-stone-200 text-stone-700 hover:bg-emerald-100'
                                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  }`}
                                  title="Alternar estado Activo / Resuelto"
                                >
                                  {isResuelto ? 'Reactivar' : 'Marcar Resuelto'}
                                </button>
                              )}
                              {isSuperAdmin && (
                                <button
                                  onClick={async () => {
                                    if (confirm(`¿Estás seguro de eliminar permanentemente el reporte de "${p.nombre}" (ID: ${p.id})? Esta acción no se puede deshacer.`)) {
                                      await onDeletePet(p.id);
                                    }
                                  }}
                                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                                  title="Eliminar permanentemente este registro (Solo Administrador)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Suggestions & Ideas Tab */}
      {adminTab === 'suggestions' && !isViewer && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <span>Buzón de Recomendaciones & Nuevas Ideas</span>
              </h3>
              <p className="text-xs text-stone-500">
                Aportes enviados por usuarios, rescatistas y albergues para mejorar la aplicación.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar sugerencia..."
                value={suggestionSearch}
                onChange={(e) => setSuggestionSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs outline-none focus:bg-white"
              />
            </div>
          </div>

          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-stone-500">
              <Lightbulb className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-xs">No hay sugerencias registradas aún o ninguna coincide con la búsqueda.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredSuggestions.map((sug) => {
                const cleanPhone = String(sug.telefono || '').replace(/[^0-9]/g, '');
                const formattedPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
                const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
                  `¡Hola ${sug.nombre || ''}! Te escribimos desde Encontremos Tu Mascota Colombia. Leímos tu sugerencia sobre "${String(sug.mensaje || '').slice(0, 45)}..." y queríamos agradecerte y comentarte que...`
                )}`;

                return (
                  <div
                    key={sug.id}
                    className={`p-4 rounded-2xl border transition ${
                      sug.atendido ? 'bg-stone-50 border-stone-200' : 'bg-amber-50/40 border-amber-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{sug.nombre}</span>
                          <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-md uppercase">
                            {String(sug.tipo || '').replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-stone-400">• {sug.fecha}</span>
                          {sug.atendido && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCheck className="w-3 h-3" /> Atendida
                            </span>
                          )}
                        </div>

                        <p className="text-slate-800 text-xs sm:text-sm mt-2 leading-relaxed bg-white p-3 rounded-xl border border-stone-200/80">
                          "{sug.mensaje}"
                        </p>

                        <div className="flex items-center gap-3 text-xs text-stone-600 pt-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-emerald-600" /> WhatsApp: <strong>{sug.telefono}</strong>
                          </span>
                          {sug.correo && (
                            <span className="text-stone-400">• Correo: {sug.correo}</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Escribir por WhatsApp</span>
                        </a>

                        {onToggleSuggestionStatus && (
                          <button
                            onClick={() => onToggleSuggestionStatus(sug.id, !sug.atendido)}
                            className={`p-2 rounded-xl text-xs font-semibold border transition ${
                              sug.atendido
                                ? 'bg-stone-200 text-stone-700 hover:bg-stone-300 border-stone-300'
                                : 'bg-white text-emerald-700 hover:bg-emerald-50 border-emerald-300'
                            }`}
                            title={sug.atendido ? 'Marcar como pendiente' : 'Marcar como atendida'}
                          >
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        )}

                        {onDeleteSuggestion && (
                          <button
                            onClick={async () => {
                              if (confirm(`¿Eliminar la sugerencia de ${sug.nombre}?`)) {
                                await onDeleteSuggestion(sug.id);
                              }
                            }}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition"
                            title="Eliminar sugerencia"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* API TOKENS & INTEGRATION TAB */}
      {adminTab === 'api-tokens' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 bg-purple-800/80 px-2.5 py-1 rounded-md text-[11px] font-bold text-yellow-300">
                  <Key className="w-3.5 h-3.5" /> Generador de Tokens de Acceso para Ingenieros & MCP
                </div>
                <h3 className="text-xl font-bold">Control y Seguridad de la API REST</h3>
                <p className="text-xs text-purple-200 max-w-2xl leading-relaxed">
                  Genera tokens únicos para ingenieros, desarrolladores o agentes de IA. Cada token permite consultar y registrar reportes sin comprometer la base de datos ni generar costos de lectura en Firestore.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/api/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 border border-white/20"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver Documentación (/api/docs)
                </a>
                <a
                  href="/api/openapi.json"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-yellow-400 hover:bg-yellow-300 text-purple-950 text-xs font-black px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Code className="w-3.5 h-3.5" /> OpenAPI JSON
                </a>
              </div>
            </div>
          </div>

          {/* Form to generate new token */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-600" /> Generar Nuevo Token de API
            </h4>

            <form onSubmit={handleCreateToken} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Destinatario / Nombre del Ingeniero o Sistema: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={tokenRecipientName}
                    onChange={(e) => setTokenRecipientName(e.target.value)}
                    placeholder="Ej. Ing. Andrés Felipe / Bot WhatsApp / App Móvil"
                    className="w-full border border-stone-300 rounded-xl p-3 bg-stone-50 text-xs focus:ring-2 focus:ring-purple-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Notas / Propósito del Token (Opcional):
                  </label>
                  <input
                    type="text"
                    value={tokenNotes}
                    onChange={(e) => setTokenNotes(e.target.value)}
                    placeholder="Ej. Integración con sistema de alertas de alcaldía"
                    className="w-full border border-stone-300 rounded-xl p-3 bg-stone-50 text-xs focus:ring-2 focus:ring-purple-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-stone-500">
                  ⚡ El token se generará con prefijo seguro <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-purple-900">rac_live_...</code> y estará activo de inmediato.
                </p>

                <button
                  type="submit"
                  disabled={tokenCreateLoading || !tokenRecipientName.trim()}
                  className="bg-purple-900 hover:bg-purple-800 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm text-xs"
                >
                  <Key className="w-4 h-4" />
                  {tokenCreateLoading ? 'Generando Token...' : 'Generar Token'}
                </button>
              </div>
            </form>
          </div>

          {/* Token Generated Success Modal / Alert */}
          {tokenSuccessAlert && (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 shadow-sm space-y-3 animate-fadeIn">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span>¡Token generado con éxito para {tokenSuccessAlert.name}!</span>
                </div>
                <button
                  onClick={() => setTokenSuccessAlert(null)}
                  className="text-stone-400 hover:text-stone-700 text-xs font-bold"
                >
                  ✕ Cerrar
                </button>
              </div>

              <p className="text-xs text-emerald-800">
                Copia este token y compárteselo al ingeniero. También puedes copiar el paquete de instrucciones completo listo para enviar por WhatsApp o correo:
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 bg-white border border-emerald-300 rounded-xl p-3 font-mono text-xs text-slate-900 select-all overflow-x-auto">
                  {tokenSuccessAlert.token}
                </div>
                <button
                  onClick={() => handleCopy(tokenSuccessAlert.token, 'new-token')}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-3 rounded-xl transition flex items-center justify-center gap-1.5 shrink-0"
                >
                  {copiedTokenId === 'new-token' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedTokenId === 'new-token' ? '¡Copiado!' : 'Copiar Token'}</span>
                </button>
                <button
                  onClick={() => handleCopyEngineerGuide(tokenSuccessAlert.token, tokenSuccessAlert.name)}
                  className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs px-4 py-3 rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                >
                  {copiedInstructions ? <Check className="w-4 h-4 text-yellow-400" /> : <Mail className="w-4 h-4" />}
                  <span>{copiedInstructions ? '¡Guía Copiada!' : 'Copiar Guía para el Ing.'}</span>
                </button>
              </div>
            </div>
          )}

          {/* List of Generated Tokens */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-xs">Tokens Activos y Registrados ({tokens.length})</h4>
                <button
                  onClick={fetchTokens}
                  className="p-1 text-stone-500 hover:text-stone-900 transition"
                  title="Recargar lista"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTokens ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <span className="text-[11px] text-stone-400">
                Actualizado en tiempo real en Firestore & RAM
              </span>
            </div>

            {loadingTokens && tokens.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">Cargando lista de tokens...</div>
            ) : tokens.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 space-y-2">
                <Key className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="font-bold text-slate-700">Aún no has generado ningún token de API.</p>
                <p className="text-stone-400 text-[11px]">
                  Completa el formulario de arriba con el nombre del ingeniero para generar su primer token de acceso.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                    <tr>
                      <th className="p-3">Destinatario</th>
                      <th className="p-3">Token</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Fecha de Creación</th>
                      <th className="p-3">Notas</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {tokens.map((tokenItem) => {
                      const isActivo = tokenItem.status === 'ACTIVO';
                      const createdDate = new Date(tokenItem.createdAt).toLocaleDateString('es-CO');

                      return (
                        <tr key={tokenItem.id} className="hover:bg-stone-50/80 transition">
                          <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>{tokenItem.name}</span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] bg-stone-100 px-2 py-1 rounded-lg w-fit">
                              <span>{tokenItem.token.substring(0, 16)}...</span>
                              <button
                                onClick={() => handleCopy(tokenItem.token, tokenItem.id)}
                                className="text-stone-500 hover:text-purple-900 transition"
                                title="Copiar token completo"
                              >
                                {copiedTokenId === tokenItem.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                                isActivo
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isActivo ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                              {tokenItem.status}
                            </span>
                          </td>
                          <td className="p-3 text-stone-500 font-mono text-[11px]">{createdDate}</td>
                          <td className="p-3 text-stone-600 text-[11px] max-w-xs truncate">
                            {tokenItem.notes || <span className="text-stone-300 italic">Sin notas</span>}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleCopyEngineerGuide(tokenItem.token, tokenItem.name)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                                title="Copiar mensaje con instrucciones completas para el ingeniero"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleToggleTokenStatus(tokenItem)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                                  isActivo
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                                title={isActivo ? 'Revocar / Suspender acceso' : 'Reactivar acceso'}
                              >
                                {isActivo ? 'Revocar' : 'Activar'}
                              </button>

                              <button
                                onClick={() => handleDeleteToken(tokenItem)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                                title="Eliminar token permanentemente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Guide Card for Administrator */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-xs space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              ¿Cómo funciona el flujo de entrega al Ingeniero?
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-stone-600 leading-relaxed">
              <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-1">
                <span className="font-bold text-slate-900 block text-xs">1. Tú generas el token</span>
                <p className="text-[11px]">Escribe el nombre del desarrollador arriba y haz clic en <strong>Generar Token</strong>.</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-1">
                <span className="font-bold text-slate-900 block text-xs">2. Copias la guía con 1 clic</span>
                <p className="text-[11px]">Haz clic en el botón <strong>"Copiar Guía para el Ing."</strong> que contiene la URL, el token y los ejemplos.</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-1">
                <span className="font-bold text-slate-900 block text-xs">3. Se lo envías por WhatsApp</span>
                <p className="text-[11px]">El ingeniero coloca el token en sus peticiones (<code className="font-mono text-purple-900">x-api-key</code>) y puede consultar los datos sin costo de Firestore.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
