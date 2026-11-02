export function validatePublicRelease(env=process.env) {
  const failures=[];
  if(env.NODE_ENV!=="production")failures.push("Production runtime required.");
  if(env.APP_ORIGIN!=="https://mixermates.com")failures.push("Approved HTTPS origin required.");
  if(env.SITE_MODE!=="full_platform" || env.TICKET_SALES_MODE!=="disabled")failures.push("Public browsing with disabled sales required.");
  for(const key of ["DEMO_MODE","LOCAL_DEMO_BOOKING_ENABLED","LOCAL_CUSTOMER_TEST_ENABLED","ISOLATED_TEST_DATA","MYSQL_DISPOSABLE_TEST","HOSTINGER_DATABASE_BOOTSTRAP","HOSTINGER_SEED_DEMO"])
    if(env[key] && env[key]!=="false")failures.push(key+" must be false.");
  if(env.MIXERMATES_TEST_LAB && env.MIXERMATES_TEST_LAB!=="disabled")failures.push("Test Lab must be disabled.");
  if(!env.DATABASE_URL?.startsWith("mysql:") && !(env.DB_USER && env.DB_NAME && env.DB_PASSWORD!==undefined))failures.push("Private MySQL connection required.");
  if(failures.length)throw Error("Public demo release refused: "+failures.join(" "));
}
if(process.argv[1]?.endsWith("validate-public-release-env.mjs")) {validatePublicRelease();console.log("Public browsing ready; real sales, billing and local simulations disabled.");}
