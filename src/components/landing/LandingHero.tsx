export const LandingHero = () => {
  return (
    <section className="relative pt-32 pb-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="space-y-8">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground font-serif text-balance">
              Kujituma is a weekly planning and accountability system.
            </h1>
            <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
              Set objectives. Track habits. Reflect. Repeat.
            </p>
            <p className="text-lg text-muted-foreground/80 italic">
              One Step at a Time.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-20 max-w-5xl mx-auto">
        <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-border">
          <img 
            src="/kilimanjaro-background.jpg" 
            srcSet="/kilimanjaro-background-sm.jpg 640w, /kilimanjaro-background-md.jpg 1024w, /kilimanjaro-background.jpg 1920w"
            sizes="(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px"
            alt="Mount Kilimanjaro"
            className="w-full h-full object-cover"
            fetchPriority="high"
          />
        </div>
      </div>
    </section>
  );
};
