/**
 * PAdES baseline B-B signatures (ETSI EN 319 142-1) — Documents product phase 6.
 *
 * The practice signs with its own certificate (a PKCS#12 file: .p12 / .pfx, from an eIDAS trust service provider or the organisation's
 * own CA). Everything happens in the browser: the certificate and its key are read in memory only, never stored or sent anywhere.
 *
 * - The PDF gets a signature field (invisible widget) whose value is a /Sig dictionary: /Filter /Adobe.PPKLite,
 *   /SubFilter /ETSI.CAdES.detached, /ByteRange covering the whole file except the /Contents hole, the signing time in /M.
 * - /Contents is a detached CMS SignedData (CAdES-BES): signed attributes content-type, message-digest (SHA-256 of the byte range) and
 *   ESS signing-certificate-v2 (SHA-256 of the signer certificate) — the attributes PAdES B-B requires; no signing-time attribute
 *   (PAdES puts the time in /M). RSA PKCS#1 v1.5 with SHA-256. The certificate chain found in the file is embedded.
 * - Readers (Adobe Acrobat, pdfsig…) check the signature; whether they show it as trusted depends on who issued the certificate
 *   (a qualified certificate from a trusted list shows as trusted; a self-signed one shows as valid but of unknown identity).
 */
import type * as Forge from "node-forge";

type F = typeof Forge;
let forgeP: Promise<F> | null = null;
/** node-forge is loaded only when a signature is made (it is not part of the editor's startup code). */
export function loadForge(): Promise<F> {
  if (!forgeP) forgeP = import("node-forge").then((m) => ((m as unknown as { default?: F }).default || (m as unknown as F)));
  return forgeP;
}

export type Signer = { key: Forge.pki.rsa.PrivateKey; cert: Forge.pki.Certificate; chain: Forge.pki.Certificate[]; name: string; issuer: string; notBefore: Date; notAfter: Date; serial: string; sha256: string };
export type SignerError = "password" | "nokey" | "nocert" | "notrsa" | "format";

/** Reads a PKCS#12 file. Throws an Error whose message is one of SignerError. */
export async function readP12(bytes: Uint8Array, password: string): Promise<Signer> {
  const forge = await loadForge();
  let p12: Forge.pkcs12.Pkcs12Pfx;
  try {
    const der = forge.util.binary.raw.encode(bytes);
    p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der), false, password);
  } catch (e) {
    const m = String((e as Error)?.message || e);
    throw new Error(/mac|password|decrypt|Invalid/i.test(m) ? "password" : "format");
  }
  const keyBags = [...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || []), ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || [])];
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const key = keyBags.find((b) => b.key)?.key as Forge.pki.rsa.PrivateKey | undefined;
  if (!keyBags.length) throw new Error("nokey");
  if (!key) throw new Error("notrsa"); /* forge decodes RSA keys only */
  const certs = certBags.map((b) => b.cert).filter(Boolean) as Forge.pki.Certificate[];
  if (!certs.length) throw new Error("nocert");
  /* the signer certificate is the one whose public key matches the private key */
  const pubOf = (c: Forge.pki.Certificate) => (c.publicKey as Forge.pki.rsa.PublicKey).n?.toString(16);
  const cert = certs.find((c) => pubOf(c) === key.n.toString(16)) || certs[0];
  const chain = certs.filter((c) => c !== cert);
  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const md = forge.md.sha256.create(); md.update(der);
  const cn = (c: Forge.pki.Certificate, w: "subject" | "issuer") => (c[w].getField("CN")?.value as string) || c[w].attributes.map((a) => a.value).join(", ");
  return { key, cert, chain, name: cn(cert, "subject"), issuer: cn(cert, "issuer"), notBefore: cert.validity.notBefore, notAfter: cert.validity.notAfter, serial: cert.serialNumber, sha256: md.digest().toHex() };
}

/** Detached CMS SignedData (CAdES-BES) over `digest` (the SHA-256 of the signed byte range, as a binary string). */
export async function cadesDetached(signer: Signer, digestBin: string): Promise<string> {
  const forge = await loadForge();
  const { asn1, pki } = forge; const A = asn1.create, C = asn1.Class.UNIVERSAL, T = asn1.Type;
  const oid = (o: string) => A(C, T.OID, false, asn1.oidToDer(o).getBytes());
  const algSha256 = () => A(C, T.SEQUENCE, true, [oid("2.16.840.1.101.3.4.2.1"), A(C, T.NULL, false, "")]);
  const certDer = asn1.toDer(pki.certificateToAsn1(signer.cert)).getBytes();
  const certHash = forge.md.sha256.create(); certHash.update(certDer);
  const attr = (type: string, value: Forge.asn1.Asn1) => A(C, T.SEQUENCE, true, [oid(type), A(C, T.SET, true, [value])]);
  const attrs = [
    attr("1.2.840.113549.1.9.3", oid("1.2.840.113549.1.7.1")), // content-type: data
    attr("1.2.840.113549.1.9.4", A(C, T.OCTETSTRING, false, digestBin)), // message-digest
    // ESS signing-certificate-v2: SEQ { certs SEQ OF ESSCertIDv2 { certHash } } (hash algorithm SHA-256 is the default, so omitted)
    attr("1.2.840.113549.1.9.16.2.47", A(C, T.SEQUENCE, true, [A(C, T.SEQUENCE, true, [A(C, T.SEQUENCE, true, [A(C, T.OCTETSTRING, false, certHash.digest().getBytes())])])])),
  ];
  /* DER SET OF: elements sorted by their encoding */
  const enc = attrs.map((a) => ({ a, d: asn1.toDer(a).getBytes() })).sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : 0));
  const setDer = asn1.toDer(A(C, T.SET, true, enc.map((x) => x.a))).getBytes();
  const md = forge.md.sha256.create(); md.update(setDer);
  const sig = signer.key.sign(md);
  const signedAttrs = A(asn1.Class.CONTEXT_SPECIFIC, 0, true, enc.map((x) => x.a)); // [0] IMPLICIT
  const issuerSerial = A(C, T.SEQUENCE, true, [(pki as unknown as { distinguishedNameToAsn1: (n: unknown) => Forge.asn1.Asn1 }).distinguishedNameToAsn1(signer.cert.issuer), A(C, T.INTEGER, false, forge.util.hexToBytes(signer.cert.serialNumber))]);
  const signerInfo = A(C, T.SEQUENCE, true, [
    A(C, T.INTEGER, false, asn1.integerToDer(1).getBytes()), issuerSerial, algSha256(), signedAttrs,
    A(C, T.SEQUENCE, true, [oid("1.2.840.113549.1.1.11"), A(C, T.NULL, false, "")]), // sha256WithRSAEncryption
    A(C, T.OCTETSTRING, false, sig),
  ]);
  const signedData = A(C, T.SEQUENCE, true, [
    A(C, T.INTEGER, false, asn1.integerToDer(1).getBytes()),
    A(C, T.SET, true, [algSha256()]),
    A(C, T.SEQUENCE, true, [oid("1.2.840.113549.1.7.1")]), // detached: no eContent
    A(asn1.Class.CONTEXT_SPECIFIC, 0, true, [signer.cert, ...signer.chain].map((c) => pki.certificateToAsn1(c))),
    A(C, T.SET, true, [signerInfo]),
  ]);
  const ci = A(C, T.SEQUENCE, true, [oid("1.2.840.113549.1.7.2"), A(asn1.Class.CONTEXT_SPECIFIC, 0, true, [signedData])]);
  return asn1.toDer(ci).getBytes();
}

/* ---- the PDF part, on pdf-lib (passed in: Documents loads it from /vendor, the tests from the same file) ---- */
type PdfLibNs = {
  PDFDocument: { load: (b: Uint8Array, o?: Record<string, unknown>) => Promise<PdfDocLike> };
  PDFName: { of: (s: string) => unknown }; PDFString: { of: (s: string) => unknown; fromDate: (d: Date) => unknown };
  PDFHexString: { of: (s: string) => unknown; fromText: (s: string) => unknown }; PDFNumber: { of: (n: number) => unknown };
  rgb: (r: number, g: number, b: number) => unknown; StandardFonts: { Helvetica: string };
};
type PdfDocLike = {
  context: { obj: (o: unknown) => unknown; register: (o: unknown) => unknown; lookup: (r: unknown) => unknown };
  catalog: { set: (k: unknown, v: unknown) => void; lookup: (k: unknown) => unknown; get: (k: unknown) => unknown };
  getPages: () => { ref: unknown; node: { set: (k: unknown, v: unknown) => void; lookup: (k: unknown) => unknown }; getWidth: () => number; drawText: (s: string, o: Record<string, unknown>) => void; drawRectangle: (o: Record<string, unknown>) => void }[];
  embedFont: (f: string) => Promise<{ widthOfTextAtSize: (s: string, n: number) => number }>;
  save: (o?: Record<string, unknown>) => Promise<Uint8Array>;
};
export type SignOpts = { reason?: string; location?: string; contact?: string; stamp?: { lines: string[] } | null; when?: Date; placeholder?: number };

const latin = (s: string) => s.replace(/[·•]/g, "-").normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/ {2,}/g, " ");
/**
 * Signs a PDF. Returns the signed bytes. The signature covers the whole file (incremental updates added later would show as changes).
 * `stamp` draws a visible mark at the bottom of the last page before signing (it is part of what is signed).
 */
export async function signPdf(L: PdfLibNs, bytes: Uint8Array, signer: Signer, o: SignOpts = {}): Promise<Uint8Array> {
  const forge = await loadForge();
  const pdf = await L.PDFDocument.load(bytes, { updateMetadata: false });
  const pages = pdf.getPages(); const last = pages[pages.length - 1];
  if (o.stamp && o.stamp.lines.length) {
    const font = await pdf.embedFont(L.StandardFonts.Helvetica); const size = 7.5, lh = 9.5, pad = 5;
    const w = Math.max(...o.stamp.lines.map((s) => font.widthOfTextAtSize(latin(s), size))) + pad * 2, h = o.stamp.lines.length * lh + pad * 2 - 2;
    const x = last.getWidth() - w - 28, y = 46; /* above the usual page footer */
    last.drawRectangle({ x, y, width: w, height: h, borderColor: L.rgb(0.18, 0.42, 0.94), borderWidth: 0.8, color: L.rgb(0.96, 0.97, 1) });
    o.stamp.lines.forEach((s, i) => last.drawText(latin(s), { x: x + pad, y: y + h - pad - size - i * lh + 1, size, font, color: L.rgb(0.1, 0.16, 0.35) }));
  }
  const when = o.when || new Date();
  const PH = o.placeholder || 16384; // bytes reserved for the CMS (hex: twice as many characters)
  const N = (s: string) => L.PDFName.of(s);
  const sigDict = pdf.context.obj({
    Type: "Sig", Filter: "Adobe.PPKLite", SubFilter: "ETSI.CAdES.detached",
    ByteRange: [0, 1111111111, 2222222222, 3333333333],
    Contents: L.PDFHexString.of("0".repeat(PH * 2)),
    M: L.PDFString.fromDate(when),
    ...(o.reason ? { Reason: L.PDFHexString.fromText(o.reason) } : {}),
    ...(o.location ? { Location: L.PDFHexString.fromText(o.location) } : {}),
    ...(o.contact ? { ContactInfo: L.PDFHexString.fromText(o.contact) } : {}),
    Name: L.PDFHexString.fromText(signer.name),
  });
  const sigRef = pdf.context.register(sigDict);
  const fieldName = "RemotionSignature" + Math.random().toString(36).slice(2, 7);
  const widget = pdf.context.obj({ Type: "Annot", Subtype: "Widget", FT: "Sig", Rect: [0, 0, 0, 0], V: sigRef, T: L.PDFString.of(fieldName), F: 132, P: last.ref });
  const wRef = pdf.context.register(widget);
  const annots = last.node.lookup(N("Annots")) as { push?: (r: unknown) => void } | undefined;
  if (annots && annots.push) annots.push(wRef); else last.node.set(N("Annots"), pdf.context.obj([wRef]));
  let af = pdf.catalog.lookup(N("AcroForm")) as { set: (k: unknown, v: unknown) => void; lookup: (k: unknown) => unknown } | undefined;
  if (!af) { af = pdf.context.obj({ Fields: [] }) as typeof af; pdf.catalog.set(N("AcroForm"), pdf.context.register(af)); }
  const fields = af!.lookup(N("Fields")) as { push?: (r: unknown) => void } | undefined;
  if (fields && fields.push) fields.push(wRef); else af!.set(N("Fields"), pdf.context.obj([wRef]));
  af!.set(N("SigFlags"), L.PDFNumber.of(3));
  const out = await pdf.save({ useObjectStreams: false });
  // locate the placeholders in the written file
  const txt = new TextDecoder("latin1").decode(out);
  const brAt = txt.indexOf("/ByteRange [ 0 1111111111 2222222222 3333333333 ]"); if (brAt < 0) throw new Error("byterange");
  const cAt = txt.indexOf("<" + "0".repeat(PH * 2) + ">"); if (cAt < 0) throw new Error("contents");
  const a = cAt, b = cAt + PH * 2 + 2;
  const br = `/ByteRange [ 0 ${a} ${b} ${out.length - b} ]`;
  const brSlot = "/ByteRange [ 0 1111111111 2222222222 3333333333 ]";
  if (br.length > brSlot.length) throw new Error("byterange");
  const outB = out.slice(); const brFull = br + " ".repeat(brSlot.length - br.length);
  for (let i = 0; i < brFull.length; i++) outB[brAt + i] = brFull.charCodeAt(i);
  // digest of everything but the /Contents hole
  const md = forge.md.sha256.create();
  const chunk = (u: Uint8Array) => { for (let i = 0; i < u.length; i += 32768) md.update(forge.util.binary.raw.encode(u.subarray(i, i + 32768))); };
  chunk(outB.subarray(0, a)); chunk(outB.subarray(b));
  const cms = await cadesDetached(signer, md.digest().getBytes());
  const hex = forge.util.bytesToHex(cms);
  if (hex.length > PH * 2) throw new Error("toolarge");
  const fill = hex + "0".repeat(PH * 2 - hex.length);
  for (let i = 0; i < fill.length; i++) outB[a + 1 + i] = fill.charCodeAt(i);
  return outB;
}
