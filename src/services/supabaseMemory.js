import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function getCustomerMemory(phone) {

  const { data } = await supabase
    .from("customer_memory")
    .select("*")
    .eq("phone", phone)
    .single();

  return data || {
    phone,
    stage: "idle",
    budget: null,
    interested_in: null,
    objections: [],
    trust_level: "medium",
    lead_score: 0
  };
}

export async function saveCustomerMemory(phone, memory) {

  await supabase
    .from("customer_memory")
    .upsert({
      phone,
      ...memory,
      updated_at: new Date().toISOString()
    });
}

export async function addCustomerObjection(phone, objection) {

  const memory = await getCustomerMemory(phone);

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

  await saveCustomerMemory(phone, {
    ...memory,
    lead_score: (memory.lead_score || 0) + amount
  });
}
