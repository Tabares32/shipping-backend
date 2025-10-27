const BACKEND =
  process.env.REACT_APP_BACKEND_URL ||
  "https://shipping-backend-kgm5.onrender.com";

/**
 * ✅ Leer datos desde localStorage con JSON.parse seguro
 */
export function getStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

/**
 * ✅ Guardar datos en localStorage
 */
export function setStorage(key, value) {
  if (value === null) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

/**
 * ✅ Cargar datos desde el backend (.json) y guardar en localStorage
 * ⚠️ Solo si el backend tiene datos válidos
 */
export async function syncFromBackend() {
  try {
    const res = await fetch(`${BACKEND}/api/sync/data`);
    const data = await res.json();

    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        setStorage(key, value);
      } else {
        console.warn(`⚠️ Datos vacíos para ${key}, se conserva localStorage`);
      }
    });

    console.log("✅ Datos cargados desde el backend");
  } catch (err) {
    console.error("❌ Error al cargar datos del backend:", err);
  }
}

/**
 * ✅ Subir datos locales al backend para sincronizar con los archivos .json
 */
export async function syncToBackend() {
  const token = localStorage.getItem("authToken");
  if (!token) {
    console.warn("❌ No hay token para sincronizar");
    return;
  }

  const data = {};

  // ✅ incluir claves específicas que quieres sincronizar
  const keysToSync = ["users", "materialsBOM", "observations", "finishedGoods", "partNumbers"];
  for (const key of keysToSync) {
    const value = getStorage(key);
    if (Array.isArray(value) && value.length > 0) {
      data[key] = value;
    } else {
      console.warn(`⚠️ ${key} vacío o no válido, no se sincroniza`);
    }
  }

  try {
    const res = await fetch(`${BACKEND}/api/sync/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("❌ Error durante sincronización:", result);
    } else {
      console.log("✅ Datos sincronizados con el backend:", result);
    }
  } catch (err) {
    console.error("❌ Error de red al sincronizar:", err);
  }
}

/**
 * ✅ Inicializar sesión y sincronización al iniciar sesión
 * ⚠️ Solo sincroniza si no se ha hecho ya en esta sesión
 */
export async function initStorageSync(token) {
  localStorage.setItem("authToken", token);

  if (!localStorage.getItem("syncDone")) {
    await syncFromBackend();
    localStorage.setItem("syncDone", "true");
  }
}

/**
 * ✅ Limpiar marca de sincronización al cerrar sesión
 */
export function clearSyncState() {
  localStorage.removeItem("syncDone");
}