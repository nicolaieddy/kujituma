export const LandingHero = () => {
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center">
      {/* Full-bleed background image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/kilimanjaro-background.jpg"
          srcSet="/kilimanjaro-background-sm.jpg 640w, /kilimanjaro-background-md.jpg 1024w, /kilimanjaro-background.jpg 1920w"
          sizes="100vw"
          alt="Mount Kilimanjaro"
          className="w-full h-full object-cover"
          // @ts-expect-error fetchpriority is a valid HTML attribute
          fetchpriority="high"
        />
        {/* Soft top fade for nav legibility, leave the rest of the photo clean */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background/60 to-transparent" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        <p className="text-xs md:text-sm tracking-[0.4em] uppercase text-foreground/80 mb-6">
          Weekly Planning · Personal
        </p>
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-foreground font-heading">
          Kujituma
        </h1>
      </div>
    </section>
  );
};
