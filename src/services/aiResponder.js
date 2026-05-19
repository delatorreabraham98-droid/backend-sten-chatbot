export async function generateBotReply({
  customerMessage,
  customerName,
  conversationHistory = []
}) {
  const response = await fetch('https://app.base44.com/api/agents/6a08d0802321c6e62c97095e/messages', {
    method: 'POST',
    headers: {
      'Authorization': 'c28a210d9a404ed385b758fa4d975b1b',
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
