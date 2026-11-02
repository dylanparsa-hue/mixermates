"""Prepare the user's exact raster logo artwork; originals remain untouched."""
from pathlib import Path
from PIL import Image
import numpy as np, json
root=Path(__file__).resolve().parent.parent/'public/branding';out=root/'processed';out.mkdir(exist_ok=True)
symbol=np.array(Image.open(root/'original/mixermates-symbol-original.png').convert('RGBA')).astype(float)
a=symbol[:,:,3]/255
# Remove the navy matte carried in partially transparent edge pixels.
bg=np.array([17.,23.,57.]);rgb=(symbol[:,:,:3]-(1-a[:,:,None])*bg)/np.maximum(a[:,:,None],.015)
symbol[:,:,:3]=np.clip(rgb,0,255);symbol[a<.018,3]=0
im=Image.fromarray(symbol.astype('uint8'),'RGBA');bounds=im.getbbox();im=im.crop(bounds)
# The transparent source is 231px above the canvas center. Crop to actual art,
# then place equal padding around its bounds without stretching the curves.
pad=12;sym=Image.new('RGBA',(im.width+2*pad,im.height+2*pad));sym.alpha_composite(im,(pad,pad));sym.save(out/'mixermates-symbol.png',optimize=True)
source=np.array(Image.open(root/'original/mixermates-logo-original.jpg').convert('RGB')).astype(float)
# Recover alpha from the neutral white and saturated purple/pink channels;
# then un-matte edges rather than retaining the JPEG's navy fringe.
saturation=source.max(2)-source.min(2)
mask=((saturation>66)&(source[:,:,2]>100))|(source.min(2)>155)
alpha=np.clip(np.maximum((saturation-43)/85,(source.min(2)-32)/145),0,1)
alpha*=mask
fg=np.clip((source-(1-alpha[:,:,None])*bg)/np.maximum(alpha[:,:,None],.02),0,255)
rgba=np.dstack((fg,alpha*255)).astype('uint8');full=Image.fromarray(rgba,'RGBA')
# Wordmark lies below the symbol in the official stacked JPG.
word=full.crop((270,1258,1780,1510));word=word.crop(word.getbbox());arr=np.array(word)
# White lettering is "Mixer"; pink lettering remains the exact source color.
white=(arr[:,:,0].astype(float)-arr[:,:,1]<55)&(arr[:,:,1]>115)&(arr[:,:,3]>0)
light=arr.copy();light[white,:3]=[23,23,43]
wordlight=Image.fromarray(light,'RGBA')
# Retain the original glyph shapes and tracking in a compact horizontal lockup.
for mode,w in [('dark',word),('light',wordlight)]:
 h=144;left=sym.resize((round(sym.width*h/sym.height),h),Image.Resampling.LANCZOS)
 wh=80;right=w.resize((round(w.width*wh/w.height),wh),Image.Resampling.LANCZOS)
 lockup=Image.new('RGBA',(left.width+38+right.width,h+16));lockup.alpha_composite(left,(0,8));lockup.alpha_composite(right,(left.width+38,(lockup.height-right.height)//2));lockup.save(out/f'mixermates-logo-{mode}.png',optimize=True)
 # Original stacked arrangement as an additional large-format logo.
 big=sym.resize((1020,round(sym.height*1020/sym.width)),Image.Resampling.LANCZOS)
 stacked=Image.new('RGBA',(word.width+20,big.height+110+word.height));stacked.alpha_composite(big,((stacked.width-big.width)//2,0));stacked.alpha_composite(w,((stacked.width-w.width)//2,big.height+110));stacked.save(out/f'mixermates-logo-stacked-{mode}.png',optimize=True)
icon=Image.new('RGBA',(1024,1024));scaled=sym.resize((832,round(sym.height*832/sym.width)),Image.Resampling.LANCZOS);icon.alpha_composite(scaled,((1024-scaled.width)//2,(1024-scaled.height)//2));icon.save(out/'mixermates-app-icon.png',optimize=True)
for size in [32,180,192,512]:icon.resize((size,size),Image.Resampling.LANCZOS).save(out/f'mixermates-icon-{size}.png',optimize=True)
# Proof sheet tests the actual transparent files against contrasting surfaces.
proof=Image.new('RGB',(1600,1040),'#e9e5f0')
from PIL import ImageDraw
draw=ImageDraw.Draw(proof)
for i,(color,mode) in enumerate([('#101632','dark'),('#000000','dark'),('#ffffff','light')]):
 x=i*530;draw.rectangle((x,0,x+520,360),fill=color);logo=Image.open(out/f'mixermates-logo-{mode}.png');logo.thumbnail((460,180),Image.Resampling.LANCZOS);proof.paste(logo,(x+(520-logo.width)//2,(360-logo.height)//2),logo)
for i,color in enumerate(['#101632','#ffffff','#000000']):
 x=i*530;draw.rounded_rectangle((x+60,425,x+460,825),radius=60,fill=color);small=Image.open(out/'mixermates-symbol.png');small.thumbnail((330,230),Image.Resampling.LANCZOS);proof.paste(small,(x+260-small.width//2,625-small.height//2),small)
 draw.ellipse((x+175,855,x+345,1025),fill=color);tiny=Image.open(out/'mixermates-symbol.png');tiny.thumbnail((130,90),Image.Resampling.LANCZOS);proof.paste(tiny,(x+260-tiny.width//2,940-tiny.height//2),tiny)
proof.save(out/'brand-proof.png')
report={'original_symbol_canvas':[3000,3000],'visible_bounds':bounds,'symbol_visual_center':[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2],'source_png_has_alpha':True,'source_jpg_has_alpha':False,'production_format':'Transparent optimized PNG; source geometry and glyphs preserved','palette':{'purple':'#532FEA','violet':'#9E1FF0','pink':'#ED07FB'}}
(out/'asset-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
