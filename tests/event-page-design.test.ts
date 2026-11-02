import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanDocument, designInput, readDesign, safeLink, designAssets } from '../lib/page-design';
import { permittedUsername } from '../lib/social';
test('rich documents reject scripts, embeds, unsafe images and excessive nesting',()=>{
 for(const type of ['script','iframe','svg','html'])assert.throws(()=>cleanDocument({type:'doc',content:[{type}]}));
 for(const src of ['javascript:alert(1)','data:image/svg+xml;base64,x','https://evil.test/tracker.png','/api/payment-qr/private'])assert.throws(()=>cleanDocument({type:'doc',content:[{type:'image',attrs:{src}}]}));
 let node:any={type:'paragraph'};for(let i=0;i<14;i++)node={type:'blockquote',content:[node]};assert.throws(()=>cleanDocument({type:'doc',content:[node]}));
 assert.throws(()=>cleanDocument({type:'doc',content:[{type:'text',text:'a'.repeat(50001)}]}));
});
test('rich formatting is allowlisted, images have a complete ownership inventory',()=>{
 const d=designInput.parse({about:{type:'doc',content:[{type:'paragraph',attrs:{onclick:'evil',textAlign:'center'},content:[{type:'text',text:'Welcome',marks:[{type:'bold'},{type:'link',attrs:{href:'javascript:evil'}},{type:'style',attrs:{color:'red'}}]}]},{type:'image',attrs:{src:'/images/neon.jpg',onerror:'evil'}}]}});
 assert.deepEqual(designAssets(d),['/images/neon.jpg']);assert(!JSON.stringify(d).includes('evil'));assert.equal(d.about!.content![0].attrs!.textAlign,'center');
 assert.equal(readDesign(JSON.stringify(d)).about!.content![0].content![0].text,'Welcome');
});
test('design controls are bounded and unsafe links are not rendered',()=>{
 for(const value of ['javascript:alert(1)','//evil.test','data:text/html,hello','https://user:pass@evil.test'])assert.equal(safeLink(value),'');
 assert.equal(safeLink('https://example.test'),'https://example.test/');
 assert(!designInput.safeParse({banner:{zoom:4}}).success);assert(!designInput.safeParse({accent:'custom-script'}).success);
 for(const name of ['admin','support','mixermates','root'])assert(!permittedUsername(name));assert(permittedUsername('fictional_mate'));
});
