# Deploy checklist - STEN Chatbot Backend

## 1. Rotar secretos expuestos

Antes de produccion:

- Rotar `BASE44_API_KEY` en Base44.
- Generar un nuevo `META_ACCESS_TOKEN` en Meta.

## 2. Crear repositorio remoto

Crear un repo en GitHub, GitLab o Bitbucket, por ejemplo:

```text
sten-chatbot-backend
```

Despues conectar este repo local:

```bash
git remote add origin https://github.com/TU_USUARIO/sten-chatbot-backend.git
git push -u origin main
```

## 3. Crear servicio en Render

En Render:

1. New
2. Web Service
3. Conectar el repo `sten-chatbot-backend`
4. Configurar:

```text
Build Command: npm install
Start Command: npm start
Health Check Path: /health
```

## 4. Variables de entorno en Render

Agregar:

```text
META_VERIFY_TOKEN=sten_meta_verify_2026_latorre
META_ACCESS_TOKEN=nuevo_token_de_meta
META_PHONE_NUMBER_ID=1164009210125614
WHATSAPP_BUSINESS_ACCOUNT_ID=960695886752699
OPENAI_API_KEY=key_de_openai
OPENAI_MODEL=gpt-4.1-mini
BASE44_API_BASE_URL=https://sten-bot-flow.base44.app/api
BASE44_APP_ID=6a0b8ecaa62d1dda9f17f8ae
BASE44_API_KEY=nueva_key_de_base44
BASE44_MESSAGE_HAS_CLIENT_ID=false
BOT_BUSINESS_NAME=La Torre LED Shop
BOT_TIMEZONE=America/Tijuana
```

Cuando agregues `client_id` a `Message` en Base44:

```text
BASE44_MESSAGE_HAS_CLIENT_ID=true
```

## 5. Configurar webhook en Meta

En la pantalla actual de Meta:

```text
URL de devolucion de llamada:
https://TU-SERVICIO.onrender.com/webhook/whatsapp

Token de verificacion:
sten_meta_verify_2026_latorre
```

Despues presionar:

```text
Verificar y guardar
```

Luego suscribir:

```text
messages
```

## 6. Prueba final

1. Enviar un WhatsApp al numero de prueba.
2. Confirmar que el bot responde.
3. Revisar en Base44:
   - `Conversation`
   - `Message`
   - `Lead`
