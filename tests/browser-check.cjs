// Development-only browser tests. No browser dependency is shipped to teachers.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer-core');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'artifacts');
fs.mkdirSync(out, {recursive:true});
const delay = ms => new Promise(r => setTimeout(r,ms));
const report = {browser:'',checks:[],errors:[]};
function check(condition,label){assert.ok(condition,label);report.checks.push(label);console.log('PASS '+label);}
async function run(){
  assert.ok(process.env.LESSON_BROWSER,'Set LESSON_BROWSER to Chrome/Edge executable');
  const browser=await puppeteer.launch({executablePath:process.env.LESSON_BROWSER,headless:true});
  report.browser=await browser.version();
  try{
    for(const name of ['spring','baicao-evidence']){
      const isolated=fs.mkdtempSync(path.join(os.tmpdir(),'lesson-offline-'));
      fs.copyFileSync(path.join(root,'dist',name,'index.html'),path.join(isolated,'index.html'));
      const page=await browser.newPage(),errors=[],requests=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.setRequestInterception(true);
      page.on('request',r=>{if(/^https?:/i.test(r.url())){requests.push(r.url());r.abort();}else r.continue();});
      page.on('dialog',d=>d.accept());
      await page.setViewport({width:1920,height:1080});
      await page.goto(pathToFileURL(path.join(isolated,'index.html')).href);
      await page.waitForFunction(()=>document.getElementById('scene-image').naturalWidth>0);
      check(await page.$eval('#title',e=>e.textContent.length>0),name+': file:// from isolated single file');
      const scenes=await page.$$eval('#scenes button',a=>a.length);
      for(let s=0;s<scenes;s++){
        await page.click(`#scenes button:nth-child(${s+1})`);await delay(100);
        const count=await page.$$eval('#hotspot-list button',a=>a.length);
        for(let h=0;h<count;h++){
          // Scene marker click exercises spatial layer, not only text shortcuts.
          await page.click(`#hotspot-list button:nth-child(${h+1})`);await delay(560);
          await page.click(`#pano-points button:nth-child(${h+1})`);await delay(560);
          check(await page.$eval('#card',e=>!e.hidden),`${name}: scene ${s+1} marker ${h+1} opens`);
          check(await page.$eval('#analysis',e=>e.hidden),name+': answer concealed before reveal');
          if(await page.$eval('#challenge',e=>!e.hidden)){
            await page.click('#choices button:nth-child(2)');const wrong=await page.$eval('#feedback',e=>e.textContent);
            await page.click('#choices button:first-child');const right=await page.$eval('#feedback',e=>e.textContent);
            check(wrong&&right&&wrong!==right,name+': reasoned feedback changes');
          }
          await page.click('#reveal');check(await page.$eval('#analysis',e=>!e.hidden),name+': reference explanation revealed');
          await page.select('#category',await page.$eval('#category option:nth-child(2)',e=>e.value));
          await page.type('#note',`我从词语找到了证据 ${s+1}-${h+1}`);
          await page.click('#collect');
        }
      }
      const total=await page.evaluate(()=>lesson.scenes.reduce((n,s)=>n+s.hotspots.length,0));
      await page.click('#notebook');
      check(await page.$$eval('#entries .entry',a=>a.length)===total,name+': evidence board contains all collected observations');
      check(await page.$eval('#entries',e=>e.textContent.includes('我从词语')),name+': learner explanation retained');
      await page.keyboard.press('Escape');check(await page.$eval('#board',e=>!e.open),name+': Escape closes modal');
      await page.click('#teacher');check(await page.$eval('#analysis',e=>!e.hidden),name+': teacher mode updates existing card');
      await page.click('#next');check(await page.$eval('#analysis',e=>!e.hidden),name+': guided next keeps teacher mode');
      await page.click('#view-reset');await page.click('#zoom-in');
      await delay(560);const before=await page.evaluate(()=>state.yaw);
      const box=await (await page.$('#stage')).boundingBox();
      await page.mouse.move(box.x+box.width*.45,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.45+40,box.y+box.height*.5+20,{steps:6});await page.mouse.up();
      check((await page.evaluate(()=>state.yaw))!==before,name+': real pointer drag changes view direction');
      await page.click('#view-reset');
      await page.click('#hotspot-list button:first-child');await delay(560);
      const alignment=await page.$eval('#pano-points button:first-child',e=>{const r=e.getBoundingClientRect(),b=document.getElementById('stage').getBoundingClientRect();return !e.hidden&&Math.abs(r.x+r.width/2-b.x-b.width/2)<2&&Math.abs(r.y+r.height/2-b.y-b.height/2)<2;});
      check(alignment,name+': panorama marker centered using camera inverse projection');
      for(const size of [{width:1920,height:1080},{width:1366,height:768},{width:390,height:844}]){
        await page.setViewport(size);await delay(80);
        check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name}: no horizontal overflow ${size.width}`);
        const bounds=await page.$eval('#stage',e=>{const r=e.getBoundingClientRect();return {x:r.x,width:r.width};});
        check(bounds.x>=0&&bounds.x+bounds.width<=size.width+1,`${name}: scene fits viewport ${size.width}`);
        if(size.width>1150)check(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),`${name}: projection controls fit vertically ${size.width}`);
        await page.screenshot({path:path.join(out,`${name}-${size.width}.png`),fullPage:true});
      }
      await page.setViewport({width:1366,height:768});
      await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      check(await page.$eval('.point',e=>parseFloat(getComputedStyle(e).transitionDuration)===0),name+': reduced motion supported');
      await page.click('#notebook');await page.keyboard.press('Tab');
      check(await page.evaluate(()=>document.getElementById('board').contains(document.activeElement)),name+': modal focus stays inside');
      await page.keyboard.press('Escape');await page.click('#reset');
      check(await page.$eval('#count',e=>e.textContent)==='0',name+': reset clears evidence');
      await page.click('#hotspot-list button:first-child');
      check(await page.$eval('#analysis',e=>e.hidden),name+': reset restores student concealment');
      check(requests.length===0,name+': zero external network requests');check(errors.length===0,name+': zero runtime errors '+errors.join(';'));
      await page.close();fs.rmSync(isolated,{recursive:true,force:true});
    }
    const page=await browser.newPage();await page.setViewport({width:1366,height:768});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.join(root,'dist','panorama','index.html')).href);await delay(700);
    const hasGL=await page.evaluate(()=>!!renderer);
    if(hasGL){
      await page.click('#hotspot-list button:nth-child(2)');await delay(560);
      check(await page.$eval('#pano-points button:nth-child(2)',e=>{const a=e.getBoundingClientRect(),s=document.getElementById('stage').getBoundingClientRect();return !e.hidden&&Math.abs(a.x+a.width/2-s.x-s.width/2)<2&&Math.abs(a.y+a.height/2-s.y-s.height/2)<2;}),'panorama: off-axis elevated hotspot centers after rotation');
      await page.click('#hotspot-list button:nth-child(3)');await delay(560);await page.focus('#stage');await page.keyboard.press('ArrowRight');
      check(await page.evaluate(()=>state.yaw===-171),'panorama: actual keyboard crosses +180°');
      const before=await page.evaluate(()=>state.fov);await page.click('#zoom-in');check(await page.evaluate(()=>state.fov)<before,'panorama: zoom changes FOV');
      await page.screenshot({path:path.join(out,'panorama.png')});
      check(await page.evaluate(()=>renderer!==null&&document.getElementById('panorama').width>0),'panorama: WebGL texture rendered');
    }else report.checks.push('SKIP panorama GPU: unavailable; fallback tested separately');
    await page.click('#hotspot-list button:first-child');await delay(560);await page.click('#play-audio');
    await page.waitForFunction(()=>audio&&audio.readyState>=2);
    check(await page.evaluate(()=>audio.duration>0),'audio: embedded WAV decoded after actual click (not speaker listening)');
    await page.click('#slow-audio');await page.waitForFunction(()=>audio&&audio.readyState>=2);
    check(await page.evaluate(()=>audio.duration>0),'audio: slow button routes to embedded asset');
    await page.click('#hotspot-list button:nth-child(2)');
    check(await page.evaluate(()=>audio===null),'audio: opening another observation stops playback');
    await page.click('#scenes button:nth-child(2)');await delay(100);
    await page.click('#plane-points button:first-child');await page.click('#zoom-in');
    check(await page.$eval('#mode-label',e=>e.textContent.includes('示意')),'scene switch: plane mode labeled separately from panorama');
    const planeAligned=await page.evaluate(()=>{const p=document.querySelector('#plane-points button'),s=document.getElementById('scene-image'),a=p.getBoundingClientRect(),b=s.getBoundingClientRect();return Math.abs(a.x+a.width/2-b.x-b.width/2)<2&&Math.abs(a.y+a.height/2-b.y-b.height/2)<2;});
    check(planeAligned,'scene switch: plane marker still aligned after zoom');
    await page.click('#scenes button:first-child');await delay(200);
    check(await page.$eval('#card',e=>e.hidden),'scene switch: old detail card cleared');
    await page.click('#fullscreen');await delay(120);
    check(await page.evaluate(()=>!!document.fullscreenElement||document.getElementById('status').textContent.includes('F11')),'fullscreen: API entered or actionable fallback shown');
    check(errors.length===0,'panorama: no runtime exception');await page.close();
    const fallback=await browser.newPage();
    await fallback.evaluateOnNewDocument(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:get.call(this,type,...args);};});
    await fallback.goto(pathToFileURL(path.join(root,'dist','panorama','index.html')).href);await delay(200);
    await fallback.click('#hotspot-list button:first-child');
    check(await fallback.$eval('#mode-label',e=>e.textContent.includes('降级')),'panorama: unsupported WebGL clearly labeled');
    check(await fallback.$eval('#quote',e=>e.textContent==='中心参考点'),'panorama: fallback text navigation still works');
    await fallback.close();
  }finally{await browser.close();fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));}
}
run().catch(e=>{report.errors.push(e.stack);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));console.error(e);process.exitCode=1;});
