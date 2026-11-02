"""Prepare a fresh fictional localhost Test Lab; never opens the canonical DB/.env."""
import argparse,os,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--directory',type=Path,required=True,help='New ~/.codex/tmp/mixermates-correction-YYYYMMDD/preview directory')
p.add_argument('--port',type=int,default=3081)
a=p.parse_args();root=Path(__file__).resolve().parent.parent;dest=a.directory.expanduser().resolve()
import re
if dest.name != 'preview' or not re.fullmatch(r'mixermates-(?:correction-\d{8}(?:-phase[23])?|local-[a-zA-Z0-9_-]+)', dest.parent.name) or dest.exists():p.error('Choose a new owned disposable Test Lab directory. Existing workspaces are preserved.')
subprocess.run([sys.executable,str(root/'scripts/prepare-local-audit.py'),'--directory',str(dest),'--port',str(a.port),'--mode','full_platform'],check=True,cwd=root)
settings=dest/'.env';settings.write_text(settings.read_text().replace('DEMO_MODE="true"','DEMO_MODE="false"').replace('LOCAL_DEMO_BOOKING_ENABLED="true"','LOCAL_DEMO_BOOKING_ENABLED="false"')+'MIXERMATES_TEST_LAB="enabled"\nLOCAL_CUSTOMER_TEST_ENABLED="true"\nMIXERMATES_PAYMENT_SIMULATOR="enabled"\n');settings.chmod(0o600)
env={k:v for k,v in os.environ.items() if not k.startswith('DB_')}
for line in settings.read_text().splitlines():
 k,v=line.split('=',1);env[k]=v.strip('"')
env['NODE_ENV']='development'
import shutil
node=Path(shutil.which('node') or Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node')
subprocess.run([str(node),'--import','tsx','scripts/setup-test-lab.mts'],cwd=dest,env=env,check=True)
launcher=dest/'.local/start-test-lab.py'
launcher.write_text('''import os,subprocess\nfrom pathlib import Path\nw=Path(__file__).resolve().parent.parent\nenv={k:v for k,v in os.environ.items() if not k.startswith("DB_")}\nfor line in (w/".env").read_text().splitlines():\n k,v=line.split("=",1);env[k]=v.strip(chr(34))\nenv["NODE_ENV"]="development"\nraise SystemExit(subprocess.call(['''+repr(str(node))+''',"node_modules/next/dist/bin/next","dev","--webpack","--hostname","127.0.0.1","--port",'''+repr(str(a.port))+'''],cwd=w,env=env))\n''');launcher.chmod(0o600)
print('Prepared. Start with: python3 '+str(launcher))
print('Open http://localhost:'+str(a.port)+'/. No access code is required.')
