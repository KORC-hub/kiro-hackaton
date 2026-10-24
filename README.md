# Markdown Study MVP

Monorepo pequeño para notas Markdown con wikilinks/backlinks, plantillas seguras de flashcards y repaso simplificado.

## Comandos

```bash
npm install
npm run build
npm test
```

Para la demo local, ejecuta en terminales separadas:

```bash
npm run dev:api  # API: 127.0.0.1:3000
npm run dev:web  # Web: localhost:3001
```

`npm run dev` ejecuta ambos procesos desde un shell compatible. La API usa `SQLITE_PATH` (por defecto `./data/app.sqlite`) y crea su directorio padre cuando hace falta. `WEB_ORIGIN` limita CORS a un origen exacto (por defecto `http://localhost:3001`); `NEXT_PUBLIC_API_URL` configura la URL que usa el frontend (por defecto `http://localhost:3000`). `/dev/clock` está deshabilitado en production.

La arquitectura, el flujo de datos, el contrato HTTP real, el alcance y los riesgos están en [`docs/README.md`](docs/README.md).

## Decisiones de dominio

- `[[Title#Section]]` es un título literal; extraer secciones queda fuera del alcance.
- Los campos ausentes de una plantilla renderizan texto vacío; los campos desconocidos enviados por el cliente devuelven `422`.
- Las tarjetas nuevas vencen inmediatamente y entran en la cola con límite de 20.
