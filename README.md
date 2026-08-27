# Content Engine Lead Generation Backend

Ready-to-run Node.js/Express API for the Content Engine frontend.

## Local
1. Install Node.js 20+
2. Copy `.env.example` to `.env`
3. Run:
   npm install
   npm start
4. API: http://localhost:8080
5. Health: http://localhost:8080/api/health

## Main endpoints
GET  /api/health
GET  /api/leads
GET  /api/stats
POST /api/discovery
POST /api/leads
POST /api/outreach/prepare

## n8n
Set `N8N_WEBHOOK_URL` to your n8n production webhook URL.
When `/api/discovery` is called, the backend forwards the search parameters to n8n.

Example:
{
  "country":"UK",
  "city":"Manchester",
  "industry":"Law",
  "niche":"Immigration Law",
  "volume":100
}

## Render
Push this folder to GitHub and create a Render Web Service using the included Dockerfile/render.yaml.
Add environment variables in Render.

## Production note
This package intentionally does not contain API keys. Connect Google Places, enrichment, email verification, Supabase and OpenAI through environment variables/n8n before using live data.
