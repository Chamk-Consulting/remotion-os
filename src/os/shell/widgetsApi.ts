/** Imperative hooks into the widgets (source globals openNoteComposer L8120 and the calendar's cy/cm + renderCal). */
export const widgetsApi: { openNoteComposer: () => void; noteInput: () => HTMLInputElement | null; calToday: () => void } = { openNoteComposer: () => {}, noteInput: () => null, calToday: () => {} };
