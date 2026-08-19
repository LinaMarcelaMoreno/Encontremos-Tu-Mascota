import React, { useState, useRef } from 'react';
import { ActiveTab, UserRole } from '../types';
import { AlertTriangle, PlusCircle, Sparkles, PawPrint, Lightbulb, ShieldCheck, Edit3, Lock, LogOut, HeartHandshake, Eye } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeCount: number;
  onSecretAdminTrigger?: () => void;
  currentRole?: UserRole;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  activeCount,
  onSecretAdminTrigger,
  currentRole = 'public',
  onLogout
}) => {
  const clickTimestampsRef = useRef<number[]>([]);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const now = Date.now();
    // Keep clicks from the last 2 seconds
    clickTimestampsRef.current = clickTimestampsRef.current.filter((t) => now - t < 2000);
    clickTimestampsRef.current.push(now);

    if (clickTimestampsRef.current.length >= 3) {
      clickTimestampsRef.current = [];
      if (onSecretAdminTrigger) {
        onSecretAdminTrigger();
      }
    } else if (clickTimestampsRef.current.length === 1) {
      onSelectTab('gallery');
    }
  };

  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
      {/* Colombian Flag Accent */}
      <div className="h-1.5 w-full flex">
        <div className="h-full bg-yellow-400 w-1/2" />
        <div className="h-full bg-blue-600 w-1/4" />
        <div className="h-full bg-red-600 w-1/4" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Solidario badge */}
        <div
          className="flex items-center space-x-3 cursor-pointer select-none group"
          onClick={handleLogoClick}
          title="Encontremos Tu Mascota Colombia"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-800 flex items-center justify-center shadow-inner border border-blue-700/50 transition transform group-active:scale-95">
            <PawPrint className="w-6 h-6 text-yellow-400" />
          </div>
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Encontremos Tu Mascota
              </h1>
              <span className="bg-yellow-400 text-blue-950 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 border border-yellow-300">
                <span className="inline-flex w-3.5 h-2.5 overflow-hidden rounded-[2px] shadow-sm border border-black/10 flex-shrink-0 flex-col">
                  <span className="bg-[#FCD116] h-[50%] w-full" />
                  <span className="bg-[#003893] h-[25%] w-full" />
                  <span className="bg-[#CE1126] h-[25%] w-full" />
                </span>
                <span>RED SOLIDARIA</span>
              </span>
            </div>
            <p className="text-[11px] text-blue-200/80">
              Plataforma comunitaria de búsqueda y reencuentro de mascotas en Colombia
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 text-xs font-medium bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
          <button
            id="nav-lost-btn"
            onClick={() => onSelectTab('lost')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 font-bold shadow-sm ${
              activeTab === 'lost'
                ? 'bg-[#E11D48] text-white ring-2 ring-rose-300 shadow-md scale-105'
                : 'bg-[#E11D48] hover:bg-[#BE123C] text-white hover:shadow'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-white shrink-0" />
            <span>Perdí mi Mascota</span>
          </button>

          <button
            id="nav-found-btn"
            onClick={() => onSelectTab('found')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 font-bold shadow-sm ${
              activeTab === 'found'
                ? 'bg-[#10B981] text-white ring-2 ring-emerald-300 shadow-md scale-105'
                : 'bg-[#10B981] hover:bg-[#059669] text-white hover:shadow'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-white shrink-0" />
            <span>Encontré una Mascota</span>
          </button>

          <button
            id="nav-gallery-btn"
            onClick={() => onSelectTab('gallery')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 font-semibold ${
              activeTab === 'gallery'
                ? 'bg-blue-800 text-white font-bold shadow-sm'
                : 'text-amber-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Coincidencias & Galería</span>
            <span className="bg-amber-400/20 text-yellow-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
              {activeCount}
            </span>
          </button>

          <button
            id="nav-success-btn"
            onClick={() => onSelectTab('success')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 font-semibold ${
              activeTab === 'success'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black shadow-md ring-2 ring-emerald-300'
                : 'text-emerald-400 hover:bg-slate-800 hover:text-emerald-300'
            }`}
            title="Historias y métricas de mascotas que regresaron a casa"
          >
            <HeartHandshake className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Reencuentros Exitosos</span>
          </button>

          <button
            id="nav-suggestions-btn"
            onClick={() => onSelectTab('suggestions')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 font-semibold ${
              activeTab === 'suggestions'
                ? 'bg-yellow-500 text-slate-950 font-black shadow-sm'
                : 'text-yellow-400 hover:bg-slate-800 hover:text-yellow-300'
            }`}
          >
            <Lightbulb className="w-4 h-4 text-yellow-400 shrink-0" />
            <span>Tu Sugerencia Importa</span>
          </button>

          {/* Access / Role indicator */}
          {currentRole === 'admin' ? (
            <div className="flex items-center gap-1 bg-blue-900/80 border border-blue-600/50 rounded-lg p-0.5">
              <button
                onClick={() => onSelectTab('admin')}
                className={`px-2.5 py-1.5 rounded-md font-bold text-xs flex items-center gap-1.5 transition ${
                  activeTab === 'admin' ? 'bg-yellow-400 text-blue-950 shadow-sm' : 'text-yellow-300 hover:bg-blue-800'
                }`}
                title="Panel de Super Administrador"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-stone-300 hover:text-white hover:bg-red-900/60 rounded-md transition"
                  title="Cerrar sesión de Administrador"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : currentRole === 'editor' ? (
            <div className="flex items-center gap-1 bg-emerald-900/80 border border-emerald-600/50 rounded-lg p-0.5">
              <button
                onClick={() => onSelectTab('admin')}
                className={`px-2.5 py-1.5 rounded-md font-bold text-xs flex items-center gap-1.5 transition ${
                  activeTab === 'admin' ? 'bg-emerald-400 text-slate-950 shadow-sm' : 'text-emerald-200 hover:bg-emerald-800'
                }`}
                title="Panel de Editor de Registros"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-stone-300 hover:text-white hover:bg-red-900/60 rounded-md transition"
                  title="Cerrar sesión de Editor"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : currentRole === 'viewer' ? (
            <div className="flex items-center gap-1 bg-indigo-950 border border-indigo-700/60 rounded-lg p-0.5">
              <button
                onClick={() => onSelectTab('admin')}
                className={`px-2.5 py-1.5 rounded-md font-bold text-xs flex items-center gap-1.5 transition ${
                  activeTab === 'admin' ? 'bg-indigo-500 text-white shadow-sm' : 'text-indigo-200 hover:bg-indigo-900'
                }`}
                title="Panel de Consultas (Solo Lectura y Exportación)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Consultas</span>
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-stone-300 hover:text-white hover:bg-red-900/60 rounded-md transition"
                  title="Cerrar sesión de Consultas"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => onSelectTab('admin')}
              className={`px-2.5 py-2 rounded-lg transition-all flex items-center gap-1 font-semibold text-stone-400 hover:text-white hover:bg-slate-800 ${
                activeTab === 'admin' ? 'bg-slate-800 text-white font-bold' : ''
              }`}
              title="Gestión y Consulta de Registros"
            >
              <Edit3 className="w-3.5 h-3.5 text-stone-400" />
              <span>Gestión</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
