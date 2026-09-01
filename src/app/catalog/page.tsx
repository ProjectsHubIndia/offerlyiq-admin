"use client";

import { useEffect, useState } from "react";
import { admin } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, List, Save, Server } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { toast } from "sonner";

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState<
    "modules" | "features" | "settings"
  >("modules");
  const [modules, setModules] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Module Config Modal State
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleCost, setModuleCost] = useState(0);
  const [moduleActive, setModuleActive] = useState(true);
  const [moduleLoading, setModuleLoading] = useState(false);

  // Settings inline state
  const [editingSettings, setEditingSettings] = useState<
    Record<string, string>
  >({});
  const [settingLoading, setSettingLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;

      const [mods, feats, sets] = await Promise.all([
        admin.getModules(token),
        admin.getFeatures(token),
        admin.getSettings(token),
      ]);

      setModules(mods || []);
      setFeatures(feats || []);
      setSettings(sets || {});
    } catch (err) {
      console.error("Failed to fetch catalog data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModule = (mod: any) => {
    setSelectedModule(mod);
    setModuleCost(mod.credit_cost);
    setModuleActive(mod.is_active);
    setShowModuleModal(true);
  };

  const handleSaveModule = async () => {
    if (!selectedModule) return;
    setModuleLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      await admin.patchModule(
        selectedModule.code,
        {
          credit_cost: moduleCost,
          is_active: moduleActive,
        },
        token,
      );
      setShowModuleModal(false);
      toast.success("Module updated successfully");
      fetchData();
    } catch (err) {
      console.error("Failed to update module", err);
      toast.error("Error updating module");
    } finally {
      setModuleLoading(false);
    }
  };

  const handleSaveSetting = async (key: string) => {
    const value =
      editingSettings[key] !== undefined ? editingSettings[key] : settings[key];
    setSettingLoading(key);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      await admin.patchSetting(key, { value }, token);
      toast.success("Setting saved successfully");
      fetchData();
    } catch (err) {
      console.error("Failed to save setting", err);
      toast.error("Error saving setting");
    } finally {
      setSettingLoading(null);
    }
  };

  const featureColumns: Column<any>[] = [
    {
      key: "code",
      header: "Code",
      render: (feat) => <span className="font-mono text-xs">{feat.code}</span>,
    },
    {
      key: "name",
      header: "Name",
      render: (feat) => <span className="font-medium">{feat.name}</span>,
    },
    {
      key: "kind",
      header: "Kind",
      render: (feat) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
          {feat.kind}
        </span>
      ),
    },
    {
      key: "display_order",
      header: "Display Order",
      render: (feat) => (
        <span className="text-muted-foreground">{feat.display_order}</span>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            Catalog & Settings
          </h1>
          <p className="text-muted-foreground">
            Manage platform modules, features, and global configurations.
          </p>
        </div>

        <div className="flex border-b border-border">
          <button
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "modules"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
            onClick={() => setActiveTab("modules")}
          >
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4" /> Modules
            </div>
          </button>
          <button
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "features"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
            onClick={() => setActiveTab("features")}
          >
            <div className="flex items-center gap-2">
              <List className="w-4 h-4" /> Features
            </div>
          </button>
          <button
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "settings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
            onClick={() => setActiveTab("settings")}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> Global Settings
            </div>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading catalog data...</p>
          </div>
        ) : (
          <div className="pt-4">
            {activeTab === "modules" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((mod) => (
                  <Card key={mod.code}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        {mod.name}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                            mod.is_active
                              ? "bg-green-500/10 text-green-500"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {mod.is_active ? "Active" : "Inactive"}
                        </span>
                      </CardTitle>
                      <CardDescription className="uppercase tracking-wider text-xs">
                        {mod.unit === "per_action"
                          ? "Per Action"
                          : mod.unit === "per_minute"
                            ? "Per Minute"
                            : mod.unit}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Credit Cost
                          </label>
                          <div className="text-2xl font-bold mt-1">
                            {mod.credit_cost}{" "}
                            <span className="text-sm font-normal text-muted-foreground">
                              credits
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => handleOpenModule(mod)}
                        >
                          <Settings className="w-4 h-4" /> Configure Module
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === "features" && (
              <div className="pt-2">
                <DataTable
                  columns={featureColumns}
                  data={features}
                  isLoading={loading}
                  keyExtractor={(feat) => feat.code}
                  emptyMessage="No features available."
                />
              </div>
            )}

            {activeTab === "settings" && (
              <Card className="w-full shadow-sm border-border">
                <CardHeader className="border-b border-border/50 pb-4 bg-muted/10">
                  <CardTitle className="text-lg">
                    Platform Configuration
                  </CardTitle>
                  <CardDescription>
                    System-wide settings and variables
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {Object.entries(settings).map(([key, value]) => {
                      const originalType = typeof value;
                      const editingValue =
                        editingSettings[key] !== undefined
                          ? editingSettings[key]
                          : value;

                      return (
                        <div
                          key={key}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 hover:bg-muted/5 transition-colors"
                        >
                          <div className="mb-4 sm:mb-0 sm:mr-6 flex-1">
                            <label className="text-base font-medium text-foreground capitalize">
                              {key.replace(/_/g, " ")}
                            </label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Set the global {key.replace(/_/g, " ")}{" "}
                              configuration.
                            </p>
                          </div>
                          <div className="flex gap-3 items-center w-full sm:w-[350px]">
                            {originalType === "boolean" ? (
                              <div className="flex-1">
                                <input
                                  type="checkbox"
                                  checked={Boolean(editingValue)}
                                  onChange={(e) =>
                                    setEditingSettings({
                                      ...editingSettings,
                                      [key]: e.target.checked as any,
                                    })
                                  }
                                  className="w-5 h-5 rounded border-border"
                                />
                              </div>
                            ) : originalType === "number" ? (
                              <input
                                type="number"
                                value={String(editingValue)}
                                onChange={(e) =>
                                  setEditingSettings({
                                    ...editingSettings,
                                    [key]: parseFloat(e.target.value) as any,
                                  })
                                }
                                className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            ) : (
                              <input
                                type="text"
                                value={String(editingValue)}
                                onChange={(e) =>
                                  setEditingSettings({
                                    ...editingSettings,
                                    [key]: e.target.value,
                                  })
                                }
                                className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleSaveSetting(key)}
                              disabled={settingLoading === key}
                            >
                              {settingLoading === key ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(settings).length === 0 && (
                      <div className="p-6">
                        <p className="text-muted-foreground text-sm">
                          No global settings found.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Configure Module Modal */}
      {showModuleModal && selectedModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-lg p-6 rounded-lg shadow-lg border border-border relative">
            <h2 className="text-xl font-bold mb-1">
              Configure {selectedModule.name}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Update the credit cost and status.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Credit Cost
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={moduleCost}
                    onChange={(e) =>
                      setModuleCost(parseInt(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-muted-foreground text-sm">
                    credits /{" "}
                    {selectedModule.unit === "per_action" ? "action" : "minute"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  checked={moduleActive}
                  onChange={(e) => setModuleActive(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                  id="module-active"
                />
                <label htmlFor="module-active" className="text-sm font-medium">
                  Module is Active (Enabled)
                </label>
              </div>
              <div className="flex justify-end gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setShowModuleModal(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveModule} disabled={moduleLoading}>
                  {moduleLoading && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
