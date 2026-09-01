// The two starter project templates. This is the single place to edit if
// the process changes — add/remove/reorder a milestone or task here and
// every NEW project created after that will use the updated template.
// (Existing projects already have their own copies of these rows in the
// database, so editing this file doesn't retroactively change a project
// that's already underway — that mirrors how construction actually works:
// you don't retroactively change a house that's already framed.)

// Note: tasks that used to be Purchasing or Superintendent are now
// PROJECT_MANAGER — Stack Built does not staff those roles, so that work
// belongs to whoever is PM on the job.
export const SINGLE_FAMILY_MILESTONES = [
  { key: "permit", name: "Building Permit", order: 0, durationDays: 14 },
  { key: "excavation", name: "Excavation — Hole Dug for Footings", order: 1, durationDays: 4 },
  { key: "foundation", name: "Foundation", order: 2, durationDays: 10 },
  { key: "framing", name: "Framing", order: 3, durationDays: 21 },
  { key: "mep", name: "Plumbing, Mechanical & Electrical Rough-In", order: 4, durationDays: 12 },
  { key: "insulation", name: "Insulation & Drywall", order: 5, durationDays: 10 },
  { key: "finishes", name: "Interior Finishes & Trim", order: 6, durationDays: 21 },
  { key: "closing", name: "Final Inspections & Closing", order: 7, durationDays: 10 },
];

export const SINGLE_FAMILY_TASKS = [
  { key: "t-trench", triggerKey: "permit", title: "Coordinate excavator to dig utility trench (power/internet conduit) with electrician", role: "PROJECT_MANAGER", deliverable: "Trench dug & conduit set", leadTimeDays: 5 },
  { key: "t-window-colors", triggerKey: "excavation", title: "Determine window colors & materials", role: "DESIGN", deliverable: "Window spec confirmed to PM", leadTimeDays: 7 },
  { key: "t-exterior", triggerKey: "excavation", title: "Exterior Color & Material Selections + rendering", role: "DESIGN", deliverable: "Design packet & rendering", leadTimeDays: 10 },
  { key: "t-interior", triggerKey: "excavation", title: "Finalize interior finishes — cabinets, countertops, flooring, paint, trim, fixtures, door/knob selections", role: "DESIGN", deliverable: "Interior finish packet", leadTimeDays: 14 },
  { key: "t-garage", triggerKey: "excavation", title: "Finalize garage door style & color", role: "DESIGN", deliverable: "Garage door spec", leadTimeDays: 7 },
  { key: "t-windows", triggerKey: "foundation", title: "Order Windows (confirm sizes, egress & tempering, place order with Sunpro)", role: "PROJECT_MANAGER", deliverable: "Window order placed", leadTimeDays: 3, critical: true },
  { key: "t-radon", triggerKey: "foundation", title: "Confirm radon system install with flatwork contractor", role: "PROJECT_MANAGER", deliverable: "Radon system confirmed", leadTimeDays: 2 },
  // Framing starting is the cue to get the cabinet shop on the calendar —
  // so this hangs off FOUNDATION, the milestone whose completion starts
  // framing, rather than off framing finishing.
  { key: "t-cabinet-measure", triggerKey: "foundation", title: "Schedule cabinet company to measure for cabinets", role: "PROJECT_MANAGER", deliverable: "Measure appointment on the calendar", leadTimeDays: 7 },
  { key: "t-ductwork", triggerKey: "framing", title: "Plan ductwork path with mechanical contractor to minimize basement ceiling drops", role: "PROJECT_MANAGER", deliverable: "Duct layout approved", leadTimeDays: 3 },
  { key: "t-lighting", triggerKey: "framing", title: "Order light fixtures & light bulbs", role: "DESIGN", deliverable: "Fixtures & bulbs delivered to Stack", leadTimeDays: 5 },
  { key: "t-smarthome", triggerKey: "framing", title: "Order smart home kits", role: "PROJECT_MANAGER", assigneeEmail: "ashton@stack.llc", deliverable: "Smart home kit delivered to Stack", leadTimeDays: 5 },
  { key: "t-doors", triggerKey: "framing", title: "Order interior & exterior doors (Sunpro)", role: "PROJECT_MANAGER", deliverable: "Door order placed", leadTimeDays: 3, critical: true },
  { key: "t-roughin-check", triggerKey: "mep", title: "Verify conduit/CAT5/hose bib/outlet rough-ins (internet, EV charger, WAP, ice-dam outlet)", role: "PROJECT_MANAGER", deliverable: "Rough-in checklist signed off", leadTimeDays: 2 },
  { key: "t-owner-walk", triggerKey: "mep", title: "Schedule exterior color selection walkthrough with homeowner", role: "DESIGN", deliverable: "Walkthrough scheduled", leadTimeDays: 4 },
  { key: "t-paint", triggerKey: "insulation", title: "Schedule paint contractor & confirm color selections", role: "PROJECT_MANAGER", deliverable: "Paint schedule confirmed", leadTimeDays: 3 },
  { key: "t-cabinets", triggerKey: "insulation", title: "Confirm cabinet & countertop install dates with supplier", role: "PROJECT_MANAGER", deliverable: "Install dates confirmed", leadTimeDays: 5 },
  { key: "t-final-inspect", triggerKey: "finishes", title: "Schedule final inspections (building, electrical, mechanical, plumbing)", role: "PROJECT_MANAGER", deliverable: "Inspections scheduled", leadTimeDays: 3, critical: true },
  { key: "t-punchlist", triggerKey: "finishes", title: "Prepare homeowner walkthrough punch list", role: "PROJECT_MANAGER", deliverable: "Punch list drafted", leadTimeDays: 5 },
  { key: "t-contractor-check", triggerKey: "finishes", title: "Contractor checklist review", role: "PROJECT_MANAGER", deliverable: "All items reviewed & signed off", leadTimeDays: 7 },
  { key: "t-closing", triggerKey: "closing", title: "Confirm closing date & documents with title company", role: "PROJECT_MANAGER", assigneeEmail: "danny@stack.llc", deliverable: "Closing confirmed", leadTimeDays: 2 },
];

// Tasks that open into their own review list. The key is the task's key;
// each sub-item's `key` is what gets stored when someone ticks it, so
// rewrite a `label` whenever you like but leave the `key` alone — change a
// key and anything already ticked against the old one comes back unticked.
//
// Adding or removing items here takes effect on every project immediately,
// including ones already underway. That's deliberate: unlike the task list
// itself, a review checklist is "how we inspect a house today", not a
// commitment made when the job started.
export const TASK_SUBITEMS = {
  "t-contractor-check": [
    { key: "bulbs",       label: "All light bulbs are installed" },
    { key: "attic",       label: "Attic access is lowered off the screws" },
    { key: "knobs",       label: "All door knobs, towel knobs, etc. installed and operable" },
    { key: "thermostats", label: "Thermostats are working properly" },
    { key: "trades",      label: "Electricians, mechanical contractors and plumbers are complete" },
    { key: "roofvents",   label: "Roof vents are painted black" },
    { key: "garagedoors", label: "Garage doors have been cleaned and wiped down" },
    { key: "garagewash",  label: "Garage has been pressure washed (if needed)" },
    { key: "basement",    label: "Basement is swept and clean" },
    { key: "debris",      label: "All construction items removed from the house" },
    { key: "touchup",     label: "Touch-up paint is complete" },
    { key: "flooring",    label: "Flooring is all complete" },
  ],
};

export function subitemsFor(taskKey) {
  return TASK_SUBITEMS[taskKey] ?? null;
}

export const APARTMENT_MILESTONES = [
  { key: "entitlement", name: "Entitlement & Permitting", order: 0, durationDays: 30 },
  { key: "sitework", name: "Site Work & Excavation", order: 1, durationDays: 14 },
  { key: "podium", name: "Foundation & Podium", order: 2, durationDays: 21 },
  { key: "framing", name: "Structural Framing", order: 3, durationDays: 45 },
  { key: "mep", name: "MEP Rough-In (Per Floor)", order: 4, durationDays: 30 },
  { key: "envelope", name: "Building Envelope & Exterior", order: 5, durationDays: 21 },
  { key: "unitfinish", name: "Interior Unit Finishes", order: 6, durationDays: 35 },
  { key: "amenity", name: "Amenity Spaces & Common Areas", order: 7, durationDays: 21 },
  { key: "coo", name: "Final Inspections & Certificate of Occupancy", order: 8, durationDays: 14 },
  { key: "turnover", name: "Leasing Turnover", order: 9, durationDays: 10 },
];

export const APARTMENT_TASKS = [
  { key: "a-trench", triggerKey: "entitlement", title: "Confirm utility trench routing & conduit plan with civil engineer", role: "PROJECT_MANAGER", deliverable: "Utility plan approved", leadTimeDays: 5 },
  { key: "a-unit-finishes", triggerKey: "sitework", title: "Finalize unit finish package options (2–3 tiers)", role: "DESIGN", deliverable: "Finish tier packet", leadTimeDays: 14 },
  { key: "a-exterior", triggerKey: "sitework", title: "Exterior Color & Material Selections for building envelope", role: "DESIGN", deliverable: "Exterior design packet", leadTimeDays: 14 },
  { key: "a-structural", triggerKey: "podium", title: "Order long-lead structural steel / precast components", role: "PROJECT_MANAGER", deliverable: "Structural order placed", leadTimeDays: 5, critical: true },
  { key: "a-appliances", triggerKey: "framing", title: "Order unit appliance packages (bulk order)", role: "PROJECT_MANAGER", deliverable: "Appliance order placed", leadTimeDays: 7, critical: true },
  { key: "a-amenity-design", triggerKey: "framing", title: "Finalize amenity space design selections (lobby, gym, clubhouse)", role: "DESIGN", deliverable: "Amenity design packet", leadTimeDays: 10 },
  { key: "a-marketing", triggerKey: "framing", title: "Begin marketing photography / rendering prep", role: "LEASING", deliverable: "Marketing assets briefed", leadTimeDays: 14 },
  { key: "a-lowvoltage", triggerKey: "mep", title: "Verify low-voltage / data rough-in for smart-unit package", role: "PROJECT_MANAGER", deliverable: "Rough-in checklist signed off", leadTimeDays: 3 },
  { key: "a-signage", triggerKey: "envelope", title: "Order signage & wayfinding", role: "PROJECT_MANAGER", deliverable: "Signage order placed", leadTimeDays: 10 },
  { key: "a-unit-qc", triggerKey: "unitfinish", title: "Schedule unit-by-unit QC walkthroughs", role: "PROJECT_MANAGER", deliverable: "QC schedule published", leadTimeDays: 5 },
  { key: "a-amenity-furniture", triggerKey: "amenity", title: "Order amenity furniture & fixtures", role: "PROJECT_MANAGER", deliverable: "Amenity furniture order placed", leadTimeDays: 7 },
  { key: "a-fire-marshal", triggerKey: "coo", title: "Schedule fire marshal walkthrough & Certificate of Occupancy inspection", role: "PROJECT_MANAGER", deliverable: "Inspection scheduled", leadTimeDays: 3, critical: true },
  { key: "a-leasing-launch", triggerKey: "turnover", title: "Launch leasing marketing & schedule move-ins", role: "LEASING", deliverable: "Leasing campaign live", leadTimeDays: 5 },
];

export function templatesFor(projectType) {
  return projectType === "APARTMENT"
    ? { milestones: APARTMENT_MILESTONES, tasks: APARTMENT_TASKS }
    : { milestones: SINGLE_FAMILY_MILESTONES, tasks: SINGLE_FAMILY_TASKS };
}
