import { useMemo, useState } from "react";
import { useContacts, useInteractions, Contact, Interaction } from "@/hooks/network/useNetworkData";
import { Link } from "react-router-dom";
import InteractionForm from "@/components/network/InteractionForm";
import SendMessageDialog from "@/components/network/SendMessageDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Flame, CalendarCheck, Users, MessageCircle, CalendarPlus,
  Cake, AlertTriangle, ArrowDownLeft, Clock, CheckCircle2, Sparkles,
} from "lucide-react";
import { format, differenceInDays, parseISO, addDays, startOfWeek } from "date-fns";

interface ScoredContact {
  contact: Contact;
  score: number;
  reason: string;
  reasonIcon: React.ReactNode;
  borderColor: string;
}

const Dashboard = () => {
  const { data: contacts = [], isLoading } = useContacts();
  const { data: interactions = [] } = useInteractions();
  const [interactionContactId, setInteractionContactId] = useState<string | null>(null);
  const [messageContact, setMessageContact] = useState<{
    id: string; name: string; whatsapp: string;
    eventType: "birthday" | "follow_up" | "custom_event";
  } | null>(null);

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const contactMap = useMemo(() => {
    const map: Record<string, Contact> = {};
    contacts.forEach((c) => (map[c.id] = c));
    return map;
  }, [contacts]);

  // === Scoring algorithm ===
  const dailyActions = useMemo(() => {
    if (!contacts.length) return [];

    const activeContacts = contacts.filter((c) => !c.muted_from_brief);

    // Pre-compute per-contact interaction stats
    const interactionsByContact: Record<string, Interaction[]> = {};
    interactions.forEach((i) => {
      if (!interactionsByContact[i.contact_id]) interactionsByContact[i.contact_id] = [];
      interactionsByContact[i.contact_id].push(i);
    });

    const scored: ScoredContact[] = [];

    activeContacts.forEach((c) => {
      const cInteractions = interactionsByContact[c.id] || [];
      // Fall back to first-met date, then created_at, then 999
      let daysSinceLast: number;
      if (c.last_interaction_date) {
        daysSinceLast = differenceInDays(today, parseISO(c.last_interaction_date));
      } else if (c.first_met_year) {
        const firstMetDate = new Date(c.first_met_year, (c.first_met_month ?? 1) - 1, 1);
        daysSinceLast = differenceInDays(today, firstMetDate);
      } else {
        daysSinceLast = differenceInDays(today, parseISO(c.created_at));
      }

      let bestScore = 0;
      let reason = "";
      let reasonIcon: React.ReactNode = null;
      let borderColor = "border-l-muted";

      // 1. Overdue follow-ups (highest priority)
      const overdueFollowUp = cInteractions.find(
        (i) => i.follow_up_date && i.follow_up_date < todayStr
      );
      if (overdueFollowUp) {
        const overdueDays = differenceInDays(today, parseISO(overdueFollowUp.follow_up_date!));
        const s = 100 + overdueDays;
        if (s > bestScore) {
          bestScore = s;
          reason = `Follow-up overdue by ${overdueDays}d`;
          reasonIcon = <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
          borderColor = "border-l-destructive";
        }
      }

      // 2. Birthday within 7 days
      if (c.birthday) {
        const bday = parseISO(c.birthday);
        const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        const nextYear = new Date(today.getFullYear() + 1, bday.getMonth(), bday.getDate());
        const upcoming = thisYear >= today ? thisYear : nextYear;
        const daysUntil = differenceInDays(upcoming, today);
        if (daysUntil <= 7) {
          const s = 90 - daysUntil;
          if (s > bestScore) {
            bestScore = s;
            reason = daysUntil === 0 ? "🎂 Birthday today!" : daysUntil === 1 ? "Birthday tomorrow" : `Birthday in ${daysUntil} days`;
            reasonIcon = <Cake className="h-3.5 w-3.5 text-primary" />;
            borderColor = "border-l-primary";
          }
        }
      }

      // 3. Inner circle not contacted in 14+ days
      if (c.is_inner_circle && daysSinceLast >= 14) {
        const s = 70 + Math.min(daysSinceLast, 60);
        if (s > bestScore) {
          bestScore = s;
          reason = `Inner circle · ${daysSinceLast}d since last contact`;
          reasonIcon = <Clock className="h-3.5 w-3.5" style={{ color: "hsl(var(--warning))" }} />;
          borderColor = "border-l-[hsl(var(--warning))]";
        }
      }

      // 4. Trusted/Strong not contacted in 30+ days
      if ((c.relationship_strength === "Trusted" || c.relationship_strength === "Strong") && daysSinceLast >= 30) {
        const s = 50 + Math.min(daysSinceLast, 90);
        if (s > bestScore) {
          bestScore = s;
          reason = `${c.relationship_strength} · ${daysSinceLast}d since last contact`;
          reasonIcon = <Clock className="h-3.5 w-3.5" style={{ color: "hsl(var(--info))" }} />;
          borderColor = "border-l-[hsl(var(--info))]";
        }
      }

      // 5. Reciprocity imbalance (they helped you more)
      const gave = cInteractions.filter((i) => i.direction === "gave").length;
      const received = cInteractions.filter((i) => i.direction === "received").length;
      if (received > gave && received - gave >= 2) {
        const imbalance = received - gave;
        const s = 40 + imbalance * 5;
        if (s > bestScore) {
          bestScore = s;
          reason = `You owe them — they helped ${received}×, you helped ${gave}×`;
          reasonIcon = <ArrowDownLeft className="h-3.5 w-3.5" style={{ color: "hsl(var(--info))" }} />;
          borderColor = "border-l-[hsl(var(--info))]";
        }
      }

      // 6. High influence + not contacted in 60+ days
      if (c.influence_score >= 4 && daysSinceLast >= 60) {
        const s = 30 + Math.min(daysSinceLast - 60, 60);
        if (s > bestScore) {
          bestScore = s;
          reason = `High influence · ${daysSinceLast}d ago`;
          reasonIcon = <Sparkles className="h-3.5 w-3.5 text-primary" />;
          borderColor = "border-l-primary/60";
        }
      }

      if (bestScore > 0) {
        scored.push({ contact: c, score: bestScore, reason, reasonIcon, borderColor });
      }
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [contacts, interactions, todayStr]);

  // === Quick stats ===
  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 30; i++) {
      const day = format(addDays(today, -i), "yyyy-MM-dd");
      if (interactions.some((int) => int.date === day)) count++;
      else if (i > 0) break;
    }
    return count;
  }, [interactions]);

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const contactsThisWeek = useMemo(() => {
    const weekStr = format(weekStart, "yyyy-MM-dd");
    const uniqueContacts = new Set(
      interactions.filter((i) => i.date >= weekStr).map((i) => i.contact_id)
    );
    return uniqueContacts.size;
  }, [interactions, weekStart]);

  const pendingFollowUps = useMemo(() => {
    return interactions.filter((i) => i.follow_up_date && i.follow_up_date <= todayStr).length;
  }, [interactions, todayStr]);

  // === Recent activity ===
  const recentActivity = useMemo(() => {
    return interactions.slice(0, 5);
  }, [interactions]);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="animate-fade-in mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Daily Brief</h1>
        <p className="text-sm text-muted-foreground">
          {format(today, "EEEE, MMMM d")}
        </p>
      </div>

      {/* Quick Stats Strip */}
      <div className="flex items-center gap-6 rounded-lg border bg-card px-5 py-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{streak}</span>
          <span className="text-xs text-muted-foreground">day streak</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{contactsThisWeek}</span>
          <span className="text-xs text-muted-foreground">this week</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{pendingFollowUps}</span>
          <span className="text-xs text-muted-foreground">pending</span>
        </div>
      </div>

      {/* Today's Actions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Reach out today
        </h2>
        {dailyActions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="mb-3 h-10 w-10 text-[hsl(var(--success))]" />
              <p className="text-lg font-semibold">All caught up!</p>
              <p className="text-sm text-muted-foreground">No urgent outreach needed today.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {dailyActions.map(({ contact: c, reason, reasonIcon, borderColor }) => (
              <Card key={c.id} className={`border-l-4 ${borderColor} overflow-hidden`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Link to={`/network/contacts/${c.id}`}>
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarImage src={c.photo_url || undefined} alt={c.full_name} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-semibold">
                        {c.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to={`/network/contacts/${c.id}`} className="hover:underline">
                      <p className="text-sm font-semibold truncate">{c.full_name}</p>
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {reasonIcon}
                      <p className="text-xs text-muted-foreground truncate">{reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.whatsapp_number && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setMessageContact({
                            id: c.id,
                            name: c.full_name,
                            whatsapp: c.whatsapp_number!,
                            eventType: c.birthday && differenceInDays(
                              (() => {
                                const bd = parseISO(c.birthday!);
                                const ty = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
                                return ty >= today ? ty : new Date(today.getFullYear() + 1, bd.getMonth(), bd.getDate());
                              })(), today
                            ) <= 7 ? "birthday" : "follow_up",
                          })
                        }
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setInteractionContactId(c.id)}
                    >
                      <CalendarPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recent activity
          </h2>
          <div className="space-y-2">
            {recentActivity.map((i) => {
              const contact = contactMap[i.contact_id];
              if (!contact) return null;
              const snippet = i.summary?.replace(/<[^>]*>/g, "").slice(0, 80);
              return (
                <Link
                  key={i.id}
                  to={`/network/contacts/${contact.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 card-hover"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={contact.photo_url || undefined} alt={contact.full_name} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                      {contact.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {contact.full_name}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{i.type}</span>
                    </p>
                    {snippet && (
                      <p className="text-xs text-muted-foreground truncate">{snippet}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(parseISO(i.date), "MMM d")}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Dialogs */}
      {interactionContactId && (
        <InteractionForm
          open={!!interactionContactId}
          onOpenChange={(open) => !open && setInteractionContactId(null)}
          contactId={interactionContactId}
        />
      )}
      {messageContact && (
        <SendMessageDialog
          open={!!messageContact}
          onOpenChange={(open) => !open && setMessageContact(null)}
          contactId={messageContact.id}
          contactName={messageContact.name}
          whatsappNumber={messageContact.whatsapp}
          eventType={messageContact.eventType}
        />
      )}
    </div>
  );
};

export default Dashboard;
