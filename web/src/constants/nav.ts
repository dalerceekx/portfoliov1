export const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
] as const;

export const SECTION_IDS = SECTIONS.map((s) => s.id);
