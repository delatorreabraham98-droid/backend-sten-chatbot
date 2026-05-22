import { createClient } from "@supabase/supabase-js";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const supabase = getClient();

export async function getCustomerMemory(phone) {

  if (!supabase) return null;

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

  if (!supabase) return;

  const { id: _id, created_at: _ca, updated_at: _ua, ...cleanMemory } = memory;

  const { error } = await supabase
    .from("customer_memory")
    .upsert({
      ...cleanMemory,
      phone,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "phone"
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
