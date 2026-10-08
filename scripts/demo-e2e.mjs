import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.NARRATOR_PLAYWRIGHT_IMPORT || 'playwright');
const base='http://127.0.0.1:3219';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3219'],{cwd:process.cwd(),env:{...process.env,VERCEL:'1'},stdio:['ignore','pipe','pipe']});
let logs=''; server.stdout.on('data',x=>logs+=x); server.stderr.on('data',x=>logs+=x);
let browser;
try {
 for(let i=0;i<100;i++){try{if((await fetch(base+'/login')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 assert.equal((await fetch(base+'/api/health')).status,503,'test must reproduce unavailable Vercel backend');
 assert.equal((await fetch(base+'/library',{redirect:'manual'})).status,307,'real studio still requires author login');
 browser=await chromium.launch({executablePath:process.env.NARRATOR_CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844}}); const errors=[]; const api=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url());});
 await page.goto(base+'/login'); await page.getByLabel('Email or demo username').fill('testuser'); await page.getByLabel('Password',{exact:true}).fill('wrong'); await page.getByRole('button',{name:'Log in',exact:true}).click(); await page.getByText('The demo password is 123456.',{exact:true}).waitFor();
 await page.getByLabel('Password',{exact:true}).fill('123456');await page.getByRole('button',{name:'Log in',exact:true}).click(); await page.waitForURL('**/demo/library'); await page.getByRole('heading',{name:'Your bookshelf'}).waitFor();assert.equal(await page.locator('.project-card').count(),3);
 await page.getByRole('button',{name:'Ready to listen'}).click(); assert.equal(await page.locator('.project-card').count(),1);
 await page.getByRole('link',{name:'Listen',exact:true}).click();await page.waitForURL('**/demo/player?*');await page.locator('audio').waitFor();assert.equal(await page.locator('audio').getAttribute('src'),'/samples/lj.wav');
 for(const route of ['upload','voices','requests','account','guide','processing']){await page.goto(base+'/demo/'+route);await page.getByRole('heading',{level:1}).waitFor();assert.equal(await page.locator('input[type=file]').count(),0);}
 await page.goto(base+'/demo/admin');assert.equal(await page.getByText('This page could not be found.').count(),1);
 await page.goto(base+'/demo/library');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('button',{name:'Toggle navigation'}).click();await page.getByRole('button',{name:'Log out',exact:true}).click();await page.waitForURL('**/login');
 assert.deepEqual(errors,[]); assert.deepEqual(api,[],'demo must never request private APIs or issue a real session');
 console.log('PASS: Vercel backend unavailable; testuser login, wrong-password feedback, library/filter/player, demo navigation, mobile width, logout, no private API calls.');
} finally {await browser?.close();server.kill('SIGTERM');}
