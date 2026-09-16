import { test, expect } from '@playwright/test';
import { sections, publicPaths } from '../src/routes.js';
import { STORAGE_KEY } from '../src/model.js';
async function login(page, role, userId) {
  await page.goto('/login');
  await page.getByRole('button', { name: role, exact: true }).click();
  await page.locator('select[name="userId"]').selectOption(userId);
  await page.getByRole('button', { name: 'Enter workspace' }).click();
  await expect(page).toHaveURL(new RegExp(`/${role}/dashboard$`));
}
async function saved(page) { return page.evaluate(key=>JSON.parse(localStorage.getItem(key)), STORAGE_KEY); }
async function field(page, name, value) { await page.locator(`input[name="${name}"], textarea[name="${name}"]`).fill(String(value)); }
async function confirm(page) { await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click(); await expect(page.getByRole('dialog')).toHaveCount(0); }
test('all public and role routes render without runtime errors',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const path of publicPaths){await page.goto(path);await expect(page.locator('main')).toBeVisible();await expect(page.locator('h1').first()).toBeVisible();}
  for(const [role,id] of [['company','c1'],['contractor','t1'],['worker','w1']]){
    await login(page,role,id);
    for(const section of sections[role]){await page.goto(`/${role}/${section}`);await expect(page.locator('main h1').first()).toBeVisible();}
    if(role!=='worker'){await page.goto(`/${role}/projects/p1`);await expect(page.getByRole('heading',{name:'Skyline Residences · Phase II'})).toBeVisible();}
    if(role==='company'){await page.goto('/company/projects/new');await expect(page.getByRole('button',{name:'Publish project'})).toBeVisible();}
    if(role==='contractor'){await page.goto('/contractor/projects/p1/bid');await expect(page.getByRole('button',{name:'Submit bid'})).toBeVisible();}
  }
  expect(errors).toEqual([]);
});
test('bid, assignment, attendance and payment stay connected across roles and reloads',async({page})=>{
  await login(page,'contractor','t1');await page.goto('/contractor/projects/p1/bid');
  await field(page,'amount',7900000);await field(page,'days',175);await field(page,'proposal','Dedicated execution team with weekly progress reporting.');await page.getByRole('button',{name:'Submit bid'}).click();await expect(page).toHaveURL(/\/contractor\/bids$/);
  await login(page,'company','c1');await page.goto('/company/bids');const bidRow=page.getByRole('row').filter({hasText:'Skyline Residences'});await bidRow.getByRole('button',{name:'Accept',exact:true}).click();await confirm(page);
  expect((await saved(page)).projects.find(p=>p.id==='p1').contractorId).toBe('t1');
  await login(page,'contractor','t1');await page.goto('/contractor/active-projects');await expect(page.getByRole('heading',{name:'Skyline Residences · Phase II'})).toBeVisible();
  await page.goto('/contractor/workers');await page.getByRole('button',{name:'Assign worker',exact:true}).click();await page.locator('[name="projectId"]').selectOption('p4');await page.locator('[name="workerId"]').selectOption('w3');await field(page,'rate',1400);await page.getByRole('dialog').getByRole('button',{name:'Assign worker',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/contractor/attendance');await page.getByRole('button',{name:'Record attendance',exact:true}).click();await page.locator('[name="projectId"]').selectOption('p4');await page.locator('[name="workerId"]').selectOption('w3');await page.locator('[name="status"]').selectOption('Present');await page.getByRole('button',{name:'Save attendance'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/contractor/payments');await page.getByRole('button',{name:'Record payment',exact:true}).click();await page.locator('[name="projectId"]').selectOption('p4');await page.locator('[name="toId"]').selectOption('w3');await field(page,'amount',700);await page.locator('[name="method"]').selectOption('UPI');await field(page,'note','Demo wage settlement');await page.getByRole('button',{name:'Record demo payment'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await login(page,'worker','w3');await page.goto('/worker/earnings');await expect(page.getByText('₹1,400',{exact:true}).first()).toBeVisible();await expect(page.getByText('₹700',{exact:true}).first()).toBeVisible();await page.reload();await expect(page.getByText('₹1,400',{exact:true}).first()).toBeVisible();
  await page.goto('/worker/notifications');await expect(page.getByRole('heading',{name:'Payment recorded'})).toBeVisible();
  const state=await saved(page);expect(state.attendance.some(h=>h.workerId==='w3'&&h.status==='Present')).toBe(true);expect(state.payments.some(p=>p.toId==='w3'&&p.amount===700)).toBe(true);
});
test('project creation, expenses and owner-approved rentals update persisted data',async({page})=>{
  await login(page,'company','c1');await page.goto('/company/projects/new');
  await field(page,'title','Jaipur Community Library');await page.locator('[name="city"]').selectOption('Jaipur');await page.locator('[name="category"]').selectOption('Public infrastructure');await field(page,'budget',2400000);await field(page,'duration',90);await field(page,'area','8,000 sq ft');await field(page,'deadline','2030-12-31');await field(page,'description','Library and accessible community reading rooms.');await page.getByRole('button',{name:'Publish project'}).click();await expect(page).toHaveURL(/\/company\/projects$/);await page.goto('/projects');await expect(page.getByRole('heading',{name:'Jaipur Community Library'})).toBeVisible();
  await login(page,'contractor','t1');await page.goto('/contractor/expenses');await page.getByRole('button',{name:'Add expense'}).click();await page.locator('[name="projectId"]').selectOption('p4');await field(page,'amount',1250);await page.locator('[name="category"]').selectOption('Transport');await field(page,'note','Site transport');await page.getByRole('button',{name:'Save expense'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);expect((await saved(page)).expenses[0].amount).toBe(1250);
  await page.goto('/equipment/e1');await page.getByRole('button',{name:'Request rental',exact:true}).click();await field(page,'days',3);await field(page,'note','Greenfield Community Centre, Delhi');await page.getByRole('dialog').getByRole('button',{name:'Request rental',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await login(page,'company','c1');await page.goto('/company/equipment');await page.getByRole('button',{name:'Approve',exact:true}).click();await confirm(page);expect((await saved(page)).equipment.find(e=>e.id==='e1').available).toBe(false);
  await page.getByRole('button',{name:'Record return'}).click();await confirm(page);expect((await saved(page)).equipment.find(e=>e.id==='e1').available).toBe(true);
});
test('mobile and tablet layouts avoid page overflow and navigation remains usable',async({page})=>{
  for(const width of [375,768,1440]){
    await page.setViewportSize({width,height:900});await page.goto('/');await expect(page.getByRole('heading',{name:'Build better. Build smarter. Build together.'})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/landing-${width}.png`,fullPage:true});
    await login(page,'contractor','t1');
    for(const path of ['/contractor/dashboard','/contractor/payments','/contractor/attendance','/contractor/projects']){await page.goto(path);await expect(page.locator('main h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}
    if(width===375){await page.getByRole('button',{name:'Open navigation'}).click();await expect(page.getByRole('navigation',{name:'contractor navigation'})).toBeVisible();await page.getByRole('navigation',{name:'contractor navigation'}).getByRole('link',{name:'Settings',exact:true}).click();await expect(page).toHaveURL(/\/contractor\/settings$/);}
  }
});
test('demo role guards, form errors, empty filters and modal dismissal work',async({page})=>{
  await page.goto('/company/dashboard');await expect(page).toHaveURL(/\/login$/);await login(page,'worker','w1');await page.goto('/company/projects/new');await expect(page).toHaveURL(/\/worker\/dashboard$/);
  await page.goto('/projects');await page.getByRole('textbox',{name:'Search listings'}).fill('no-such-project');await expect(page.getByRole('heading',{name:'No matching results'})).toBeVisible();await page.getByRole('button',{name:'Clear filters'}).click();await expect(page.getByRole('heading',{name:'Skyline Residences · Phase II'})).toBeVisible();
  await login(page,'contractor','t1');await page.goto('/contractor/payments');await page.getByRole('button',{name:'Record payment',exact:true}).click();await page.locator('[name="projectId"]').selectOption('p4');await page.locator('[name="toId"]').selectOption('w1');await field(page,'amount',100000);await page.locator('[name="method"]').selectOption('Cash');await field(page,'note','Overpayment validation');await page.getByRole('button',{name:'Record demo payment'}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('exceeds');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
});
