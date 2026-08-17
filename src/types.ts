export type PetType = 'PERDIDO' | 'ENCONTRADO';
export type PetStatus = 'ACTIVO' | 'RESUELTO';
export type PetSpecies = 'Perro' | 'Gato' | 'Otro';
export type PetColor =
  | 'Negro'
  | 'Blanco'
  | 'Café'
  | 'Dorado'
  | 'Gris'
  | 'Crema'
  | 'Atigrado'
  | 'Bicolor'
  | 'Tricolor'
  | 'Otro';
export type SubColor =
  | 'Negro'
  | 'Blanco'
  | 'Dorado'
  | 'Amarillo'
  | 'Naranja'
  | 'Gris'
  | 'Café'
  | 'Crema';
export type PetSize = 'Pequeño' | 'Mediano' | 'Grande';

export interface PetRecord {
  id: string;
  tipo: PetType;
  estado: PetStatus;
  nombre: string;
  cedula?: string; // Campo opcional (migrado a validación por celular + nombre)
  llave: string; // Llave única: nombre_telefono
  especie: PetSpecies;
  raza: string;
  color: PetColor;
  subColores?: string[]; // Sub-colores para Bicolor, Atigrado (2 colores) o Tricolor (3 colores)
  tamano: PetSize;
  departamento: string;
  ciudad: string; // Municipio
  ubicacion: string;
  contacto: string;
  telefono: string; // Teléfono / WhatsApp Principal (llave única junto con el nombre)
  telefonoSecundario?: string; // Teléfono / WhatsApp Secundario (Opcional)
  correo: string;
  foto: string; // High-res compressed base64 / URL
  detalles: string;
  fecha: string; // e.g. "14/08/2026"
  fechaEvento?: string; // Fecha en que se extravió o fue encontrado
  createdAt: number; // Unix timestamp
  resolveToken: string;
  descartados?: string[]; // IDs de animales encontrados descartados por el dueño
}

export interface MatchPair {
  lost: PetRecord;
  found: PetRecord;
  matchScore: 'ALTO' | 'EXACTO';
  matchedAt: string;
  aiSimilarity?: number; // Porcentaje calculado por IA Gemini (0-100)
  aiAnalysis?: {
    similarityPercentage: number;
    isExactMatch: boolean;
    confidence: string;
    reasoning: string;
    matchingFeatures: string[];
    differingFeatures?: string[];
  };
}

export type ActiveTab = 'lost' | 'found' | 'gallery' | 'suggestions' | 'admin';
export type GalleryViewMode = 'all' | 'PERDIDO' | 'ENCONTRADO' | 'matches';

export interface SuggestionRecord {
  id: string;
  nombre: string;
  telefono: string; // WhatsApp
  correo?: string;
  tipo: 'NUEVA_FUNCION' | 'MEJORA' | 'ERROR' | 'ALIANZA' | 'OTRO';
  mensaje: string;
  fecha: string;
  createdAt: number;
  atendido?: boolean;
}

export interface ApiTokenRecord {
  id: string;
  name: string; // Nombre del destinatario (ej. "Ing. Andrés - App Móvil")
  token: string; // e.g. "rac_live_abc123..."
  status: 'ACTIVO' | 'REVOCADO';
  notes?: string;
  createdAt: number;
  lastUsedAt?: number;
  requestCount?: number;
}

export interface DepartmentInfo {
  id: string;
  name: string;
  municipalities: string[];
}
