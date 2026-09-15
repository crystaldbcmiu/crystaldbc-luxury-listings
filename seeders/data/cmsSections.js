/**
 * CMS sections that populate the home, about, contact and footer content.
 * Keyed documents the API serves at GET /api/cms/:key.
 */
module.exports = [
      {
        key: "hero",
        content: {
          heading: "Discover Your Dream",
          highlight: "Luxury Property",
          subheading:
            "Exceptional homes, unparalleled service, and a commitment to excellence in every detail",
          backgroundImage:
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=2000",
          primaryCta: { label: "Explore Properties", href: "/listings" },
          secondaryCta: { label: "Contact Us", href: "/contact" },
        },
      },
      {
        key: "about",
        content: {
          heroImage:
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=2000",
          heroTitle: "About CrystalDBC",
          heroSubtitle: "Excellence in luxury real estate since 2002",
          storyParagraphs: [
            "Founded in 2002, CrystalDBC has established itself as a premier luxury real estate firm, specializing in exceptional properties that define sophisticated living.",
            "With decades of combined experience, our team brings unparalleled expertise in the luxury real estate market.",
            "We pride ourselves on attention to detail, market knowledge, and dedication to delivering results that exceed expectations.",
          ],
          impactItems: ["Egypt", "Saudi Arabia", "Germany", "United Arab Emirates", "Russia", "Iraq"],
          values: [
            { iconKey: "Award", title: "Excellence", description: "We strive for excellence in every interaction." },
            { iconKey: "Users", title: "Expertise", description: "Deep market knowledge and proven success." },
            { iconKey: "Target", title: "Integrity", description: "Honest, transparent, and ethical practices." },
            { iconKey: "Heart", title: "Service", description: "Personalized attention for every client." },
          ],
          stats: [
            { label: "Years Experience", value: "24+" },
            { label: "Properties Sold", value: "2,500+" },
            { label: "Total Sales Volume", value: "$5B+" },
            { label: "Client Satisfaction", value: "98%" },
          ],
        },
      },
      {
        key: "contact",
        content: {
          title: "Contact Information",
          subtitle:
            "Reach out to our team of luxury real estate experts. We're available to answer your questions and schedule property viewings.",
          phone: "+1 (888) 555-1234",
          email: "info@crystaldbc.com",
          office: "123 Luxury Avenue, Beverly Hills, CA 90210",
          officeHours: [
            "Monday - Friday: 9:00 AM - 6:00 PM",
            "Saturday: 10:00 AM - 4:00 PM",
            "Sunday: By Appointment Only",
          ],
        },
      },
      {
        key: "footer",
        content: {
          description:
            "Your trusted partner in Egypt real estate. We provide premium properties and exceptional service to help you find your perfect home or investment opportunity.",
          contact: {
            phone: "(800) 110-220",
            email: "info@crystaldbc.com",
            location: "Egypt",
          },
          quickLinks: [
            { label: "Home", href: "/" },
            { label: "Properties", href: "/listings" },
            { label: "Info", href: "/about" },
            { label: "Contact", href: "/contact" },
          ],
          propertyTypes: ["Apartment", "Villa", "Townhouse", "Penthouse"],
          social: [
            { label: "Instagram", href: "https://instagram.com" },
            { label: "LinkedIn", href: "https://linkedin.com" },
          ],
        },
      },
      {
        key: "siteSettings",
        content: {
          rentButtonEnabled: true,
        },
      },
];
