const LED_API_BASE = "https://69f136c1f0bb6ef2f9eaab65.base44.app/api/functions";

const LED_TIMEOUT_MS = 10_000;

async function callLedFunction(functionName, payload = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LED_TIMEOUT_MS);

  try {
    const response = await fetch(`${LED_API_BASE}/${functionName}`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || `LED API ${functionName} failed with status ${response.status}`);
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function buscarProductosLED({ query, categoria } = {}) {
  return callLedFunction("buscarProductos", { query, categoria });
}

export async function obtenerProductoLED({ productoId, nombre } = {}) {
  return callLedFunction("obtenerProducto", { producto_id: productoId, nombre });
}

export async function obtenerFAQ({ categoria } = {}) {
  return callLedFunction("obtenerFAQ", { categoria });
}

export async function obtenerNegocio() {
  return callLedFunction("obtenerNegocio");
}

export async function calcularPrecioMayoreo({ productoId, cantidad }) {
  return callLedFunction("calcularPrecioMayoreo", { producto_id: productoId, cantidad });
}

export async function crearClienteEnTienda({ nombre, telefono, correo, vehiculo, notas }) {
  return callLedFunction("crearCliente", { nombre, telefono, correo, vehiculo, notas });
}

export async function crearCotizacionEnTienda({ nombre, telefono, correo, vehiculoMarca, vehiculoModelo, vehiculoAnio, tipoLuces, descripcion }) {
  return callLedFunction("crearCotizacion", {
    nombre,
    telefono,
    correo,
    vehiculo_marca: vehiculoMarca,
    vehiculo_modelo: vehiculoModelo,
    vehiculo_anio: vehiculoAnio,
    tipo_luces: tipoLuces,
    descripcion
  });
}