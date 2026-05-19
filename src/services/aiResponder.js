export async function generateBotReply({
  customerMessage,
  customerName,
  conversationHistory = []
}) {
  const response = await fetch('TU_SUPERAGENTE_BASE_URL/messages', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer TU_SUPERAGENTE_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: customerMessage,
      user_id: customerName || 'cliente_whatsapp'
    })
  });

  const data = await response.json();
  return data.content?.[0]?.text || 
    "Gracias por escribirnos. Un asesor te atenderá en breve.";
}
