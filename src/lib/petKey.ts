// Kernel unico para la 'llave' de deduplicacion de fichas.
//
// Contexto (20/8/2026): la llave de los ENCONTRADO se generaba como
// `hallazgo_${Date.now()}_${random}`, es decir un valor distinto en cada envio.
// Como la deteccion de duplicados compara justamente por llave, nunca podia dar
// positivo: un mismo hallazgo reenviado creaba una ficha nueva cada vez. Asi
// aparecieron grupos de hasta 6 fichas identicas del mismo caso.
//
// La llave debe cumplir dos cosas a la vez:
//   1. Ser IGUAL si es el mismo hallazgo reenviado  -> permite detectar el duplicado.
//   2. Ser DISTINTA entre animales distintos del mismo rescatista -> no bloquea
//      a quien reporta varios casos con su mismo telefono.
// La foto resuelve ambas: es obligatoria, y dos animales distintos no comparten
// la misma imagen byte a byte.

// FNV-1a de 32 bits. Deterministico, sincrono y sin dependencias: la misma
// entrada da la misma salida en el navegador y en el servidor.
function hashFnv1a(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function limpiarTelefono(telefono: string): string {
  return (telefono || '').replace(/\D/g, '');
}

/**
 * Telefono normalizado para comparar. En la base conviven "+57 313 7085033" y
 * "3137085033" para la misma persona, asi que se descarta el indicativo: de mas
 * de 10 digitos se conservan los ultimos 10 (el celular colombiano). Los fijos de
 * 7 digitos se dejan como estan.
 */
export function telefonoParaLlave(telefono: string): string {
  const solo = limpiarTelefono(telefono);
  return solo.length > 10 ? solo.slice(-10) : solo;
}

/**
 * Llave de un reporte de mascota ENCONTRADA.
 * Mismo telefono + misma foto => misma llave => es un reenvio del mismo hallazgo.
 */
export function buildFoundPetKey(telefono: string, foto: string): string {
  const tel = telefonoParaLlave(telefono);
  // Se hashea tambien el largo para separar imagenes que colisionen en el hash.
  const huellaFoto = `${hashFnv1a(foto || '')}${(foto || '').length.toString(36)}`;
  return `hallazgo_${tel}_${huellaFoto}`;
}

/**
 * Llave de un reporte de mascota PERDIDA: nombre + telefono, como ya se venia usando.
 */
export function buildLostPetKey(nombre: string, telefono: string): string {
  return `${(nombre || '').trim().toLowerCase()}_${limpiarTelefono(telefono)}`;
}
