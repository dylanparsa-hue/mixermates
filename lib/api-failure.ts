/** Classify infrastructure failures without exposing connection strings, SQL or credentials. */
export function infrastructureFailure(error: unknown) {
  const code =
    error && typeof error === "object"
      ? String(
          "code" in error
            ? error.code
            : "errorCode" in error
              ? error.errorCode
              : "",
        )
      : "";
  // SQLite's engine can omit errorCode on initialization failure entirely.
  if (
    (error instanceof Error &&
      error.name === "PrismaClientInitializationError") ||
    [
      "P1000",
      "P1001",
      "P1002",
      "P1003",
      "P1008",
      "P1017",
      "P2021",
      "P2022",
      "P2024",
      "P2028",
      "P2034",
    ].includes(code)
  ) {
    return {
      status: 503,
      message:
        "The service cannot verify this request right now. Refresh your saved status before retrying. Do not pay again or admit a guest without confirmation.",
    };
  }
  return null;
}
