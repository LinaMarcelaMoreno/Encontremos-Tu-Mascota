/**
 * Registro LOCAL (por dispositivo) de que fichas marco este navegador como duplicadas.
 *
 * No hay Firebase Auth (issue #3), asi que no existe forma de saber en el servidor quien
 * voto. Este registro en localStorage no es seguridad —cualquiera puede limpiarlo— sino
 * cortesia de UI: evita que la misma persona sume el contador dos veces por accidente y
 * le permite deshacer su propia marca. El contador de Firestore sigue siendo una
 * ESTIMACION para priorizar la revision manual, nunca un dato duro.
 */

const STORAGE_KEY = 'etm_duplicados_marcados_v1';

function readSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((id) => typeof id === 'string')) : new Set();
  } catch {
    // Modo incognito / storage bloqueado: se degrada a "nunca marque nada".
    return new Set();
  }
}

function writeSet(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Sin persistencia local el boton igual funciona; solo se pierde el "deshacer".
  }
}

export function getVotedPetIds(): Set<string> {
  return readSet();
}

export function hasVotedDuplicado(petId: string): boolean {
  return readSet().has(petId);
}

export function markVotedDuplicado(petId: string): void {
  const ids = readSet();
  ids.add(petId);
  writeSet(ids);
}

export function unmarkVotedDuplicado(petId: string): void {
  const ids = readSet();
  ids.delete(petId);
  writeSet(ids);
}
