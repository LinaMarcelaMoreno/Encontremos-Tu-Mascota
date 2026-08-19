import { PetRecord } from '../types';

/**
 * Único mapeo Firestore doc -> PetRecord.
 *
 * Fuente de verdad para App.tsx (listener en vivo + refresh manual del admin) y para
 * server.ts (cache RAM de /api/pets). Antes existían TRES copias divergentes de este
 * mapeo; su divergencia causó el bug DAT-2 (telefonoSecundario y fechaEvento se perdían
 * al editar una ficha porque un mapeo los omitía).
 *
 * REGLA: no dejar caer ningún campo aquí. Los campos opcionales de PetRecord
 * (cedula, subColores, telefonoSecundario, fechaEvento, descartados) NO producen error
 * de TypeScript si se omiten, así que la única garantía contra otro DAT-2 es que este
 * mapeo —el único— los incluya siempre.
 *
 * Los defaults son los del listener en vivo (lo que el usuario realmente ve, porque el
 * listener corre de último y sobrescribe al cache local y a /api/pets en la SPA).
 */
export function mapPetDoc(data: any, id: string): PetRecord {
  return {
    id,
    tipo: data.tipo || 'PERDIDO',
    estado: data.estado || 'ACTIVO',
    nombre: data.nombre || 'Sin Nombre',
    cedula: data.cedula || '',
    llave: data.llave || '',
    especie: data.especie || 'Perro',
    raza: data.raza || 'Mestizo',
    color: data.color || 'Café',
    subColores: Array.isArray(data.subColores) ? data.subColores : [],
    tamano: data.tamano || 'Mediano',
    departamento: data.departamento || 'Quindío',
    ciudad: data.ciudad || 'Armenia',
    ubicacion: data.ubicacion || '',
    contacto: data.contacto || '',
    telefono: data.telefono || '',
    telefonoSecundario: data.telefonoSecundario || '',
    correo: data.correo || '',
    foto: data.foto || '',
    detalles: data.detalles || '',
    fecha: data.fecha || new Date().toLocaleDateString('es-CO'),
    fechaEvento: data.fechaEvento || '',
    createdAt: data.createdAt || Date.now(),
    resolveToken: data.resolveToken || '',
    descartados: Array.isArray(data.descartados) ? data.descartados : []
  };
}
