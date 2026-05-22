create table if not exists customer_memory (

  id bigint generated always as identity primary key,

  phone text unique not null,

  customer_name text,

  stage text default 'idle',

  vehicle text,

  vehicle_year text,

  bulb_low text,

  bulb_high text,

  bulb_type text,

  selected_product text,

  conversation_stage text default 'new',

  budget text,

  interested_in text,

  trust_level text default 'medium',

  lead_score integer default 0,

  objections text[] default '{}',

  delivery_type text,

  meeting_point text,

  address text,

  last_seen_at timestamptz default now(),

  created_at timestamptz default now(),

  updated_at timestamptz default now()
);

create table if not exists learned_expressions (

  id bigint generated always as identity primary key,

  expression text unique not null,

  detected_intent text,

  created_at timestamptz default now()
);

create table if not exists vehicle_bulb_cache (
  query_text text primary key,
  low_beam text,
  high_beam text,
  fog text,
  type text,
  source text,
  created_at timestamptz default now()
);

create table if not exists conversation_analytics (

  id bigint generated always as identity primary key,

  phone text,

  message text,

  detected_intent text,

  detected_objection text,

  created_at timestamptz default now()
);
