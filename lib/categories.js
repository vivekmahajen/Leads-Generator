// lib/categories.js
// 28 lead categories — researched CPL, avg deal size, monthly lead volume

export const CATEGORIES = [

  // ══════════════════════════════════════════════
  // TIER 1: ULTRA-HIGH ROI
  // Avg deal size > $5,000 · CPL $200–$900
  // ══════════════════════════════════════════════

  {
    id: 'real_estate',
    name: 'Real Estate',
    icon: '🏠',
    tier: 'ultra',
    tierLabel: 'Ultra ROI',
    description: 'Property buyers, sellers, NRI investors, commercial tenants',
    avgDealSize: '$8,000 commission',
    avgCPL: '$75–$180',
    monthlyLeads: '80–150',
    conversionRate: '3–5%',
    leadTypes: ['Home buyers (first-time)', 'Property investors', 'NRI buyers', 'Commercial tenants', 'Villa/plot buyers', 'Home sellers'],
    whyHighROI: 'Single closed deal justifies months of lead spend. Agents pay $75–180/lead and see 3–5% close rates.',
    qualificationCriteria: ['Budget confirmed', 'Timeline < 6 months', 'Location specified', 'Pre-approved or cash buyer'],
  },

  {
    id: 'insurance',
    name: 'Insurance',
    icon: '🛡️',
    tier: 'ultra',
    tierLabel: 'Ultra ROI',
    description: 'Life, health, vehicle, term, business insurance seekers',
    avgDealSize: '$1,200/year premium',
    avgCPL: '$50–$120',
    monthlyLeads: '120–220',
    conversionRate: '8–12%',
    leadTypes: ['Term life insurance', 'Health insurance (family)', 'Vehicle insurance renewals', 'Business liability', 'ULIP / investment insurance'],
    whyHighROI: 'Recurring annual premiums. Agents earn 15–40% first-year commission. High volume + high frequency.',
    qualificationCriteria: ['Age and health status', 'Coverage amount needed', 'Budget per month', 'Existing coverage gaps'],
  },

  {
    id: 'fintech_loans',
    name: 'Fintech & Loans',
    icon: '💳',
    tier: 'ultra',
    tierLabel: 'Ultra ROI',
    description: 'Personal loans, home loans, business loans, credit cards, investments',
    avgDealSize: '$2,400 processing fee',
    avgCPL: '$60–$150',
    monthlyLeads: '150–250',
    conversionRate: '5–9%',
    leadTypes: ['Personal loan', 'Home loan', 'Business loan', 'Credit card', 'Mutual fund SIP', 'Fixed deposits', 'Credit score repair'],
    whyHighROI: 'Lenders pay $50–150/lead. High volume, fast decisions. DSAs earn 0.5–1% of loan amount.',
    qualificationCriteria: ['Employment type', 'Monthly income', 'Credit score range', 'Loan amount needed', 'Purpose of loan'],
  },

  {
    id: 'edtech',
    name: 'Education & EdTech',
    icon: '🎓',
    tier: 'ultra',
    tierLabel: 'Ultra ROI',
    description: 'Online courses, college admissions, upskilling, certifications',
    avgDealSize: '$600 course fee',
    avgCPL: '$30–$80',
    monthlyLeads: '100–200',
    conversionRate: '6–10%',
    leadTypes: ['Online certification (tech)', 'MBA admissions', 'Study abroad', 'Professional upskilling', 'K-12 coaching', 'UPSC/competitive exams'],
    whyHighROI: 'Large addressable market. Institutions pay well for intent-confirmed students.',
    qualificationCriteria: ['Current qualification', 'Target program', 'Budget range', 'Timeline to join', 'Preferred mode (online/offline)'],
  },

  {
    id: 'saas_software',
    name: 'B2B SaaS & Software',
    icon: '💻',
    tier: 'ultra',
    tierLabel: 'Ultra ROI',
    description: 'Business software buyers — CRM, ERP, HR, accounting, security',
    avgDealSize: '$12,000 ACV',
    avgCPL: '$150–$350',
    monthlyLeads: '30–80',
    conversionRate: '2–4%',
    leadTypes: ['CRM software buyers', 'HR/payroll software', 'Accounting software', 'ERP decision-makers', 'Cybersecurity buyers', 'Marketing automation'],
    whyHighROI: 'Highest deal size per lead. LinkedIn CPL for B2B SaaS averages $150–250. ACV justifies cost.',
    qualificationCriteria: ['Company size', 'Current software stack', 'Decision-maker role', 'Budget authority', 'Implementation timeline'],
  },

  {
    id: 'healthcare',
    name: 'Healthcare & Medical',
    icon: '⚕️',
    tier: 'ultra',
    tierLabel: 'Ultra ROI',
    description: 'Patients, hospitals, pharma, medical devices, wellness centers',
    avgDealSize: '$3,000 per patient',
    avgCPL: '$80–$200',
    monthlyLeads: '60–120',
    conversionRate: '4–7%',
    leadTypes: ['Patients seeking specialists', 'Medical tourism', 'Hospital equipment buyers', 'Clinic software', 'Ayurveda/wellness', 'Mental health services'],
    whyHighROI: 'Healthcare decisions are high-urgency and high-value. Hospitals pay for patient acquisition.',
    qualificationCriteria: ['Condition/specialty needed', 'Location', 'Insurance coverage', 'Urgency', 'Treatment budget'],
  },

  {
    id: 'discharge_planning',
    name: 'Discharge Planning',
    icon: '🏥',
    tier: 'ultra',
    tierLabel: 'Ultra ROI',
    description: 'Hospital case managers, social workers & discharge planners; SNF and hospice referral sources',
    avgDealSize: '$6,000 per referral relationship',
    avgCPL: '$60–$160',
    monthlyLeads: '40–90',
    conversionRate: '3–6%',
    leadTypes: ['Hospital case managers', 'Medical social workers', 'Discharge planners', 'SNF admissions/marketers', 'Hospice liaisons', 'Home health intake'],
    whyHighROI: 'Discharge planners are the referral gatekeepers for post-acute care — one relationship drives recurring patient referrals to SNFs, hospice and home health.',
    qualificationCriteria: ['Facility type (hospital/SNF/hospice)', 'Role/title', 'City & state', 'Caseload/volume', 'Best contact method'],
  },

  // ══════════════════════════════════════════════
  // TIER 2: HIGH ROI
  // Avg deal size $800–$5,000 · CPL $30–$150
  // ══════════════════════════════════════════════

  {
    id: 'automotive',
    name: 'Automotive',
    icon: '🚗',
    tier: 'high',
    tierLabel: 'High ROI',
    description: 'New/used car buyers, test drive requests, EV intenders, fleet',
    avgDealSize: '$800 dealer commission',
    avgCPL: '$40–$100',
    monthlyLeads: '80–140',
    conversionRate: '5–8%',
    leadTypes: ['New car buyers', 'Used car buyers', 'EV intenders', 'Fleet purchases', 'Two-wheeler buyers', 'Commercial vehicle'],
    whyHighROI: 'Dealers pay per test drive. High volume market. OEMs spend heavily on lead gen.',
    qualificationCriteria: ['Vehicle type', 'Budget range', 'Finance or cash', 'Trade-in intent', 'Timeline'],
  },

  {
    id: 'legal',
    name: 'Legal Services',
    icon: '⚖️',
    tier: 'high',
    tierLabel: 'High ROI',
    description: 'Personal injury, divorce, property disputes, business law, immigration',
    avgDealSize: '$2,500 retainer',
    avgCPL: '$80–$200',
    monthlyLeads: '40–80',
    conversionRate: '3–6%',
    leadTypes: ['Personal injury claims', 'Divorce / family law', 'Property disputes', 'Business formation', 'Immigration / visa', 'Criminal defense'],
    whyHighROI: 'Legal CPL can reach $400–$900. Firms budget heavily for client acquisition. High LTV.',
    qualificationCriteria: ['Case type', 'Jurisdiction', 'Urgency', 'Prior legal action', 'Budget for legal fees'],
  },

  {
    id: 'ecommerce',
    name: 'E-Commerce & D2C',
    icon: '🛒',
    tier: 'high',
    tierLabel: 'High ROI',
    description: 'D2C brands, Amazon sellers, Shopify stores needing B2B services',
    avgDealSize: '$3,500 service contract',
    avgCPL: '$50–$120',
    monthlyLeads: '60–100',
    conversionRate: '4–7%',
    leadTypes: ['Amazon/Flipkart sellers', 'D2C brand founders', 'Logistics buyers', 'Performance marketing buyers', 'Returns management', 'E-commerce enablers'],
    whyHighROI: 'Growing e-commerce sector. Multiple service needs per business = repeat business.',
    qualificationCriteria: ['Monthly GMV', 'Platform (Amazon/Shopify)', 'Product category', 'Pain point (logistics/ads/returns)'],
  },

  {
    id: 'solar_energy',
    name: 'Solar & Clean Energy',
    icon: '☀️',
    tier: 'high',
    tierLabel: 'High ROI',
    description: 'Rooftop solar, commercial installations, EV charging, batteries',
    avgDealSize: '$5,000 installation',
    avgCPL: '$40–$100',
    monthlyLeads: '50–90',
    conversionRate: '4–8%',
    leadTypes: ['Residential rooftop solar', 'Commercial solar', 'EV charging stations', 'Battery storage', 'Solar financing seekers'],
    whyHighROI: 'Government subsidies drive demand. Installers pay per qualified lead. Growing market.',
    qualificationCriteria: ['Property ownership', 'Monthly electricity bill', 'Roof type/size', 'Location (solar irradiance)', 'Financing vs cash'],
  },

  {
    id: 'hr_recruitment',
    name: 'HR & Recruitment',
    icon: '👥',
    tier: 'high',
    tierLabel: 'High ROI',
    description: 'Companies hiring, staffing agencies, HR software, background verification',
    avgDealSize: '$4,000 placement fee',
    avgCPL: '$60–$150',
    monthlyLeads: '60–100',
    conversionRate: '3–6%',
    leadTypes: ['Companies with open positions', 'Staffing agency clients', 'HR software buyers', 'Payroll service seekers', 'Background check buyers'],
    whyHighROI: 'Placement fees = 10–15% of first year salary. Recurring need. Large B2B market.',
    qualificationCriteria: ['Industry', 'Hiring volume', 'Roles needed', 'Location', 'In-house vs outsource preference'],
  },

  {
    id: 'agriculture',
    name: 'Agriculture & AgriTech',
    icon: '🌾',
    tier: 'high',
    tierLabel: 'High ROI',
    description: 'Farmers, FPOs, agri-input buyers, cold chain, agri-finance',
    avgDealSize: '$1,500 per season',
    avgCPL: '$20–$60',
    monthlyLeads: '100–180',
    conversionRate: '6–10%',
    leadTypes: ['Seed/fertilizer buyers', 'Tractor buyers', 'FPO members', 'Agri-finance seekers', 'Cold chain operators', 'Farm management software'],
    whyHighROI: 'Massive underserved market. Agri-input companies pay well. AgriTech is VC-funded.',
    qualificationCriteria: ['Farm size (acres)', 'Crop type', 'Ownership vs lease', 'State/district', 'Current pain point'],
  },

  {
    id: 'wedding_events',
    name: 'Wedding & Events',
    icon: '💍',
    tier: 'high',
    tierLabel: 'High ROI',
    description: 'Wedding venues, catering, photographers, planners, corporate events',
    avgDealSize: '$2,000 per booking',
    avgCPL: '$25–$70',
    monthlyLeads: '60–100',
    conversionRate: '5–9%',
    leadTypes: ['Couples planning weddings', 'Corporate event organizers', 'Birthday/anniversary events', 'Venue seekers', 'Destination wedding planners'],
    whyHighROI: 'High-intent leads — weddings are once-in-a-lifetime. Multiple vendor needs per event.',
    qualificationCriteria: ['Event date', 'Guest count', 'Budget', 'Location', 'Services needed (venue/catering/decor)'],
  },

  {
    id: 'travel_tourism',
    name: 'Travel & Tourism',
    icon: '✈️',
    tier: 'high',
    tierLabel: 'High ROI',
    description: 'Leisure travel, pilgrimage, corporate travel, visa services, hotels',
    avgDealSize: '$900 package',
    avgCPL: '$20–$60',
    monthlyLeads: '100–160',
    conversionRate: '4–8%',
    leadTypes: ['Holiday planners', 'Pilgrimage groups', 'Honeymoon travelers', 'Corporate travel managers', 'Visa / immigration seekers', 'Adventure travelers'],
    whyHighROI: 'Post-COVID travel boom. OTAs pay well for intent-confirmed travelers.',
    qualificationCriteria: ['Destination', 'Travel dates', 'Group size', 'Budget per person', 'Accommodation preference'],
  },

  {
    id: 'interior_design',
    name: 'Interior Design & Home',
    icon: '🛋️',
    tier: 'high',
    tierLabel: 'High ROI',
    description: 'New homeowners seeking interior designers, modular kitchens, furniture',
    avgDealSize: '$3,500 project',
    avgCPL: '$30–$80',
    monthlyLeads: '50–90',
    conversionRate: '4–8%',
    leadTypes: ['New apartment owners', 'Villa owners', 'Modular kitchen buyers', 'Office interiors', 'Furniture buyers', 'Home renovation seekers'],
    whyHighROI: 'Real estate boom drives interior demand. High project values. Repeat vendors.',
    qualificationCriteria: ['Property type/size', 'Location', 'Budget range', 'Timeline (possession date)', 'Style preference'],
  },

  {
    id: 'digital_marketing',
    name: 'Digital Marketing Services',
    icon: '📱',
    tier: 'high',
    tierLabel: 'High ROI',
    description: 'SMEs and startups seeking SEO, PPC, social media, content agencies',
    avgDealSize: '$2,000 monthly retainer',
    avgCPL: '$30–$90',
    monthlyLeads: '70–120',
    conversionRate: '4–7%',
    leadTypes: ['SEO buyers', 'PPC/Google Ads management', 'Social media management', 'Website development', 'Content marketing', 'Performance marketing'],
    whyHighROI: 'Every business needs digital marketing. Agency retainers are recurring MRR.',
    qualificationCriteria: ['Business type', 'Monthly marketing budget', 'Current channels', 'Primary goal (leads/brand/ecomm)', 'Timeline'],
  },

  // ══════════════════════════════════════════════
  // TIER 3: MEDIUM ROI
  // Avg deal size $300–$1,500 · CPL $15–$60
  // ══════════════════════════════════════════════

  {
    id: 'fitness_wellness',
    name: 'Fitness & Wellness',
    icon: '💪',
    tier: 'medium',
    tierLabel: 'Medium ROI',
    description: 'Gyms, personal trainers, yoga studios, dietitians, mental wellness',
    avgDealSize: '$400 membership',
    avgCPL: '$15–$40',
    monthlyLeads: '100–180',
    conversionRate: '8–14%',
    leadTypes: ['Gym memberships', 'Personal training', 'Yoga/Pilates', 'Online fitness coaching', 'Dietitian consultations', 'Corporate wellness'],
    whyHighROI: 'High conversion rates. Recurring memberships. Low CPL makes ROI strong.',
    qualificationCriteria: ['Fitness goal', 'Preferred format (home/studio)', 'Budget/month', 'Location', 'Experience level'],
  },

  {
    id: 'beauty_salon',
    name: 'Beauty & Salon',
    icon: '💆',
    tier: 'medium',
    tierLabel: 'Medium ROI',
    description: 'Premium salons, aesthetics clinics, skincare, hair transplant',
    avgDealSize: '$350 per visit/treatment',
    avgCPL: '$15–$45',
    monthlyLeads: '80–150',
    conversionRate: '10–16%',
    leadTypes: ['Hair salon bookings', 'Skin treatment', 'Hair transplant', 'Laser treatments', 'Bridal packages', 'Nail art / grooming'],
    whyHighROI: 'High repeat purchase. Bridal season = premium pricing. Aesthetic clinic leads are high-ticket.',
    qualificationCriteria: ['Treatment type', 'Location', 'Budget', 'Timing (bridal season)', 'Skin/hair condition'],
  },

  {
    id: 'restaurant_food',
    name: 'Restaurant & Food Service',
    icon: '🍽️',
    tier: 'medium',
    tierLabel: 'Medium ROI',
    description: 'Catering for events, corporate meal plans, cloud kitchens, franchise',
    avgDealSize: '$800 catering contract',
    avgCPL: '$15–$40',
    monthlyLeads: '60–120',
    conversionRate: '6–10%',
    leadTypes: ['Event catering', 'Corporate meal subscriptions', 'Restaurant franchise inquiries', 'Cloud kitchen operators', 'F&B investors'],
    whyHighROI: 'Catering events have high ticket value. Corporate meal plans = recurring revenue.',
    qualificationCriteria: ['Event type/date', 'Guest count', 'Cuisine preference', 'Budget per head', 'Location'],
  },

  {
    id: 'printing_packaging',
    name: 'Printing & Packaging',
    icon: '📦',
    tier: 'medium',
    tierLabel: 'Medium ROI',
    description: 'Bulk printing, corporate gifting, custom packaging, labels',
    avgDealSize: '$1,200 order',
    avgCPL: '$20–$50',
    monthlyLeads: '50–90',
    conversionRate: '7–12%',
    leadTypes: ['Corporate brochure printing', 'Custom packaging', 'Label manufacturers', 'Corporate gifting', 'Trade show materials'],
    whyHighROI: 'B2B bulk orders with repeat purchase. Festival seasons drive surge demand.',
    qualificationCriteria: ['Product type', 'Quantity', 'Timeline', 'Budget', 'Industry (food/pharma/retail)'],
  },

  {
    id: 'logistics',
    name: 'Logistics & Supply Chain',
    icon: '🚚',
    tier: 'medium',
    tierLabel: 'Medium ROI',
    description: 'Freight forwarding, last-mile delivery, warehousing, 3PL',
    avgDealSize: '$5,000 contract/month',
    avgCPL: '$40–$100',
    monthlyLeads: '40–80',
    conversionRate: '3–6%',
    leadTypes: ['Freight shippers', 'Warehousing seekers', 'Last-mile delivery buyers', 'Cold chain operators', '3PL partnerships', 'Cross-border trade'],
    whyHighROI: 'Long-term B2B contracts. Growing e-commerce drives demand. High contract values.',
    qualificationCriteria: ['Shipment type', 'Volume (tons/shipments)', 'Route (domestic/international)', 'Special requirements', 'Current logistics partner'],
  },

  {
    id: 'construction',
    name: 'Construction & Infrastructure',
    icon: '🏗️',
    tier: 'medium',
    tierLabel: 'Medium ROI',
    description: 'Contractors, builders, material suppliers, civil engineering projects',
    avgDealSize: '$8,000 project',
    avgCPL: '$40–$100',
    monthlyLeads: '30–70',
    conversionRate: '3–6%',
    leadTypes: ['General contractors', 'Building material buyers', 'Architect/designer sourcing', 'Civil project tenders', 'Housing developers', 'Renovation contractors'],
    whyHighROI: 'Large project sizes. Infrastructure boom in India. Long sales cycles but high deal values.',
    qualificationCriteria: ['Project type', 'Budget range', 'Location', 'Timeline', 'Decision-maker role'],
  },

  {
    id: 'manufacturing',
    name: 'Manufacturing & Industrial',
    icon: '🏭',
    tier: 'medium',
    tierLabel: 'Medium ROI',
    description: 'Industrial buyers, B2B procurement, machinery, raw material',
    avgDealSize: '$10,000 purchase order',
    avgCPL: '$50–$120',
    monthlyLeads: '25–60',
    conversionRate: '2–5%',
    leadTypes: ['Industrial machinery buyers', 'Raw material procurement', 'Factory equipment', 'Industrial chemicals', 'B2B component buyers', 'OEM partnerships'],
    whyHighROI: 'Highest average order value. Long-term supplier relationships. India manufacturing boom.',
    qualificationCriteria: ['Industry vertical', 'Product/material needed', 'Volume', 'Quality certifications required', 'Location'],
  },

  {
    id: 'pet_services',
    name: 'Pet Services',
    icon: '🐾',
    tier: 'medium',
    tierLabel: 'Medium ROI',
    description: 'Veterinary, grooming, pet food, insurance, training',
    avgDealSize: '$300 per service',
    avgCPL: '$10–$30',
    monthlyLeads: '80–160',
    conversionRate: '12–18%',
    leadTypes: ['Veterinary consultations', 'Pet grooming', 'Premium pet food', 'Pet boarding', 'Dog training', 'Pet insurance'],
    whyHighROI: 'Pet ownership explosion. Owners spend freely. High conversion from pet-specific leads.',
    qualificationCriteria: ['Pet type/breed', 'Age of pet', 'Service needed', 'Location', 'Budget'],
  },

  {
    id: 'pharma_biotech',
    name: 'Pharma & Biotech',
    icon: '💊',
    tier: 'medium',
    tierLabel: 'Medium ROI',
    description: 'Distributors, hospital procurement, CRO, biotech partnerships',
    avgDealSize: '$15,000 contract',
    avgCPL: '$80–$200',
    monthlyLeads: '20–50',
    conversionRate: '2–4%',
    leadTypes: ['Pharma distributors', 'Hospital formulary buyers', 'CRO/CMO partnerships', 'Biotech investors', 'Pharma machinery buyers', 'Regulatory services'],
    whyHighROI: 'Very high contract values. Regulated sector with few quality lead sources.',
    qualificationCriteria: ['Company type', 'Therapeutic area', 'Volume needs', 'Certifications', 'Geographic market'],
  },

  {
    id: 'gaming_esports',
    name: 'Gaming & Esports',
    icon: '🎮',
    tier: 'medium',
    tierLabel: 'Medium ROI',
    description: 'Game publishers, esports brands, gaming peripherals, sponsorships',
    avgDealSize: '$500 per deal',
    avgCPL: '$10–$30',
    monthlyLeads: '100–200',
    conversionRate: '6–10%',
    leadTypes: ['PC/console game buyers', 'Mobile game spenders', 'Esports team sponsorships', 'Gaming peripheral buyers', 'Game developers (B2B)', 'Streaming platform users'],
    whyHighROI: 'Young demographic with high disposable income. Digital delivery = high margins.',
    qualificationCriteria: ['Platform preference', 'Genre', 'Spending level', 'Competitive interest', 'Age bracket'],
  },

  {
    id: 'media_entertainment',
    name: 'Media & Entertainment',
    icon: '📺',
    tier: 'medium',
    tierLabel: 'Medium ROI',
    description: 'Ad buyers, content creators, OTT partnerships, production services',
    avgDealSize: '$3,000 deal',
    avgCPL: '$30–$80',
    monthlyLeads: '40–90',
    conversionRate: '3–6%',
    leadTypes: ['Brand ad buyers', 'Content creators seeking sponsors', 'OTT platform partnerships', 'Video production buyers', 'PR agency clients', 'Event sponsorship seekers'],
    whyHighROI: 'Digital media advertising growing 25%/year. Influencer economy = new lead category.',
    qualificationCriteria: ['Content type', 'Audience size', 'Platform', 'Ad budget range', 'Campaign goals'],
  },

  {
    id: 'spiritual_wellness',
    name: 'Spiritual & Wellness',
    icon: '🛕',
    tier: 'medium',
    tierLabel: 'Medium ROI',
    description: 'Online puja services, meditation apps, retreat centers, astrology',
    avgDealSize: '$600 per service',
    avgCPL: '$10–$35',
    monthlyLeads: '80–160',
    conversionRate: '8–14%',
    leadTypes: ['Online puja seekers', 'Meditation/yoga retreats', 'Astrology consultation', 'Ayurveda wellness', 'Spiritual tourism', 'Temple pilgrimage groups'],
    whyHighROI: 'India\'s spiritualtech market growing at 25% CAGR. NRI segment pays premium.',
    qualificationCriteria: ['Service interest', 'Budget', 'Location (India/abroad)', 'Urgency (occasion-based)', 'Language preference'],
  },
];

// Tier configuration
export const TIERS = {
  ultra:  { label: 'Ultra ROI', color: '#a855f7', bgColor: 'rgba(168,85,247,0.12)', description: 'Highest deal values · $200–$900 CPL market · Premium buyer intent' },
  high:   { label: 'High ROI',  color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)',  description: 'Strong conversion rates · $30–$150 CPL · Active buying intent' },
  medium: { label: 'Medium ROI', color: '#10b981', bgColor: 'rgba(16,185,129,0.12)', description: 'High volume · $10–$60 CPL · Broad market demand' },
};

// Lookup helper used by API + dashboard
export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

export function getCategory(id) {
  return CATEGORY_MAP[id] || null;
}

// ── Category auto-detection from profile/bio/headline text ────────
// Used by the LinkedIn/X extraction pipeline to classify raw contacts.
export const CATEGORY_KEYWORDS = {
  real_estate: ['real estate', 'property', 'realtor', 'broker', 'mortgage', 'housing', 'buy home', 'sell home', 'nri property', 'commercial property', 'realty'],
  insurance: ['insurance', 'term plan', 'health insurance', 'life insurance', 'premium', 'policyholder', 'underwriter', 'claims', 'actuary'],
  fintech_loans: ['fintech', 'loan', 'credit', 'neobank', 'nbfc', 'payment', 'emi', 'invest', 'mutual fund', 'portfolio', 'wealth management'],
  edtech: ['edtech', 'education', 'online course', 'e-learning', 'upskilling', 'bootcamp', 'certification', 'coaching', 'tutor', 'curriculum'],
  saas_software: ['saas', 'software', 'crm', 'erp', 'b2b software', 'cloud', 'api', 'developer tools', 'tech stack', 'product manager', 'platform'],
  healthcare: ['healthcare', 'hospital', 'clinic', 'doctor', 'physician', 'medical', 'pharma', 'health tech', 'wellness', 'ayurveda', 'telehealth'],
  discharge_planning: ['discharge plan', 'case manager', 'case management', 'social worker', 'care coordinator', 'hospice', 'skilled nursing', 'snf', 'home health', 'post-acute', 'nursing home', 'rehabilitation'],
  automotive: ['automotive', 'car dealer', 'ev', 'electric vehicle', 'automobile', 'two wheeler', 'fleet', 'vehicle', 'showroom', 'auto industry'],
  legal: ['lawyer', 'attorney', 'legal', 'advocate', 'litigation', 'law firm', 'barrister', 'solicitor', 'compliance', 'intellectual property'],
  digital_marketing: ['digital marketing', 'seo', 'ppc', 'performance marketing', 'content marketing', 'social media', 'growth hacker', 'media buying', 'brand strategy'],
  solar_energy: ['solar', 'renewable energy', 'clean energy', 'ev charging', 'wind energy', 'green energy', 'sustainability', 'carbon', 'solar installation'],
  agriculture: ['agriculture', 'agritech', 'farmer', 'crop', 'agri', 'farm', 'kisan', 'horticulture', 'food processing', 'fpo', 'rural'],
  wedding_events: ['wedding', 'event planner', 'venues', 'catering', 'decorator', 'photographer', 'bridal', 'event management', 'corporate events'],
  logistics: ['logistics', 'supply chain', 'freight', 'warehouse', 'last mile', '3pl', 'shipping', 'courier', 'fleet management', 'cold chain'],
  fitness_wellness: ['fitness', 'personal trainer', 'gym', 'yoga', 'wellness', 'health coach', 'nutritionist', 'dietitian', 'pilates', 'crossfit'],
};

export function detectCategory(text) {
  if (!text) return null;
  const lower = String(text).toLowerCase();
  let bestCategory = null;
  let bestScore = 0;
  for (const [categoryId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter((kw) => lower.includes(kw)).length;
    if (matches > bestScore) {
      bestScore = matches;
      bestCategory = categoryId;
    }
  }
  return bestScore > 0 ? bestCategory : null;
}
