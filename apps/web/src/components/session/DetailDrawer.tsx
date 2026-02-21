"use client";

import { PanelRight } from "lucide-react";

import type { SessionArtifacts } from "@/lib/contracts";

import { Button } from "@/components/ui/Button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/Sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { DisagreementMapPanel } from "@/components/map/DisagreementMapPanel";
import { TracePanel } from "@/components/trace/TracePanel";
import { EpistemicContractPanel } from "@/components/contract/EpistemicContractPanel";

export function DetailDrawer({ session }: { session: SessionArtifacts }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <PanelRight className="h-4 w-4" />
          <span className="hidden sm:inline">Details</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <Tabs defaultValue="map">
          <TabsList>
            <TabsTrigger value="map">Map</TabsTrigger>
            <TabsTrigger value="trace">Trace</TabsTrigger>
            <TabsTrigger value="contract">Contract</TabsTrigger>
          </TabsList>
          <TabsContent value="map" className="mt-4">
            <DisagreementMapPanel session={session} />
          </TabsContent>
          <TabsContent value="trace" className="mt-4">
            <TracePanel session={session} />
          </TabsContent>
          <TabsContent value="contract" className="mt-4">
            <EpistemicContractPanel session={session} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
