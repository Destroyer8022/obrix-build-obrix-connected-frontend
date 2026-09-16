import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, today } from '../src/data.js';
import { transition } from '../src/model.js';
test('only the assigned contractor updates progress and the owning company completes delivery',()=>{
 let s=seed();const act=(type,data)=>{s=transition(s,{type,data});};
 act('LOGIN',{userId:'t2'});assert.throws(()=>act('PROJECT_PROGRESS',{projectId:'p4',progress:50}),/your active/);
 act('LOGIN',{userId:'t1'});assert.throws(()=>act('PROJECT_PROGRESS',{projectId:'p4',progress:101}),/exceed/);
 act('PROJECT_PROGRESS',{projectId:'p4',progress:100});assert.equal(s.projects.find(p=>p.id==='p4').progress,100);
 act('LOGIN',{userId:'c1'});act('PROJECT_COMPLETE',{projectId:'p4'});assert.equal(s.projects.find(p=>p.id==='p4').status,'Completed');
 assert.ok(s.notifications.some(n=>n.userId==='t1'&&n.title==='Project completed'));
});
test('attendance across multiple sites cannot exceed one full day',()=>{
 let s=seed();s.session='t1';s.projects[0].contractorId='t1';s.projects[0].status='Active';
 s=transition(s,{type:'ASSIGN',data:{projectId:'p1',workerId:'w1',rate:900}});
 assert.throws(()=>transition(s,{type:'ATTENDANCE',data:{projectId:'p1',workerId:'w1',date:today(),status:'Present'}}),/exceed one day/);
});
test('rental approval conflict is rejected without changing the second request',()=>{
 let s=seed();const act=(type,data,id)=>{s=transition(s,{type,data,id});};
 act('LOGIN',{userId:'t1'});act('RENTAL',{equipmentId:'e1',start:today(),days:1,note:'Delhi site'},'one');
 act('LOGIN',{userId:'t2'});act('RENTAL',{equipmentId:'e1',start:today(),days:1,note:'Other site'},'two');
 act('LOGIN',{userId:'c1'});act('RENTAL_STATUS',{rentalId:'one',status:'Approved'});
 assert.throws(()=>act('RENTAL_STATUS',{rentalId:'two',status:'Approved'}),/already rented/);
 assert.equal(s.rentals.find(r=>r.id==='two').status,'Requested');
});
