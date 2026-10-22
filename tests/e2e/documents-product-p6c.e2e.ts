/** Documents product phase 6 — PAdES B-B: the document's PDF signed with a .p12 certificate is valid for pdfsig, the wrong password is
 *  refused, and the signature (signer, certificate, fingerprint of the signed file) is recorded with the document. */
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import forge from "node-forge";
import { W, newShell, openShell, openDc, dclick, readStore } from "../helpers/documents";

test.describe.configure({ timeout: 240_000 });
function p12File(password: string) {
  const keys = forge.pki.rsa.generateKeyPair(2048); const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey; cert.serialNumber = "01ab"; cert.validity.notBefore = new Date(Date.now() - 86400e3); cert.validity.notAfter = new Date(Date.now() + 365 * 86400e3);
  const a = [{ name: "commonName", value: "Dr Marie Lefevre" }, { name: "organizationName", value: "Remotion Clinic (test)" }]; cert.setSubject(a); cert.setIssuer(a); cert.sign(keys.privateKey, forge.md.sha256.create());
  const path = `test-results/p6c-${Date.now()}.p12`; fs.writeFileSync(path, Buffer.from(forge.asn1.toDer(forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, { algorithm: "3des" })).getBytes(), "binary")); return path;
}

test("sign the document as a PAdES PDF with a .p12 certificate", async ({ browser, baseURL }) => {
  const cert = p12File("clinic-pass-1");
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  await dclick(p, `${W} [data-dsharem]`, 500);
  await p.locator(".os-menu button", { hasText: "Sign as PDF (PAdES)" }).first().click(); await p.waitForTimeout(600);
  await p.setInputFiles(`${W} .dc-mdl [data-dxp12]`, cert);
  await p.fill(`${W} .dc-mdl [data-dxp12pw]`, "wrong");
  await dclick(p, `${W} .dc-mdl [data-dxpago]`, 3000);
  await expect(p.locator(`${W} .dc-mdl .dcx-err`)).toContainText("Wrong certificate password");
  await p.fill(`${W} .dc-mdl [data-dxp12pw]`, "clinic-pass-1");
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 90000 }), dclick(p, `${W} .dc-mdl [data-dxpago]`, 300)]);
  const path = `test-results/p6c-signed-${Date.now()}.pdf`; await dl.saveAs(path);
  await p.waitForTimeout(1200);
  const st = (await readStore(p))!.json as { cur: string; docs: Record<string, { pades?: { by: string; pdf: string; cert: string }[] }> };
  await ctx.close();
  expect(dl.suggestedFilename()).toMatch(/signed\.pdf$/);
  const sha = crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex");
  const rec = st.docs[st.cur].pades!; expect(rec.length).toBe(1); expect(rec[0].by).toBe("Dr Marie Lefevre"); expect(rec[0].pdf).toBe(sha);
  let out = ""; try { out = execFileSync("pdfsig", [path], { encoding: "utf8" }); } catch (e) { out = String((e as { stdout?: string }).stdout || ""); }
  test.skip(!out, "poppler-utils not installed");
  expect(out).toContain("Signature Type: ETSI.CAdES.detached");
  expect(out).toContain("Signature Validation: Signature is Valid.");
  expect(out).toContain("Dr Marie Lefevre");
  // the page text is still there and the mark is drawn
  const txt = execFileSync("pdftotext", [path, "-"], { encoding: "utf8" });
  expect(txt).toContain("Digitally signed by Dr Marie Lefevre");
});
