import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Webhook-Secret"],
  credentials: false
}));
app.use(express.json({limit:"2mb"}));

const PORT = Number(process.env.PORT || 8080);
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || "";
const API_KEY = process.env.API_KEY || "";

const jobs = new Map();
const leads = new Map();

function auth(req,res,next){
  if (!API_KEY) return next();
  const supplied = req.get("X-API-Key");
  if (supplied !== API_KEY) return res.status(401).json({error:"Unauthorized"});
  next();
}

function makeId(prefix="JOB"){
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
}

function normalizeLead(x, job){
  const name = x.company || x.companyName || x.displayName || x.name || "";
  return {
    leadId: x.leadId || makeId("LEAD"),
    company: name,
    industry: x.industry || job.industry || "",
    niche: x.niche || job.niche || "",
    country: x.country || job.country || "",
    city: x.city || job.city || "",
    address: x.address || x.formattedAddress || "",
    phone: x.phone || x.nationalPhoneNumber || "",
    website: x.website || x.websiteUri || "",
    rating: x.rating ?? null,
    reviews: x.reviews ?? x.userRatingCount ?? null,
    placeId: x.placeId || x.id || "",
    googleMapsUri: x.googleMapsUri || "",
    email: x.email || "",
    decisionMaker: x.decisionMaker || "",
    title: x.title || "",
    score: Number(x.score ?? 0),
    status: x.status || "New",
    source: x.source || "Google Places API",
    createdAt: x.createdAt || new Date().toISOString()
  };
}

app.get("/", (_req,res)=>res.json({
  name:"content-engine-leadgen-backend",
  version:"2.0.0",
  status:"ok",
  n8nConfigured:Boolean(N8N_WEBHOOK_URL)
}));

app.get("/api/health", (_req,res)=>res.json({
  status:"ok",
  service:"content-engine-leadgen-backend",
  version:"2.0.0",
  n8nConfigured:Boolean(N8N_WEBHOOK_URL),
  timestamp:new Date().toISOString()
}));

app.get("/api/stats", auth, (_req,res)=>{
  const all=[...leads.values()];
  res.json({
    companies: all.length,
    decisionMakers: all.filter(x=>x.decisionMaker).length,
    highIntent: all.filter(x=>x.score>=70).length,
    qualifiedReplies: all.filter(x=>x.status==="Replied").length
  });
});

app.get("/api/leads", auth, (req,res)=>{
  let out=[...leads.values()];
  const {country,city,industry,niche,q,limit="500"}=req.query;
  if(country) out=out.filter(x=>x.country.toLowerCase()===String(country).toLowerCase());
  if(city) out=out.filter(x=>x.city.toLowerCase().includes(String(city).toLowerCase()));
  if(industry) out=out.filter(x=>x.industry.toLowerCase().includes(String(industry).toLowerCase()));
  if(niche) out=out.filter(x=>x.niche.toLowerCase().includes(String(niche).toLowerCase()));
  if(q) out=out.filter(x=>JSON.stringify(x).toLowerCase().includes(String(q).toLowerCase()));
  res.json({count:out.length, leads:out.slice(0,Math.min(Number(limit)||500,2000))});
});

app.post("/api/discovery", auth, async (req,res)=>{
  const {country,city,industry,niche,volume=25}=req.body || {};
  if(!country || !city || !industry || !niche) {
    return res.status(400).json({error:"country, city, industry and niche are required"});
  }
  const jobId=makeId("JOB");
  const job={jobId,country,city,industry,niche,volume:Math.min(Math.max(Number(volume)||25,1),500),status:"queued",createdAt:new Date().toISOString(),leadCount:0};
  jobs.set(jobId,job);

  if(!N8N_WEBHOOK_URL){
    job.status="waiting_for_n8n";
    return res.status(202).json(job);
  }

  try{
    const headers={"Content-Type":"application/json"};
    if(N8N_WEBHOOK_SECRET) headers["X-Webhook-Secret"]=N8N_WEBHOOK_SECRET;
    const r=await fetch(N8N_WEBHOOK_URL,{method:"POST",headers,body:JSON.stringify(job)});
    const text=await r.text();
    if(!r.ok) throw new Error(`n8n ${r.status}: ${text.slice(0,500)}`);
    job.status="running";
    job.n8nResponse=text.slice(0,1000);
    jobs.set(jobId,job);
    res.status(202).json(job);
  }catch(e){
    job.status="error";
    job.error=e.message;
    jobs.set(jobId,job);
    res.status(502).json(job);
  }
});

app.get("/api/discovery/:jobId", auth, (req,res)=>{
  const job=jobs.get(req.params.jobId);
  if(!job) return res.status(404).json({error:"Job not found"});
  res.json(job);
});

app.post("/api/discovery/:jobId/results", auth, (req,res)=>{
  const job=jobs.get(req.params.jobId);
  if(!job) return res.status(404).json({error:"Job not found"});
  const incoming=Array.isArray(req.body?.leads) ? req.body.leads : [];
  const normalized=incoming.map(x=>normalizeLead(x,job));
  normalized.forEach(x=>leads.set(x.leadId,x));
  job.status="completed";
  job.leadCount=normalized.length;
  job.completedAt=new Date().toISOString();
  jobs.set(job.jobId,job);
  res.json({ok:true,jobId:job.jobId,count:normalized.length,leads:normalized});
});

app.post("/api/leads/bulk", auth, (req,res)=>{
  const arr=Array.isArray(req.body?.leads) ? req.body.leads : [];
  const normalized=arr.map(x=>normalizeLead(x,{}));
  normalized.forEach(x=>leads.set(x.leadId,x));
  res.json({ok:true,count:normalized.length});
});

app.delete("/api/leads", auth, (_req,res)=>{
  leads.clear();
  res.json({ok:true});
});

app.listen(PORT,()=>console.log(`Content Engine backend listening on :${PORT}`));
