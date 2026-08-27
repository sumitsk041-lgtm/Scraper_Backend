# Content Engine Lead Generation — V2

## Architecture
Vercel frontend -> Render backend -> n8n -> Google Places API -> Render results endpoint -> lead database.

The existing frontend can keep using:
- `GET /api/health`
- `POST /api/discovery`
- `GET /api/leads`

This backend adds:
- `GET /api/discovery/:jobId`
- `POST /api/discovery/:jobId/results`
- `GET /api/stats`

## Render deployment
Replace the existing backend files with this backend and redeploy.

Set these environment variables in Render:
- `N8N_WEBHOOK_URL=https://YOUR-N8N-DOMAIN/webhook/content-engine/discovery`
- `N8N_WEBHOOK_SECRET=<long-random-string>` (recommended)
- `CORS_ORIGIN=*` initially; later restrict to your Vercel domain.

## n8n setup
1. Import `n8n/content-engine-google-places-discovery.json`.
2. Set n8n environment variables:
   - `GOOGLE_PLACES_API_KEY` = your Google Maps Platform key
   - `BACKEND_BASE_URL` = `https://scraper-backend-pvuk.onrender.com`
   - `N8N_WEBHOOK_SECRET` = same secret used in Render.
3. Activate the workflow.
4. Copy the Production Webhook URL into Render's `N8N_WEBHOOK_URL`.
5. Redeploy Render.

If your n8n host does not allow `$env` in workflow expressions, replace the three env expressions in the imported workflow with n8n credentials or fixed configuration values.

## Google Places
The workflow uses Places API (New) Text Search. Google requires a field mask and API key. Enable Places API and billing in Google Cloud before testing.

The current workflow returns business-level data available from Places: company name, address, phone, website, rating, review count, place ID and Maps URL. It does NOT invent personal decision-maker names or email addresses.

## Compliance
Use business contact data and lawful enrichment sources. For UK/Canada outreach, follow applicable privacy/marketing rules (including PECR/CASL where applicable), honor opt-outs, and avoid collecting sensitive personal data.

## Scaling
Places Text Search (New) returns at most 60 results across pages. For larger volumes, add pagination/batching in n8n rather than assuming one request returns 100+ records.
