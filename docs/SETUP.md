# Setup checklist

1. Google Cloud:
   - Create/select a project.
   - Enable Places API (New).
   - Create an API key.
   - Restrict the key to the Places API and your server-side usage.
   - Ensure billing is enabled.

2. n8n:
   - Import `content-engine-google-places-discovery.json`.
   - Configure `GOOGLE_PLACES_API_KEY`, `BACKEND_BASE_URL`, `N8N_WEBHOOK_SECRET`.
   - Activate workflow.
   - Copy production webhook URL.

3. Render:
   - Deploy backend.
   - Add `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`, `CORS_ORIGIN`.
   - Redeploy.

4. Vercel:
   - Keep `NEXT_PUBLIC_API_BASE_URL=https://scraper-backend-pvuk.onrender.com`.
   - Redeploy only if you change the frontend.

5. Test:
   POST /api/discovery with:
   {"country":"UK","city":"Manchester","industry":"Law","niche":"Immigration Law","volume":20}
