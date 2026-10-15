/**
 * Healthcare suite switch (slices 14–15). Patients, Calendar, Cabinet and Planning are tightly coupled (record hooks,
 * direct calls, shared bus consumers), so they move from the bridge to native together: the native bodies are used
 * with `?health=native` (tests, review) or a build with NEXT_PUBLIC_HEALTH_NATIVE=1; otherwise the live route keeps
 * the bridged apps. See doc 15 (slices 14–15) and doc 14 §6.
 */
export const healthNative = () => {
  if (process.env.NEXT_PUBLIC_HEALTH_NATIVE === "1") return true;
  try { return new URLSearchParams(location.search).get("health") === "native"; } catch { return false; }
};
