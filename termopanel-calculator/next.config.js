/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [],
    // Гарантируем попадание фото текстур в serverless-бандл /api/visualize.
    // В Next 14.2 опция живёт под experimental (тип ExperimentalConfig).
    outputFileTracingIncludes: {
      "/api/visualize": [
        "./public/textures/**",
        "./public/frames/**",
        "./public/foundations/**",
        "./public/columns/**",
        "./public/belts/**",
        "./public/brackets/**",
        "./public/termopanels/**",
      ],
    },
  },
};

module.exports = nextConfig;
