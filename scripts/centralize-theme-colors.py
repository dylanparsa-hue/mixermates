"""Migrate legacy page colors onto semantic roles; imagery/QR paper keep fixed roles."""
from pathlib import Path
import re,colorsys
for p in Path('app/styles').glob('*.css'):
 if p.name=='brand-theme.css':continue
 text=p.read_text()
 # Old root declarations must not shadow the new common aliases.
 text=re.sub(r'^\s*--(?:bg|surface|surface2|border|text|muted|accent|accent-strong|green|tabs-bar-bg|tabs-pill-bg|tabs-text-muted|tabs-text-active):[^;]+;\n','',text,flags=re.M)
 def declaration(m):
  prop=m.group(1);value=m.group(2)
  if prop.startswith('--'):return m.group(0)
  def color(c):
   h=c.group(0)[1:]
   if len(h) in [3,4]:h=''.join(x*2 for x in h)
   r,g,b=[int(h[i:i+2],16)/255 for i in [0,2,4]];alpha=int(h[6:8],16)/255 if len(h)==8 else 1
   hue,lum,sat=colorsys.rgb_to_hls(r,g,b)
   if p.name=='entry-ticket.css':
    if prop=='color':role='on-photo' if lum>.8 else 'ticket-ink' if lum<.35 else 'ticket-muted'
    elif prop.startswith('border'):role='ticket-line'
    elif 'shadow' in prop:role='shadow'
    elif lum>.88:role='ticket-paper'
    elif sat>.38:role='brand-purple' if b>=r else 'brand-pink'
    else:role='ticket-ink'
   elif 'shadow' in prop:role='shadow' if lum<.45 else 'border'
   elif prop.startswith('border') or prop in ['outline-color']:return 'var(--border)'
   elif prop=='color' or prop=='fill' or prop=='stroke':
    if sat>.45 and lum>.35:role='accent' if hue<.47 or hue>.72 else 'primary'
    elif lum>.82:role='foreground'
    else:role='muted-foreground' if lum>.35 else 'foreground'
    alpha=1
   elif lum>.86 and alpha>.9:role='surface-elevated'
   elif lum>.7 and alpha<.5:role='foreground'
   elif sat>.50 and lum>.30:
    role='brand-pink' if hue<.46 or hue>.72 else 'brand-purple'
   elif lum<.07:role='background'
   elif lum<.18:role='surface'
   elif lum<.33:role='surface-elevated'
   else:role='muted-foreground'
   result=f'var(--{role})'
   return f'color-mix(in srgb, {result} {round(alpha*100)}%, transparent)' if alpha<.99 else result
  value=re.sub(r'#[0-9a-fA-F]{3,8}\b',color,value)
  return prop+':'+value+';'
 text=re.sub(r'([\w-]+)\s*:([^{};]+);',declaration,text)
 p.write_text(text)
