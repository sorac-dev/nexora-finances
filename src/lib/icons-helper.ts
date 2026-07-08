// Shared icon constants for the entire app
// Use these everywhere instead of duplicating icon arrays

export const ICONS_FINANCE = ["Wallet","DollarSign","CreditCard","Banknote","PiggyBank","TrendingUp","Receipt","Calculator","Percent"];
export const ICONS_FOOD = ["Utensils","Coffee","Wine","Beef","ShoppingCart","ShoppingBag"];
export const ICONS_TRANSPORT = ["Car","Bus","Plane","Bike","Fuel","Ship"];
export const ICONS_HOME = ["House","Building2","Zap","Wifi","Droplets","Smartphone","Tv"];
export const ICONS_ENTERTAINMENT = ["Film","Music","Gamepad2","BookOpen","Newspaper","Camera"];
export const ICONS_HEALTH = ["Heart","Hospital","Stethoscope","Dumbbell","Activity"];
export const ICONS_WORK = ["Briefcase","Laptop","GraduationCap","BookMarked","Rocket"];
export const ICONS_LIFESTYLE = ["Dog","Shirt","Coffee","Leaf","Lightbulb","Gift","Gem","Star","Target","Trophy"];
export const ICONS_SECURITY = ["Shield","Lock","Key","LifeBuoy","Ban"];
export const ICONS_OTHER = ["Package","Palette","Sun","Moon","Cloud","Globe","Watch"];

// Flat list for selectors
export const ALL_ICONS = [
  ...ICONS_FINANCE, ...ICONS_FOOD, ...ICONS_TRANSPORT, ...ICONS_HOME,
  ...ICONS_ENTERTAINMENT, ...ICONS_HEALTH, ...ICONS_WORK, ...ICONS_LIFESTYLE,
  ...ICONS_SECURITY, ...ICONS_OTHER,
];

// Grouped for better UX in selectors
export const ICON_GROUPS = [
  { label: "Dinero", icons: ICONS_FINANCE },
  { label: "Comida", icons: ICONS_FOOD },
  { label: "Transporte", icons: ICONS_TRANSPORT },
  { label: "Hogar", icons: ICONS_HOME },
  { label: "Entretenimiento", icons: ICONS_ENTERTAINMENT },
  { label: "Salud", icons: ICONS_HEALTH },
  { label: "Trabajo", icons: ICONS_WORK },
  { label: "Estilo de vida", icons: ICONS_LIFESTYLE },
  { label: "Seguridad", icons: ICONS_SECURITY },
  { label: "Otros", icons: ICONS_OTHER },
];

export const DEFAULT_ICON = "Package";
