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

    await api.post("/Lead", {
      nombre: data.name || "Cliente WhatsApp",
      telefono: data.phone,
      vehiculo: data.vehicle,
      producto_interes: data.product,
      lead_score: data.lead_score || 0,
      estado: data.status || "Nuevo"
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

    await api.post("/Cotizacion", {
      cliente_telefono: data.phone,
      vehiculo: data.vehicle,
      producto: data.product,
      entrega: data.delivery_type,
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

    await api.post("/Venta", {
      cliente_telefono: data.phone,
      producto: data.product,
      monto_total: data.total,
      estado: "Pendiente"
    });

  } catch (error) {

    console.error(
      "BASE44_CREATE_SALE_ERROR",
      error?.response?.data || error.message
    );
  }
}
