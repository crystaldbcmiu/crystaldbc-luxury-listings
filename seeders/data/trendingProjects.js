/**
 * Trending projects. Each links to a property by its index in properties.js;
 * the seed runner resolves propertyIndex to the inserted document's _id.
 */
module.exports = [
      {
        name: "Binghatti Moonlight",
        location: "Al Jaddaf",
        image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1400",
        status: "Presale",
        description:
          "Binghatti Moonlight is a sculptural architectural statement rising from Al Jaddaf's waterfront district in Dubai.",
        amenities: [
          { name: "Common Gym" },
          { name: "Swimming Pool" },
          { name: "Seating Area" },
          { name: "Retail Shops" },
        ],
        completion: "June 2026",
        startingPrice: "1.5M AED",
        developer: "Binghatti",
        propertyIndex: 0,
      },
      {
        name: "The Serene at Sobha Central",
        location: "Sobha Hartland",
        image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1400",
        status: "Presale",
        description:
          "The Serene at Sobha Central is a masterfully envisioned community bringing lagoon living to the heart of Dubai.",
        amenities: [
          { name: "Swimming Pool" },
          { name: "Jogging Track" },
          { name: "Sport Courts" },
          { name: "Outdoor Cinema" },
        ],
        completion: "December 2029",
        startingPrice: "1.8M AED",
        developer: "Sobha",
        propertyIndex: 1,
      },
];
