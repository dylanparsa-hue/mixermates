const failures=[];
if(process.env.NODE_ENV!=='production')failures.push('NODE_ENV must be production.');
if(process.env.SITE_MODE!=='coming_soon'||process.env.TICKET_SALES_MODE!=='disabled')failures.push('Initial deployment requires Coming Soon and disabled ticket sales.');
for(const key of ['DEMO_MODE','LOCAL_DEMO_BOOKING_ENABLED','LOCAL_CUSTOMER_TEST_ENABLED','ISOLATED_TEST_DATA','MYSQL_DISPOSABLE_TEST','HOSTINGER_DATABASE_BOOTSTRAP','HOSTINGER_SEED_DEMO'])if(process.env[key]&&process.env[key]!=='false')failures.push(key+' must be false.');
if(process.env.APP_ORIGIN!=='https://mixermates.com'&&!(process.env.LOCAL_RELEASE_SMOKE==='true'&&process.env.APP_ORIGIN==='http://localhost:3003'))failures.push('Set the approved application origin.');
let configured=process.env.DB_PASSWORD!==undefined&&process.env.DB_NAME&&process.env.DB_USER;
if(!configured){try{configured=new URL(process.env.DATABASE_URL).protocol==='mysql:';}catch{}}
if(!configured)failures.push('Configure the private MySQL connection in hosting.');
if(failures.length){console.error('Release configuration refused:',failures.join(' '));process.exit(1);}console.log('Guarded release environment validated. No connection or migration performed.');
