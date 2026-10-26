import {env} from 'cloudflare:workers';
const e=()=>env as any;
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
async function hash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256))}
export async function accountAuth(req:Request,sign:any,reply:any){const path=new URL(req.url).pathname;
if(path==='/api/logout')return reply({ok:true},200,{'Set-Cookie':'jiayu_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});
const data=await req.json() as any;const displayName=String(data.username||'').trim(),username=displayName.toLowerCase(),password=String(data.password||'');
if(!/^[a-z0-9_]{3,32}$/.test(username)||password.length<8||password.length>128)return reply({error:'用户名需为3–32位字母、数字或下划线，密码需为8–128位'},400);
const bucket=new Date().toISOString().slice(0,13)+':'+(req.headers.get('CF-Connecting-IP')||'unknown');
const attempt=await e().DB.prepare('INSERT INTO auth_attempts(bucket,used) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET used=used+1 WHERE used<40 RETURNING used').bind(bucket).first();
if(!attempt)return reply({error:'操作过于频繁，请一小时后再试'},429);
let account=await e().DB.prepare('SELECT * FROM accounts WHERE username=?').bind(username).first();
if(path==='/api/register'){if(account)return reply({error:'此用户名已注册，请登录或更换用户名'},409);const salt=crypto.randomUUID(),id=crypto.randomUUID();const result=await e().DB.prepare('INSERT OR IGNORE INTO accounts(id,username,salt,password_hash,created_at,display_name) VALUES(?,?,?,?,?,?)').bind(id,username,salt,await hash(password,salt),new Date().toISOString(),displayName).run();if(!result.meta.changes)return reply({error:'此用户名已注册'},409);account={id,username};}
else{const actual=await hash(password,account?.salt||'unknown-account');if(!account||actual!==account.password_hash)return reply({error:'用户名或密码不正确'},401);}
if(!account.display_name)await e().DB.prepare('UPDATE accounts SET display_name=? WHERE id=? AND display_name IS NULL').bind(displayName,account.id).run();
const payload=btoa(JSON.stringify({role:'member',id:account.id,exp:Date.now()+7*86400000}));return reply({ok:true},200,{'Set-Cookie':`jiayu_session=${payload}.${await sign(payload)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`});
}
