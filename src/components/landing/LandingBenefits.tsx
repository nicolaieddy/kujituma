import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const LandingBenefits = () => {
  const benefits = [
    {
      stat: "3x",
      label: "More Likely to Achieve Goals",
      description: "With structured weekly planning and community accountability"
    },
    {
      stat: "85%",
      label: "Report Better Focus",
      description: "Clear weekly objectives eliminate decision fatigue"
    },
    {
      stat: "90%",
      label: "Stay Motivated Longer", 
      description: "Community support and progress tracking keep you going"
    }
  ];

  const testimonials = [
    {
      quote: "I finally stopped setting goals that never happened. The weekly structure changed everything.",
      author: "Sarah M.",
      role: "Entrepreneur"
    },
    {
      quote: "Seeing my progress visually and sharing wins with the community keeps me motivated every day.",
      author: "Mike R.",
      role: "Software Engineer"
    },
    {
      quote: "The accountability aspect is game-changing. I'm actually following through for the first time.",
      author: "Jessica L.",
      role: "Designer"
    }
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Stats Section */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-5xl font-bold">
            <span className="bg-gradient-primary bg-clip-text text-transparent">Proven Results</span>
            <br />That Speak for Themselves
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands who've transformed their goal-setting approach and achieved more than they thought possible.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {benefits.map((benefit, index) => (
            <Card key={index} className="p-8 text-center bg-gradient-card border-primary/10 hover:border-primary/20 transition-colors">
              <div className="space-y-4">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {benefit.stat}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    {benefit.label}
                  </h3>
                  <p className="text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Testimonials */}
        <div className="space-y-8">
          <div className="text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              What Our Users Say
            </h3>
            <Badge variant="secondary" className="text-sm">
              Real feedback from real goal-achievers
            </Badge>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6 bg-gradient-card border-primary/10">
                <div className="space-y-4">
                  <p className="text-foreground italic leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                  <div className="space-y-1">
                    <div className="font-semibold text-primary">
                      {testimonial.author}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};