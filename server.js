require("dotenv").config();
const express=require("express");
const cors=require("cors");

const app=express();
const PORT=process.env.PORT||8080;

app.use(cors({origin:true}));
app.use(express.json({limit:"1mb"}));

const leads=[
  {id:"LEAD-001",company:"Northstar Legal LLP",city:"Manchester",country:"UK",industry:"Law",niche:"Immigration Law",contact:"Sarah Mitchell",role:"Managing Partner",email:"sarah@northstarlegal.co.uk",score:92,status:"Hot"},
  {id:"LEAD-002",company:"Maple Health Tech",city:"Toronto",country:"Canada",industry:"Healthcare",niche:"Healthtech",contact:"Daniel Wong",role:"Co-Founder",email:"daniel@maplehealth.ca",score:87,status:"Hot"},
  {id:"LEAD-003",company:"Bristol Family Solicitors",city:"Bristol",country:"UK",industry:"Law",niche:"Family Law",contact:"James Carter",role:"Partner",email:"j.carter@bristolfamily.co.uk",score:76,status:"Warm"},
  {id:"LEAD-004",company:"CareBridge Digital Health",city:"Vancouver",country:"Canada",industry:"Healthcare",niche:"Telehealth",contact:"Emma Lewis",role:"Head of Growth",email:"emma@carebridge.ca",score:71,status:"Warm"}
];

app.get("/api/health",(req,res)=>res.json({ok:true,service:"content-engine-leadgen-backend",timestamp:new Date().toISOString()}));

app.get("/api/leads",(req,res)=>{
  const {country,city,industry,niche,status,q}=req.query;
  let result=[...leads];
  if(country) result=result.filter(x=>x.country.toLowerCase()===country.toLowerCase());
  if(city) result=result.filter(x=>x.city.toLowerCase().includes(city.toLowerCase()));
  if(industry) result=result.filter(x=>x.industry.toLowerCase()===industry.toLowerCase());
  if(niche) result=result.filter(x=>x.niche.toLowerCase().includes(niche.toLowerCase()));
  if(status) result=result.filter(x=>x.status.toLowerCase()===status.toLowerCase());
  if(q) result=result.filter(x=>JSON.stringify(x).toLowerCase().includes(q.toLowerCase()));
  res.json({success:true,count:result.length,data:result});
});

app.post("/api/discovery",(req,res)=>{
  const {country,city,industry,niche,volume}=req.body||{};
  if(!country||!city||!industry||!niche) return res.status(400).json({success:false,error:"country, city, industry and niche are required"});
  const payload={country,city,industry,niche,volume:Number(volume)||100,requestedAt:new Date().toISOString()};
  if(process.env.N8N_WEBHOOK_URL){
    // The actual external workflow is intentionally delegated to n8n.
    fetch(process.env.N8N_WEBHOOK_URL,{
      method:"POST",
      headers:{"content-type":"application/json",...(process.env.N8N_WEBHOOK_SECRET?{"x-webhook-secret":process.env.N8N_WEBHOOK_SECRET}:{})},
      body:JSON.stringify(payload)
    }).catch(err=>console.error("n8n webhook error:",err.message));
  }
  res.json({success:true,message:"Discovery job accepted",jobId:"JOB-"+Date.now(),payload});
});

app.post("/api/leads",(req,res)=>{
  const lead={id:"LEAD-"+String(Date.now()).slice(-8),...req.body,createdAt:new Date().toISOString()};
  leads.unshift(lead);
  res.status(201).json({success:true,data:lead});
});

app.get("/api/stats",(req,res)=>res.json({
  success:true,
  data:{companies:1284,decisionMakers:946,highIntent:183,qualifiedReplies:42}
}));

app.post("/api/outreach/prepare",(req,res)=>{
  const {leadId,channel="email",offer="SEO + Conversion Optimisation"}=req.body||{};
  const lead=leads.find(x=>x.id===leadId);
  if(!lead) return res.status(404).json({success:false,error:"Lead not found"});
  res.json({
    success:true,
    data:{
      leadId,channel,offer,
      personalization:`I noticed ${lead.company} has an opportunity to improve its online acquisition in ${lead.niche}.`,
      status:"ready_for_review",
      complianceReviewRequired:true
    }
  });
});

app.listen(PORT,()=>console.log(`Content Engine backend running on port ${PORT}`));