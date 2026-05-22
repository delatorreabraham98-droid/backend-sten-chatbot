import axios from "axios";

const api = axios.create({
  baseURL: process.env.BASE44_API_URL,
  headers: {
    api_key: process.env.BASE44_API_KEY,
    "Content-Type": "application/json"
  }
});

export async function createLead(data) {

  try {

    await api.post("/api/entities/Cliente", {
      nombre: data.nombre || "Cliente WhatsApp",
      telefono: data.telefono,
      vehiculo: data.vehiculo,
      notas: data.notas || "",
      activo: true
    });

  } catch (error) {

    console.error(
      "BASE44_CREATE_LEAD_ERROR",
      error?.response?.data || error.message
    );
  }
}

export async function createQuote(data) {

  try {

    await api.post("/api/entities/Cotizacion", {
      telefono: data.telefono,
      vehiculo: data.vehiculo,
      producto: data.producto,
      estado: "Pendiente"
    });

  } catch (error) {

    console.error(
      "BASE44_CREATE_QUOTE_ERROR",
      error?.response?.data || error.message
    );
  }
}

export async function createSale(data) {

  try {

    await api.post("/api/entities/Venta", {
      telefono: data.telefono,
      producto: data.producto,
      total: data.total,
      estado: "Pendiente"
    });

  } catch (error) {

    console.error(
      "BASE44_CREATE_SALE_ERROR",
      error?.response?.data || error.message
    );
  }
}
