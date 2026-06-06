import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, EyeOff, Edit, Trash2, Upload, Heart } from "lucide-react";
import { useValues, usePublicValues } from "@/hooks/useValues";
import { ValueFormDialog } from "./ValueFormDialog";
import { ValuesBulkImportDialog } from "./ValuesBulkImportDialog";
import type { UserValue, ValueVisibility } from "@/types/values";

interface Props {
  isOwnProfile: boolean;
  userId: string;
}

export const ValuesSection = ({ isOwnProfile, userId }: Props) => {
  const { values, isLoading, create, bulkCreate, update, remove } = useValues();
  const { data: publicValues = [] } = usePublicValues(isOwnProfile ? undefined : userId);

  const displayValues = isOwnProfile ? values : publicValues;

  const [editing, setEditing] = useState<UserValue | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // If viewing someone else's profile and they have no public values, hide section
  if (!isOwnProfile && displayValues.length === 0) return null;

  const toggleVisibility = (v: UserValue) => {
    const next: ValueVisibility = v.visibility === "public" ? "private" : "public";
    update.mutate({ id: v.id, patch: { visibility: next } });
  };

  return (
    <Card className="glass-card shadow-elegant">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-heading">My Values</CardTitle>
              <p className="text-xs text-muted-foreground">
                {isOwnProfile
                  ? "Goals tied to your values get done. Define what you care about."
                  : "What this person cares about."}
              </p>
            </div>
          </div>
          {isOwnProfile && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add value
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && isOwnProfile ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : displayValues.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-lg border border-dashed border-border bg-muted/20">
            <p className="text-sm text-muted-foreground mb-3">
              You haven't defined any values yet. Start with the ones that already feel true to you.
            </p>
            {isOwnProfile && (
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-1" />
                Paste your list
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {displayValues.map((v) => (
              <li
                key={v.id}
                className="group flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card/50 hover:bg-card transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{v.label}</span>
                    {v.feeling && v.feeling !== v.label && (
                      <Badge variant="outline" className="text-xs">{v.feeling}</Badge>
                    )}
                    {isOwnProfile && (
                      <Badge
                        variant="outline"
                        className={
                          v.visibility === "public"
                            ? "text-xs border-green-500/30 text-green-600 bg-green-500/5"
                            : "text-xs"
                        }
                      >
                        {v.visibility === "public" ? "Public" : "Private"}
                      </Badge>
                    )}
                  </div>
                  {v.statement && (
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{v.statement}</p>
                  )}
                </div>
                {isOwnProfile && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleVisibility(v)}
                      title={v.visibility === "public" ? "Make private" : "Make public"}
                    >
                      {v.visibility === "public" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(v);
                        setFormOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete value "${v.label}"? This also removes its links to goals.`)) {
                          remove.mutate(v.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ValueFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={(data) => {
          if (editing) {
            update.mutate({ id: editing.id, patch: data });
          } else {
            create.mutate(data);
          }
        }}
      />
      <ValuesBulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={(vals) => bulkCreate.mutate(vals)}
      />
    </Card>
  );
};
