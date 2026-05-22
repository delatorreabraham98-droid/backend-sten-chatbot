import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function getCustomerMemory(phone) {

  const { data, error } = await supabase
    .from("customer_memory")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("getCustomerMemory error:", error);
  }

  return data || null;
}

export async function saveCustomerMemory(phone, memory) {

  const { error } = await supabase
    .from("customer_memory")
    .upsert({
      ...memory,
      phone,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error("saveCustomerMemory error:", error);
  }
}

export async function addCustomerObjection(phone, objection) {

  const memory = await getCustomerMemory(phone);

  if (!memory) return;

  const objections = [
    ...(memory.objections || []),
    objection
  ];

  await saveCustomerMemory(phone, {
    ...memory,
    objections
  });
}

export async function increaseLeadScore(phone, amount = 10) {

  const memory = await getCustomerMemory(phone);

  if (!memory) return;

  await saveCustomerMemory(phone, {
    ...memory,
    lead_score: (memory.lead_score || 0) + amount
  });
}
