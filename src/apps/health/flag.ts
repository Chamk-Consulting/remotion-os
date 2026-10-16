/**
 * Healthcare suite switch (slices 14–16). Patients, Calendar, Cabinet and Planning are tightly coupled (record hooks,
 * direct calls, shared bus consumers), so they move from the bridge to native together. Since slice 16 all four are
 * native and the native suite is the default. Rollback (doc 14 §6): `?health=legacy` serves the bridged apps for one
 * visit (diagnosis, support); a build with NEXT_PUBLIC_HEALTH_NATIVE=0 makes the bridged apps the default again.
 * `?health=native` keeps forcing the native suite (tests, and builds where the default is the bridge).
 */
export const healthNative = () => {
  try {
    const q = new URLSearchParams(location.search).get("health");
    if (q === "native") return true;
    if (q === "legacy") return false;
  } catch {}
  return process.env.NEXT_PUBLIC_HEALTH_NATIVE !== "0";
};
