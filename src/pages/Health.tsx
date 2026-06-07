import { useState } from "react";
import { Stethoscope } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BodyTab } from "@/components/health/BodyTab";
import { LabsTab } from "@/components/health/LabsTab";
import { SupplementsTab } from "@/components/health/SupplementsTab";

export default function Health() {
  const [tab, setTab] = useState("body");

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-center gap-2">
        <Stethoscope className="h-6 w-6 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Health</h1>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="labs">Labs</TabsTrigger>
          <TabsTrigger value="supplements">Supplements</TabsTrigger>
        </TabsList>

        <TabsContent value="body" className="space-y-5 mt-0">
          <BodyTab />
        </TabsContent>
        <TabsContent value="labs" className="mt-0">
          <LabsTab />
        </TabsContent>
        <TabsContent value="supplements" className="mt-0">
          <SupplementsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
