// Category taxonomy + dynamic per-category fields, shared by the seed script
// and (for the canonical list of slugs/labels) anything else that needs to
// know the default marketplace structure. Admins can add/edit/reorder/hide
// categories, subcategories afterwards from the admin dashboard — this is
// just the starting data set required by the spec's 18 main categories.

export type FieldType = "TEXT" | "TEXTAREA" | "NUMBER" | "SELECT" | "MULTISELECT" | "BOOLEAN" | "DATE";

export interface CategoryFieldSeed {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  unit?: string;
}

export interface CategorySeed {
  name: string;
  slug: string;
  description: string;
  icon: string;
  subcategories: { name: string; slug: string }[];
  fields?: CategoryFieldSeed[];
}

const conditionOptions = ["New", "Like New", "Good", "Fair", "Poor"];

export const CATEGORY_SEED: CategorySeed[] = [
  {
    name: "Community",
    slug: "community",
    description: "Local activities, classes, volunteers, and neighborhood announcements.",
    icon: "Users",
    subcategories: [
      { name: "Activities", slug: "activities" },
      { name: "Artists", slug: "artists" },
      { name: "Childcare", slug: "childcare" },
      { name: "Classes & Lessons", slug: "classes-lessons" },
      { name: "General", slug: "general" },
      { name: "Groups", slug: "groups" },
      { name: "Local News", slug: "local-news" },
      { name: "Lost & Found", slug: "lost-and-found" },
      { name: "Rideshare & Carpool", slug: "rideshare-carpool" },
      { name: "Volunteers", slug: "volunteers" },
    ],
  },
  {
    name: "Jobs",
    slug: "jobs",
    description: "Full-time, part-time, contract, and remote job openings.",
    icon: "Briefcase",
    subcategories: [
      { name: "Accounting & Finance", slug: "accounting-finance" },
      { name: "Admin & Office", slug: "admin-office" },
      { name: "Arts & Media", slug: "arts-media" },
      { name: "Business & Management", slug: "business-management" },
      { name: "Customer Service", slug: "customer-service" },
      { name: "Education", slug: "education" },
      { name: "Food & Hospitality", slug: "food-hospitality" },
      { name: "Healthcare", slug: "healthcare" },
      { name: "Legal", slug: "legal" },
      { name: "Manufacturing", slug: "manufacturing" },
      { name: "Marketing & PR", slug: "marketing-pr" },
      { name: "Retail", slug: "retail" },
      { name: "Sales", slug: "sales" },
      { name: "Skilled Trade", slug: "skilled-trade" },
      { name: "Software & IT", slug: "software-it" },
      { name: "Transportation", slug: "transportation" },
    ],
    fields: [
      { key: "jobType", label: "Job Type", type: "SELECT", required: true, options: ["Full-time", "Part-time", "Contract", "Temporary", "Internship"] },
      { key: "employmentType", label: "Employment Type", type: "SELECT", options: ["Employee", "Contractor", "Freelance"] },
      { key: "remoteOnsite", label: "Remote / On-site", type: "SELECT", required: true, options: ["Remote", "On-site", "Hybrid"] },
      { key: "experienceLevel", label: "Experience Level", type: "SELECT", options: ["Entry level", "Mid level", "Senior", "Executive"] },
      { key: "salaryRange", label: "Salary / Compensation", type: "TEXT" },
    ],
  },
  {
    name: "Housing",
    slug: "housing",
    description: "Apartments, rooms, sublets, and real estate for rent or sale.",
    icon: "Home",
    subcategories: [
      { name: "Apartments for Rent", slug: "apartments-for-rent" },
      { name: "Housing Wanted", slug: "housing-wanted" },
      { name: "Office & Commercial", slug: "office-commercial" },
      { name: "Parking & Storage", slug: "parking-storage" },
      { name: "Real Estate for Sale", slug: "real-estate-for-sale" },
      { name: "Rooms & Shared", slug: "rooms-shared" },
      { name: "Sublets & Temporary", slug: "sublets-temporary" },
      { name: "Vacation Rentals", slug: "vacation-rentals" },
    ],
    fields: [
      { key: "propertyType", label: "Property Type", type: "SELECT", required: true, options: ["Apartment", "House", "Condo", "Townhouse", "Room", "Other"] },
      { key: "bedrooms", label: "Bedrooms", type: "NUMBER" },
      { key: "bathrooms", label: "Bathrooms", type: "NUMBER" },
      { key: "squareFootage", label: "Square Footage", type: "NUMBER", unit: "sq ft" },
      { key: "leaseDuration", label: "Lease Duration", type: "SELECT", options: ["Month-to-month", "6 months", "1 year", "Other"] },
      { key: "amenities", label: "Amenities", type: "MULTISELECT", options: ["Parking", "In-unit Laundry", "A/C", "Pool", "Gym", "Pets Allowed", "Furnished"] },
    ],
  },
  {
    name: "For Sale",
    slug: "for-sale",
    description: "Everything from antiques to garage sale finds.",
    icon: "Tag",
    subcategories: [
      { name: "Antiques", slug: "antiques" },
      { name: "Appliances", slug: "appliances" },
      { name: "Arts & Crafts", slug: "arts-crafts" },
      { name: "Baby & Kids", slug: "baby-kids" },
      { name: "Bikes", slug: "bikes" },
      { name: "Books", slug: "books" },
      { name: "Collectibles", slug: "collectibles" },
      { name: "Garage Sale", slug: "garage-sale" },
      { name: "Health & Beauty", slug: "health-beauty" },
      { name: "Jewelry", slug: "jewelry" },
      { name: "Musical Instruments", slug: "musical-instruments" },
      { name: "Sporting Goods", slug: "sporting-goods" },
      { name: "Tickets", slug: "tickets" },
      { name: "Toys & Games", slug: "toys-games" },
    ],
    fields: [
      { key: "brand", label: "Brand", type: "TEXT" },
      { key: "model", label: "Model", type: "TEXT" },
    ],
  },
  {
    name: "Services",
    slug: "services",
    description: "Local professionals offering their services.",
    icon: "Wrench",
    subcategories: [
      { name: "Automotive", slug: "automotive" },
      { name: "Beauty & Personal Care", slug: "beauty-personal-care" },
      { name: "Computer & Tech", slug: "computer-tech" },
      { name: "Creative Services", slug: "creative-services" },
      { name: "Event Services", slug: "event-services" },
      { name: "Financial", slug: "financial" },
      { name: "Health & Wellness", slug: "health-wellness" },
      { name: "Household Services", slug: "household-services" },
      { name: "Labor & Moving", slug: "labor-moving" },
      { name: "Legal Services", slug: "legal-services" },
      { name: "Lessons & Tutoring", slug: "lessons-tutoring" },
      { name: "Pet Services", slug: "pet-services" },
      { name: "Real Estate Services", slug: "real-estate-services" },
      { name: "Skilled Trade", slug: "skilled-trade-services" },
      { name: "Travel", slug: "travel" },
      { name: "Writing & Translation", slug: "writing-translation" },
    ],
    fields: [{ key: "serviceArea", label: "Service Area", type: "TEXT" }],
  },
  {
    name: "Gigs",
    slug: "gigs",
    description: "Short-term and one-off work.",
    icon: "Zap",
    subcategories: [
      { name: "Computer Gigs", slug: "computer-gigs" },
      { name: "Creative Gigs", slug: "creative-gigs" },
      { name: "Crew Gigs", slug: "crew-gigs" },
      { name: "Domestic Gigs", slug: "domestic-gigs" },
      { name: "Event Gigs", slug: "event-gigs" },
      { name: "Labor Gigs", slug: "labor-gigs" },
      { name: "Talent Gigs", slug: "talent-gigs" },
      { name: "Writing Gigs", slug: "writing-gigs" },
    ],
    fields: [{ key: "gigDate", label: "Gig Date", type: "DATE" }],
  },
  {
    name: "Resumes",
    slug: "resumes",
    description: "Job seekers introducing themselves to local employers.",
    icon: "FileText",
    subcategories: [
      { name: "General", slug: "general" },
      { name: "Professional", slug: "professional" },
      { name: "Skilled Trade", slug: "skilled-trade" },
      { name: "Creative", slug: "creative" },
      { name: "Technical", slug: "technical" },
    ],
    fields: [
      { key: "desiredJobType", label: "Desired Job Type", type: "SELECT", options: ["Full-time", "Part-time", "Contract", "Internship"] },
      { key: "yearsExperience", label: "Years of Experience", type: "NUMBER" },
    ],
  },
  {
    name: "Events",
    slug: "events",
    description: "Concerts, classes, festivals, and community gatherings.",
    icon: "Calendar",
    subcategories: [
      { name: "Community Events", slug: "community-events" },
      { name: "Concerts & Music", slug: "concerts-music" },
      { name: "Classes & Workshops", slug: "classes-workshops" },
      { name: "Festivals", slug: "festivals" },
      { name: "Fundraisers", slug: "fundraisers" },
      { name: "Kids & Family", slug: "kids-family" },
      { name: "Nightlife", slug: "nightlife" },
      { name: "Sports", slug: "sports" },
    ],
    fields: [
      { key: "eventDate", label: "Event Date", type: "DATE", required: true },
      { key: "venue", label: "Venue", type: "TEXT" },
      { key: "ageRestriction", label: "Age Restriction", type: "SELECT", options: ["All ages", "18+", "21+"] },
    ],
  },
  {
    name: "Pets",
    slug: "pets",
    description: "Pets, supplies, and pet services.",
    icon: "PawPrint",
    subcategories: [
      { name: "Dogs", slug: "dogs" },
      { name: "Cats", slug: "cats" },
      { name: "Birds", slug: "birds" },
      { name: "Fish & Aquarium", slug: "fish-aquarium" },
      { name: "Reptiles", slug: "reptiles" },
      { name: "Small Animals", slug: "small-animals" },
      { name: "Pet Supplies", slug: "pet-supplies" },
      { name: "Lost & Found Pets", slug: "lost-and-found-pets" },
    ],
    fields: [
      { key: "species", label: "Species", type: "TEXT" },
      { key: "breed", label: "Breed", type: "TEXT" },
      { key: "age", label: "Age", type: "TEXT" },
      { key: "vaccinated", label: "Vaccinated", type: "BOOLEAN" },
    ],
  },
  {
    name: "Vehicles",
    slug: "vehicles",
    description: "Cars, trucks, motorcycles, boats, and parts.",
    icon: "Car",
    subcategories: [
      { name: "Cars & Trucks", slug: "cars-trucks" },
      { name: "Motorcycles", slug: "motorcycles" },
      { name: "RVs & Campers", slug: "rvs-campers" },
      { name: "Boats", slug: "boats" },
      { name: "ATVs & UTVs", slug: "atvs-utvs" },
      { name: "Auto Parts", slug: "auto-parts" },
      { name: "Trailers", slug: "trailers" },
    ],
    fields: [
      { key: "make", label: "Make", type: "TEXT", required: true },
      { key: "model", label: "Model", type: "TEXT", required: true },
      { key: "year", label: "Year", type: "NUMBER", required: true },
      { key: "mileage", label: "Mileage", type: "NUMBER", unit: "mi" },
      { key: "vin", label: "VIN", type: "TEXT" },
      { key: "transmission", label: "Transmission", type: "SELECT", options: ["Automatic", "Manual", "CVT", "Other"] },
      { key: "fuelType", label: "Fuel Type", type: "SELECT", options: ["Gasoline", "Diesel", "Electric", "Hybrid", "Other"] },
    ],
  },
  {
    name: "Electronics",
    slug: "electronics",
    description: "Computers, phones, TVs, cameras, and more.",
    icon: "Laptop",
    subcategories: [
      { name: "Computers & Laptops", slug: "computers-laptops" },
      { name: "TVs", slug: "tvs" },
      { name: "Cameras", slug: "cameras" },
      { name: "Audio", slug: "audio" },
      { name: "Cell Phones", slug: "cell-phones" },
      { name: "Video Games & Consoles", slug: "video-games-consoles" },
      { name: "Wearables", slug: "wearables" },
    ],
    fields: [
      { key: "brand", label: "Brand", type: "TEXT" },
      { key: "model", label: "Model", type: "TEXT" },
      { key: "storageCapacity", label: "Storage Capacity", type: "TEXT" },
    ],
  },
  {
    name: "Furniture",
    slug: "furniture",
    description: "Living room, bedroom, office, and outdoor furniture.",
    icon: "Sofa",
    subcategories: [
      { name: "Living Room", slug: "living-room" },
      { name: "Bedroom", slug: "bedroom" },
      { name: "Dining Room", slug: "dining-room" },
      { name: "Office", slug: "office" },
      { name: "Outdoor", slug: "outdoor" },
      { name: "Kids Furniture", slug: "kids-furniture" },
    ],
    fields: [
      { key: "material", label: "Material", type: "TEXT" },
      { key: "dimensions", label: "Dimensions", type: "TEXT" },
    ],
  },
  {
    name: "Clothing",
    slug: "clothing",
    description: "Apparel, shoes, and accessories.",
    icon: "Shirt",
    subcategories: [
      { name: "Women's", slug: "womens" },
      { name: "Men's", slug: "mens" },
      { name: "Kids'", slug: "kids" },
      { name: "Shoes", slug: "shoes" },
      { name: "Accessories", slug: "accessories" },
      { name: "Vintage & Costume", slug: "vintage-costume" },
    ],
    fields: [
      { key: "size", label: "Size", type: "TEXT" },
      { key: "brand", label: "Brand", type: "TEXT" },
    ],
  },
  {
    name: "Home & Garden",
    slug: "home-and-garden",
    description: "Appliances, decor, and outdoor living.",
    icon: "Flower2",
    subcategories: [
      { name: "Appliances", slug: "appliances" },
      { name: "Decor", slug: "decor" },
      { name: "Garden & Outdoor", slug: "garden-outdoor" },
      { name: "Kitchen", slug: "kitchen" },
      { name: "Bedding & Bath", slug: "bedding-bath" },
    ],
    fields: [{ key: "brand", label: "Brand", type: "TEXT" }],
  },
  {
    name: "Tools",
    slug: "tools",
    description: "Power tools, hand tools, and equipment.",
    icon: "Hammer",
    subcategories: [
      { name: "Power Tools", slug: "power-tools" },
      { name: "Hand Tools", slug: "hand-tools" },
      { name: "Lawn & Garden Equipment", slug: "lawn-garden-equipment" },
      { name: "Tool Storage", slug: "tool-storage" },
      { name: "Welding", slug: "welding" },
    ],
    fields: [
      { key: "brand", label: "Brand", type: "TEXT" },
      { key: "powerSource", label: "Power Source", type: "SELECT", options: ["Electric", "Battery", "Gas", "Manual"] },
    ],
  },
  {
    name: "Free Stuff",
    slug: "free-stuff",
    description: "Free items — first come, first served.",
    icon: "Gift",
    subcategories: [
      { name: "Furniture", slug: "furniture" },
      { name: "Electronics", slug: "electronics" },
      { name: "Clothing", slug: "clothing" },
      { name: "Building Materials", slug: "building-materials" },
      { name: "Moving Boxes", slug: "moving-boxes" },
      { name: "Other", slug: "other" },
    ],
  },
  {
    name: "Wanted",
    slug: "wanted",
    description: "Looking for something? Post what you want to buy.",
    icon: "Search",
    subcategories: [
      { name: "Vehicles", slug: "vehicles" },
      { name: "Electronics", slug: "electronics" },
      { name: "Furniture", slug: "furniture" },
      { name: "Housing", slug: "housing" },
      { name: "Services", slug: "services" },
      { name: "Other", slug: "other" },
    ],
  },
  {
    name: "Other",
    slug: "other",
    description: "Anything that doesn't fit elsewhere.",
    icon: "MoreHorizontal",
    subcategories: [{ name: "Miscellaneous", slug: "miscellaneous" }],
  },
];

export const CONDITION_OPTIONS = conditionOptions;
