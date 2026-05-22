import { createClient } from "@base44/sdk";

const base44 = createClient({
  appId: process.env.BASE44_APP_ID,
  headers: {
    api_key: process.env.BASE44_API_KEY,
  },
});

export async function createLead(data) {

  try {

    return await base44.entities.Cliente.create({

      nombre: data.nombre || "Cliente WhatsApp",

      telefono: data.telefono,

      vehiculo: data.vehiculo,

      notas: data.notas || "",

      activo: true
    });

  } catch (error) {

    console.error(
      "BASE44_CREATE_LEAD_ERROR",
      error
    );
  }
}

export async function createQuote(data) {

  try {

    return await base44.entities.Cotizacion.create({

      telefono: data.telefono,

      vehiculo: data.vehiculo,

      producto: data.producto,

      estado: "Pendiente"
    });

  } catch (error) {

    console.error(
      "BASE44_CREATE_QUOTE_ERROR",
      error
    );
  }
}

export async function createSale(data) {

  try {

    return await base44.entities.Venta.create({

      telefono: data.telefono,

      producto: data.producto,

      total: data.total,

      estado: "Pendiente"
    });

  } catch (error) {

    console.error(
      "BASE44_CREATE_SALE_ERROR",
      error
    );
  }
}
