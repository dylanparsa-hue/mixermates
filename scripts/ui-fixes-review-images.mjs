import sharp from 'sharp';
const root='/Users/parsa/Desktop/EVENT FINDER/docs/ui-fixes';
for(const theme of ['light','dark'])for(const width of [390,1440]){
 const names=['hero','home','event','profile-menu','organizer','notifications'],tile=width===390?360:720,cols=width===390?3:2,content=Math.round(900*tile/width),rowHeight=content+36,composite=[];
 for(let i=0;i<names.length;i++){const name=names[i],file=`${root}/after/${name}-${theme}-${width}.png`,meta=await sharp(file).metadata();const screenshot=await sharp(file).extract({left:0,top:0,width:meta.width,height:Math.min(900,meta.height)}).resize(tile,content,{fit:'contain',background:theme==='light'?'#f8f7f5':'#080909'}).png().toBuffer();const left=i%cols*tile,top=Math.floor(i/cols)*rowHeight;composite.push({input:screenshot,left,top:top+36},{input:Buffer.from(`<svg width="${tile}" height="36"><rect width="100%" height="100%" fill="${theme==='light'?'#fff':'#1c1f20'}"/><text x="12" y="24" fill="${theme==='light'?'#18191a':'#fff'}" font-family="Arial" font-size="16">${name} · ${theme} · ${width}px</text></svg>`),left,top});}
 await sharp({create:{width:cols*tile,height:Math.ceil(names.length/cols)*rowHeight,channels:3,background:theme==='light'?'#f8f7f5':'#080909'}}).composite(composite).png().toFile(`${root}/review-${theme}-${width}.png`);
}
