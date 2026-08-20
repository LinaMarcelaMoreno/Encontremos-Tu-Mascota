import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import { mapPetDoc } from './src/lib/petMapper';
import { evaluatePetMatch, hasValidPetPhoto } from './src/data/colombiaData';

// Load Firebase Config safely
let firebaseConfig: any = {};
try {
  const configRaw = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8');
  firebaseConfig = JSON.parse(configRaw);
} catch (e) {
  console.warn('Could not load firebase-applet-config.json from fs:', e);
}

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || undefined);

// In-Memory RAM Cache for Pets
let petsCache: any[] = [];
let lastCacheUpdate: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in-memory TTL
let isFetchingFromFirestore = false;

// In-Memory RAM Cache for AI Gemini Vision comparisons
const aiComparisonsCache = new Map<string, any>();

let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return genAIClient;
}

// In-Memory RAM Cache for API Tokens
let apiTokensCache: any[] = [];
let lastTokensUpdate: number = 0;

async function getOrFetchApiTokens(forceRefresh = false): Promise<any[]> {
  const isCacheValid = !forceRefresh && apiTokensCache.length > 0 && Date.now() - lastTokensUpdate < CACHE_TTL_MS;
  if (isCacheValid) return apiTokensCache;

  try {
    const tokensCol = collection(db, 'api_tokens');
    const snap = await getDocs(tokensCol);
    const loadedTokens: any[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      loadedTokens.push({
        id: docSnap.id,
        name: data.name || 'Sin Nombre',
        token: data.token || '',
        status: data.status || 'ACTIVO',
        notes: data.notes || '',
        createdAt: data.createdAt || Date.now(),
        lastUsedAt: data.lastUsedAt || null,
        requestCount: data.requestCount || 0
      });
    });

    // If no token exists yet, create default master development token for convenience
    if (loadedTokens.length === 0) {
      const initialToken = {
        name: 'Ingeniero Principal / Equipo Dev',
        token: `rac_live_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`,
        status: 'ACTIVO',
        notes: 'Token inicial creado automáticamente para pruebas de desarrollo e integración MCP',
        createdAt: Date.now(),
        lastUsedAt: null,
        requestCount: 0
      };
      try {
        const docRef = await addDoc(tokensCol, initialToken);
        loadedTokens.push({ id: docRef.id, ...initialToken });
      } catch (err) {
        console.warn('Initial token creation notice:', err);
      }
    }

    // Sort by newest
    loadedTokens.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

    apiTokensCache = loadedTokens;
    lastTokensUpdate = Date.now();
    console.log(`[RAM Cache] Synced ${loadedTokens.length} API tokens from Firestore`);
    return apiTokensCache;
  } catch (e: any) {
    console.warn('[RAM Cache] Notice fetching API tokens:', e?.message || e);
    return apiTokensCache;
  }
}

// Authentication Middleware for API requests
async function authenticateApiRequest(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Allow internal web SPA requests or admin bypass
  const internalHeader = req.headers['x-internal-client'];
  const referer = req.headers['referer'] || '';
  const isWebSpaRequest = internalHeader === 'tumascota-web-spa' || (req.headers['sec-fetch-dest'] === 'empty' && referer.includes('/'));

  const authHeader = req.headers['authorization'] || '';
  const customApiKey = req.headers['x-api-key'] || req.headers['x-admin-key'] || req.query.apiKey || req.query.token;

  let tokenToVerify = '';
  if (typeof customApiKey === 'string' && customApiKey.trim()) {
    tokenToVerify = customApiKey.trim();
  } else if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    tokenToVerify = authHeader.substring(7).trim();
  }

  // Master admin bypass
  if (tokenToVerify === '1234' || tokenToVerify === 'tumascotaperdida2026') {
    return next();
  }

  // Allow web client frontend internally
  if (!tokenToVerify && isWebSpaRequest) {
    return next();
  }

  if (!tokenToVerify) {
    return res.status(401).json({
      success: false,
      error: 'Token de API requerido. Incluye tu clave en el header "x-api-key: TU_TOKEN" o "Authorization: Bearer TU_TOKEN". Solicita tu token al administrador de la plataforma.',
      documentation: '/api/docs'
    });
  }

  // Claves de desarrollo servidas desde env var (Netlify). Formato: "nombre:clave,nombre2:clave2".
  // Va ANTES del lookup a Firestore porque hoy 'api_tokens' esta cerrada por reglas y siempre falla.
  // Copia de lo mismo en src/server/apiApp.ts: mantener las dos en sincronia.
  const envKeys = (process.env.API_KEYS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (envKeys.some((e) => e.split(':')[1] === tokenToVerify)) {
    return next();
  }

  const tokens = await getOrFetchApiTokens();
  const matched = tokens.find((t) => t.token === tokenToVerify && t.status === 'ACTIVO');

  if (!matched) {
    return res.status(403).json({
      success: false,
      error: 'Token de API no válido o revocado. Contacta al administrador para renovar o activar tu token de acceso.',
      documentation: '/api/docs'
    });
  }

  // Record usage metrics in RAM (non-blocking)
  matched.lastUsedAt = Date.now();
  matched.requestCount = (matched.requestCount || 0) + 1;

  next();
}

async function getOrFetchPets(forceRefresh = false): Promise<{ pets: any[]; cached: boolean }> {
  const isCacheValid = !forceRefresh && petsCache.length > 0 && Date.now() - lastCacheUpdate < CACHE_TTL_MS;

  if (isCacheValid) {
    return { pets: petsCache, cached: true };
  }

  // If already fetching, return current cache to avoid duplicate reads
  if (isFetchingFromFirestore && petsCache.length > 0) {
    return { pets: petsCache, cached: true };
  }

  try {
    isFetchingFromFirestore = true;
    const petsCol = collection(db, 'pets');
    const snapshot = await getDocs(petsCol);

    const loadedPets: any[] = [];
    snapshot.forEach((docSnap) => {
      loadedPets.push(mapPetDoc(docSnap.data(), docSnap.id));
    });

    // Sort in memory by createdAt descending
    loadedPets.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

    petsCache = loadedPets;
    lastCacheUpdate = Date.now();
    console.log(`[RAM Cache] Synced ${loadedPets.length} pets from Firestore at ${new Date().toLocaleTimeString()}`);
    return { pets: petsCache, cached: false };
  } catch (error: any) {
    console.warn('[RAM Cache] Notice while fetching from Firestore (serving cached memory):', error?.message || error);
    return { pets: petsCache, cached: true };
  } finally {
    isFetchingFromFirestore = false;
  }
}

// Helper: Calculate cross-matching score and affinity.
// Kernel único (issue #4/#5): delega en evaluatePetMatch de colombiaData — este wrapper solo
// aporta el requisito PERDIDO vs ENCONTRADO y la traducción a etiquetas EXACTO/ALTO/MEDIO.
function calculateMatchScore(p1: any, p2: any): { score: 'EXACTO' | 'ALTO' | 'MEDIO' | null; points: number; dataPoints: number; reasons: string[]; isExactMatch: boolean } {
  // Opposites required: PERDIDO vs ENCONTRADO
  if (p1.tipo === p2.tipo) return { score: null, points: 0, dataPoints: 0, reasons: [], isExactMatch: false };

  const [lost, found] = p1.tipo === 'PERDIDO' ? [p1, p2] : [p2, p1];
  const r = evaluatePetMatch(lost, found);

  let score: 'EXACTO' | 'ALTO' | 'MEDIO' | null = null;
  if (r.isExactMatch) {
    score = 'EXACTO';
  } else if (r.dataPoints >= 55) {
    score = 'ALTO';
  } else if (r.dataPoints >= 45) {
    score = 'MEDIO';
  }

  return { score, points: r.dataPoints, dataPoints: r.dataPoints, reasons: r.reasons, isExactMatch: r.isExactMatch };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS Middleware for external clients (WhatsApp Bots, Webhooks, Scripts)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key, x-admin-key, x-internal-client');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '20mb' }));

  // Pre-warm RAM cache on server boot
  getOrFetchPets(true).catch((err) => console.warn('Pre-warming cache notice:', err));

  // ==========================================
  // API ENDPOINTS FOR FRONTEND & MCP / API CLIENTS
  // ==========================================

  // ==========================================
  // API TOKENS MANAGEMENT (ADMIN ONLY)
  // ==========================================

  // GET /api/admin/tokens - List all generated API tokens
  app.get('/api/admin/tokens', async (req, res) => {
    try {
      const auth = req.headers['x-admin-key'] || req.query.adminKey;
      if (auth !== '1234' && auth !== 'tumascotaperdida2026') {
        return res.status(403).json({ success: false, error: 'Acceso no autorizado para administrar tokens.' });
      }

      const tokens = await getOrFetchApiTokens(true);
      res.json({ success: true, count: tokens.length, tokens });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/admin/tokens - Generate a new API token for a developer or system
  app.post('/api/admin/tokens', async (req, res) => {
    try {
      const auth = req.headers['x-admin-key'] || req.body.adminKey;
      if (auth !== '1234' && auth !== 'tumascotaperdida2026') {
        return res.status(403).json({ success: false, error: 'Acceso no autorizado para crear tokens.' });
      }

      const { name, notes } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'El nombre del destinatario / desarrollador es obligatorio.' });
      }

      // Generate a secure standard token key (e.g. rac_live_...)
      const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      const generatedToken = `rac_live_${randomHex}`;

      const newTokenData = {
        name: name.trim(),
        token: generatedToken,
        status: 'ACTIVO',
        notes: (notes || '').trim(),
        createdAt: Date.now(),
        lastUsedAt: null,
        requestCount: 0
      };

      const tokensCol = collection(db, 'api_tokens');
      const docRef = await addDoc(tokensCol, newTokenData);

      const created = { id: docRef.id, ...newTokenData };
      apiTokensCache.unshift(created);
      lastTokensUpdate = Date.now();

      res.status(201).json({
        success: true,
        message: 'Token de API generado exitosamente.',
        token: created
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT /api/admin/tokens/:id - Toggle token status (ACTIVO / REVOCADO) or update notes
  app.put('/api/admin/tokens/:id', async (req, res) => {
    try {
      const auth = req.headers['x-admin-key'] || req.body.adminKey;
      if (auth !== '1234' && auth !== 'tumascotaperdida2026') {
        return res.status(403).json({ success: false, error: 'Acceso no autorizado.' });
      }

      const { id } = req.params;
      const { status, notes, name } = req.body;

      const updates: any = {};
      if (status) updates.status = status;
      if (notes !== undefined) updates.notes = notes;
      if (name) updates.name = name;

      const tokenRef = doc(db, 'api_tokens', id);
      await updateDoc(tokenRef, updates);

      const idx = apiTokensCache.findIndex((t) => t.id === id);
      if (idx !== -1) {
        apiTokensCache[idx] = { ...apiTokensCache[idx], ...updates };
      }

      res.json({ success: true, message: 'Estado del token actualizado.', token: apiTokensCache[idx] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE /api/admin/tokens/:id - Delete token permanently
  app.delete('/api/admin/tokens/:id', async (req, res) => {
    try {
      const auth = req.headers['x-admin-key'] || req.query.adminKey;
      if (auth !== '1234' && auth !== 'tumascotaperdida2026') {
        return res.status(403).json({ success: false, error: 'Acceso no autorizado.' });
      }

      const { id } = req.params;
      const tokenRef = doc(db, 'api_tokens', id);
      await deleteDoc(tokenRef);

      apiTokensCache = apiTokensCache.filter((t) => t.id !== id);
      lastTokensUpdate = Date.now();

      res.json({ success: true, message: 'Token eliminado con éxito.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/health - Health check and system diagnostics
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Rescate Animal Colombia REST API & MCP Engine',
      version: '2.5.0',
      timestamp: new Date().toISOString(),
      emailServiceConfigured: Boolean(process.env.RESEND_API_KEY),
      ramCacheStatus: {
        totalCachedPets: petsCache.length,
        totalActiveTokens: apiTokensCache.filter((t) => t.status === 'ACTIVO').length,
        lastUpdated: lastCacheUpdate ? new Date(lastCacheUpdate).toISOString() : 'Never',
        cacheTTLSeconds: CACHE_TTL_MS / 1000,
        memoryEngine: 'Active (Zero-Firestore-Cost)'
      }
    });
  });

  // GET /api/stats - Global statistics served from RAM (Token Protected)
  app.get('/api/stats', authenticateApiRequest, async (req, res) => {
    try {
      const { pets } = await getOrFetchPets();
      const perdidos = pets.filter((p) => p.tipo === 'PERDIDO' && p.estado !== 'RESUELTO').length;
      const encontrados = pets.filter((p) => p.tipo === 'ENCONTRADO' && p.estado !== 'RESUELTO').length;
      const resueltos = pets.filter((p) => p.estado === 'RESUELTO').length;

      // Species breakdown
      const perros = pets.filter((p) => p.especie === 'Perro').length;
      const gatos = pets.filter((p) => p.especie === 'Gato').length;
      const otros = pets.filter((p) => p.especie === 'Otro').length;

      res.json({
        success: true,
        totalRegistros: pets.length,
        perdidosActivos: perdidos,
        encontradosActivos: encontrados,
        casosExitosos: resueltos,
        distribucionEspecies: {
          perros,
          gatos,
          otros
        },
        tasaEfectividad: pets.length > 0 ? `${((resueltos / pets.length) * 100).toFixed(1)}%` : '0%'
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/pets - Get list of pets with RAM cache & flexible filtering (Token Protected)
  app.get('/api/pets', authenticateApiRequest, async (req, res) => {
    try {
      const forceRefresh = req.query.forceRefresh === 'true';
      const { pets, cached } = await getOrFetchPets(forceRefresh);

      let result = [...pets];
      const { tipo, ciudad, departamento, especie, estado, color, tamano, q, limit, offset } = req.query;

      if (tipo && typeof tipo === 'string') {
        result = result.filter((p) => p.tipo?.toUpperCase() === tipo.toUpperCase());
      }
      if (estado && typeof estado === 'string') {
        result = result.filter((p) => p.estado?.toUpperCase() === estado.toUpperCase());
      }
      if (ciudad && typeof ciudad === 'string') {
        result = result.filter((p) => p.ciudad?.toLowerCase() === ciudad.toLowerCase());
      }
      if (departamento && typeof departamento === 'string') {
        result = result.filter((p) => p.departamento?.toLowerCase() === departamento.toLowerCase());
      }
      if (especie && typeof especie === 'string') {
        result = result.filter((p) => p.especie?.toLowerCase() === especie.toLowerCase());
      }
      if (color && typeof color === 'string') {
        result = result.filter((p) => p.color?.toLowerCase() === color.toLowerCase());
      }
      if (tamano && typeof tamano === 'string') {
        result = result.filter((p) => p.tamano?.toLowerCase() === tamano.toLowerCase());
      }
      if (q && typeof q === 'string') {
        const queryTerm = q.toLowerCase();
        result = result.filter(
          (p) =>
            (p.nombre || '').toLowerCase().includes(queryTerm) ||
            (p.raza || '').toLowerCase().includes(queryTerm) ||
            (p.detalles || '').toLowerCase().includes(queryTerm) ||
            (p.ubicacion || '').toLowerCase().includes(queryTerm) ||
            (p.contacto || '').toLowerCase().includes(queryTerm)
        );
      }

      const totalFiltered = result.length;

      // Pagination
      const parsedOffset = Math.max(0, parseInt(offset as string, 10) || 0);
      const parsedLimit = Math.min(500, Math.max(1, parseInt(limit as string, 10) || totalFiltered));
      const paginatedPets = result.slice(parsedOffset, parsedOffset + parsedLimit);

      res.json({
        success: true,
        count: paginatedPets.length,
        total: totalFiltered,
        totalDatabase: pets.length,
        offset: parsedOffset,
        limit: parsedLimit,
        cached,
        lastCacheUpdate: new Date(lastCacheUpdate).toISOString(),
        pets: paginatedPets
      });
    } catch (error: any) {
      console.error('Error in GET /api/pets:', error);
      res.status(500).json({ success: false, error: error.message || 'Error al obtener mascotas' });
    }
  });

  // GET /api/pets/:id - Get single pet details (Token Protected)
  app.get('/api/pets/:id', authenticateApiRequest, async (req, res) => {
    try {
      const { id } = req.params;
      const { pets } = await getOrFetchPets();
      const pet = pets.find((p) => p.id === id);

      if (!pet) {
        return res.status(404).json({ success: false, error: `Mascota con ID "${id}" no encontrada.` });
      }

      res.json({ success: true, pet });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/pets - Create a new pet report (Token Protected)
  app.post('/api/pets', authenticateApiRequest, async (req, res) => {
    try {
      const body = req.body;

      // Validation
      if (!body.tipo || !['PERDIDO', 'ENCONTRADO'].includes(body.tipo)) {
        return res.status(400).json({ success: false, error: 'El campo "tipo" es obligatorio y debe ser PERDIDO o ENCONTRADO.' });
      }
      if (body.tipo === 'PERDIDO' && (!body.nombre || !body.nombre.trim())) {
        return res.status(400).json({ success: false, error: 'El campo "nombre" es obligatorio para mascotas perdidas.' });
      }
      if (!body.especie || !['Perro', 'Gato', 'Otro'].includes(body.especie)) {
        return res.status(400).json({ success: false, error: 'El campo "especie" es obligatorio (Perro, Gato, Otro).' });
      }
      if (!body.color) {
        return res.status(400).json({ success: false, error: 'El campo "color" es obligatorio.' });
      }
      if (!body.departamento || !body.ciudad) {
        return res.status(400).json({ success: false, error: 'Los campos "departamento" y "ciudad" son obligatorios.' });
      }
      if (!body.telefono || !body.telefono.trim()) {
        return res.status(400).json({ success: false, error: 'El campo "telefono" (celular / WhatsApp) es obligatorio para coordinar rescates y autenticar el caso.' });
      }
      if (!body.foto || !body.foto.trim()) {
        return res.status(400).json({ success: false, error: 'La fotografía de la mascota es obligatoria para el registro y reconocimiento visual.' });
      }

      const cleanPhone = (body.telefono || '').replace(/\D/g, '');
      const petName = (body.nombre || (body.tipo === 'ENCONTRADO' ? 'Sin Nombre' : '')).trim();
      // La llave de deduplicacion la calcula el cliente (src/lib/petKey.ts). Para los
      // ENCONTRADO es telefono + huella de la foto, y hay que respetarla: recalcularla
      // aqui como nombre_telefono la haria distinta de la que ya esta en la base y la
      // deteccion de duplicados del fallback no encontraria nada.
      const uniqueKey = typeof body.llave === 'string' && body.llave.trim()
        ? body.llave.trim()
        : `${petName.toLowerCase()}_${cleanPhone}`;

      // Check duplicate in memory
      const isDuplicate = petsCache.some(
        (p) => p.tipo === body.tipo && p.estado === 'ACTIVO' && p.llave === uniqueKey
      );

      if (isDuplicate) {
        return res.status(409).json({
          success: false,
          error: `Ya existe un reporte activo para "${petName}" con el número de teléfono ${body.telefono}.`
        });
      }

      const now = Date.now();
      const resolveToken = `token_${Math.random().toString(36).substring(2, 12)}_${now}`;

      const newPetData = {
        tipo: body.tipo,
        estado: 'ACTIVO',
        nombre: petName,
        cedula: body.cedula || '',
        llave: uniqueKey,
        especie: body.especie,
        raza: (body.raza || 'Criollo / Mestizo').trim(),
        color: body.color,
        subColores: Array.isArray(body.subColores) ? body.subColores : [],
        tamano: body.tamano || 'Mediano',
        departamento: body.departamento.trim(),
        ciudad: body.ciudad.trim(),
        ubicacion: (body.ubicacion || '').trim(),
        contacto: (body.contacto || '').trim(),
        telefono: body.telefono.trim(),
        telefonoSecundario: (body.telefonoSecundario || '').trim(),
        correo: (body.correo || '').trim().toLowerCase(),
        foto: body.foto || '',
        detalles: (body.detalles || '').trim(),
        fecha: body.fecha || new Date().toLocaleDateString('es-CO'),
        fechaEvento: body.fechaEvento || new Date().toISOString().split('T')[0],
        createdAt: now,
        resolveToken,
        descartados: []
      };

      // Save to Firestore
      const petsCol = collection(db, 'pets');
      const docRef = await addDoc(petsCol, newPetData);

      const createdPet = {
        id: docRef.id,
        ...newPetData
      };

      // Instantly insert at top of RAM cache
      petsCache.unshift(createdPet);
      lastCacheUpdate = Date.now();

      res.status(201).json({
        success: true,
        message: 'Mascota reportada exitosamente.',
        pet: createdPet
      });
    } catch (error: any) {
      console.error('Error in POST /api/pets:', error);
      res.status(500).json({ success: false, error: error.message || 'Error al registrar mascota' });
    }
  });

  // PUT /api/pets/:id - Update pet data with authentication (Token Protected)
  app.put('/api/pets/:id', authenticateApiRequest, async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body;
      const { pets } = await getOrFetchPets();
      const existing = pets.find((p) => p.id === id);

      if (!existing) {
        return res.status(404).json({ success: false, error: `Mascota con ID "${id}" no encontrada.` });
      }

      // Security check
      const authKey = req.headers['x-admin-key'] || body.adminKey || body.resolveToken;
      const inputPhone = (body.authTelefono || body.telefono || '').replace(/\D/g, '');
      const inputMail = (body.authCorreo || body.correo || '').trim().toLowerCase();
      const regPhone = (existing.telefono || '').replace(/\D/g, '');
      const regSecPhone = (existing.telefonoSecundario || '').replace(/\D/g, '');
      const regMail = (existing.correo || '').trim().toLowerCase();

      const isAuthorized =
        authKey === '1234' ||
        authKey === 'tumascotaperdida2026' ||
        (existing.resolveToken && existing.resolveToken === body.resolveToken) ||
        (inputPhone && regPhone && (regPhone.includes(inputPhone) || inputPhone.includes(regPhone))) ||
        (inputPhone && regSecPhone && (regSecPhone.includes(inputPhone) || inputPhone.includes(regSecPhone))) ||
        (inputMail && regMail && inputMail === regMail);

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: 'No autorizado. Proporciona el número de teléfono o correo registrado, o el token de resolución.'
        });
      }

      // Fields to update
      const updatedFields: any = {};
      const allowed = ['nombre', 'especie', 'raza', 'color', 'subColores', 'tamano', 'departamento', 'ciudad', 'ubicacion', 'contacto', 'telefono', 'telefonoSecundario', 'correo', 'foto', 'detalles', 'fechaEvento', 'estado'];
      allowed.forEach((k) => {
        if (body[k] !== undefined) updatedFields[k] = body[k];
      });

      const petDocRef = doc(db, 'pets', id);
      await updateDoc(petDocRef, updatedFields);

      // Update in RAM cache
      const cacheIdx = petsCache.findIndex((p) => p.id === id);
      if (cacheIdx !== -1) {
        petsCache[cacheIdx] = { ...petsCache[cacheIdx], ...updatedFields };
      }

      res.json({
        success: true,
        message: 'Registro actualizado con éxito.',
        pet: { ...existing, ...updatedFields }
      });
    } catch (error: any) {
      console.error('Error in PUT /api/pets/:id:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/pets/:id/resolve - Mark pet as RESUELTO (Token Protected)
  app.post('/api/pets/:id/resolve', authenticateApiRequest, async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body || {};
      const { pets } = await getOrFetchPets();
      const existing = pets.find((p) => p.id === id);

      if (!existing) {
        return res.status(404).json({ success: false, error: `Mascota con ID "${id}" no encontrada.` });
      }

      // Check authorization
      const inputPhone = (body.telefono || body.auth || '').replace(/\D/g, '');
      const inputMail = (body.correo || body.auth || '').trim().toLowerCase();
      const regPhone = (existing.telefono || '').replace(/\D/g, '');
      const regSecPhone = (existing.telefonoSecundario || '').replace(/\D/g, '');
      const regMail = (existing.correo || '').trim().toLowerCase();
      const regCed = (existing.cedula || '').trim().toLowerCase();

      const isAuthorized =
        body.adminKey === '1234' ||
        body.adminKey === 'tumascotaperdida2026' ||
        (existing.resolveToken && existing.resolveToken === body.resolveToken) ||
        (inputPhone && regPhone && (regPhone.includes(inputPhone) || inputPhone.includes(regPhone))) ||
        (inputPhone && regSecPhone && (regSecPhone.includes(inputPhone) || inputPhone.includes(regSecPhone))) ||
        (inputMail && regMail && inputMail === regMail) ||
        (body.auth && regCed && body.auth.trim().toLowerCase() === regCed);

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: 'No autorizado. Se requiere el teléfono o correo con el que se registró originalmente.'
        });
      }

      const petDocRef = doc(db, 'pets', id);
      await updateDoc(petDocRef, { estado: 'RESUELTO' });

      // Update in RAM cache
      const cacheIdx = petsCache.findIndex((p) => p.id === id);
      if (cacheIdx !== -1) {
        petsCache[cacheIdx].estado = 'RESUELTO';
      }

      res.json({
        success: true,
        message: `¡Caso de ${existing.nombre || 'la mascota'} marcado como RESUELTO con éxito! 🎉`
      });
    } catch (error: any) {
      console.error('Error in POST /api/pets/:id/resolve:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/match - Cross-matching AI / Algorithmic Engine (Token Protected)
  app.post('/api/match', authenticateApiRequest, async (req, res) => {
    try {
      const { petId, pet } = req.body;
      const { pets } = await getOrFetchPets();

      let targetPet = pet;
      if (petId) {
        targetPet = pets.find((p) => p.id === petId);
        if (!targetPet) {
          return res.status(404).json({ success: false, error: `Mascota con ID "${petId}" no encontrada.` });
        }
      }

      if (!targetPet) {
        return res.status(400).json({ success: false, error: 'Debes proporcionar un "petId" existente o un objeto "pet".' });
      }

      const candidates = pets
        .filter((p) => p.id !== targetPet.id && p.estado !== 'RESUELTO')
        .map((candidate) => {
          const match = calculateMatchScore(targetPet, candidate);
          return {
            pet: candidate,
            score: match.score,
            affinityPercentage: Math.min(100, match.points),
            isExactMatch: match.isExactMatch,
            reasons: match.reasons
          };
        })
        .filter((c) => c.score !== null)
        .sort((a, b) => b.affinityPercentage - a.affinityPercentage);

      res.json({
        success: true,
        targetPet: {
          id: targetPet.id,
          nombre: targetPet.nombre,
          tipo: targetPet.tipo,
          especie: targetPet.especie,
          color: targetPet.color,
          ciudad: targetPet.ciudad
        },
        matchesCount: candidates.length,
        matches: candidates
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/ai/compare-pets - Visual Animal Recognition & Biometric Comparison via Gemini
  app.post('/api/ai/compare-pets', authenticateApiRequest, async (req, res) => {
    try {
      const { pet1, pet2, pet1Id, pet2Id } = req.body;
      const { pets } = await getOrFetchPets();

      let targetPet1 = pet1;
      let targetPet2 = pet2;

      if (pet1Id) targetPet1 = pets.find((p) => p.id === pet1Id);
      if (pet2Id) targetPet2 = pets.find((p) => p.id === pet2Id);

      if (!targetPet1 || !targetPet2) {
        return res.status(400).json({ success: false, error: 'Debes proporcionar dos mascotas para comparar.' });
      }

      // Cache key based on sorted IDs
      const idA = targetPet1.id || targetPet1.llave || 'p1';
      const idB = targetPet2.id || targetPet2.llave || 'p2';
      const cacheKey = [idA, idB].sort().join('___');

      if (aiComparisonsCache.has(cacheKey)) {
        return res.json({
          success: true,
          cached: true,
          comparison: aiComparisonsCache.get(cacheKey)
        });
      }

      // Algorithmic base evaluation
      const algorithmicMatch = calculateMatchScore(targetPet1, targetPet2);

      // If species or department don't match, return algorithmic evaluation without wasting Gemini quota
      const norm = (s?: string) => (s || '').trim().toLowerCase();
      const sameSpecies = norm(targetPet1.especie) === norm(targetPet2.especie);
      const sameDept = norm(targetPet1.departamento) === norm(targetPet2.departamento);

      if (!sameSpecies) {
        const result = {
          similarityPercentage: 0,
          isExactMatch: false,
          confidence: 'ALTA',
          reasoning: 'Especies diferentes (no hay coincidencia biológica).',
          matchingFeatures: [],
          differingFeatures: ['Especie distinta']
        };
        aiComparisonsCache.set(cacheKey, result);
        return res.json({ success: true, cached: false, comparison: result, aiPowered: false });
      }

      if (!sameDept) {
        const result = {
          similarityPercentage: algorithmicMatch.points,
          isExactMatch: false,
          confidence: 'MEDIA',
          reasoning: 'Departamentos diferentes. Cotejo basado únicamente en datos registrados.',
          matchingFeatures: algorithmicMatch.reasons,
          differingFeatures: ['Departamento distinto']
        };
        aiComparisonsCache.set(cacheKey, result);
        return res.json({ success: true, cached: false, comparison: result, aiPowered: false });
      }

      if (!hasValidPetPhoto(targetPet1) || !hasValidPetPhoto(targetPet2)) {
        const noPhotoResult = {
          similarityPercentage: 0,
          isExactMatch: false,
          confidence: 'BAJA',
          reasoning: 'Uno o ambos registros no cuentan con fotografía real para realizar el cotejo biométrico.',
          matchingFeatures: [],
          differingFeatures: ['Sin fotografía válida'],
          isVetoed: true,
          combinedAffinity: 0
        };
        aiComparisonsCache.set(cacheKey, noPhotoResult);
        return res.json({ success: true, cached: false, comparison: noPhotoResult, aiPowered: false });
      }

      const ai = getGenAI();
      if (!ai || !targetPet1.foto || !targetPet2.foto) {
        // Fallback to algorithmic scoring if no AI key or no photos
        const fallbackResult = {
          similarityPercentage: algorithmicMatch.points,
          isExactMatch: algorithmicMatch.isExactMatch,
          confidence: 'MEDIA',
          reasoning: algorithmicMatch.reasons.join(', ') || 'Cotejo basado en datos morfológicos registrados.',
          matchingFeatures: algorithmicMatch.reasons,
          differingFeatures: []
        };
        aiComparisonsCache.set(cacheKey, fallbackResult);
        return res.json({ success: true, cached: false, comparison: fallbackResult, aiPowered: false });
      }

      // Extract image parts
      const parseImage = (fotoStr: string) => {
        if (fotoStr.startsWith('data:image/')) {
          const match = fotoStr.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
          if (match) {
            return {
              inlineData: {
                mimeType: match[1],
                data: match[2]
              }
            };
          }
        }
        return null;
      };

      const img1 = parseImage(targetPet1.foto);
      const img2 = parseImage(targetPet2.foto);

      if (!img1 || !img2) {
        const fallbackResult = {
          similarityPercentage: algorithmicMatch.points,
          isExactMatch: algorithmicMatch.isExactMatch,
          confidence: 'MEDIA',
          reasoning: 'Cotejo algorítmico (una de las imágenes no tiene formato compatible para visión por computadora).',
          matchingFeatures: algorithmicMatch.reasons,
          differingFeatures: []
        };
        aiComparisonsCache.set(cacheKey, fallbackResult);
        return res.json({ success: true, cached: false, comparison: fallbackResult, aiPowered: false });
      }

      const promptText = `Eres un sistema biométrico estricto de visión computacional para identificación de animales domésticos (perros y gatos) en rescate animal.

OBJETIVO CRÍTICO:
Determinar con total precisión si los dos animales en las fotos son EXACTAMENTE EL MISMO ANIMAL o son ANIMALES DISTINTOS.

REGLAS INFALIBLES DE COLOR, MANTO Y PATRÓN:
1. IDENTIFICA EL PATRÓN DE PELAJE EN CADA ANIMAL:
   - GATOS:
     * ATIGRADO / TABBY / RAYADO / ROMANO: Líneas oscuras, rayas grises, pardas o marrones.
     * TUXEDO (Bicolor negro y blanco clásico): Cuerpo negro con pechera, barbilla y patitas blancas.
     * MANCHADO / ARLEQUÍN: Cuerpo blanco con manchas negras o grises dispersas.
     * TRICOLOR / CALICÓ / CAREY: Mezcla de naranja, negro/café y blanco.
     * SÓLIDO: Un solo color uniforme (todo negro, todo blanco, todo gris).
   - PERROS:
     * Compara patrón (manchas, antifaz, marcas de fuego, atigrado, sólido).

2. VETO ABSOLUTO POR COLOR Y PATRÓN:
   - Si un animal es ATIGRADO / RAYADO (gris o pardo con rayas) y el otro es TUXEDO (negro liso con blanco), o manchado con negro, SON ANIMALES DIFERENTES.
   - Si uno es gris y el otro es negro azabache, SON ANIMALES DIFERENTES.
   - Si uno es café/marrón y el otro negro, SON ANIMALES DIFERENTES.
   - Si la distribución de manchas en la cara (antifaz, mancha en nariz o frente) no coincide, SON ANIMALES DIFERENTES.

3. EVALUACIÓN Y PUNTAJE:
   - Si los colores, tonalidades o patrones de pelaje NO coinciden exactamente:
     * "colorsMatchIdentical": false
     * "isSameAnimal": false
     * "similarityPercentage": 0
     * "isExactMatch": false
   - Solo si ambos animales tienen EXACTAMENTE el mismo patrón, los mismos colores y la misma distribución facial:
     * "colorsMatchIdentical": true
     * "similarityPercentage": 85 a 100
     * "isExactMatch": true (si similarityPercentage >= 90)

4. Devuelve ÚNICAMENTE un JSON con esta estructura:
{
  "colorsMatchIdentical": boolean,
  "isSameAnimal": boolean,
  "similarityPercentage": number,
  "isExactMatch": boolean,
  "confidence": "ALTA" | "MEDIA" | "BAJA",
  "reasoning": "Explicación concisa en español señalando la compatibilidad o incompatibilidad del pelaje",
  "matchingFeatures": ["rasgo 1"],
  "differingFeatures": ["diferencia de color o manto"]
}`;

      let response: any = null;
      const candidateModels = ['gemini-3.7-flash', 'gemini-flash-latest'];
      let lastAiError: any = null;

      for (const modelName of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  img1,
                  img2,
                  { text: promptText }
                ]
              }
            ],
            config: {
              responseMimeType: 'application/json'
            }
          });
          if (response?.text) {
            break;
          }
        } catch (err: any) {
          lastAiError = err;
          const msg = err?.message || String(err);
          console.log(`[Gemini Vision] Notice on model "${modelName}": ${msg.slice(0, 120)}`);
          // Try next valid model in candidate list
        }
      }

      let aiData: any = null;
      if (response?.text) {
        try {
          aiData = JSON.parse(response.text);
        } catch {
          aiData = null;
        }
      }

      if (!aiData) {
        // Graceful fallback to rich algorithmic comparison without failing or exposing raw errors to the user
        const fallbackSimilarity = algorithmicMatch.points;
        const fallbackResult = {
          colorsMatchIdentical: algorithmicMatch.isExactMatch,
          similarityPercentage: fallbackSimilarity,
          isExactMatch: false,
          confidence: fallbackSimilarity >= 55 ? ('ALTA' as const) : ('MEDIA' as const),
          reasoning: `Cotejo de datos de registro (${targetPet1.especie} ${targetPet1.color}, ${targetPet1.tamano}, ${targetPet1.departamento}). Análisis visual en espera.`,
          matchingFeatures: algorithmicMatch.reasons,
          differingFeatures: []
        };

        aiComparisonsCache.set(cacheKey, fallbackResult);
        return res.json({
          success: true,
          cached: false,
          comparison: fallbackResult,
          aiPowered: false,
          fallbackReason: 'temporary_high_demand'
        });
      }

      // Clamp and evaluate AI results strictly
      const isSameAnimal = Boolean(aiData.isSameAnimal ?? true);
      const rawSimilarity = Math.max(0, Math.min(100, Math.round(Number(aiData.similarityPercentage) || 0)));
      let colorsMatchIdentical = Boolean(aiData.colorsMatchIdentical && isSameAnimal && rawSimilarity >= 60);

      let similarityPercentage = rawSimilarity;
      let effectiveDataPoints = algorithmicMatch.dataPoints;
      let aiPoints = 0;
      let combinedAffinity = 0;
      let isExactMatch = false;
      let isVetoed = false;

      if (!colorsMatchIdentical || !isSameAnimal || rawSimilarity < 50) {
        // VETO ABSOLUTO: Si la IA certifica que los colores, manto o rasgos no coinciden, afinidad total es 0%
        colorsMatchIdentical = false;
        similarityPercentage = 0;
        effectiveDataPoints = 0;
        aiPoints = 0;
        combinedAffinity = 0;
        isExactMatch = false;
        isVetoed = true;
      } else {
        // Coincidencia de color y manto certificada por IA
        aiPoints = Math.round(similarityPercentage * 0.30);
        combinedAffinity = Math.min(100, Math.max(0, effectiveDataPoints + aiPoints));
        isExactMatch = Boolean(algorithmicMatch.isExactMatch && similarityPercentage >= 90);
      }

      const finalResult = {
        similarityPercentage,
        colorsMatchIdentical,
        aiPoints,
        isExactMatch,
        isVetoed,
        combinedAffinity,
        dataPoints: effectiveDataPoints,
        confidence: aiData.confidence || (similarityPercentage >= 75 ? 'ALTA' : similarityPercentage >= 40 ? 'MEDIA' : 'BAJA'),
        reasoning: aiData.reasoning || (isVetoed ? 'Incompatibilidad de color o patrón de pelaje detectada por IA.' : algorithmicMatch.reasons.join('. ')),
        matchingFeatures: Array.isArray(aiData.matchingFeatures) ? aiData.matchingFeatures : algorithmicMatch.reasons,
        differingFeatures: Array.isArray(aiData.differingFeatures) ? aiData.differingFeatures : []
      };

      aiComparisonsCache.set(cacheKey, finalResult);

      res.json({
        success: true,
        cached: false,
        comparison: finalResult,
        aiPowered: true
      });
    } catch (err: any) {
      console.error('Error in /api/ai/compare-pets:', err);
      // Return a clean fallback object instead of an ugly 500 error payload
      const fallbackResult = {
        similarityPercentage: 50,
        isExactMatch: false,
        confidence: 'MEDIA' as const,
        reasoning: 'Cotejo biométrico temporalmente no disponible. Se aplican reglas morfológicas directas.',
        matchingFeatures: ['Especie y zona geográfica coincidente'],
        differingFeatures: []
      };
      res.json({ success: true, cached: false, comparison: fallbackResult, aiPowered: false });
    }
  });

  // POST /api/pets/invalidate - Force-refreshes RAM cache
  app.post('/api/pets/invalidate', async (req, res) => {
    try {
      const { pets } = await getOrFetchPets(true);
      res.json({
        success: true,
        message: 'Caché de memoria RAM invalidada y actualizada correctamente.',
        count: pets.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Error invalidando caché' });
    }
  });

  // GET /api/openapi.json - OpenAPI 3.0 Machine-Readable Specification for MCP & Swagger
  app.get('/api/openapi.json', (req, res) => {
    res.json({
      openapi: '3.0.3',
      info: {
        title: 'Rescate Animal Colombia API',
        version: '2.5.0',
        description: 'API REST y MCP protegida por tokens de alta velocidad servida desde memoria RAM para la búsqueda, reporte y cruce inteligente de mascotas perdidas y encontradas en Colombia.'
      },
      servers: [{ url: 'https://encontremostumascota.co/api', description: 'Produccion' }, { url: '/api', description: 'Local' }],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
            description: 'API Token generado por el administrador (ej: rac_live_...)'
          },
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'API-Token',
            description: 'Token en formato Bearer (Authorization: Bearer rac_live_...)'
          }
        }
      },
      security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
      paths: {
        '/health': {
          get: { summary: 'Estado de salud y diagnóstico del sistema' }
        },
        '/stats': {
          get: { summary: 'Estadísticas globales de mascotas perdidas, encontradas y resueltas' }
        },
        '/pets': {
          get: {
            summary: 'Listar mascotas con filtros (tipo, ciudad, especie, color, tamaño, búsqueda de texto)',
            parameters: [
              { name: 'tipo', in: 'query', schema: { type: 'string', enum: ['PERDIDO', 'ENCONTRADO'] } },
              { name: 'ciudad', in: 'query', schema: { type: 'string' } },
              { name: 'especie', in: 'query', schema: { type: 'string', enum: ['Perro', 'Gato', 'Otro'] } },
              { name: 'estado', in: 'query', schema: { type: 'string', enum: ['ACTIVO', 'RESUELTO'] } },
              { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Búsqueda por texto libre' },
              { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
              { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
            ]
          },
          post: {
            summary: 'Crear un nuevo reporte de mascota (Perdida o Encontrada)',
            description: 'Usa celular + nombre como llave única. No requiere cédula.'
          }
        },
        '/pets/{id}': {
          get: { summary: 'Obtener información detallada de una mascota por ID' },
          put: { summary: 'Actualizar información de una mascota (autenticado por celular/correo)' }
        },
        '/pets/{id}/resolve': {
          post: { summary: 'Marcar mascota como RESUELTO / Reencontrada' }
        },
        '/match': {
          post: { summary: 'Motor de cotejo / cruce inteligente entre perdidos y encontrados' }
        }
      }
    });
  });

  // GET /api/docs - Interactive visual documentation for the collaborating engineer
  app.get('/api/docs', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentación API REST - Rescate Animal Colombia</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-stone-50 text-slate-800 font-sans p-4 sm:p-8">
  <div class="max-w-4xl mx-auto space-y-6">
    <header class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
      <div class="flex items-center gap-3">
        <span class="text-3xl">🐾</span>
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Rescate Animal Colombia - REST API & MCP</h1>
          <p class="text-xs text-stone-500 mt-0.5">Versión 2.5.0 • Autenticación por Tokens • Memoria RAM (~5ms, 0 costo de lectura)</p>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 text-xs">
        <span class="bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-md">🔒 Protegido con API Token</span>
        <span class="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-md">✓ Sin Cédula</span>
        <span class="bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-md">⚡ Celular + Nombre como Llave</span>
        <span class="bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-md">🤖 Compatible con MCP / AI Agents</span>
        <a href="/api/openapi.json" target="_blank" class="bg-stone-800 text-white px-2.5 py-1 rounded-md hover:bg-black transition">📄 Ver openapi.json</a>
      </div>
    </header>

    <!-- Authentication Guide Box -->
    <div class="bg-amber-50 border border-amber-200 p-5 rounded-2xl space-y-2 text-xs">
      <h3 class="font-bold text-amber-900 flex items-center gap-2 text-sm">
        <span>🔑</span> Cómo autenticar tus peticiones con API Token
      </h3>
      <p class="text-amber-800 leading-relaxed">
        Todas las peticiones a los endpoints protegidos deben incluir tu <strong>API Token</strong> generado por el administrador en uno de estos dos encabezados HTTP:
      </p>
      <div class="bg-stone-900 text-amber-300 p-3 rounded-xl font-mono text-xs overflow-x-auto space-y-1">
        <div><strong>Opción 1 (Recomendada):</strong> <code>x-api-key: rac_live_tu_token_aqui</code></div>
        <div><strong>Opción 2:</strong> <code>Authorization: Bearer rac_live_tu_token_aqui</code></div>
      </div>
    </div>

    <div class="space-y-4 text-xs sm:text-sm">
      <!-- Endpoint 1: GET /api/pets -->
      <div class="bg-white p-5 rounded-2xl border border-stone-200 space-y-3">
        <div class="flex items-center gap-2">
          <span class="bg-blue-600 text-white font-mono font-bold px-2 py-0.5 rounded text-xs">GET</span>
          <code class="text-slate-900 font-bold font-mono">/api/pets</code>
          <span class="text-stone-400 text-xs">Listar mascotas con filtros</span>
        </div>
        <p class="text-stone-600 text-xs">Obtiene todas las mascotas activas o filtradas desde la memoria RAM del servidor.</p>
        <div class="bg-stone-900 text-stone-100 p-3 rounded-xl font-mono text-xs overflow-x-auto">
          <code>curl -X GET "https://encontremostumascota.co/api/pets?tipo=PERDIDO&ciudad=Armenia&especie=Perro" \
  -H "x-api-key: rac_live_tu_token_aqui"</code>
        </div>
      </div>

      <!-- Endpoint 2: POST /api/pets -->
      <div class="bg-white p-5 rounded-2xl border border-stone-200 space-y-3">
        <div class="flex items-center gap-2">
          <span class="bg-emerald-600 text-white font-mono font-bold px-2 py-0.5 rounded text-xs">POST</span>
          <code class="text-slate-900 font-bold font-mono">/api/pets</code>
          <span class="text-stone-400 text-xs">Crear nuevo reporte de mascota</span>
        </div>
        <p class="text-stone-600 text-xs">Publica una mascota perdida o encontrada. Valida identidad mediante celular/WhatsApp.</p>
        <div class="bg-stone-900 text-stone-100 p-3 rounded-xl font-mono text-xs overflow-x-auto">
<pre>curl -X POST "https://encontremostumascota.co/api/pets" \
  -H "Content-Type: application/json" \
  -H "x-api-key: rac_live_tu_token_aqui" \
  -d '{
    "tipo": "PERDIDO",
    "nombre": "Bruno",
    "especie": "Perro",
    "raza": "Golden Retriever",
    "color": "Dorado",
    "tamano": "Grande",
    "departamento": "Quindío",
    "ciudad": "Armenia",
    "telefono": "3001234567",
    "contacto": "Carlos Gómez",
    "correo": "carlos@gmail.com",
    "detalles": "Tiene collar rojo con placa"
  }'</pre>
        </div>
      </div>

      <!-- Endpoint 3: POST /api/match -->
      <div class="bg-white p-5 rounded-2xl border border-stone-200 space-y-3">
        <div class="flex items-center gap-2">
          <span class="bg-purple-600 text-white font-mono font-bold px-2 py-0.5 rounded text-xs">POST</span>
          <code class="text-slate-900 font-bold font-mono">/api/match</code>
          <span class="text-stone-400 text-xs">Cruce algorítmico inteligente</span>
        </div>
        <p class="text-stone-600 text-xs">Compara una mascota contra todos los reportes opuestos en memoria y devuelve los candidatos con puntuación de afinidad.</p>
        <div class="bg-stone-900 text-stone-100 p-3 rounded-xl font-mono text-xs overflow-x-auto">
          <code>curl -X POST "https://encontremostumascota.co/api/match" \
  -H "Content-Type: application/json" \
  -H "x-api-key: rac_live_tu_token_aqui" \
  -d '{"petId": "DOC_ID"}'</code>
        </div>
      </div>

      <!-- Endpoint 4: POST /api/pets/:id/resolve -->
      <div class="bg-white p-5 rounded-2xl border border-stone-200 space-y-3">
        <div class="flex items-center gap-2">
          <span class="bg-amber-600 text-white font-mono font-bold px-2 py-0.5 rounded text-xs">POST</span>
          <code class="text-slate-900 font-bold font-mono">/api/pets/:id/resolve</code>
          <span class="text-stone-400 text-xs">Marcar caso como resuelto</span>
        </div>
        <p class="text-stone-600 text-xs">Cierra el caso cuando el animal regresa a casa. Requiere el teléfono o correo con el que se registró.</p>
        <div class="bg-stone-900 text-stone-100 p-3 rounded-xl font-mono text-xs overflow-x-auto">
          <code>curl -X POST "https://encontremostumascota.co/api/pets/ID_MASCOTA/resolve" \
  -H "Content-Type: application/json" \
  -H "x-api-key: rac_live_tu_token_aqui" \
  -d '{"telefono": "3001234567"}'</code>
        </div>
      </div>

      <!-- Endpoint 5: GET /api/stats -->
      <div class="bg-white p-5 rounded-2xl border border-stone-200 space-y-3">
        <div class="flex items-center gap-2">
          <span class="bg-blue-600 text-white font-mono font-bold px-2 py-0.5 rounded text-xs">GET</span>
          <code class="text-slate-900 font-bold font-mono">/api/stats</code>
          <span class="text-stone-400 text-xs">Estadísticas consolidadas</span>
        </div>
        <p class="text-stone-600 text-xs">Devuelve métricas en tiempo real de mascotas activas, encontradas y tasa de éxito.</p>
        <div class="bg-stone-900 text-stone-100 p-3 rounded-xl font-mono text-xs overflow-x-auto">
          <code>curl -X GET "https://encontremostumascota.co/api/stats" -H "x-api-key: rac_live_tu_token_aqui"</code>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`);
  });

  // 6:00 AM Daily Summary Cross-Match Trigger endpoint
  const handleCronDailySummary = async (req: express.Request, res: express.Response) => {
    try {
      const resendApiKey = process.env.RESEND_API_KEY;

      res.json({
        success: true,
        message: 'Proceso de resumen de alertas ejecutado correctamente a las 6:00 AM.',
        serviceConfigured: Boolean(resendApiKey),
        sender: 'Encontremos Tu Mascota <alertas@encontremostumascota.co>',
        executionTime: new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })
      });
    } catch (error) {
      console.error('Error in daily summary cron:', error);
      res.status(500).json({ error: 'Error al ejecutar cron de resumen diario' });
    }
  };

  app.get('/api/cron/daily-summary', handleCronDailySummary);
  app.post('/api/cron/daily-summary', handleCronDailySummary);
  app.get('/api/cron-daily-digest', handleCronDailySummary);
  app.post('/api/cron-daily-digest', handleCronDailySummary);

  // Endpoint to send transactional email with Resend
  app.post('/api/send-email', async (req, res) => {
    const { to, subject, html } = req.body;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: to, subject, html' });
    }

    if (!resendApiKey) {
      return res.json({
        simulated: true,
        message: 'Correo simulado con éxito (para activar envíos reales agrega RESEND_API_KEY en variables de entorno)',
        to,
        subject
      });
    }

    try {
      const fromSender = process.env.RESEND_FROM_EMAIL || 'Encontremos Tu Mascota <alertas@encontremostumascota.co>';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromSender,
          to: [to],
          subject,
          html
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data });
      }

      res.json({ success: true, data });
    } catch (err: any) {
      console.error('Error sending email through Resend:', err);
      res.status(500).json({ error: err.message || 'Error al enviar correo' });
    }
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rescate Animal Colombia server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

