# Web

Frontend cliente de Notas y repaso, construido con Next.js, React y TypeScript. La interfaz no replica la lógica del dominio: usa los endpoints de `apps/api` para notas, backlinks, plantillas, render seguro, tarjetas y repaso.

## Desarrollo

Desde la raíz del monorepo:

```bash
npm install
npm run dev:web
```

El frontend escucha en `localhost:3001` (el proceso se enlaza a loopback). `NEXT_PUBLIC_API_URL` es opcional; por defecto apunta a `http://localhost:3000`. Para levantar la API en el puerto esperado, ejecuta `npm run dev:api` en otra terminal.

## Validación

```bash
npm run test --workspace @app/web
npm run build --workspace @app/web
```

La vista previa de plantillas y las tarjetas de repaso se muestran exclusivamente con `<iframe sandbox srcDoc>`, sin `allow-scripts` ni `allow-same-origin`.
