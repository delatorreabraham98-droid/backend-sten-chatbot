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
META_VERIFY_TOKEN=your_verify_token
META_ACCESS_TOKEN=your_meta_access_token
META_PHONE_NUMBER_ID=replace_with_your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=replace_with_your_waba_id
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
BASE44_API_BASE_URL=https://your-base44-app.base44.app/api
BASE44_APP_ID=replace_with_your_base44_app_id
BASE44_API_KEY=your_base44_api_key
BASE44_MESSAGE_HAS_CLIENT_ID=false
BOT_BUSINESS_NAME=your_business_name
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
your_verify_token
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
