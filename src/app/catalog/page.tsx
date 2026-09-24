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
import {
  Loader2,
  Settings,
  List,
  Save,
  Server,
  AlertTriangle,
  X,
  Info,
} from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { toast } from "sonner";
import { useAdminSession } from "@/components/layout/admin-session-provider";

interface ModuleItem {
  code: string;
  name: string;
  unit: string;
  credit_cost: number;
  is_active: boolean;
  cost_label: string;
  is_featured: boolean;
  description: string;
  group: string;
  group_label: string;
  unit_label: string;
  free_for_everyone: boolean;
  is_charged: boolean;
  charge_label: string;
}

interface PlanLink {
  id: string;
  name: string;
  status_label: string;
}

interface FeatureItem {
  code: string;
  name: string;
  description: string;
  kind: string;
  kind_label: string;
  display_order: number;
  free_for_everyone: boolean;
  plans: PlanLink[];
  availability_label: string;
}

interface SettingOption {
  value: string;
  label: string;
  description?: string;
}

interface SettingItem {
  key: string;
  label: string;
  description: string;
  group: string;
  group_label: string;
  input: "toggle" | "integer" | "decimal" | "choice" | "multi_choice";
  value: any;
  display_value: string;
  unit?: string | null;
  min?: number | null;
  max?: number | null;
  step?: number | null;
  nullable?: boolean;
  null_label?: string | null;
  options?: SettingOption[];
  warning?: string | null;
  editable?: boolean;
  updated_at?: string | null;
}

interface SettingGroup {
  group: string;
  label: string;
  description: string;
  settings: SettingItem[];
}

function relativeTime(iso?: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function CatalogPage() {
  const { user: currentUser } = useAdminSession();
  const [activeTab, setActiveTab] = useState<
    "modules" | "features" | "settings"
  >("modules");

  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [settingGroups, setSettingGroups] = useState<SettingGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Module Config Modal State
  const [selectedModule, setSelectedModule] = useState<ModuleItem | null>(null);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleCost, setModuleCost] = useState<number | "">(0);
  const [moduleActive, setModuleActive] = useState(true);
  const [moduleLoading, setModuleLoading] = useState(false);

  // Settings editing state: key -> current edited value
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});
  const [settingLoading, setSettingLoading] = useState<string | null>(null);

  // Warning Confirm Dialog State for Settings with `warning`
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningTargetSetting, setWarningTargetSetting] =
    useState<SettingItem | null>(null);
  const [warningReason, setWarningReason] = useState("");
  const [warningSubmitting, setWarningSubmitting] = useState(false);

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

      const loadedMods: ModuleItem[] = mods || [];
      const loadedFeats: FeatureItem[] = feats || [];
      const loadedSets: SettingGroup[] = Array.isArray(sets)
        ? sets
        : [];

      setModules(loadedMods);
      setFeatures(loadedFeats);
      setSettingGroups(loadedSets);

      // Initialize editingValues map
      const initialValues: Record<string, any> = {};
      for (const grp of loadedSets) {
        for (const s of grp.settings) {
          initialValues[s.key] = s.value;
        }
      }
      setEditingValues(initialValues);
    } catch (err) {
      console.error("Failed to fetch catalog data", err);
      toast.error("Failed to load catalog data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── MODULES ──
  const handleOpenModule = (mod: ModuleItem) => {
    setSelectedModule(mod);
    setModuleCost(mod.credit_cost);
    setModuleActive(mod.is_active);
    setShowModuleModal(true);
  };

  const handleSaveModule = async () => {
    if (!selectedModule) return;
    const cost = Number(moduleCost);
    if (isNaN(cost) || cost < 0) {
      toast.error("Credit cost must be a non-negative number");
      return;
    }

    setModuleLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      const updated = await admin.patchModule(
        selectedModule.code,
        {
          credit_cost: cost,
          is_active: moduleActive,
        },
        token,
      );

      // Update in local state
      setModules((prev) =>
        prev.map((m) => (m.code === selectedModule.code ? updated : m)),
      );
      setShowModuleModal(false);
      toast.success("Module updated successfully");
    } catch (err: any) {
      console.error("Failed to update module", err);
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Error updating module");
    } finally {
      setModuleLoading(false);
    }
  };

  // ── SETTINGS ──
  const isValueUnchanged = (setting: SettingItem): boolean => {
    const current = editingValues[setting.key];
    const original = setting.value;

    if (current === original) return true;
    if (current === null && original === null) return true;
    if (Array.isArray(current) && Array.isArray(original)) {
      if (current.length !== original.length) return false;
      const s1 = [...current].sort();
      const s2 = [...original].sort();
      return s1.every((val, i) => val === s2[i]);
    }
    return false;
  };

  const commitSettingSave = async (
    setting: SettingItem,
    valueToSave: any,
    reason?: string,
  ) => {
    setSettingLoading(setting.key);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;

      const payload: { value: any; reason?: string } = {
        value: valueToSave,
      };
      if (reason && reason.trim().length >= 3) {
        payload.reason = reason.trim();
      }

      const updatedSetting: SettingItem = await admin.patchSetting(
        setting.key,
        payload,
        token,
      );

      // Replace updated setting in settingGroups
      setSettingGroups((prev) =>
        prev.map((grp) => ({
          ...grp,
          settings: grp.settings.map((s) =>
            s.key === setting.key ? updatedSetting : s,
          ),
        })),
      );
      setEditingValues((prev) => ({
        ...prev,
        [setting.key]: updatedSetting.value,
      }));

      toast.success("Setting saved successfully");
      return true;
    } catch (err: any) {
      console.error("Failed to save setting", err);
      const detail = err.response?.data?.detail;
      toast.error(
        typeof detail === "string" ? detail : "Failed to save setting",
      );
      return false;
    } finally {
      setSettingLoading(null);
    }
  };

  const handleTriggerSaveSetting = async (setting: SettingItem) => {
    const currentVal = editingValues[setting.key];

    // Format value according to input type
    let preparedVal: any = currentVal;
    if (setting.input === "integer") {
      preparedVal = currentVal === null ? null : parseInt(currentVal, 10);
    } else if (setting.input === "decimal") {
      preparedVal = currentVal === null ? null : parseFloat(currentVal);
    } else if (setting.input === "toggle") {
      preparedVal = Boolean(currentVal);
    } else if (setting.input === "multi_choice") {
      preparedVal = Array.isArray(currentVal) ? currentVal : [];
    }

    // Check if setting has a warning
    if (setting.warning) {
      setWarningTargetSetting(setting);
      setWarningReason("");
      setWarningModalOpen(true);
      return;
    }

    await commitSettingSave(setting, preparedVal);
  };

  const handleWarningConfirm = async () => {
    if (!warningTargetSetting) return;
    setWarningSubmitting(true);
    const currentVal = editingValues[warningTargetSetting.key];
    let preparedVal: any = currentVal;
    if (warningTargetSetting.input === "integer") {
      preparedVal = currentVal === null ? null : parseInt(currentVal, 10);
    } else if (warningTargetSetting.input === "decimal") {
      preparedVal = currentVal === null ? null : parseFloat(currentVal);
    } else if (warningTargetSetting.input === "toggle") {
      preparedVal = Boolean(currentVal);
    } else if (warningTargetSetting.input === "multi_choice") {
      preparedVal = Array.isArray(currentVal) ? currentVal : [];
    }

    const success = await commitSettingSave(
      warningTargetSetting,
      preparedVal,
      warningReason,
    );
    setWarningSubmitting(false);
    if (success) {
      setWarningModalOpen(false);
      setWarningTargetSetting(null);
    }
  };

  // Group modules by group_label while preserving order
  const moduleGroups = modules.reduce<
    { group_label: string; items: ModuleItem[] }[]
  >((acc, mod) => {
    const groupLabel = mod.group_label || "Other Modules";
    let existing = acc.find((g) => g.group_label === groupLabel);
    if (!existing) {
      existing = { group_label: groupLabel, items: [] };
      acc.push(existing);
    }
    existing.items.push(mod);
    return acc;
  }, []);

  // Features columns (read-only)
  const featureColumns: Column<FeatureItem>[] = [
    {
      key: "feature",
      header: "Feature",
      render: (feat) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-foreground text-sm">
            {feat.name}
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            {feat.description}
          </div>
        </div>
      ),
    },
    {
      key: "where_users_get_it",
      header: "Where Users Get It",
      render: (feat) => (
        <span className="text-sm font-medium text-foreground">
          {feat.availability_label || "—"}
        </span>
      ),
    },
    {
      key: "plans",
      header: "Plans",
      render: (feat) => {
        if (!feat.plans || feat.plans.length === 0) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1.5">
            {feat.plans.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs font-medium border border-border"
              >
                <span className="text-foreground">{p.name}</span>
                <span className="text-[10px] text-muted-foreground uppercase">
                  ({p.status_label})
                </span>
              </span>
            ))}
          </div>
        );
      },
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

        {/* Tab Navigation */}
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
          <div className="pt-2">
            {/* ── TAB 1: MODULES ── */}
            {activeTab === "modules" && (
              <div className="space-y-8">
                {moduleGroups.map((grp) => (
                  <div key={grp.group_label} className="space-y-4">
                    <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border pb-2">
                      {grp.group_label}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {grp.items.map((mod) => (
                        <Card
                          key={mod.code}
                          className="flex flex-col justify-between hover:border-primary/40 transition-all shadow-sm"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-lg font-bold">
                                {mod.name}
                              </CardTitle>
                              {mod.free_for_everyone ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 shrink-0 border border-blue-500/20">
                                  Free for everyone
                                </span>
                              ) : !mod.is_active ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground shrink-0 border border-border">
                                  Not charged
                                </span>
                              ) : null}
                            </div>
                            <CardDescription className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                              {mod.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0 space-y-4">
                            <div>
                              <div className="text-xl font-black text-foreground">
                                {mod.charge_label || mod.cost_label}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full gap-2 text-xs"
                              onClick={() => handleOpenModule(mod)}
                            >
                              <Settings className="w-3.5 h-3.5" /> Configure
                              Module
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}

                {modules.length === 0 && (
                  <div className="text-center py-12 border border-dashed border-border rounded-lg text-muted-foreground text-sm">
                    No modules found.
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: FEATURES ── */}
            {activeTab === "features" && (
              <div className="space-y-4">
                <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground leading-relaxed">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    Features are switched on per plan in{" "}
                    <strong className="text-foreground">Plans → Edit</strong>, and
                    made free for everyone in{" "}
                    <strong className="text-foreground">Global settings</strong>.
                  </span>
                </div>

                <DataTable
                  columns={featureColumns}
                  data={features}
                  isLoading={loading}
                  keyExtractor={(feat) => feat.code}
                  emptyMessage="No features available."
                />
              </div>
            )}

            {/* ── TAB 3: GLOBAL SETTINGS ── */}
            {activeTab === "settings" && (
              <div className="space-y-8">
                {settingGroups.map((grp) => (
                  <Card
                    key={grp.group}
                    className="w-full shadow-sm border-border overflow-hidden"
                  >
                    <CardHeader className="border-b border-border bg-muted/15 pb-4">
                      <CardTitle className="text-lg font-bold">
                        {grp.label}
                      </CardTitle>
                      {grp.description && (
                        <CardDescription className="text-xs">
                          {grp.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {grp.settings.map((setting) => {
                          const isEditable =
                            setting.editable !== false &&
                            currentUser?.role === "superadmin";
                          const currentVal = editingValues[setting.key];
                          const unchanged = isValueUnchanged(setting);
                          const isSaving = settingLoading === setting.key;

                          return (
                            <div
                              key={setting.key}
                              className="flex flex-col lg:flex-row lg:items-center justify-between p-4 sm:p-6 hover:bg-muted/5 transition-colors gap-4"
                            >
                              {/* Left Info Column */}
                              <div className="flex-1 min-w-0 pr-2">
                                <label className="text-sm font-semibold text-foreground block">
                                  {setting.label}
                                </label>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                  {setting.description}
                                </p>
                                {setting.updated_at && (
                                  <span className="text-[11px] text-muted-foreground/70 mt-1.5 block">
                                    Last changed {relativeTime(setting.updated_at)}
                                  </span>
                                )}
                              </div>

                              {/* Right Control Column */}
                              <div className="flex items-center gap-3 w-full lg:w-[420px] shrink-0 justify-end">
                                {!isEditable ? (
                                  <div className="flex-1 text-right">
                                    <span className="inline-block px-3 py-1.5 rounded-md bg-muted/50 border border-border text-xs font-semibold text-foreground">
                                      {setting.display_value || "—"}
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    {/* TOGGLE */}
                                    {setting.input === "toggle" && (
                                      <div className="flex-1 flex items-center justify-end gap-2">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={Boolean(currentVal)}
                                            onChange={(e) =>
                                              setEditingValues({
                                                ...editingValues,
                                                [setting.key]: e.target.checked,
                                              })
                                            }
                                            className="sr-only peer"
                                          />
                                          <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                        <span className="text-xs font-medium text-muted-foreground min-w-[36px]">
                                          {currentVal ? "On" : "Off"}
                                        </span>
                                      </div>
                                    )}

                                    {/* INTEGER / DECIMAL */}
                                    {(setting.input === "integer" ||
                                      setting.input === "decimal") && (
                                      <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="number"
                                            min={setting.min ?? undefined}
                                            max={setting.max ?? undefined}
                                            step={
                                              setting.step ??
                                              (setting.input === "decimal"
                                                ? "0.001"
                                                : "1")
                                            }
                                            value={
                                              currentVal === null
                                                ? ""
                                                : currentVal
                                            }
                                            disabled={currentVal === null}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setEditingValues({
                                                ...editingValues,
                                                [setting.key]:
                                                  val === ""
                                                    ? ""
                                                    : setting.input === "decimal"
                                                      ? parseFloat(val)
                                                      : parseInt(val, 10),
                                              });
                                            }}
                                            className="flex-1 px-3 py-1.5 bg-background border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed"
                                          />
                                          {setting.unit && (
                                            <span className="text-xs text-muted-foreground font-medium shrink-0">
                                              {setting.unit}
                                            </span>
                                          )}
                                        </div>
                                        {setting.nullable && (
                                          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                                            <input
                                              type="checkbox"
                                              checked={currentVal === null}
                                              onChange={(e) => {
                                                setEditingValues({
                                                  ...editingValues,
                                                  [setting.key]: e.target.checked
                                                    ? null
                                                    : setting.min ?? 0,
                                                });
                                              }}
                                              className="w-4 h-4 rounded border-border"
                                            />
                                            <span>
                                              {setting.null_label ||
                                                "Never expires"}
                                            </span>
                                          </label>
                                        )}
                                      </div>
                                    )}

                                    {/* CHOICE */}
                                    {setting.input === "choice" && (
                                      <div className="flex-1">
                                        <select
                                          value={String(currentVal ?? "")}
                                          onChange={(e) =>
                                            setEditingValues({
                                              ...editingValues,
                                              [setting.key]: e.target.value,
                                            })
                                          }
                                          className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                        >
                                          {(setting.options || []).map(
                                            (opt) => (
                                              <option
                                                key={opt.value}
                                                value={opt.value}
                                              >
                                                {opt.label}
                                              </option>
                                            ),
                                          )}
                                        </select>
                                      </div>
                                    )}

                                    {/* MULTI_CHOICE */}
                                    {setting.input === "multi_choice" && (
                                      <div className="flex-1 space-y-2 max-h-48 overflow-y-auto pr-1 border border-border rounded-md p-2 bg-muted/10">
                                        {(setting.options || []).map(
                                          (opt) => {
                                            const selectedList: string[] =
                                              Array.isArray(currentVal)
                                                ? currentVal
                                                : [];
                                            const isChecked =
                                              selectedList.includes(opt.value);

                                            return (
                                              <label
                                                key={opt.value}
                                                className="flex items-start gap-2.5 p-1.5 rounded hover:bg-muted/40 cursor-pointer transition-colors"
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={(e) => {
                                                    const nextList =
                                                      e.target.checked
                                                        ? [
                                                            ...selectedList,
                                                            opt.value,
                                                          ]
                                                        : selectedList.filter(
                                                            (v) =>
                                                              v !== opt.value,
                                                          );
                                                    setEditingValues({
                                                      ...editingValues,
                                                      [setting.key]: nextList,
                                                    });
                                                  }}
                                                  className="w-4 h-4 rounded border-border mt-0.5"
                                                />
                                                <div className="min-w-0">
                                                  <div className="text-xs font-semibold text-foreground">
                                                    {opt.label}
                                                  </div>
                                                  {opt.description && (
                                                    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                                                      {opt.description}
                                                    </div>
                                                  )}
                                                </div>
                                              </label>
                                            );
                                          },
                                        )}
                                      </div>
                                    )}

                                    {/* Save Button */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleTriggerSaveSetting(setting)
                                      }
                                      disabled={unchanged || isSaving}
                                      className="shrink-0 h-9 px-3 gap-1.5"
                                      title={
                                        unchanged ? "No changes" : "Save setting"
                                      }
                                    >
                                      {isSaving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Save className="w-4 h-4" />
                                      )}
                                      <span className="hidden sm:inline">
                                        Save
                                      </span>
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {settingGroups.length === 0 && (
                  <div className="text-center py-12 border border-dashed border-border rounded-lg text-muted-foreground text-sm">
                    No global settings found.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CONFIGURE MODULE MODAL ── */}
      {showModuleModal && selectedModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-lg p-6 rounded-lg shadow-lg border border-border relative">
            <button
              onClick={() => {
                if (!moduleLoading) setShowModuleModal(false);
              }}
              disabled={moduleLoading}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-1">
              Configure {selectedModule.name}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Update the credit cost and charging state.
            </p>

            {selectedModule.free_for_everyone && (
              <div className="mb-4 p-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  This tool is on the always-free list in Global settings, so
                  users are not charged whatever you set here.
                </span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Credit Cost
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={moduleCost}
                    disabled={moduleLoading}
                    onChange={(e) =>
                      setModuleCost(
                        e.target.value === ""
                          ? ""
                          : parseInt(e.target.value, 10) || 0,
                      )
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {selectedModule.unit_label ||
                      (selectedModule.unit === "per_minute"
                        ? "credits per minute"
                        : "credits per use")}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={moduleActive}
                    disabled={moduleLoading}
                    onChange={(e) => setModuleActive(e.target.checked)}
                    className="w-4 h-4 rounded border-border mt-0.5"
                    id="module-charge"
                  />
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Charge for this
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      When off, the tool keeps working but costs users nothing.
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  disabled={moduleLoading}
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

      {/* ── SETTING WARNING CONFIRM MODAL ── */}
      {warningModalOpen && warningTargetSetting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-lg shadow-lg border border-border relative">
            <button
              onClick={() => {
                if (!warningSubmitting) setWarningModalOpen(false);
              }}
              disabled={warningSubmitting}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3 text-amber-500">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="text-lg font-bold text-foreground">
                Confirm {warningTargetSetting.label}
              </h2>
            </div>

            <div className="p-3.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 leading-relaxed mb-4">
              {warningTargetSetting.warning}
            </div>

            <div className="space-y-1.5 mb-6">
              <label className="block text-xs font-semibold text-foreground">
                Reason for change{" "}
                <span className="text-muted-foreground font-normal">
                  (optional, for audit log)
                </span>
              </label>
              <textarea
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                maxLength={500}
                rows={3}
                disabled={warningSubmitting}
                placeholder="e.g. Setting updated as part of pricing adjustment"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={warningSubmitting}
                onClick={() => setWarningModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleWarningConfirm}
                disabled={warningSubmitting}
              >
                {warningSubmitting && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Confirm &amp; Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
