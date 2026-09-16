export const sections = {
  company: ['dashboard', 'projects', 'bids', 'contractors', 'equipment', 'workers', 'payments', 'notifications', 'profile', 'settings'],
  contractor: ['dashboard', 'projects', 'bids', 'active-projects', 'workers', 'attendance', 'payments', 'equipment', 'expenses', 'notifications', 'profile', 'settings'],
  worker: ['dashboard', 'projects', 'attendance', 'earnings', 'payment-history', 'skills', 'availability', 'reviews', 'notifications', 'profile', 'settings']
};
export const titleCase = value => value.replaceAll('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
export const publicPaths = ['/', '/how-it-works', '/projects', '/projects/p1', '/equipment', '/equipment/e1', '/contractors', '/workers', '/about', '/login', '/signup'];
export const smokePaths = [...publicPaths, ...Object.entries(sections).flatMap(([role, pages]) => pages.map(p => `/${role}/${p}`)), '/company/projects/new', '/company/projects/p1', '/contractor/projects/p1', '/contractor/projects/p1/bid'];
