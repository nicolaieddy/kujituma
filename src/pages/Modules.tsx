import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MODULE_REGISTRY } from "@/modules/registry";
import type { ModuleDefinition, ModuleId } from "@/modules/types";
import {
  useInstalledModules,
  useInstallModule,
  useUninstallModule,
} from "@/hooks/useInstalledModules";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const tierLabel = (m: ModuleDefinition) => {
  if (m.status === "coming_soon") return "Coming soon";
  if (m.status === "beta") return "Beta";
  return m.tier === "pro" ? "Pro" : "Free";
};

export default function Modules() {
  const [params] = useSearchParams();
  const highlight = params.get("highlight") as ModuleId | null;
  const { data: installed, isLoading } = useInstalledModules();
  const install = useInstallModule();
  const uninstall = useUninstallModule();
  const [detail, setDetail] = useState<ModuleDefinition | null>(null);
  const [pendingUninstall, setPendingUninstall] = useState<ModuleDefinition | null>(null);

  const handleInstall = async (m: ModuleDefinition) => {
    try {
      await install.mutateAsync(m.id);
      toast.success(`${m.name} installed`);
      setDetail(null);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to install");
    }
  };

  const handleUninstall = async (m: ModuleDefinition) => {
    try {
      await uninstall.mutateAsync(m.id);
      toast.success(`${m.name} uninstalled — your data is kept`);
      setPendingUninstall(null);
      setDetail(null);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to uninstall");
    }
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Modules</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Extend your tracker with optional modules. Install only what you need —
          your core experience (Goals, Habits, Daily Check-in, Weekly Planning)
          is always on.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULE_REGISTRY.map((m) => {
          const isInstalled = installed?.has(m.id) ?? false;
          const isHighlighted = highlight === m.id;
          return (
            <Card
              key={m.id}
              className={`flex flex-col transition-shadow hover:shadow-md cursor-pointer ${
                isHighlighted ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setDetail(m)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-4xl">{m.coverEmoji}</div>
                  <Badge variant={isInstalled ? "default" : "secondary"}>
                    {isInstalled ? "Installed" : tierLabel(m)}
                  </Badge>
                </div>
                <CardTitle className="mt-3">{m.name}</CardTitle>
                <CardDescription>{m.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button
                  size="sm"
                  variant={isInstalled ? "outline" : "default"}
                  disabled={isLoading || install.isPending || uninstall.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isInstalled) setPendingUninstall(m);
                    else handleInstall(m);
                  }}
                  className="w-full"
                >
                  {isInstalled ? (
                    <>
                      <Check className="h-4 w-4 mr-2" /> Installed
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" /> Install
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <div className="text-5xl mb-2">{detail.coverEmoji}</div>
                <DialogTitle className="flex items-center gap-2">
                  {detail.name}
                  <Badge variant="secondary">{tierLabel(detail)}</Badge>
                </DialogTitle>
                <DialogDescription>{detail.tagline}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <p className="text-muted-foreground">{detail.description}</p>
                <SurfaceList title="What this adds" items={[
                  ...(detail.surfaces.thisWeekCards ?? []),
                  ...(detail.surfaces.profileSections ?? []),
                  ...(detail.surfaces.navItems?.map((n) => `${n.label} navigation`) ?? []),
                ]} />
                {detail.surfaces.integrations && detail.surfaces.integrations.length > 0 && (
                  <SurfaceList title="Integrations" items={detail.surfaces.integrations} />
                )}
                <div>
                  <div className="font-medium mb-1">Data stored</div>
                  <p className="text-muted-foreground text-xs">
                    {detail.dataTables.length} table{detail.dataTables.length === 1 ? "" : "s"}.
                    Uninstalling keeps your data; you can re-install anytime to restore it.
                  </p>
                </div>
              </div>
              <DialogFooter>
                {installed?.has(detail.id) ? (
                  <Button
                    variant="outline"
                    onClick={() => setPendingUninstall(detail)}
                    disabled={uninstall.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Uninstall
                  </Button>
                ) : (
                  <Button onClick={() => handleInstall(detail)} disabled={install.isPending}>
                    <Plus className="h-4 w-4 mr-2" /> Install module
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Uninstall confirmation */}
      <Dialog open={!!pendingUninstall} onOpenChange={(o) => !o && setPendingUninstall(null)}>
        <DialogContent>
          {pendingUninstall && (
            <>
              <DialogHeader>
                <DialogTitle>Uninstall {pendingUninstall.name}?</DialogTitle>
                <DialogDescription>
                  The module's UI will be hidden across the app. Your existing data
                  is <strong>kept</strong> — re-installing later restores everything.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPendingUninstall(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleUninstall(pendingUninstall)}
                  disabled={uninstall.isPending}
                >
                  Uninstall
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SurfaceList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="font-medium mb-1">{title}</div>
      <ul className="space-y-1 text-muted-foreground">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2">
            <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
