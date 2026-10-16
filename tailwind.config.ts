// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        pwc: {
          black: "#000000",
          yellow: "#FFB600",     // primary accent
          tangerine: "#EB8C00",  // hover/secondary accent
          orange: "#D04A02",     // primary CTA
          rose: "#DB536A",       // optional data-viz accent
          red: "#E0301E",        // destructive/error only
          gray: {
            50: "#FAFAFA",
            100: "#F2F2F2",
            200: "#DEDEDE",
            300: "#C4C4C4",
            400: "#7D7D7D",
            600: "#464646",
            800: "#2D2D2D",
            900: "#1A1A1A",
          },
        },
      },
    },
  },
};
