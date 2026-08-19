import { DepartmentInfo } from '../types';

export const COLOMBIAN_DEPARTMENTS: DepartmentInfo[] = [
  {
    id: 'quindio',
    name: 'Quindío',
    municipalities: [
      'Armenia',
      'Calarcá',
      'Circasia',
      'Montenegro',
      'Quimbaya',
      'La Tebaida',
      'Filandia',
      'Salento',
      'Génova',
      'Pijao',
      'Córdoba',
      'Buenavista'
    ]
  },
  {
    id: 'risaralda',
    name: 'Risaralda',
    municipalities: [
      'Pereira',
      'Dosquebradas',
      'Santa Rosa de Cabal',
      'La Virginia',
      'Belén de Umbría',
      'Santuario',
      'Marsella',
      'Apía',
      'Guática',
      'Quinchía',
      'La Celia',
      'Balboa',
      'Pueblo Rico',
      'Mistrató'
    ]
  },
  {
    id: 'caldas',
    name: 'Caldas',
    municipalities: [
      'Manizales',
      'Chinchiná',
      'Villamaría',
      'La Dorada',
      'Riosucio',
      'Anserma',
      'Neira',
      'Palestina',
      'Supía',
      'Salamina',
      'Aguadas',
      'Pensilvania',
      'Manzanares',
      'Marmato',
      'Viterbo',
      'Belalcázar',
      'Filadelfia',
      'Marquetalia',
      'Samaná',
      'Victoria',
      'Norcasia'
    ]
  },
  {
    id: 'cundinamarca',
    name: 'Cundinamarca',
    municipalities: [
      'Bogotá D.C.',
      'Soacha',
      'Zipaquirá',
      'Chía',
      'Facatativá',
      'Fusagasugá',
      'Madrid',
      'Mosquera',
      'Funza',
      'Girardot',
      'Cajicá',
      'Sopó',
      'Cota',
      'Tocancipá',
      'Gachancipá',
      'Tenjo',
      'Tabio',
      'Subachoque',
      'La Calera',
      'Guaduas',
      'Pacho',
      'Ubaté',
      'Villeta',
      'Silvania',
      'Anapoima',
      'La Mesa'
    ]
  },
  {
    id: 'antioquia',
    name: 'Antioquia',
    municipalities: [
      'Medellín',
      'Bello',
      'Itagüí',
      'Envigado',
      'Rionegro',
      'Sabaneta',
      'La Estrella',
      'Caldas',
      'Apartadó',
      'Turbo',
      'Caucasia',
      'Copacabana',
      'Marinilla',
      'Guarne',
      'El Carmen de Viboral',
      'La Ceja',
      'Santa Fe de Antioquia',
      'Yarumal',
      'Segovia',
      'Puerto Berrío'
    ]
  },
  {
    id: 'valle_cauca',
    name: 'Valle del Cauca',
    municipalities: [
      'Cali',
      'Palmira',
      'Buenaventura',
      'Tuluá',
      'Buga',
      'Cartago',
      'Jamundí',
      'Yumbo',
      'Candelaria',
      'Florida',
      'Pradera',
      'Zarzal',
      'Sevilla',
      'Roldanillo',
      'Caicedonia',
      'El Cerrito',
      'Ginebra'
    ]
  },
  {
    id: 'choco',
    name: 'Chocó',
    municipalities: [
      'Quibdó',
      'Istmina',
      'Tadó',
      'Condoto',
      'Bahía Solano',
      'Nuquí',
      'Acandí',
      'Riosucio',
      'El Carmen de Atrato',
      'Bojayá',
      'Cértegui',
      'Medio San Juan'
    ]
  },
  {
    id: 'tolima',
    name: 'Tolima',
    municipalities: [
      'Ibagué',
      'Espinal',
      'Melgar',
      'Mariquita',
      'Honda',
      'Líbano',
      'Chaparral',
      'Flandes',
      'Fresno',
      'Purificación'
    ]
  },
  {
    id: 'santander',
    name: 'Santander',
    municipalities: [
      'Bucaramanga',
      'Floridablanca',
      'Girón',
      'Piedecuesta',
      'Barrancabermeja',
      'San Gil',
      'Socorro',
      'Barbosa'
    ]
  },
  {
    id: 'otro_departamento',
    name: 'Otro Departamento',
    municipalities: [
      'Otra Ciudad / Municipio'
    ]
  }
];

export const ALL_COLORS = [
  'Negro',
  'Blanco',
  'Café',
  'Dorado',
  'Amarillo',
  'Naranja',
  'Gris',
  'Crema',
  'Atigrado',
  'Bicolor',
  'Tricolor',
  'Otro'
] as const;

export const SUB_COLORS = [
  'Negro',
  'Blanco',
  'Dorado',
  'Amarillo',
  'Naranja',
  'Gris',
  'Café',
  'Crema'
] as const;

/**
 * Retorna si un color requiere sub-selectores (Bicolor, Atigrado o Tricolor)
 */
export function isCompoundColor(color: string): boolean {
  return color === 'Bicolor' || color === 'Atigrado' || color === 'Tricolor';
}

/**
 * Retorna la cantidad de sub-colores requeridos para un color compuesto
 */
export function getCompoundSubColorsCount(color: string): number {
  if (color === 'Bicolor' || color === 'Atigrado') return 2;
  if (color === 'Tricolor') return 3;
  return 0;
}

/**
 * Da formato legible al color de la mascota mostrando sus subcolores si existen
 */
export function formatPetColorDisplay(
  colorOrPet?: string | { color?: string; subColores?: string[] },
  subColores?: string[]
): string {
  if (!colorOrPet) return 'Desconocido';
  if (typeof colorOrPet === 'object') {
    if (!colorOrPet.color) return 'Desconocido';
    if (colorOrPet.subColores && colorOrPet.subColores.length > 0) {
      return `${colorOrPet.color} (${colorOrPet.subColores.join(' + ')})`;
    }
    return colorOrPet.color;
  }
  if (subColores && subColores.length > 0) {
    return `${colorOrPet} (${subColores.join(' + ')})`;
  }
  return colorOrPet;
}

/**
 * Normaliza un tono de color para comparación consistente
 */
export const normalizeTone = (raw: string): string => {
  const s = (raw || '').trim().toLowerCase();
  if (!s || s === 'otro') return '';
  if (s.includes('blanc') || s.includes('nieve')) return 'blanco';
  if (s.includes('negr') || s.includes('azabache')) return 'negro';
  if (s.includes('gris') || s.includes('plomo') || s.includes('azul') || s.includes('ceniza')) return 'gris';
  if (s.includes('caf') || s.includes('marron') || s.includes('marrón') || s.includes('chocolat') || s.includes('castan') || s.includes('castañ')) return 'café';
  if (s.includes('dorad') || s.includes('miel') || s.includes('rubio')) return 'dorado';
  if (s.includes('amarill')) return 'amarillo';
  if (s.includes('naranj') || s.includes('roj') || s.includes('fuego')) return 'naranja';
  if (s.includes('crema') || s.includes('beige') || s.includes('marfil') || s.includes('arena')) return 'crema';
  return s;
};

/**
 * Obtiene el arreglo de todos los tonos asociados a una mascota (color principal + subcolores)
 */
export function getPetAllColorTones(
  petOrColor: string | { color?: string; subColores?: string[] },
  subColoresParam?: string[]
): string[] {
  let mainColor = '';
  let subs: string[] = [];

  if (typeof petOrColor === 'string') {
    mainColor = petOrColor || '';
    subs = Array.isArray(subColoresParam) ? subColoresParam : [];
  } else if (petOrColor && typeof petOrColor === 'object') {
    mainColor = petOrColor.color || '';
    subs = Array.isArray(petOrColor.subColores) ? petOrColor.subColores : [];
  }

  const tones: string[] = [];
  subs.forEach((s) => {
    const t = normalizeTone(s);
    if (t) tones.push(t);
  });

  const mainTone = normalizeTone(mainColor);
  if (mainTone && !['bicolor', 'tricolor', 'atigrado'].includes(mainTone)) {
    tones.push(mainTone);
  }

  return Array.from(new Set(tones));
}

/**
 * Verifica si una mascota cumple con los filtros de color seleccionados.
 * Si se seleccionan múltiples colores (ej. Negro y Blanco, o Naranja y Amarillo),
 * se aplica lógica estricta AND (la mascota DEBE incluir TODOS los colores requeridos).
 */
export function filterMatchesColorStrict(
  petOrColor: string | { color?: string; subColores?: string[] },
  selectedColors: string[] = [],
  selectedSubColores: string[] = [],
  compoundColorPattern?: string // 'all' | 'Bicolor' | 'Atigrado' | 'Tricolor'
): boolean {
  if (!petOrColor) return false;

  let mainColor = '';
  let petSubs: string[] = [];
  if (typeof petOrColor === 'string') {
    mainColor = petOrColor || '';
  } else if (petOrColor && typeof petOrColor === 'object') {
    mainColor = petOrColor.color || '';
    petSubs = Array.isArray(petOrColor.subColores) ? petOrColor.subColores : [];
  }

  // 1. Si se filtró por un patrón específico (Bicolor, Atigrado, Tricolor)
  if (compoundColorPattern && compoundColorPattern !== 'all') {
    if (mainColor.toLowerCase() !== compoundColorPattern.toLowerCase()) {
      return false;
    }
  }

  // 2. Colores requeridos en conjunto (colores base seleccionados + subcolores seleccionados para patrón)
  const requiredColors = [
    ...selectedColors.filter((c) => c && c !== 'all'),
    ...selectedSubColores.filter((c) => c && c !== 'all')
  ];

  if (requiredColors.length === 0) {
    return true; // No hay filtro de color activo
  }

  const petTones = getPetAllColorTones({ color: mainColor, subColores: petSubs });

  // Si la mascota no tiene tonos reconocidos y el usuario buscó colores específicos -> false
  if (petTones.length === 0) {
    // Si buscó el nombre directo en color principal (ej. "Otro")
    return requiredColors.some((r) => r.toLowerCase() === mainColor.toLowerCase());
  }

  // REGLA ESTRICTA AND: Cada uno de los colores requeridos debe estar presente en los tonos de la mascota
  return requiredColors.every((req) => {
    const normReq = normalizeTone(req);
    return petTones.includes(normReq) || mainColor.toLowerCase() === req.toLowerCase();
  });
}

/**
 * Compara dos mascotas y evalúa si sus colores son compatibles o exactos
 */
/**
 * Comprueba compatibilidad de color según la regla comunitaria:
 * - Si un animal es de 1 o 2 colores (monocolor, bicolor, atigrado): por lo menos 1 color debe coincidir.
 * - Si un animal es de 3 colores (tricolor): por lo menos 2 colores deben coincidir.
 */
export function checkPetColorMatch(
  petAOrColorA: string | { color: string; subColores?: string[] },
  petBOrSubColoresA?: string[] | { color: string; subColores?: string[] } | string,
  colorBParam?: string,
  subColoresBParam?: string[]
): { isMatch: boolean; isExact: boolean; score: number; sharedColors: string[]; requiredA: number; requiredB: number } {
  let colorA = '';
  let subColoresA: string[] = [];
  let colorB = '';
  let subColoresB: string[] = [];

  if (typeof petAOrColorA === 'object' && petAOrColorA !== null) {
    colorA = petAOrColorA?.color || '';
    subColoresA = Array.isArray(petAOrColorA?.subColores) ? petAOrColorA.subColores : [];
    if (typeof petBOrSubColoresA === 'object' && petBOrSubColoresA !== null && !Array.isArray(petBOrSubColoresA)) {
      colorB = petBOrSubColoresA?.color || '';
      subColoresB = Array.isArray(petBOrSubColoresA?.subColores) ? petBOrSubColoresA.subColores : [];
    }
  } else {
    colorA = (typeof petAOrColorA === 'string' ? petAOrColorA : '') || '';
    subColoresA = Array.isArray(petBOrSubColoresA) ? petBOrSubColoresA : [];
    colorB = colorBParam || '';
    subColoresB = Array.isArray(subColoresBParam) ? subColoresBParam : [];
  }

  // Canonical color tone mapping helper
  const normalizeTone = (raw: string): string => {
    const s = (raw || '').trim().toLowerCase();
    if (!s || s === 'otro') return '';
    if (s.includes('blanc') || s.includes('nieve')) return 'blanco';
    if (s.includes('negr') || s.includes('azabache')) return 'negro';
    if (s.includes('gris') || s.includes('plomo') || s.includes('azul') || s.includes('ceniza')) return 'gris';
    if (s.includes('caf') || s.includes('marron') || s.includes('marrón') || s.includes('chocolat') || s.includes('castan') || s.includes('castañ')) return 'café';
    if (s.includes('dorad') || s.includes('amarill') || s.includes('miel') || s.includes('rubio')) return 'dorado';
    if (s.includes('naranj') || s.includes('roj') || s.includes('fuego')) return 'naranja';
    if (s.includes('crema') || s.includes('beige') || s.includes('marfil') || s.includes('arena')) return 'crema';
    return s;
  };

  const getColorsArray = (col: string, subs: string[]) => {
    const tones: string[] = [];
    if (subs && subs.length > 0) {
      subs.forEach((s) => {
        const t = normalizeTone(s);
        if (t) tones.push(t);
      });
    }
    const mainTone = normalizeTone(col);
    if (mainTone && !['bicolor', 'tricolor', 'atigrado'].includes(mainTone)) {
      tones.push(mainTone);
    }
    return Array.from(new Set(tones));
  };

  const colorsA = getColorsArray(colorA, subColoresA);
  const colorsB = getColorsArray(colorB, subColoresB);

  // If color information is missing or completely unidentifiable, no automatic color match
  if (colorsA.length === 0 || colorsB.length === 0) {
    return { isMatch: false, isExact: false, score: 0, sharedColors: [], requiredA: 1, requiredB: 1 };
  }

  const sharedColors = colorsA.filter((c) => colorsB.includes(c));
  const sharedCount = sharedColors.length;

  // Coincidencia exacta de color si comparten todos y cada uno de los tonos registrados
  const isExact =
    sharedCount === colorsA.length &&
    sharedCount === colorsB.length;

  let isMatch = false;

  if (isExact) {
    isMatch = true;
  } else if (colorsA.length === 1 && colorsB.length === 1) {
    // Ambos tienen 1 solo color pero son distintos (ej. Negro vs Blanco) -> Incompatible
    isMatch = false;
  } else if (colorsA.length === 2 && colorsB.length === 2) {
    // Ambos son bicolores: deben compartir ambos colores. Si uno es blanco+gris y el otro blanco+negro -> Incompatible
    isMatch = sharedCount === 2;
  } else if (colorsA.length >= 3 || colorsB.length >= 3) {
    // Tricolor: debe compartir al menos 2 tonos principales
    isMatch = sharedCount >= 2;
  } else {
    // Uno tiene 1 color y el otro 2 o 3 (ej. Blanco vs Blanco+Gris)
    isMatch = sharedCount >= 1;
  }

  let score = 0;
  if (isExact) {
    score = 100;
  } else if (isMatch) {
    score = sharedCount >= 2 ? 85 : 70;
  }

  return { isMatch, isExact, score, sharedColors, requiredA: isExact ? colorsA.length : 1, requiredB: isExact ? colorsB.length : 1 };
}

/**
 * Validador de fotografía real para mascotas
 * Retorna true solo si el registro tiene una imagen real (base64 o URL) y no es un marcador/placeholder vacío.
 */
export function hasValidPetPhoto(pet?: { foto?: string } | null): boolean {
  if (!pet || !pet.foto) return false;
  const f = typeof pet.foto === 'string' ? pet.foto.trim() : '';
  if (!f || f === 'null' || f === 'undefined') return false;
  // Debe tener longitud representativa de una imagen (no solo un carácter o emoji)
  if (f.startsWith('data:image/') || f.startsWith('http://') || f.startsWith('https://')) {
    return f.length > 50;
  }
  return f.length > 20;
}

/**
 * Evaluación integral de cruce y porcentaje de afinidad para Modo Cruce
 * Coincidencia Exacta de Registro (70 pts): Si departamento, ciudad, especie, raza y color 100% son iguales.
 * El 30% restante corresponde a la Visión IA biométrica (Gemini).
 * NOTA: Los registros sin fotografía no participan en coincidencias / cruces.
 */
export function evaluatePetMatch(
  lost: {
    departamento?: string;
    ciudad?: string;
    especie?: string;
    raza?: string;
    tamano?: string;
    color: string;
    subColores?: string[];
    foto?: string;
  },
  found: {
    departamento?: string;
    ciudad?: string;
    especie?: string;
    raza?: string;
    tamano?: string;
    color: string;
    subColores?: string[];
    foto?: string;
  }
): {
  isMatch: boolean;
  isExactMatch: boolean;
  dataPoints: number; // 0 to 70
  affinityPercentage: number; // 0 to 70 (o hasta 100 con IA)
  reasons: string[];
  colorDetails: { isMatch: boolean; isExact: boolean; sharedColors: string[] };
} {
  const norm = (s?: string) => (s || '').trim().toLowerCase();

  // 0. Fotografía obligatoria en ambos registros: Si alguno no tiene foto válida -> 0% de inmediato
  if (!hasValidPetPhoto(lost) || !hasValidPetPhoto(found)) {
    return {
      isMatch: false,
      isExactMatch: false,
      dataPoints: 0,
      affinityPercentage: 0,
      reasons: [],
      colorDetails: { isMatch: false, isExact: false, sharedColors: [] }
    };
  }

  // 1. Especie idéntica obligatoria (Si no es la misma especie -> 0% de inmediato)
  if (!lost.especie || !found.especie || norm(lost.especie) !== norm(found.especie)) {
    return {
      isMatch: false,
      isExactMatch: false,
      dataPoints: 0,
      affinityPercentage: 0,
      reasons: [],
      colorDetails: { isMatch: false, isExact: false, sharedColors: [] }
    };
  }

  // 2. Color compatible obligatorio (Si los colores son incompatibles -> 0% de inmediato)
  const colorCheck = checkPetColorMatch(lost, found);
  if (!colorCheck.isMatch) {
    return {
      isMatch: false,
      isExactMatch: false,
      dataPoints: 0,
      affinityPercentage: 0,
      reasons: [],
      colorDetails: { isMatch: false, isExact: false, sharedColors: [] }
    };
  }

  const reasons: string[] = [];
  const sameDept = Boolean(lost.departamento && found.departamento && norm(lost.departamento) === norm(found.departamento));
  const sameCity = Boolean(lost.ciudad && found.ciudad && norm(lost.ciudad) === norm(found.ciudad));
  const sameSize = Boolean(lost.tamano && found.tamano && norm(lost.tamano) === norm(found.tamano));

  // Normalización de raza (criollo / mestizo / común europeo son equivalentes)
  const normBreedA = norm(lost.raza).replace(/mestizo|común europeo|comun europeo/g, 'criollo');
  const normBreedB = norm(found.raza).replace(/mestizo|común europeo|comun europeo/g, 'criollo');
  const sameBreed = Boolean(
    (lost.raza && found.raza && norm(lost.raza) === norm(found.raza)) ||
    normBreedA === normBreedB ||
    (normBreedA.includes('criollo') && normBreedB.includes('criollo'))
  );

  // Exact Match en datos de registro: departamento, ciudad/municipio, especie, raza y color 100% iguales
  const isExactDataMatch = Boolean(sameDept && sameCity && sameBreed && sameSize && colorCheck.isExact);

  // Ponderación de atributos morfológicos y geográficos (Hasta 70 puntos):
  // - Departamento: 20 pts
  // - Ciudad / Municipio: 15 pts
  // - Raza / Tipo racial: 15 pts
  // - Tamaño: 10 pts
  // - Color 100% idéntico: 10 pts (Color compatible parcial: 4 pts)
  let dataPoints = 0;

  if (sameDept) {
    dataPoints += 20;
    reasons.push(`Mismo departamento (${lost.departamento})`);
  }
  if (sameCity) {
    dataPoints += 15;
    reasons.push(`Mismo municipio (${lost.ciudad})`);
  }
  if (sameBreed) {
    dataPoints += 15;
    reasons.push(`Misma raza (${lost.raza || 'Criollo'})`);
  }
  if (sameSize) {
    dataPoints += 10;
    reasons.push(`Mismo tamaño (${lost.tamano})`);
  }
  if (colorCheck.isExact) {
    dataPoints += 10;
    reasons.push(`Color idéntico en registro (${formatPetColorDisplay(lost.color as any, lost.subColores as any)})`);
  } else if (colorCheck.sharedColors.length > 0) {
    dataPoints += 4;
    reasons.push(`Colores compatibles (${colorCheck.sharedColors.join(', ')})`);
  }

  return {
    isMatch: dataPoints >= 45, // Al menos departamento + municipio + raza o color compatible
    isExactMatch: isExactDataMatch,
    dataPoints,
    affinityPercentage: dataPoints, // 0 to 70
    reasons,
    colorDetails: { isMatch: colorCheck.isMatch, isExact: colorCheck.isExact, sharedColors: colorCheck.sharedColors }
  };
}

/**
 * Verifica si un animal coincide con el filtro de color seleccionado
 */
export function filterMatchesColor(
  petOrColor: string | { color: string; subColores?: string[] },
  selectedColorOrSubColores?: string | string[],
  selectedColorParam?: string
): boolean {
  let color = '';
  let subColores: string[] = [];
  let selected = '';

  if (typeof petOrColor === 'object') {
    color = petOrColor?.color || '';
    subColores = petOrColor?.subColores || [];
    selected = typeof selectedColorOrSubColores === 'string' ? selectedColorOrSubColores : '';
  } else {
    color = petOrColor || '';
    subColores = Array.isArray(selectedColorOrSubColores) ? selectedColorOrSubColores : [];
    selected = selectedColorParam || '';
  }

  if (!selected || selected === 'all') return true;
  if (!color) return false;

  const sel = selected.trim().toLowerCase();
  const petCol = color.trim().toLowerCase();

  // If matches primary label
  if (petCol === sel) return true;

  // If pet has sub-colors and user selected one of those sub-colors
  if (subColores && subColores.length > 0) {
    return subColores.some((c) => c.trim().toLowerCase() === sel);
  }

  return false;
}

export const ALL_SIZES = [
  'Pequeño',
  'Mediano',
  'Grande'
] as const;

export const ALL_SPECIES = [
  'Perro',
  'Gato',
  'Otro'
] as const;

export const POPULAR_DOG_BREEDS = [
  'Criollo / Mestizo',
  'Labrador Retriever',
  'Golden Retriever',
  'Bulldog Francés',
  'Poodle / Caniche',
  'Schnauzer',
  'Pastor Alemán',
  'Pitbull / American Bully',
  'Shih Tzu',
  'Beagle',
  'Pinscher',
  'Husky Siberiano',
  'Yorkshire Terrier',
  'Pug',
  'Pomerania',
  'Rottweiler',
  'Chihuahua',
  'Bóxer',
  'Cocker Spaniel'
];

export const POPULAR_CAT_BREEDS = [
  'Criollo / Mestizo / Común Europeo',
  'Siamés',
  'Persa',
  'Angora',
  'Maine Coon',
  'Bengala',
  'Ragdoll',
  'Azul Ruso',
  'Británico de Pelo Corto',
  'Sphynx (Sin pelo)',
  'Himalayo',
  'Bombay'
];
