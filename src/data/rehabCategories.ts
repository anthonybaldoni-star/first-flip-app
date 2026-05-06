/** PRD: expanded rehab budget — 20+ granular categories (24 total). */

export type RehabCategoryDef = {
  id: string;
  label: string;
};

export const REHAB_CATEGORIES: RehabCategoryDef[] = [
  { id: "demo", label: "Demolition & haul-off" },
  { id: "struct", label: "Structural / framing" },
  { id: "foundation", label: "Foundation & waterproofing" },
  { id: "roof", label: "Roofing" },
  { id: "gutters", label: "Gutters & downspouts" },
  { id: "exterior", label: "Exterior siding / paint" },
  { id: "windows", label: "Windows & doors (exterior)" },
  { id: "garage", label: "Garage & driveway" },
  { id: "electrical", label: "Electrical (panel & rough)" },
  { id: "plumbing", label: "Plumbing supply & waste" },
  { id: "hvac", label: "HVAC / mechanical" },
  { id: "insulation", label: "Insulation & air sealing" },
  { id: "drywall", label: "Drywall & texture" },
  { id: "int_paint", label: "Interior paint" },
  { id: "flooring", label: "Flooring" },
  { id: "kitchen_cabs", label: "Kitchen cabinets & counters" },
  { id: "kitchen_app", label: "Kitchen appliances" },
  { id: "bath", label: "Bathrooms — rough & finish" },
  { id: "lighting", label: "Lighting fixtures" },
  { id: "trim", label: "Trim & hardware" },
  { id: "mold", label: "Mold remediation / abatement" },
  { id: "landscape", label: "Landscaping & grading" },
  { id: "permits", label: "Permits, GC overhead, dumpsters" },
  { id: "contingency", label: "Contingency / holding buffer" },
];
