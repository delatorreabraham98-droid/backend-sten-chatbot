# CRM de Chatbots Multi-Tenant en Base44

## Prompt para construir el CRM

```
CRM DE CHATBOTS MULTI-TENANT EN BASE44
========================================

## ENTIDADES A CREAR

### 1. CREAR ENTIDAD: Product
Campos:
- name (text, requerido)
- price (number, requerido)
- description (text multilinea)
- lumens (number)
- warranty_months (number)
- sku (text)
- sort_order (number, default 0)
- active (boolean, default true)
- client_id (relation → Client, requerido)

### 2. EXTENDER ENTIDAD: Bot
Agregar campos:
- greeting_message (text multilinea) — "Buenos días, soy el asistente de {business_name}"
- business_name (text) — "Mi Negocio"
- business_phone (text) — teléfono del negocio
- business_address (text multilinea)
- delivery_zones (text multilinea) — una zona por línea
- home_delivery_fee (number, default 100)
- installation_fee (number, default 100)
- timezone (text, default "America/Tijuana")
- admin_phone (text) — número para notificaciones de leads
- settings (json, default {})

### 3. EXTENDER ENTIDAD: Client
Agregar campos:
- timezone (text, default "America/Tijuana")
- max_bots (number, default 1)
- active (boolean, default true)

### 4. EXTENDER ENTIDAD: Lead
Agregar campos:
- assigned_to (relation → CRMUser, opcional)
- last_contacted_at (date, opcional)
- converted_at (date, opcional)


## DATOS DE PRUEBA

### Products para tu client_id
| name | price | lumens | warranty_months | sort_order |
|---|---|---|---|---|
| COB 2 Caras | 250 | 6000 | 3 | 1 |
| COB 4 Caras | 350 | 12000 | 3 | 2 |
| CSP Premium | 500 | 20000 | 6 | 3 |

### Bot de prueba
- business_name: "La Torre LED Shop"
- business_phone: "6864719077"
- delivery_zones: "Portales\nJuventud 2000\nCostco\nPlaza Mandarin"
- home_delivery_fee: 100
- installation_fee: 100
- timezone: "America/Tijuana"
- admin_phone: tu número de WhatsApp


## VISTAS DEL DASHBOARD

### 1. PÁGINA: Dashboard
Tipo: Dashboard / Custom Page
Elementos:
  - Tarjeta: "Conversaciones hoy" = COUNT(Conversation WHERE client_id=[usuario] AND DATE(last_message_at)=TODAY())
  - Tarjeta: "Leads nuevos (7d)" = COUNT(Lead WHERE client_id=[usuario] AND created_date>=TODAY()-7)
  - Tarjeta: "Tasa conv." = COUNT(Lead WHERE status=converted) / COUNT(Lead) * 100
  - Tabla: Leads recientes (customer_name, product_interest, status, created_date) ordenado DESC, límite 10

### 2. PÁGINA: Conversaciones
Tipo: Table
Entidad: Conversation
Filtro fijo: client_id = [usuario actual]
Columnas: customer_name, customer_phone, last_message_preview, message_count, last_message_at, status
Click → detalle: tabla embebida de Message + link a Lead asociado

### 3. PÁGINA: Leads
Tipo: Kanban Board
Entidad: Lead
Filtro fijo: client_id = [usuario actual]
Columnas por status: new (🟢) → contacted (🟡) → negotiating (🔵) → converted (✅) → lost (❌)
Click → formulario: status, assigned_to, notes, last_contacted_at, converted_at

### 4. PÁGINA: Productos
Tipo: Table + CRUD Form
Entidad: Product
Filtro fijo: client_id = [usuario actual]
Columnas editables: sort_order, name, price, active
Form: name, price, description, lumens, warranty_months, sku, sort_order, active

### 5. PÁGINA: Configuración del Bot
Tipo: Form (single record)
Entidad: Bot
Filtro: client_id = [usuario actual], limit 1
Campos: name, greeting_message, business_name, business_phone, business_address, delivery_zones, home_delivery_fee, installation_fee, timezone, admin_phone, active

### 6. PÁGINA: Base de Conocimiento
Tipo: Table + CRUD Form
Entidad: KnowledgeItem
Filtro fijo: client_id = [usuario actual]
Columnas: question, answer, active
```
