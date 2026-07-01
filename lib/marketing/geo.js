// lib/marketing/geo.js
// Curated vertical × city matrix for the programmatic SEO pages. Quality over
// millions: a sensible set of US cities and verticals the product can actually
// serve (OSM local businesses + NPI healthcare people).

export const VERTICALS = [
  { slug: 'real-estate', categoryId: 'real_estate', label: 'Real estate', source: 'osm', unit: 'agencies & brokerages' },
  { slug: 'insurance', categoryId: 'insurance', label: 'Insurance', source: 'osm', unit: 'agencies' },
  { slug: 'legal', categoryId: 'legal', label: 'Legal', source: 'osm', unit: 'law firms' },
  { slug: 'automotive', categoryId: 'automotive', label: 'Automotive', source: 'osm', unit: 'dealers & shops' },
  { slug: 'fitness', categoryId: 'fitness_wellness', label: 'Fitness & wellness', source: 'osm', unit: 'gyms & studios' },
  { slug: 'restaurants', categoryId: 'restaurant_food', label: 'Restaurants & catering', source: 'osm', unit: 'restaurants & caterers' },
  { slug: 'solar', categoryId: 'solar_energy', label: 'Solar', source: 'osm', unit: 'installers' },
  { slug: 'healthcare', categoryId: 'healthcare', label: 'Healthcare', source: 'osm', unit: 'clinics & practices' },
  { slug: 'discharge-planning', categoryId: 'discharge_planning', label: 'Discharge planning', source: 'npi', unit: 'case managers & social workers' },
  { slug: 'digital-marketing', categoryId: 'digital_marketing', label: 'Digital marketing', source: 'osm', unit: 'agencies' },
  { slug: 'construction', categoryId: 'construction', label: 'Construction', source: 'osm', unit: 'contractors' },
  { slug: 'beauty-salons', categoryId: 'beauty_salon', label: 'Beauty & salons', source: 'osm', unit: 'salons & spas' },
];

const CITY_LIST = [
  ['New York', 'NY'], ['Los Angeles', 'CA'], ['Chicago', 'IL'], ['Houston', 'TX'],
  ['Phoenix', 'AZ'], ['Philadelphia', 'PA'], ['San Antonio', 'TX'], ['San Diego', 'CA'],
  ['Dallas', 'TX'], ['Austin', 'TX'], ['San Jose', 'CA'], ['Jacksonville', 'FL'],
  ['Columbus', 'OH'], ['Charlotte', 'NC'], ['Indianapolis', 'IN'], ['Seattle', 'WA'],
  ['Denver', 'CO'], ['Boston', 'MA'], ['Nashville', 'TN'], ['Miami', 'FL'],
  ['Atlanta', 'GA'], ['Portland', 'OR'], ['Las Vegas', 'NV'], ['Minneapolis', 'MN'],
];

export const CITIES = CITY_LIST.map(([name, state]) => ({
  name,
  state,
  slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`,
  label: `${name}, ${state}`,
}));

export const verticalBySlug = (slug) => VERTICALS.find((v) => v.slug === slug) || null;
export const cityBySlug = (slug) => CITIES.find((c) => c.slug === slug) || null;
