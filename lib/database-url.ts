export function databaseUrl(
  env: Record<string, string | undefined> = process.env,
) {
  if (env.DB_PASSWORD !== undefined && env.DB_NAME && env.DB_USER) {
    const url = new URL("mysql://localhost");
    url.hostname = env.DB_HOST || "localhost";
    url.port = env.DB_PORT || "3306";
    url.username = encodeURIComponent(env.DB_USER);
    url.password = encodeURIComponent(env.DB_PASSWORD);
    url.pathname = `/${env.DB_NAME}`;
    return url.toString();
  }
  return env.DATABASE_URL;
}

/** SQLite permits one writer; a CPU-sized pool amplifies read-to-write lock contention. */
export function clientDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
) {
  const value = databaseUrl(env);
  if (!value?.startsWith("file:")) return value;
  const question = value.indexOf("?");
  const location = question < 0 ? value : value.slice(0, question);
  const query = new URLSearchParams(
    question < 0 ? "" : value.slice(question + 1),
  );
  if (!query.has("connection_limit")) query.set("connection_limit", "1");
  return location + "?" + query.toString();
}
