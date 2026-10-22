// @vitest-environment node
/** PAdES B-B (product phase 6): a PDF signed with a PKCS#12 certificate is valid for poppler's pdfsig, covers the whole file,
 *  carries ETSI.CAdES.detached, and any later change to the bytes is detected. */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import forge from "node-forge";
import { readP12, signPdf } from "@/apps/documents/pades";

const req = createRequire(import.meta.url);
const PL = req(process.cwd() + "/public/vendor/pdf-lib-1.17.1/pdf-lib.min.js");
const pdfsig = (f: string) => { try { return execFileSync("pdfsig", [f], { encoding: "utf8" }); } catch (e) { return String((e as { stdout?: string }).stdout || "") || null; } };

function makeP12(password: string) {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate(); cert.publicKey = keys.publicKey; cert.serialNumber = "0a1b2c3d";
  cert.validity.notBefore = new Date(Date.now() - 86400e3); cert.validity.notAfter = new Date(Date.now() + 365 * 86400e3);
  const attrs = [{ name: "commonName", value: "Dr Marie Lefevre" }, { name: "organizationName", value: "Remotion Clinic (test)" }, { name: "countryName", value: "BE" }];
  cert.setSubject(attrs); cert.setIssuer(attrs); cert.sign(keys.privateKey, forge.md.sha256.create());
  const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, { algorithm: "3des" });
  return new Uint8Array(Buffer.from(forge.asn1.toDer(p12).getBytes(), "binary"));
}

describe("PAdES B-B signature", () => {
  it("signs, verifies with pdfsig and detects tampering", { timeout: 120_000 }, async () => {
    const p12 = makeP12("s3cret-pass");
    await expect(readP12(p12, "wrong")).rejects.toThrow(/password|format/);
    const signer = await readP12(p12, "s3cret-pass");
    expect(signer.name).toBe("Dr Marie Lefevre");
    const doc = await PL.PDFDocument.create(); const pg = doc.addPage([595, 842]); const f = await doc.embedFont(PL.StandardFonts.Helvetica);
    pg.drawText("Consent form - test", { x: 60, y: 760, size: 16, font: f });
    const src = await doc.save();
    const out = await signPdf(PL, src, signer, { reason: "Consent recorded", location: "Brussels", stamp: { lines: ["Digitally signed by Dr Marie Lefevre", "2026-10-22"] } });
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pades-")); const file = path.join(dir, "signed.pdf"); fs.writeFileSync(file, out);
    const r = pdfsig(file);
    if (r === null) return; // poppler not installed
    expect(r).toContain("Signature Type: ETSI.CAdES.detached");
    expect(r).toContain("Signature Validation: Signature is Valid.");
    expect(r).toMatch(/Total document signed|Signed Ranges/);
    expect(r).toContain("Dr Marie Lefevre");
    // one byte changed inside the signed range → no longer valid
    const bad = Buffer.from(out); const i = bad.indexOf("/Producer"); expect(i).toBeGreaterThan(0); bad[i + 1] = "p".charCodeAt(0); const f2 = path.join(dir, "tampered.pdf"); fs.writeFileSync(f2, bad);
    expect(pdfsig(f2)).not.toContain("Signature Validation: Signature is Valid.");
  });
});
