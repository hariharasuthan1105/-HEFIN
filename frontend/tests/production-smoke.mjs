import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel:'msedge' });
try {
  const page = await browser.newPage({ viewport:{width:1440,height:1000} });
  await page.addInitScript(() => {
    Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8,configurable:true});
    Object.defineProperty(navigator,'deviceMemory',{get:()=>8,configurable:true});
    Object.defineProperty(navigator,'connection',{get:()=>({saveData:false}),configurable:true});
  });
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('console', m=>{ if(m.type()==='error')errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4201/');
  await page.locator('h1').waitFor();
  assert.match(await page.locator('h1').innerText(), /Healthcare/);
  await page.locator('.hospital-experience[data-mode="interactive"]').waitFor({timeout:20000});
  assert.equal(await page.locator('canvas.hospital-canvas').count(),1);
  assert.equal(await page.evaluate(()=>window.__hefinHospitalMetrics),undefined);
  assert.equal(await page.getByRole('link',{name:'Design system',exact:true}).count(),0);
  await page.goto('http://127.0.0.1:4201/design-system');
  await page.getByRole('heading',{name:'Let’s get you back on track.'}).waitFor();
  await page.goto('http://127.0.0.1:4201/hospital/dashboard');
  await page.getByRole('heading',{name:'Hospital workspace',exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS: production landing and real 3D, deep link, no debug metrics/design-system route/link, no console errors.');
} finally { await browser.close(); }
