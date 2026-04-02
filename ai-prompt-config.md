# Prompt de Configuración y Arquitectura: E-Commerce Multi-Tenant

**Contexto para la IA:**
Quiero desarrollar o configurar un e-commerce multi-tenant (multi-tienda) en Next.js utilizando las siguientes tecnologías clave: Supabase (Auth, Database y Storage), Mercado Pago (Bricks) y Resend (Mails). 

A continuación, te detallo la arquitectura, la base de datos y las configuraciones críticas que ya están definidas y probadas, para que las tengas en cuenta en todo el código que generes.

---

## 1. Supabase (Base de Datos y Autenticación)

El sistema es multi-tenant, lo que significa que varios clientes (tenants) pueden tener su propia tienda en la misma base de datos, separados lógicamente por el `tenant_id`.

**Tablas principales necesarias:**
*   **`tenants`**: Contiene la información global de la tienda. Columnas clave: `id` (UUID), `name`, `resend_api_key` (llave para enviar mails de la tienda).
*   **`user_tenants`**: Tabla intermedia para Auth. Relaciona usuarios de `auth.users` con el `tenant_id` y su `role` (ej: admin).
*   **`products`**: Tabla de productos. Columnas clave: `id`, `tenant_id`, `name`, `price`, `image_urls` (Array de Texto: `TEXT[]` para manejar múltiples imágenes).
*   **`orders`**: Registro de compras. Columnas clave: `id`, `tenant_id`, `status` (pending, approved, rejected, etc.), `mp_preference_id`, `total`.

**Seguridad (Row Level Security - RLS):**
*   Todas las tablas tienen habilitado RLS.
*   Las políticas de **LECTURA** públicas siempre filtran por el `tenant_id` que viene en la petición.
*   Las políticas de **ESCRITURA** verifican el `auth.uid()` contra la tabla `user_tenants` para garantizar que el usuario pertenece al tenant correspondiente antes de insertar, actualizar o borrar (DELETE).

---

## 2. Supabase Storage (Manejo de Imágenes)

**Configuración del Bucket:**
*   El bucket principal se llama **`objects`**.
*   **Debe ser obligatoriamente PÚBLICO** (`public: true`).
*   Reglas: Límite de tamaño de 10MB (`file_size_limit: 10485760`), tipos permitidos: `image/jpeg`, `image/png`, `image/webp`.
*   Ruta de subida: Las imágenes se guardan estructuradas como `[tenant_id]/[uuid_unico].[extension]`. Se debe usar `crypto.randomUUID()` para garantizar nombres únicos.

**Políticas RLS del Storage:**
*   `SELECT`: Abierto al público `USING (bucket_id = 'objects')`.
*   `INSERT`, `UPDATE`, `DELETE`: Solo para usuarios autenticados (`authenticated`). Se verifica mediante el cliente si el usuario admin puede subirla.

**Comportamiento del Frontend:**
*   Las imágenes se comprimen *client-side* en el navegador usando librerías (ej. `browser-image-compression`) antes de subir a Storage.
*   Al actualizar un producto y descartar fotos viejas, o al borrar un producto, el frontend llama al Storage para eliminar físicamente los archivos y no dejar imágenes huérfanas.

---

## 3. Mercado Pago (Procesamiento de Pagos)

Se utiliza **Mercado Pago Bricks** (`@mercadopago/sdk-react`) y el flujo incluye Webhooks garantizados.

**Flujo Crítico de Compra:**
1.  **Antes de ir a pagar (Create Preference):** Primero se crea la orden en la base de datos como `pending`. El `id` de esa orden se envía a Mercado Pago dentro del campo `external_reference` al crear la Preferencia.
2.  **Back URLs & Webhooks:** 
    *   Tanto las `back_urls` (success, pending, failure) como la `notification_url` apuntan al backend.
    *   En desarrollo, se DEBE usar un túnel (como **Ngrok**) seteado en la variable global de entorno `NEXT_PUBLIC_SITE_URL`. NO usar `localhost` para Mercado Pago, de lo contrario los webhooks no llegarán.
3.  **Procesamiento del Webhook:**
    *   La ruta `/api/webhooks/mercadopago` escucha eventos `payment.created` o `payment.updated`.
    *   Extrae el ID del pago, lo consulta internamente en la API de Mercado Pago para validar seguridad, y extrae la orden desde el campo `external_reference`.
    *   Actualiza el `status` en la tabla `orders`.

---

## 4. Resend (Envío de Mails Transaccionales)

**Integración Multi-Tenant del Mail:**
*   No hay una única API Key de Resend en el servidor. La API Key se lee dinámicamente desde la columna `resend_api_key` de la tabla `tenants` correspondiente al tenant de la orden.
*   El correo de confirmación automática se dispara EXCLUSIVAMENTE dentro del Webhook de Mercado Pago, una vez que el estado del pago pasa a estar validado como `approved`.
*   El remitente siempre utiliza un dominio registrado y verificado en la cuenta del tenant en Resend (ej: `contacto@mi-dominio.com.ar`).

---

**NOTA PARA LA IA:** Utiliza estas reglas estrictas como la fuente de verdad arquitectónica al crear componentes, establecer rutas API, y generar scripts de SQL para Supabase. No asumas simplificaciones (como no usar `external_reference` o guardar las fotos en Base64).
