const express=require("express");
const cors=require("cors");
const session=require("express-session");
const multer=require("multer");
const fs=require("fs");
const path=require("path");

const app=express();
const PORT=process.env.PORT||3000;
const ROOT=path.join(__dirname,"..");
const DATA=path.join(__dirname,"data");
const UPLOADS=path.join(__dirname,"uploads");

app.use(cors({origin:true,credentials:true}));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret:process.env.SESSION_SECRET||"npds-college-demo-secret",
  resave:false,
  saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"lax",secure:false}
}));
app.use("/uploads",express.static(UPLOADS));
app.use(express.static(path.join(ROOT,"public")));

if(!fs.existsSync(DATA))fs.mkdirSync(DATA,{recursive:true});
if(!fs.existsSync(UPLOADS))fs.mkdirSync(UPLOADS,{recursive:true});
for(const f of ["applications.json","schemes.json"]){
  const p=path.join(DATA,f);
  if(!fs.existsSync(p))fs.writeFileSync(p,"[]");
}

const ADMIN_USER=process.env.ADMIN_USER||"admin";
const ADMIN_PASS=process.env.ADMIN_PASS||"admin123";

const storage=multer.diskStorage({
  destination:(req,file,cb)=>cb(null,UPLOADS),
  filename:(req,file,cb)=>{
    const safe=file.originalname.replace(/[^a-zA-Z0-9._-]/g,"_");
    cb(null,Date.now()+"-"+safe);
  }
});
const upload=multer({
  storage,
  limits:{fileSize:5*1024*1024},
  fileFilter:(req,file,cb)=>{
    const ok=["application/pdf","image/jpeg","image/png"].includes(file.mimetype);
    cb(ok?null:new Error("Only PDF, JPG and PNG files are allowed."),ok);
  }
});

function read(name){try{return JSON.parse(fs.readFileSync(path.join(DATA,name),"utf8"))}catch{return[]}}
function write(name,data){fs.writeFileSync(path.join(DATA,name),JSON.stringify(data,null,2))}
function id(prefix){return prefix+"-"+new Date().getFullYear()+"-"+Math.random().toString(36).slice(2,8).toUpperCase()}
function admin(req,res,next){if(req.session.admin)return next();res.status(401).json({message:"Admin login required"})}

function score(income,family,region){
  let s=100;
  if(income>30000)s-=45; else if(income>20000)s-=30; else if(income>12000)s-=15;
  if(region==="Urban")s-=5; else if(region==="Rural")s+=5;
  if(Number(family)>=6)s+=8; else if(Number(family)>=4)s+=4;
  return Math.max(0,Math.min(100,s));
}

app.get("/api/health",(req,res)=>res.json({ok:true}));
app.post("/api/admin/login",(req,res)=>{
  const {username,password}=req.body;
  if(username===ADMIN_USER&&password===ADMIN_PASS){req.session.admin=true;return res.json({ok:true,message:"Login successful"})}
  res.status(401).json({message:"Invalid username or password"});
});
app.post("/api/admin/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/admin/me",(req,res)=>res.json({authenticated:!!req.session.admin}));

app.post("/api/applications",upload.fields([
  {name:"panDocument",maxCount:1},{name:"incomeDocument",maxCount:1},
  {name:"addressDocument",maxCount:1},{name:"identityDocument",maxCount:1},
  {name:"otherDocument",maxCount:1}
]),(req,res)=>{
  const b=req.body;
  if(!b.fullName||!b.mobileNumber||!b.monthlyIncome||!b.regionType||!b.panNumber)
    return res.status(400).json({message:"Name, mobile, income, region and PAN number are required."});
  const apps=read("applications.json");
  const sc=score(Number(b.monthlyIncome),Number(b.familySize||1),b.regionType);
  const docs={};
  for(const key of Object.keys(req.files||{})){
    const f=req.files[key][0];
    docs[key]={name:f.originalname,path:"/uploads/"+f.filename,mime:f.mimetype,verified:false};
  }
  const item={
    applicationId:id("NPDS"),fullName:b.fullName,fatherName:b.fatherName||"",
    motherName:b.motherName||"",mobileNumber:b.mobileNumber,email:b.email||"",
    panNumber:b.panNumber.toUpperCase(),familySize:Number(b.familySize||1),
    monthlyIncome:Number(b.monthlyIncome),regionType:b.regionType,address:b.address||"",
    latitude:Number(b.latitude||28.6139),longitude:Number(b.longitude||77.2090),
    eligibilityScore:sc,eligibility:sc>=60?"Potentially Eligible":"Needs Review",
    status:"Under Verification",panStatus:"Pending",documentStatus:"Pending",
    documents:docs,createdAt:new Date().toISOString()
  };
  apps.unshift(item);write("applications.json",apps);res.status(201).json(item);
});

app.get("/api/applications",(req,res)=>res.json(read("applications.json")));
app.get("/api/applications/:id",(req,res)=>{
  const a=read("applications.json").find(x=>x.applicationId.toLowerCase()===req.params.id.toLowerCase());
  if(!a)return res.status(404).json({message:"Application not found"});
  res.json(a);
});
app.put("/api/admin/applications/:id",(req,res)=>{
  const apps=read("applications.json");
  const i=apps.findIndex(x=>x.applicationId.toLowerCase()===req.params.id.toLowerCase());
  if(i<0)return res.status(404).json({message:"Application not found"});
  const allowed=["Under Verification","Verified","Rejected","Assistance Provided"];
  if(req.body.status&&!allowed.includes(req.body.status))return res.status(400).json({message:"Invalid status"});
  if(req.body.status)apps[i].status=req.body.status;
  if(req.body.panStatus)apps[i].panStatus=req.body.panStatus;
  if(req.body.documentStatus)apps[i].documentStatus=req.body.documentStatus;
  write("applications.json",apps);res.json(apps[i]);
});

app.get("/api/schemes",(req,res)=>{
  let s=read("schemes.json");
  if(req.query.level)s=s.filter(x=>x.level.toLowerCase()===req.query.level.toLowerCase());
  if(req.query.state)s=s.filter(x=>!x.state||x.state.toLowerCase()===req.query.state.toLowerCase());
  res.json(s);
});
app.post("/api/admin/schemes",admin,(req,res)=>{
  const b=req.body;
  if(!b.name||!b.level||!b.description)return res.status(400).json({message:"Name, level and description are required."});
  const s=read("schemes.json");
  const item={id:id("SCH"),name:b.name,level:b.level,state:b.state||"",description:b.description,
    eligibility:b.eligibility||"See official scheme guidelines.",benefits:b.benefits||"",link:b.link||""};
  s.unshift(item);write("schemes.json",s);res.status(201).json(item);
});
app.put("/api/admin/schemes/:id",admin,(req,res)=>{
  const s=read("schemes.json");const i=s.findIndex(x=>x.id===req.params.id);
  if(i<0)return res.status(404).json({message:"Scheme not found"});
  s[i]={...s[i],...req.body,id:s[i].id};write("schemes.json",s);res.json(s[i]);
});
app.delete("/api/admin/schemes/:id",admin,(req,res)=>{
  const s=read("schemes.json");const n=s.filter(x=>x.id!==req.params.id);
  if(n.length===s.length)return res.status(404).json({message:"Scheme not found"});
  write("schemes.json",n);res.json({ok:true});
});

app.use((err,req,res,next)=>res.status(400).json({message:err.message||"Request failed"}));

app.get("*",(req,res)=>res.sendFile(path.join(ROOT,"public","index.html")));
app.listen(PORT,()=>console.log(`NPDS running at http://localhost:${PORT}`));
