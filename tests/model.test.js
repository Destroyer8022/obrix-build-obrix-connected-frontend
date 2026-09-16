import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, today } from '../src/data.js';
import { transition, earned, paid, restore } from '../src/model.js';
function workspace(userId='t1') { let s=transition(seed(),{type:'LOGIN',data:{userId}}); return { get state(){return s;}, act(type,data={},id){s=transition(s,{type,data,id});return s;}}; }
test('bid acceptance connects both roles and rejects competing bids',()=>{
 const w=workspace(); w.act('BID_SUBMIT',{projectId:'p1',amount:8000000,days:180,proposal:'Experienced site team'},'bid-test');
 assert.ok(w.state.notifications.some(n=>n.userId==='c1'&&n.title==='New project bid'));
 assert.throws(()=>w.act('BID_SUBMIT',{projectId:'p1',amount:1,days:1,proposal:'Duplicate'}),/already/);
 w.act('LOGIN',{userId:'t2'});w.act('BID_SUBMIT',{projectId:'p1',amount:8200000,days:190,proposal:'Alternative execution'},'bid-other');
 w.act('LOGIN',{userId:'c1'});w.act('BID_DECIDE',{bidId:'bid-test',status:'Accepted'});
 const p=w.state.projects.find(p=>p.id==='p1');assert.equal(p.status,'Active');assert.equal(p.contractorId,'t1');
 assert.equal(w.state.bids.find(b=>b.id==='bid-other').status,'Rejected');assert.ok(w.state.notifications.some(n=>n.userId==='t1'&&n.title==='Bid accepted'));
 assert.throws(()=>w.act('BID_DECIDE',{bidId:'bid-test',status:'Accepted'}),/cannot/);
});
test('worker attendance accrues wages and payments update balance and notifications',()=>{
 const w=workspace();w.act('ASSIGN',{projectId:'p4',workerId:'w3',rate:1400});
 w.act('ATTENDANCE',{projectId:'p4',workerId:'w3',date:today(),status:'Present'});
 assert.equal(earned(w.state,'w3'),1400);w.act('PAYMENT',{projectId:'p4',toId:'w3',amount:700,method:'UPI',note:'Wages'});
 assert.equal(paid(w.state,'w3'),700);assert.ok(w.state.notifications.some(n=>n.userId==='w3'&&n.title==='Payment recorded'));
 assert.throws(()=>w.act('PAYMENT',{projectId:'p4',toId:'w3',amount:701,method:'UPI',note:'Overpay'}),/exceeds/);
 assert.throws(()=>w.act('ATTENDANCE',{projectId:'p4',workerId:'w3',date:today(),status:'Absent'}),/below/);
 w.act('ATTENDANCE',{projectId:'p4',workerId:'w3',date:today(),status:'Half day'});assert.equal(earned(w.state,'w3'),700);
 assert.equal(w.state.attendance.filter(a=>a.workerId==='w3').length,1);
});
test('assignment removal preserves attendance and financial history',()=>{const w=workspace();w.act('UNASSIGN',{assignmentId:'a1'});assert.equal(w.state.assignments.some(a=>a.id==='a1'),false);assert.equal(earned(w.state,'w1'),900);assert.equal(paid(w.state,'w1'),450);});
test('company contract payments cannot exceed accepted contract amount',()=>{const w=workspace('c1');w.act('PAYMENT',{projectId:'p4',amount:100000,method:'Bank transfer',note:'Milestone'});assert.equal(paid(w.state,'t1','p4'),350000);assert.throws(()=>w.act('PAYMENT',{projectId:'p4',amount:3000000,method:'Bank transfer',note:'Overpay'}),/exceeds/);});
test('rental requests reserve equipment on owner approval and release on return',()=>{const w=workspace();w.act('RENTAL',{equipmentId:'e1',start:today(),days:3,note:'Delhi site'},'rental-test');assert.equal(w.state.rentals[0].total,19500);assert.throws(()=>w.act('RENTAL_STATUS',{rentalId:'rental-test',status:'Approved'}),/not allowed/);w.act('LOGIN',{userId:'c1'});w.act('RENTAL_STATUS',{rentalId:'rental-test',status:'Approved'});assert.equal(w.state.equipment.find(e=>e.id==='e1').available,false);w.act('LOGIN',{userId:'t1'});w.act('RENTAL_STATUS',{rentalId:'rental-test',status:'Returned'});assert.equal(w.state.equipment.find(e=>e.id==='e1').available,true);});
test('expenses, profile, skills and settings remain in restored state',()=>{const w=workspace();w.act('EXPENSE',{projectId:'p4',amount:1234,category:'Materials',note:'Bricks'});w.act('SETTINGS',{notifications:'Off',compact:'Compact'});w.act('LOGIN',{userId:'w1'});w.act('SKILLS',{skills:'Masonry, Painting, Masonry',rate:1100});w.act('AVAILABILITY',{availability:'On leave'});const s=restore(JSON.stringify(w.state));assert.equal(s.expenses.at(0).amount,1234);assert.deepEqual(s.users.find(u=>u.id==='w1').skills,['Masonry','Painting']);assert.equal(s.settings.t1.compact,true);assert.equal(s.session,'w1');});
test('invalid actions cannot mutate original state',()=>{const s=seed();s.session='w1';const before=JSON.stringify(s);assert.throws(()=>transition(s,{type:'EXPENSE',data:{projectId:'p4',amount:20,category:'Other',note:'Invalid'}}));assert.equal(JSON.stringify(s),before);assert.throws(()=>restore('{invalid'));assert.throws(()=>restore('{"version":99}'));});
test('profile signup is demo-only, rejects duplicates and validates numeric values',()=>{const w=workspace();w.act('SIGNUP',{role:'worker',name:'Test Worker',email:'test@example.com',city:'Jaipur'},'test-worker');assert.equal(w.state.session,'test-worker');assert.throws(()=>w.act('SIGNUP',{role:'worker',name:'Test',email:'TEST@example.com',city:'Jaipur'}),/already exists/);w.act('LOGIN',{userId:'t1'});for(const amount of [-1,0,'not a number',Infinity])assert.throws(()=>w.act('EXPENSE',{projectId:'p4',amount,category:'Other',note:'Invalid'}));});
test('company publishes a discoverable project and controls edits',()=>{const w=workspace('c1');const d={title:'New site',city:'Delhi',category:'Residential',budget:100000,duration:30,area:'1000 sq ft',deadline:today(),description:'Foundation work'};w.act('PROJECT_SAVE',d,'new-project');assert.equal(w.state.projects[0].status,'Open');w.act('LOGIN',{userId:'c2'});assert.throws(()=>w.act('PROJECT_SAVE',{...d,projectId:'new-project'}),/Only your/);});
test('notifications can only be marked read for the active account',()=>{const w=workspace('w1');w.act('READ');assert.ok(w.state.notifications.filter(n=>n.userId==='w1').every(n=>n.read));assert.ok(w.state.notifications.some(n=>n.userId==='c1'&&!n.read));});
test('reset restores seed and clears the session',()=>{const w=workspace();w.act('RESET');assert.equal(w.state.session,null);assert.equal(w.state.projects.length,4);});
