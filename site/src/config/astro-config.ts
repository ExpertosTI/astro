export const ASTRO_CONFIG = {
  videos: {
    desktop: "https://insforge-assets.s3.us-east-1.amazonaws.com/astro/backgrounds/VIDEO-FONDO-A-COLOR-WEB-GRANDE.mp4",
    mobile: "https://insforge-assets.s3.us-east-1.amazonaws.com/astro/backgrounds/mobile-bg.webm", // URL Garantizada
    scrubStart: 1.2,
    scrubEndPadding: 0.25,
  },
  assets: {
    preloader: [
      "/astro/elements/ELMENTO-1.png",
      "/astro/elements/ELEMENTO-2.png",
      "/astro/elements/ELEMENTO-3.png",
      "/astro/elements/ELEMENTO-4.png",
    ],
    fallbackPoster: "/astro/backgrounds/IMAGEN-FONDO-A-COLOR-WEB-GRANDE.jpg",
    mobilePoster: "/astro/backgrounds/mobile-color.jpg",
  },
  storage: {
    leadsKey: "astro-notify-leads",
    maxLeads: 100,
  },
  project: {
    id: "ASTRO_SDQ_2027",
    edition: "5TA EDICIÓN · 2027",
  }
};
