export function calculateLeadScore(memory = {}, message = '') {
  let score = memory.lead_score || 0;
  const text = message.toLowerCase();

  if (text.includes('premium')) score += 25;
  if (text.includes('instalacion') || text.includes('instalación')) score += 20;
  if (text.includes('domicilio')) score += 15;
  if (text.includes('precio')) score += 5;
  if (text.includes('garantia') || text.includes('garantía')) score += 10;
  if (text.includes('mañana') || text.includes('despues')) score -= 10;

  return Math.max(score, 0);
}
