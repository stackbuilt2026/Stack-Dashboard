// The selection categories that appear on a project's Selections page.
//
// This list IS the page — add, remove, reorder or rename an entry here and
// the page follows, with no database change needed (selections are stored
// as key/value rows, not one column per category). The only thing that
// must stay stable is `key`: that's what already-entered selections are
// filed under, so renaming a key orphans whatever was typed against the
// old one. Change `label` freely; change `key` only on purpose.
export const SELECTION_CATEGORIES = [
  {
    group: "Exterior",
    items: [
      { key: "windows", label: "Window Material & Colors",
        hint: "Manufacturer, material, interior/exterior color, grille pattern. Note any egress or tempered units." },
      { key: "ext_paint", label: "Exterior Paint Colors",
        hint: "Brand, color name + code, sheen — and which element each goes on (body, trim, soffit, fascia, front door)." },
      { key: "ext_masonry", label: "Exterior Rock / Brick",
        hint: "Type, color, and coursing or pattern. Note where it starts and stops on the elevation." },
      { key: "ext_stucco", label: "Exterior Stucco Color",
        hint: "Color name + code, texture, and which elevations it covers." },
      { key: "soffit_fascia", label: "Soffit & Fascia Color",
        hint: "Material and color for each — soffit and fascia are often different. Note vented vs solid soffit and where each runs." },
      { key: "shingles", label: "Shingle Color",
        hint: "Manufacturer, product line, color name. Note ridge cap and any accent or drip edge color if it differs." },
      { key: "garage_door", label: "Garage Door Color & Style",
        hint: "Style, color, window option, and opener if it's being specified here." },
      { key: "ext_lighting", label: "Exterior Light Fixtures",
        hint: "Brand, model, finish and quantity for each location — front entry, garage doors, back patio, soffit cans. Note any dusk-to-dawn or motion requirement." },
    ],
  },
  {
    group: "Kitchen & Bath",
    items: [
      { key: "cabinets", label: "Cabinet Materials & Colors",
        hint: "Species or material, door style, stain/paint color, and pulls. Call out anywhere the kitchen and baths differ." },
      { key: "countertops", label: "Countertop Colors & Material",
        hint: "Material, color/slab name, edge profile, thickness — and which rooms get which." },
      { key: "backsplash", label: "Kitchen Backsplash",
        hint: "Tile, size, layout/pattern, grout color. Note where it stops — to the underside of the cabinets, or full height behind the range/hood." },
      { key: "plumbing", label: "Plumbing Fixture Selections",
        hint: "Faucets, sinks, tubs, shower valves and trim — brand, model, finish, and the room each belongs to." },
    ],
  },
  {
    group: "Flooring",
    items: [
      { key: "lvp", label: "LVP Color & Brand",
        hint: "Brand, color/style name, plank width, and which rooms it runs through." },
      { key: "tile_floor", label: "Tile Flooring Selection",
        hint: "Tile, size, layout/pattern, grout color and width — and the room for each." },
      { key: "carpet", label: "Carpet Selection",
        hint: "Brand, style, color, and pad spec. Note where carpet stops and hard surface begins." },
    ],
  },
  {
    group: "Interior Finishes",
    items: [
      { key: "int_paint", label: "Interior Paint Selections",
        hint: "Walls, ceilings, trim and doors — brand, color name + code, sheen. Note any accent walls and where." },
      { key: "trim", label: "Trim Style & Specialty Trim Directions",
        hint: "Base and casing profile + size. For any specialty trim (beams, shiplap, wainscot, coffered ceilings), write the direction the installer needs — room, wall, orientation, spacing." },
      { key: "door_hardware", label: "Interior & Exterior Door Knob Selections",
        hint: "Brand, style, finish. Note interior vs exterior, any keyed/privacy/dummy split, and keying instructions." },
      { key: "lighting", label: "Specialty Light Selections & Room",
        hint: "Every specialty fixture with the room it goes in — pendants, chandeliers, vanity lights, sconces. Include quantity and mounting height where it matters." },
    ],
  },
];

// Flat list, in page order — handy for counting and lookups.
export const ALL_SELECTION_KEYS = SELECTION_CATEGORIES.flatMap((g) => g.items.map((i) => i.key));

export function selectionLabel(key) {
  for (const g of SELECTION_CATEGORIES) {
    const hit = g.items.find((i) => i.key === key);
    if (hit) return hit.label;
  }
  return key;
}
