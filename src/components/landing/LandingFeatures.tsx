export const LandingFeatures = () => {
  return (
    <div className="space-y-24 py-24 px-4">
      {/* What the System Does */}
      <section className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold text-foreground mb-8">What the system does</h2>
        <ul className="space-y-4 text-muted-foreground">
          <li>Plan weekly objectives tied to longer-term goals</li>
          <li>Track daily habits with streaks and completion records</li>
          <li>Reflect through weekly planning, daily check-ins, and quarterly reviews</li>
          <li>Share progress with a small group of trusted people</li>
        </ul>
      </section>

      {/* How It Works */}
      <section className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold text-foreground mb-8">How it works</h2>
        <p className="text-muted-foreground mb-6">A weekly loop:</p>
        <p className="text-lg text-foreground font-medium tracking-wide">
          Plan → Execute → Review → Share
        </p>
        <p className="text-muted-foreground mt-6">Each week builds on the last.</p>
      </section>

      {/* Accountability */}
      <section className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold text-foreground mb-8">Accountability</h2>
        <div className="space-y-4 text-muted-foreground">
          <p>A friends system connects you to others working on their own objectives.</p>
          <p>You see their weekly progress. They see yours.</p>
          <p>This is not performance. It is consistency made visible.</p>
        </div>
      </section>

      {/* Name & Theme */}
      <section className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold text-foreground mb-8">Name</h2>
        <div className="space-y-4 text-muted-foreground">
          <p>"Kujituma" is Swahili — roughly, "to have a burning fire in your stomach."</p>
          <p>It refers to quiet internal drive, not outward motivation.</p>
          <p>The Kilimanjaro imagery reflects the same idea: long climbs, patience, elevation through consistency.</p>
        </div>
      </section>
    </div>
  );
};
