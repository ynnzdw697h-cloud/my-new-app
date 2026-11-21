// Prep steps with timers / speeds, written once and shipped with the app.
// They replace the plain-text steps of a recipe (by recipe / dish id) in the recipe screen.
// A cook can still edit steps in the app: what is saved in the app wins over this file.
//
// Format:  [id]: [ { text: 'הוראה', seconds: 30 /* or null = no timer */, note: 'מהירות 7' }, ... ]
export const STEP_OVERRIDES = {};
