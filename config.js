window.COACH_APP_CONFIG = {
  templateVersion: "1.3.0",
  packageTier: "pro",
  storagePrefix: "coach-kyle-booking",

  brand: {
    name: "Coach Kyle",
    shortName: "Coach Kyle",
    tagline: "Play • Learn • Improve",
    primaryColor: "#070707",
    accentColor: "#ffd600",
    backgroundColor: "#f5f5f5"
  },

  coach: {
    fullName: "Kyle Paulo Alvarez Guzman",
    firstName: "Kyle",
    bio: "Pickleball coaching in Santiago City for kids, beginners, novice, and intermediate players. Sessions focus on strong fundamentals, consistency, movement, confidence, and smarter point construction.",
    heroLead: "Focused pickleball coaching in Santiago City built around fundamentals, consistency, movement, confidence, and smarter play.",
    profilePhoto: "coach-placeholder.svg"
  },

  location: {
    city: "Santiago City",
    province: "Isabela",
    full: "Santiago City, Isabela",
    venueNote: "Venue confirmed with Coach Kyle"
  },

  schedule: {
    startHour: 8,
    endHour: 22,
    hoursLabel: "8 AM – 10 PM",
    daysLabel: "Monday–Sunday",
    durationLabel: "1-hour sessions",
    durationNote: "Choose available consecutive hours when needed"
  },

  rates: {
    solo: { label: "1-on-1", amount: 500, minPlayers: 1, maxPlayers: 1, billingLabel: "per hour" },
    partners: { label: "2 Players", amount: 700, minPlayers: 2, maxPlayers: 2, billingLabel: "total / hour" },
    group: { label: "3–5 Players", amount: 900, minPlayers: 3, maxPlayers: 5, billingLabel: "starts at ₱900 / hour" },
    byPlayers: { 1: 500, 2: 700, 3: 900, 4: 1100, 5: 1500 }
  },

  courtFee: {
    included: false,
    note: "Court fee is not included in the coaching rate.",
    detail: "Court fee depends on the selected venue and schedule and is confirmed separately.",
    bookingMessage: "Not included; final court fee is confirmed separately based on venue and schedule."
  },

  contact: {
    facebookUrl: "https://www.facebook.com/kylepaulo13",
    facebookLabel: "Facebook / Messenger",
    phone: "09637600148",
    email: "coachkyle.booking@gmail.com"
  },

  assets: {
    logo: "coach-kyle-main.svg",
    wordmark: "coach-kyle-wordmark.svg",
    emblem: "coach-kyle-favicon.svg",
    favicon: "coach-kyle-favicon.svg"
  },

  backend: {
    demoMode: false,
    supabaseUrl: "https://pnomsapqqkgcvkzknujc.supabase.co",
    supabasePublishableKey: "sb_publishable_EokwTiLlK_qy2Upc_0j3hw_noRX84_q"
  },

  publicSiteUrl: "https://coachkyle.xbalanced.net",

  features: {
    programs: true,
    testimonials: true,
    progressTracking: true,
    paymentTracking: true,
    weeklyScheduleCard: true,
    pwaInstall: true,
    multipleCoaches: false,
    multipleVenues: false
  }
};
