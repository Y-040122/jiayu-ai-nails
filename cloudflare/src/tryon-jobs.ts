import {WorkflowEntrypoint} from 'cloudflare:workers';
const imageOK=(s:any)=>typeof s==='string'&&(s.length<850000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s)||s.length<2000&&/^https:\/\/images\.(unsplash|pexels)\.com\//.test(s));
export async function tryonJobs(req:Request,user:any,env:any,reply:any){
 const path=new URL(req.url).pathname;
 if(path==='/api/tryon-jobs'&&req.method==='POST'){
  if(!env.ARK_API_KEY)return reply({error:'云端 AI 密钥尚未配置'},503);
  if(!env.TRYON_WORKFLOW)return reply({error:'试戴任务服务尚未就绪'},503);
  const data=await req.json() as any,id=String(data.id||'');
  if(!/^[a-zA-Z0-9_-]{16,80}$/.test(id))return reply({error:'任务编号无效'},400);
  const previous=await env.DB.prepare('SELECT id,owner_id,status FROM tryon_jobs WHERE id=?').bind(id).first();
  if(previous)return previous.owner_id===user.id?reply({id,status:previous.status},202):reply({error:'任务不存在'},404);
  if(!imageOK(data.reference)||!imageOK(data.hand))return reply({error:'照片格式或大小不合适，请重新选择照片'},400);
  const now=Date.now();await env.DB.prepare('DELETE FROM tryon_jobs WHERE created_at<?').bind(now-86400000).run();
  const inserted=await env.DB.prepare("INSERT OR IGNORE INTO tryon_jobs(id,owner_id,status,input,created_at,updated_at) VALUES(?,?,'queued',?,?,?)").bind(id,user.id,JSON.stringify({reference:data.reference,hand:data.hand,notes:String(data.notes||'').slice(0,400)}),now,now).run();
  if(!inserted.meta.changes)return reply({id,status:'queued'},202);
  const day=new Date().toISOString().slice(0,10);const quota=await env.DB.prepare('INSERT INTO ai_quota(id,used) VALUES(?,1) ON CONFLICT(id) DO UPDATE SET used=used+1 WHERE used<20 RETURNING used').bind(day).first();
  if(!quota){await env.DB.prepare("UPDATE tryon_jobs SET status='failed',input=NULL,error=? WHERE id=?").bind('今日共享体验额度已用完（20次），请明日再试',id).run();return reply({error:'今日共享体验额度已用完（20次），请明日再试'},429)}
  try{await env.TRYON_WORKFLOW.create({id,params:{id}})}catch(error){let exists=false;try{await (await env.TRYON_WORKFLOW.get(id)).status();exists=true}catch{}if(!exists){await env.DB.prepare("UPDATE tryon_jobs SET status='failed',input=NULL,error=? WHERE id=?").bind('任务启动失败，请稍后重新生成',id).run();return reply({error:'任务启动失败，请稍后重新生成'},503)}}
  return reply({id,status:'queued'},202);
 }
 const match=path.match(/^\/api\/tryon-jobs\/([a-zA-Z0-9_-]{16,80})(\/image)?$/);
 if(!match||req.method!=='GET')return reply({error:'任务接口不存在'},404);
 const job=await env.DB.prepare('SELECT id,owner_id,status,result,error,created_at FROM tryon_jobs WHERE id=?').bind(match[1]).first();
 if(!job||job.owner_id!==user.id||Date.now()-job.created_at>86400000)return reply({error:'试戴任务已过期或不存在，请重新生成'},404);
 if(['queued','running'].includes(job.status)&&Date.now()-job.created_at>360000){await env.DB.prepare("UPDATE tryon_jobs SET status='failed',input=NULL,error=? WHERE id=? AND status IN ('queued','running')").bind('模型未能及时完成，请稍后重试。系统没有自动重复生成。',job.id).run();job.status='failed';job.error='模型未能及时完成，请稍后重试。系统没有自动重复生成。'}
 if(match[2]){if(job.status!=='completed'||!job.result)return reply({error:'试戴图片尚未就绪'},409);const result=await fetch(job.result,{signal:AbortSignal.timeout(25000)});if(!result.ok||!result.headers.get('content-type')?.startsWith('image/'))return reply({error:'效果图暂时无法加载，请稍后重试加载'},502);return new Response(result.body,{headers:{'Content-Type':result.headers.get('content-type')!,'Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'}})}
 return reply({id:job.id,status:job.status,error:job.error||'',createdAt:job.created_at,...(job.status==='completed'?{image:'/api/tryon-jobs/'+job.id+'/image'}:{})});
}
export class TryOnWorkflow extends WorkflowEntrypoint<any,{id:string}>{
 async run(event:any,step:any){const id=event.payload.id;
  const result=await step.do('generate-once',{retries:{limit:0,delay:'1 second'},timeout:'4 minutes'},async()=>{
   const job=await this.env.DB.prepare('SELECT input,status FROM tryon_jobs WHERE id=?').bind(id).first();
   if(!job||job.status!=='queued')return {error:'任务已执行或已过期，请查看已有结果；系统没有重复调用模型。'};
   const claimed=await this.env.DB.prepare("UPDATE tryon_jobs SET status='running',updated_at=? WHERE id=? AND status='queued'").bind(Date.now(),id).run();if(!claimed.meta.changes)return {error:'任务正在处理中，请稍后查询'};
   try{const data=JSON.parse(job.input);const response=await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations',{method:'POST',headers:{Authorization:'Bearer '+this.env.ARK_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:this.env.JIAYU_SEEDREAM_MODEL||'doubao-seedream-5-0-pro-260628',image:[data.reference,data.hand],prompt:'图1为美甲参考，图2为顾客手照。以图2为底图，仅将图1的甲面颜色、图案、装饰迁移到图2指甲上。保留图2手型、肤色、手指数量、皮肤纹理、手势、背景和光照，甲缘自然贴合。不要添加文字。调整：'+data.notes,size:'2K',response_format:'url',watermark:true}),signal:AbortSignal.timeout(210000)});
    let json:any;try{json=await response.json()}catch{return {error:'模型服务暂时未返回有效结果，请稍后重试'}};
    if(!response.ok)return {error:response.status===429?'模型服务繁忙或额度不足，请稍后再试':`模型服务返回 ${response.status}（${String(json.error?.code||'Unknown').slice(0,80)}），请稍后重试`};
    const image=json.data?.[0]?.url;if(typeof image!=='string'||!image.startsWith('https://'))return {error:'模型没有返回有效效果图，请稍后重试'};return {image};
   }catch(error:any){return {error:['TimeoutError','AbortError'].includes(error.name)?'模型生成超过等待时间，请稍后重试。系统没有自动重复生成。':'云端暂时无法连接模型服务，请稍后重试'}}
  });
  await step.do('save-result',async()=>{await this.env.DB.prepare("UPDATE tryon_jobs SET status=?,result=?,error=?,input=NULL,updated_at=? WHERE id=? AND status IN ('queued','running')").bind(result.image?'completed':'failed',result.image||null,result.error||null,Date.now(),id).run()});
 }
}
