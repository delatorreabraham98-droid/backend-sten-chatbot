# STEN Chatbot Backend

Backend Node.js para recibir mensajes de WhatsApp Cloud API, generar respuesta con OpenAI y responder por WhatsApp.

## Flujo

```text
WhatsApp -> Meta Webhook -> Node.js en Render -> OpenAI -> WhatsApp Cloud API
```

## Variables de entorno

Copia `.env.example` a `.env.local` en desarrollo y llena los valores privados:

```text
META_VERIFY_TOKEN=token_que_tu_inventas_para_meta
META_ACCESS_TOKEN=token_de_meta
META_PHONE_NUMBER_ID=id_del_numero_de_whatsapp
WHATSAPP_BUSINESS_ACCOUNT_ID=id_de_la_cuenta_whatsapp_business
OPENAI_API_KEY=key_de_openai
OPENAI_MODEL=gpt-4.1-mini
BASE44_API_BASE_URL=https://sten-bot-flow.base44.app/api
BASE44_APP_ID=tu_app_id_de_base44
BASE44_API_KEY=key_de_base44
BASE44_MESSAGE_HAS_CLIENT_ID=false
BOT_BUSINESS_NAME=La Torre LED Shop
BOT_TIMEZONE=America/Tijuana
```

## Desarrollo local

```bash
npm install
npm run dev
```

Revisar salud:

```bash
curl http://localhost:3000/health
```

## Webhook de WhatsApp

URL de verificacion para Meta:

```text
https://TU_DOMINIO_O_RENDER_URL/webhook/whatsapp
```

Token de verificacion:

```text
El mismo valor de META_VERIFY_TOKEN
```

Campo a suscribir en Meta:

```text
messages
```

## Integracion con Base44

El backend usa las entidades:

```text
Client
Bot
Channel
Conversation
Message
Lead
KnowledgeItem
```

Flujo de persistencia:

```text
Buscar Channel por phone_number_id
-> cargar Bot activo, Client y KnowledgeItem
-> crear/actualizar Conversation
-> guardar Message inbound
-> generar respuesta con OpenAI
-> guardar Message outbound
-> crear Lead si hay intencion comercial
```

Cuando agregues `client_id` a la entidad `Message`, cambia:

```text
BASE44_MESSAGE_HAS_CLIENT_ID=true
```

## Deploy en Render

1. Sube este proyecto a GitHub.
2. En Render crea un Web Service desde el repo.
3. Usa:
   - Build command: `npm install`
   - Start command: `npm start`
4. Agrega las variables de entorno privadas en Render.
5. Copia la URL publica de Render y configurala en Meta como webhook.

## Nota de seguridad

No publiques `.env.local`, tokens de Meta ni llaves de OpenAI. El archivo `.gitignore` ya evita subir los archivos de entorno locales.
