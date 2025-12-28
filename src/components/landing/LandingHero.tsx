export const LandingHero = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center">
      {/* Full-bleed background image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/kilimanjaro-background.jpg" 
          srcSet="/kilimanjaro-background-sm.jpg 640w, /kilimanjaro-background-md.jpg 1024w, /kilimanjaro-background.jpg 1920w"
          sizes="100vw"
          alt="Mount Kilimanjaro"
          className="w-full h-full object-cover"
          fetchPriority="high"
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground font-serif mb-6">
          Kujituma
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground font-light mb-8">
          A weekly planning and accountability system.
        </p>
        <p className="text-lg text-muted-foreground/80 italic">
          One Step at a Time.
        </p>
      </div>
    </section>
  );
};
