/**
 * Forms store — the part of the Forms app other apps read (Billing's form-linked documents, source L23652; the patient
 * record's forms tab). Since slice 18 the Forms app itself is native (./forms.ts), so this module re-exports its
 * `feS`, loader and walkers: readers share the Forms app's in-memory store, as in the source, where one `feS` serves
 * the Forms editor and its readers. (The storage listener the bridged-era copy needed is gone: the source has none.)
 */
export { feS, feLoad, feSave, feWalk, feWalk2, feName, feEntry, feDoc, fv, feField, feMakeDoc, feFresh, feSeedMain, FE_WIDE, FE_TPL } from "./forms";
export type { FeField, FeSection, FePage, FeDocT, FeEntryT, FeState } from "./forms";
