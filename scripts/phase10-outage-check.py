"""HTTP refusal checks against the owned empty Phase10 localhost database only."""
from pathlib import Path
import json,urllib.request,urllib.error
out=[]
for route in ['events','customer/bookings','customer/reserve','customer/review','entrance/admit']:
 method='POST' if route in ['customer/reserve','customer/review','entrance/admit'] else 'GET'
 req=urllib.request.Request('http://localhost:3055/api/'+route,data=b'{}' if method=='POST' else None,headers={'Cookie':'vibey-session='+'c'*64,'Content-Type':'application/json','Origin':'http://localhost:3055'},method=method)
 try:r=urllib.request.urlopen(req);status=r.status;body=r.read().decode()
 except urllib.error.HTTPError as e:status=e.code;body=e.read().decode()
 assert status==503,(route,status);assert 'Refresh your saved status' in body;assert 'prisma' not in body.lower();out.append({'route':route,'status':status,'secretFree':True})
Path('/Users/parsa/Desktop/EVENT FINDER/docs/phase10/http-schema-failure.json').write_text(json.dumps({'scenario':'Empty incompatible fictional schema; database session lookup fails before protected actions','responses':out,'admissions':0,'fundsConfirmed':0,'ticketsIssued':0},indent=2))
print(json.dumps(out))
