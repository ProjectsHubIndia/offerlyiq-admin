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
  Plus,
  Edit2,
  Globe,
  EyeOff,
  Package,
  DollarSign,
  ListChecks,
  X,
  Settings,
  Sparkles,
  ChevronUp,
  ChevronDown,
  History,
} from "lucide-react";
import { ConfirmAction } from "@/components/ConfirmAction";
import { toast } from "sonner";

const SUPPORTED_CURRENCIES = [
  "AED","AUD","BRL","CAD","CHF","CZK","DKK","EUR","GBP","HKD",
  "HUF","IDR","ILS","INR","JPY","KRW","KWD","MXN","MYR","NOK",
  "NZD","PHP","PLN","RON","SAR","SEK","SGD","THB","TWD","USD","ZAR",
];

const CURRENCY_EXPONENTS: Record<string, number> = {
  JPY: 0, KRW: 0, TWD: 0, KWD: 3,
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", AUD: "A$", CAD: "C$", NZD: "NZ$",
  SGD: "S$", INR: "₹", JPY: "¥", KRW: "₩", BRL: "R$", MXN: "MX$",
  CHF: "Fr", SEK: "kr", NOK: "kr", DKK: "kr", PLN: "zł", CZK: "Kč",
  HUF: "Ft", RON: "lei", PHP: "₱", TWD: "NT$", THB: "฿", IDR: "Rp",
  MYR: "RM", HKD: "HK$", SAR: "﷼", AED: "د.إ", ZAR: "R", ILS: "₪", KWD: "د.ك",
};

const EUROZONE_COUNTRIES = [
  "AT","BE","CY","DE","EE","ES","FI","FR","GR","HR",
  "IE","IT","LT","LU","LV","MT","NL","PT","SI","SK",
];

function getCurrencyExponent(code: string): number {
  return CURRENCY_EXPONENTS[code] ?? 2;
}

function toMajor(minor: number, code: string): number {
  return minor / Math.pow(10, getCurrencyExponent(code));
}

function toMinor(major: number, code: string): number {
  return Math.round(major * Math.pow(10, getCurrencyExponent(code)));
}

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const [showPricesModal, setShowPricesModal] = useState(false);
  const [planPrices, setPlanPrices] = useState<any[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesPublishFailed, setPricesPublishFailed] = useState(false);

  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [planFeatures, setPlanFeatures] = useState<any[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [availableFeatures, setAvailableFeatures] = useState<any[]>([]);

  const [showHighlightsModal, setShowHighlightsModal] = useState(false);
  const [planHighlights, setPlanHighlights] = useState<any[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [highlightsCustomized, setHighlightsCustomized] = useState(false);
  const [billingCosts, setBillingCosts] = useState<any[]>([]);

  // Create Plan Modal
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [createPlanData, setCreatePlanData] = useState({
    code: "",
    name: "",
    description: "",
    billing_type: "one_time",
    credits_granted: 0,
    credit_validity_days: 30,
    badge: "",
    display_order: 0,
    is_public: true,
  });
  const [createPlanLoading, setCreatePlanLoading] = useState(false);

  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [editPlanData, setEditPlanData] = useState<any>({});
  const [editPlanLoading, setEditPlanLoading] = useState(false);

  // ConfirmAction state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    consequence: string;
    isDanger: boolean;
    action: (reason: string) => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    consequence: "",
    isDanger: false,
    action: async () => {},
  });

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      const response = await admin.getPlans(token);
      setPlans(response || []);
    } catch (err) {
      console.error("Failed to fetch plans", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatures = async () => {
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      const response = await admin.getFeatures(token);
      setAvailableFeatures(response || []);
    } catch (err) {
      console.error("Failed to fetch features", err);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchFeatures();
  }, []);

  const handleTogglePublish = (plan: any) => {
    const isPublished = plan.status === "published";
    if (isPublished) {
      setConfirmState({
        isOpen: true,
        title: `Unpublish ${plan.name}?`,
        consequence:
          "New users will not be able to purchase this plan. Existing subscriptions continue.",
        isDanger: true,
        action: async (reason: string) => {
          const { getAccessToken } = await import("@/lib/auth");
          const token = getAccessToken() || undefined;
          await admin.unpublishPlan(plan.id, token);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          fetchPlans();
        },
      });
    } else {
      setConfirmState({
        isOpen: true,
        title: `Publish ${plan.name}?`,
        consequence: "This plan will become visible for users to purchase.",
        isDanger: false,
        action: async (reason: string) => {
          const { getAccessToken } = await import("@/lib/auth");
          const token = getAccessToken() || undefined;
          await admin.publishPlan(plan.id, token);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          fetchPlans();
        },
      });
    }
  };

  const handleArchive = (plan: any) => {
    setConfirmState({
      isOpen: true,
      title: `Archive ${plan.name}?`,
      consequence:
        "Archived plans are completely hidden from all API lists and cannot be unarchived. Are you sure?",
      isDanger: true,
      action: async (reason: string) => {
        const { getAccessToken } = await import("@/lib/auth");
        const token = getAccessToken() || undefined;
        await admin.archivePlan(plan.id, token);
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        fetchPlans();
      },
    });
  };

  const handleOpenPrices = (plan: any) => {
    setSelectedPlan(plan);
    setPricesPublishFailed(false);
    setPlanPrices(
      (plan.prices ? [...plan.prices] : []).map((p: any) => ({
        ...p,
        _major: String(toMajor(p.amount_minor ?? 0, p.currency_code)),
        _country_input: "",
      }))
    );
    setShowPricesModal(true);
  };

  const handleSavePrices = async () => {
    if (!selectedPlan) return;

    // Client-side validation (mirrors server rules)
    const usedCurrencies: string[] = [];
    const usedCountries: Record<string, string> = {};
    for (const p of planPrices) {
      if (!p.currency_code) {
        toast.error("Every row needs a currency"); return;
      }
      if (usedCurrencies.includes(p.currency_code)) {
        toast.error(`Duplicate currency: ${p.currency_code}`); return;
      }
      usedCurrencies.push(p.currency_code);

      if (p.currency_code === "USD" && (p.country_codes || []).length > 0) {
        toast.error("The base currency applies to every country without an override, so it cannot list countries of its own"); return;
      }

      for (const cc of (p.country_codes || [])) {
        if (usedCountries[cc]) {
          toast.error(`Country ${cc} is claimed by both ${usedCountries[cc]} and ${p.currency_code}`); return;
        }
        usedCountries[cc] = p.currency_code;
      }
    }
    if (!usedCurrencies.includes("USD")) {
      toast.error("The base currency (USD) must have a price"); return;
    }

    // Convert major → minor for each row
    const payload = planPrices.map((p) => ({
      currency_code: p.currency_code,
      amount_minor: toMinor(parseFloat(p._major) || 0, p.currency_code),
      country_codes: p.country_codes || [],
      ...(p.compare_at_amount_minor != null ? { compare_at_amount_minor: p.compare_at_amount_minor } : {}),
    }));

    setPricesLoading(true);
    setPricesPublishFailed(false);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;

      // Step 1: Unpublish if currently live (PUT requires draft status)
      if (selectedPlan.status === "published") {
        await admin.unpublishPlan(selectedPlan.id, token);
      }

      // Step 2: Replace the whole price matrix
      await admin.updatePlanPrices(selectedPlan.id, payload, token);

      // Step 3: Re-publish (skip for archived plans)
      if (selectedPlan.status !== "archived") {
        try {
          await admin.publishPlan(selectedPlan.id, token);
          setShowPricesModal(false);
          fetchPlans();
          toast.success("Prices saved and plan published");
        } catch (publishErr: any) {
          // Prices are saved but plan is now draft — show a loud warning.
          // Also update selectedPlan.status so a retry skips the unpublish step.
          setPricesPublishFailed(true);
          setSelectedPlan((prev: any) => ({ ...prev, status: "draft" }));
          fetchPlans();
          const detail = (publishErr as any)?.response?.data?.detail || "Unknown publish error";
          toast.error(`Prices saved but publish failed — plan is now DRAFT. ${detail}`);
        }
      } else {
        setShowPricesModal(false);
        fetchPlans();
        toast.success("Prices saved");
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Failed to update prices";
      toast.error(detail);
    } finally {
      setPricesLoading(false);
    }
  };

  const handleOpenFeatures = (plan: any) => {
    setSelectedPlan(plan);
    setPlanFeatures(plan.features ? [...plan.features] : []);
    setShowFeaturesModal(true);
  };

  const handleSaveFeatures = async () => {
    if (!selectedPlan) return;
    setFeaturesLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      await admin.updatePlanFeatures(selectedPlan.id, planFeatures, token);
      setShowFeaturesModal(false);
      fetchPlans();
    } catch (err) {
      console.error("Failed to update features", err);
      toast.error("Failed to update features");
    } finally {
      setFeaturesLoading(false);
    }
  };

  const fetchBillingCosts = async () => {
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      const response = await admin.getBillingCosts(token);
      setBillingCosts(response || []);
    } catch (err) {
      console.error("Failed to fetch billing costs", err);
      toast.error("Failed to load modules — close and reopen to retry");
    }
  };

  const handleOpenHighlights = (plan: any) => {
    setSelectedPlan(plan);
    const stored = plan.highlights || [];
    setHighlightsCustomized(stored.length > 0);
    setPlanHighlights(
      stored.map((h: any) => ({
        type: h.module_code ? "module" : "text",
        module_code: h.module_code || "",
        text: h.text || "",
        label: h.label || "",
      })),
    );
    setShowHighlightsModal(true);
    if (billingCosts.length === 0) fetchBillingCosts();
  };

  const handleSaveHighlights = async () => {
    if (!selectedPlan) return;

    // Validation
    const usedCodes: string[] = [];
    for (const row of planHighlights) {
      if (row.type === "module") {
        if (!row.module_code) {
          toast.error("Select a module for each module row");
          return;
        }
        if (usedCodes.includes(row.module_code)) {
          toast.error(`Module '${row.module_code}' is highlighted more than once`);
          return;
        }
        usedCodes.push(row.module_code);
      } else {
        if (!row.text.trim()) {
          toast.error("Text rows cannot be empty");
          return;
        }
      }
    }

    setHighlightsLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      const payload = planHighlights.map((row) =>
        row.type === "module"
          ? { module_code: row.module_code, ...(row.label ? { label: row.label } : {}) }
          : { text: row.text },
      );
      await admin.updatePlanHighlights(selectedPlan.id, payload, token);
      setShowHighlightsModal(false);
      fetchPlans();
      toast.success("Highlights saved");
    } catch (err) {
      console.error("Failed to update highlights", err);
      toast.error("Failed to save highlights");
    } finally {
      setHighlightsLoading(false);
    }
  };

  const handleResetHighlights = async () => {
    if (!selectedPlan) return;
    setHighlightsLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      await admin.updatePlanHighlights(selectedPlan.id, [], token);
      setShowHighlightsModal(false);
      fetchPlans();
      toast.success("Reset to automatic highlights");
    } catch (err) {
      console.error("Failed to reset highlights", err);
      toast.error("Failed to reset highlights");
    } finally {
      setHighlightsLoading(false);
    }
  };

  const moveHighlight = (idx: number, dir: -1 | 1) => {
    const next = [...planHighlights];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setPlanHighlights(next);
  };

  const handleCreatePlan = async () => {
    setCreatePlanLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      await admin.createPlan(
        {
          ...createPlanData,
          credits_granted: Number(createPlanData.credits_granted) || 0,
          credit_validity_days: createPlanData.credit_validity_days ? Number(createPlanData.credit_validity_days) : null,
          display_order: Number(createPlanData.display_order) || 0,
          badge: createPlanData.badge || null,
        },
        token,
      );
      setShowCreatePlanModal(false);
      setCreatePlanData({
        code: "",
        name: "",
        description: "",
        billing_type: "one_time",
        credits_granted: 0,
        credit_validity_days: 30,
        badge: "",
        display_order: 0,
        is_public: true,
      });
      fetchPlans();
    } catch (err) {
      console.error("Failed to create plan", err);
      toast.error("Failed to create plan");
    } finally {
      setCreatePlanLoading(false);
    }
  };

  const handleOpenEditPlan = (plan: any) => {
    setSelectedPlan(plan);
    setEditPlanData({
      name: plan.name,
      description: plan.description || "",
      credits_granted: plan.credits_granted,
      credit_validity_days: plan.credit_validity_days || 0,
      badge: plan.badge || "",
      display_order: plan.display_order,
      is_public: plan.is_public,
    });
    setShowEditPlanModal(true);
  };

  const handleSaveEditPlan = async () => {
    if (!selectedPlan) return;
    setEditPlanLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      const data = {
        ...editPlanData,
        credits_granted: Number(editPlanData.credits_granted) || 0,
        credit_validity_days: editPlanData.credit_validity_days ? Number(editPlanData.credit_validity_days) : null,
        display_order: Number(editPlanData.display_order) || 0,
      };
      if (!data.badge) data.badge = null;
      await admin.updatePlan(selectedPlan.id, data, token);
      setShowEditPlanModal(false);
      fetchPlans();
    } catch (err) {
      console.error("Failed to update plan", err);
      toast.error("Failed to update plan");
    } finally {
      setEditPlanLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Plans</h1>
          <p className="text-muted-foreground">
            Manage subscription tiers and pricing.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreatePlanModal(true)}>
          <Plus className="w-4 h-4" /> Create Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-foreground bg-card rounded-xl border border-border shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-foreground bg-card rounded-xl border border-border border-dashed">
            <Package className="w-12 h-12 mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              No plans found
            </h3>
            <p>Get started by creating your first subscription plan.</p>
            <Button variant="outline" className="mt-4 gap-2">
              <Plus className="w-4 h-4" /> Create Plan
            </Button>
          </div>
        ) : (
          plans.map((plan) => {
            const isPublished = plan.status === "published";
            const isArchived = plan.status === "archived";
            const isDraft = plan.status === "draft";

            const priceList: string =
              (plan.prices && plan.prices.length > 0
                ? plan.prices
                : plan.price
                  ? [plan.price]
                  : []
              )
                .map((p: any) =>
                  `${p.currency_code} ${toMajor(p.amount_minor, p.currency_code).toLocaleString()}`
                )
                .join("  ·  ") || "No price set";

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden flex flex-col hover:border-primary/50 transition-all ${isArchived ? "opacity-60 grayscale hover:grayscale-0" : ""}`}
              >
                <div
                  className={`absolute top-0 inset-x-0 h-1 ${isPublished ? "bg-green-500" : isArchived ? "bg-red-500" : "bg-muted"}`}
                />
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        {plan.badge && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {plan.description}
                      </CardDescription>
                    </div>
                    <div
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        isPublished
                          ? "bg-green-500/10 text-green-500 border border-green-500/20"
                          : isArchived
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {plan.status || "Draft"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="mb-4">
                    <span className="text-xl font-bold">{priceList}</span>
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      / {plan.billing_type === "one_time" ? "one-time" : "mo"}
                    </span>
                  </div>

                  <div className="space-y-2 mb-6 flex-1">
                    <div className="text-sm flex flex-col">
                      <span className="text-muted-foreground text-xs mb-1">
                        Paddle Product ID:{" "}
                      </span>
                      <span className="font-mono text-[10px] bg-muted px-1.5 py-1 rounded break-all w-fit">
                        {plan.paddle_product_id || "N/A"}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Credits: </span>
                      <span className="font-medium">
                        {plan.credits_granted} credits
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto pt-4 border-t border-border flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-[30%] gap-2"
                      onClick={() => handleOpenEditPlan(plan)}
                      disabled={isPublished || isArchived}
                      title={isPublished ? "Unpublish to edit" : undefined}
                    >
                      <Settings className="w-3.5 h-3.5" /> Info
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-[30%] gap-2"
                      onClick={() => handleOpenPrices(plan)}
                      disabled={isArchived}
                      title="Edit Prices"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Prices
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-[30%] gap-2"
                      onClick={() => handleOpenFeatures(plan)}
                      disabled={isPublished || isArchived}
                      title={isPublished ? "Unpublish to edit" : undefined}
                    >
                      <ListChecks className="w-3.5 h-3.5" /> Features
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-[30%] gap-2"
                      onClick={() => handleOpenHighlights(plan)}
                      title="Edit Highlights"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Highlights
                    </Button>
                    <Button
                      variant={isPublished ? "outline" : "default"}
                      size="sm"
                      className={`flex-1 min-w-[30%] gap-2 ${isPublished ? "hover:bg-destructive/10 hover:text-destructive hover:border-destructive" : ""}`}
                      onClick={() => handleTogglePublish(plan)}
                      disabled={isArchived}
                    >
                      {isPublished ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Unpublish
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5" /> Publish
                        </>
                      )}
                    </Button>
                    {!isArchived && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 min-w-[30%] gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleArchive(plan)}
                        title="Archive Plan"
                      >
                        <X className="w-3.5 h-3.5" /> Archive
                      </Button>
                    )}
                    <a
                      href={`/audit?target_type=plan&target_id=${plan.id}`}
                      className="flex-1 min-w-[30%] flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-md border border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
                      title="View audit history"
                    >
                      <History className="w-3.5 h-3.5" /> History
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Prices Modal */}
      {showPricesModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-2xl p-6 rounded-lg shadow-lg border border-border relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowPricesModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-1">
              Prices: {selectedPlan.name}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter amounts in major units (e.g. 9.99 for $9.99). Countries are optional — unlisted countries fall back to USD at the live Paddle rate.
            </p>

            {pricesPublishFailed && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm flex gap-2">
                <span className="font-bold shrink-0">Warning:</span>
                <span>
                  Prices were saved but the plan is now <strong>DRAFT</strong> and off the pricing page. Fix any issues and click Save &amp; Publish again.
                </span>
              </div>
            )}

            <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
              {planPrices.map((p, idx) => {
                const isBase = p.currency_code === "USD";
                const sym = CURRENCY_SYMBOLS[p.currency_code] || p.currency_code;
                return (
                  <div key={idx} className="p-3 border border-border rounded-md bg-muted/20 space-y-2">
                    <div className="flex items-end gap-3">
                      {/* Currency dropdown */}
                      <div className="w-28 shrink-0">
                        <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                          Currency
                        </label>
                        <select
                          value={p.currency_code}
                          disabled={isBase}
                          onChange={(e) => {
                            const next = [...planPrices];
                            next[idx] = { ...next[idx], currency_code: e.target.value };
                            setPlanPrices(next);
                          }}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm font-mono disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {SUPPORTED_CURRENCIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* Amount in major units */}
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                          Amount ({sym})
                        </label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                            {sym}
                          </span>
                          <input
                            type="number"
                            step={getCurrencyExponent(p.currency_code) === 0 ? "1" : getCurrencyExponent(p.currency_code) === 3 ? "0.001" : "0.01"}
                            min="0"
                            value={p._major ?? ""}
                            onChange={(e) => {
                              const next = [...planPrices];
                              next[idx] = { ...next[idx], _major: e.target.value };
                              setPlanPrices(next);
                            }}
                            className="w-full pl-7 pr-2 py-1.5 bg-background border border-border rounded text-sm font-mono"
                          />
                        </div>
                      </div>

                      {/* Remove (not for base) */}
                      {!isBase && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                          onClick={() => setPlanPrices(planPrices.filter((_, i) => i !== idx))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Country chips */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                        Countries
                      </label>
                      {isBase ? (
                        <p className="text-xs text-muted-foreground italic px-2 py-1.5 bg-background border border-border rounded">
                          Base — applies to every country without a local price override
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1 p-1.5 bg-background border border-border rounded min-h-[34px] items-center">
                          {(p.country_codes || []).map((cc: string) => (
                            <span
                              key={cc}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs font-mono"
                            >
                              {cc}
                              <button
                                onClick={() => {
                                  const next = [...planPrices];
                                  next[idx] = { ...next[idx], country_codes: next[idx].country_codes.filter((c: string) => c !== cc) };
                                  setPlanPrices(next);
                                }}
                                className="hover:text-destructive ml-0.5"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                          <input
                            type="text"
                            value={p._country_input || ""}
                            maxLength={2}
                            placeholder="+ CC"
                            onChange={(e) => {
                              const next = [...planPrices];
                              next[idx] = { ...next[idx], _country_input: e.target.value.toUpperCase() };
                              setPlanPrices(next);
                            }}
                            onKeyDown={(e) => {
                              if (["Enter", " ", ","].includes(e.key) && (p._country_input || "").trim()) {
                                e.preventDefault();
                                const cc = (p._country_input || "").trim().toUpperCase();
                                if (cc.length === 2 && !(p.country_codes || []).includes(cc)) {
                                  const next = [...planPrices];
                                  next[idx] = {
                                    ...next[idx],
                                    country_codes: [...(next[idx].country_codes || []), cc],
                                    _country_input: "",
                                  };
                                  setPlanPrices(next);
                                }
                              }
                            }}
                            className="flex-1 min-w-[40px] px-1 text-xs font-mono bg-transparent outline-none placeholder:text-muted-foreground/40"
                          />
                          {p.currency_code === "EUR" && (
                            <button
                              onClick={() => {
                                const next = [...planPrices];
                                const existing = new Set<string>(next[idx].country_codes || []);
                                next[idx] = {
                                  ...next[idx],
                                  country_codes: [...existing, ...EUROZONE_COUNTRIES.filter((c) => !existing.has(c))],
                                };
                                setPlanPrices(next);
                              }}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground font-medium whitespace-nowrap"
                            >
                              + Eurozone (20)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={() =>
                  setPlanPrices([
                    ...planPrices,
                    { currency_code: "EUR", amount_minor: 0, country_codes: [], _major: "", _country_input: "" },
                  ])
                }
              >
                <Plus className="w-3.5 h-3.5 mr-2" /> Add currency
              </Button>
            </div>

            {/* Live preview */}
            {planPrices.some((p) => parseFloat(p._major) > 0) && (
              <div className="mt-3 px-3 py-2 rounded bg-muted/30 text-xs text-muted-foreground">
                Preview:{" "}
                {planPrices
                  .filter((p) => parseFloat(p._major) > 0)
                  .map((p) => {
                    const sym = CURRENCY_SYMBOLS[p.currency_code] || p.currency_code;
                    const dec = getCurrencyExponent(p.currency_code) === 0 ? 0 : getCurrencyExponent(p.currency_code) === 3 ? 3 : 2;
                    return `${sym}${Number(p._major).toFixed(dec)}`;
                  })
                  .join(" · ")}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowPricesModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePrices} disabled={pricesLoading}>
                {pricesLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Globe className="w-4 h-4 mr-2" />
                )}
                Save &amp; Publish
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Features Modal */}
      {showFeaturesModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-2xl p-6 rounded-lg shadow-lg border border-border relative">
            <button
              onClick={() => setShowFeaturesModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-2">
              Edit Features: {selectedPlan.name}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enable or disable features for this plan.
            </p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {planFeatures.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 border border-border rounded-md bg-muted/20"
                >
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                      Feature Code
                    </label>
                    <select
                      value={f.feature_code}
                      onChange={(e) => {
                        const newF = [...planFeatures];
                        newF[idx].feature_code = e.target.value;
                        setPlanFeatures(newF);
                      }}
                      className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm font-mono"
                    >
                      <option value="">Select a feature...</option>
                      {availableFeatures.map((af) => (
                        <option key={af.code} value={af.code}>
                          {af.code} ({af.name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <input
                      type="checkbox"
                      checked={f.enabled}
                      onChange={(e) => {
                        const newF = [...planFeatures];
                        newF[idx].enabled = e.target.checked;
                        setPlanFeatures(newF);
                      }}
                      className="w-4 h-4 rounded border-border"
                    />
                    <label className="text-sm">Enabled</label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      const newF = planFeatures.filter((_, i) => i !== idx);
                      setPlanFeatures(newF);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={() =>
                  setPlanFeatures([
                    ...planFeatures,
                    { feature_code: "", enabled: true, limit_value: null },
                  ])
                }
              >
                <Plus className="w-3.5 h-3.5 mr-2" /> Add Feature
              </Button>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowFeaturesModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveFeatures} disabled={featuresLoading}>
                {featuresLoading && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Save Features
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Create Plan Modal */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-2xl p-6 rounded-lg shadow-lg border border-border relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreatePlanModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Create New Plan</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Code</label>
                  <input
                    type="text"
                    value={createPlanData.code}
                    onChange={(e) =>
                      setCreatePlanData({
                        ...createPlanData,
                        code: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                    placeholder="e.g. pro_monthly"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={createPlanData.name}
                    onChange={(e) =>
                      setCreatePlanData({
                        ...createPlanData,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                    placeholder="e.g. Pro Plan"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  value={createPlanData.description}
                  onChange={(e) =>
                    setCreatePlanData({
                      ...createPlanData,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm h-20"
                  placeholder="Plan description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Billing Type
                  </label>
                  <select
                    value={createPlanData.billing_type}
                    onChange={(e) =>
                      setCreatePlanData({
                        ...createPlanData,
                        billing_type: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  >
                    <option value="one_time">One-Time</option>
                    <option value="recurring">Recurring</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Credits Granted
                  </label>
                  <input
                    type="number"
                    value={createPlanData.credits_granted}
                    onChange={(e) =>
                      setCreatePlanData({
                        ...createPlanData,
                        credits_granted: e.target.value === "" ? ("" as any) : parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Credit Validity Days (Optional)
                  </label>
                  <input
                    type="number"
                    value={createPlanData.credit_validity_days}
                    onChange={(e) =>
                      setCreatePlanData({
                        ...createPlanData,
                        credit_validity_days: e.target.value === "" ? ("" as any) : parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Badge (Optional)
                  </label>
                  <input
                    type="text"
                    value={createPlanData.badge}
                    onChange={(e) =>
                      setCreatePlanData({
                        ...createPlanData,
                        badge: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                    placeholder="e.g. Most Popular"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreatePlanModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreatePlan} disabled={createPlanLoading}>
                {createPlanLoading && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Create Plan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {showEditPlanModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-2xl p-6 rounded-lg shadow-lg border border-border relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowEditPlanModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">
              Edit Info: {selectedPlan.name}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={editPlanData.name}
                  onChange={(e) =>
                    setEditPlanData({ ...editPlanData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  value={editPlanData.description}
                  onChange={(e) =>
                    setEditPlanData({
                      ...editPlanData,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Credits Granted
                  </label>
                  <input
                    type="number"
                    value={editPlanData.credits_granted}
                    onChange={(e) =>
                      setEditPlanData({
                        ...editPlanData,
                        credits_granted: e.target.value === "" ? ("" as any) : parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Credit Validity Days (Optional)
                  </label>
                  <input
                    type="number"
                    value={editPlanData.credit_validity_days}
                    onChange={(e) =>
                      setEditPlanData({
                        ...editPlanData,
                        credit_validity_days: e.target.value === "" ? ("" as any) : parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Badge (Optional)
                  </label>
                  <input
                    type="text"
                    value={editPlanData.badge}
                    onChange={(e) =>
                      setEditPlanData({
                        ...editPlanData,
                        badge: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowEditPlanModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEditPlan} disabled={editPlanLoading}>
                {editPlanLoading && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Highlights Modal */}
      {showHighlightsModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-2xl p-6 rounded-lg shadow-lg border border-border relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowHighlightsModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-1">
              Highlights: {selectedPlan.name}
            </h2>

            {!highlightsCustomized ? (
              <>
                <p className="text-sm text-muted-foreground mb-6">
                  This plan is using <strong>automatic highlights</strong> — the
                  server generates these from the module list. Customise to
                  choose and order the lines shown on this card.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowHighlightsModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setHighlightsCustomized(true);
                      setPlanHighlights([]);
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" /> Customise
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Module rows update automatically when credit costs change. Use
                  Text only for non-quantity bullets like "Priority support".
                </p>

                <div className="space-y-3 mb-4 max-h-[50vh] overflow-y-auto pr-1">
                  {planHighlights.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-md">
                      No highlights yet — click Add highlight below.
                    </p>
                  )}
                  {planHighlights.map((row, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-3 border border-border rounded-md bg-muted/20"
                    >
                      {/* Reorder */}
                      <div className="flex flex-col gap-1 pt-1 shrink-0">
                        <button
                          onClick={() => moveHighlight(idx, -1)}
                          disabled={idx === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveHighlight(idx, 1)}
                          disabled={idx === planHighlights.length - 1}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Type toggle */}
                      <div className="flex flex-col gap-1 shrink-0 pt-1">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="radio"
                            checked={row.type === "module"}
                            onChange={() => {
                              const next = [...planHighlights];
                              next[idx] = { ...next[idx], type: "module", text: "" };
                              setPlanHighlights(next);
                            }}
                            className="accent-primary"
                          />
                          Module
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="radio"
                            checked={row.type === "text"}
                            onChange={() => {
                              const next = [...planHighlights];
                              next[idx] = { ...next[idx], type: "text", module_code: "", label: "" };
                              setPlanHighlights(next);
                            }}
                            className="accent-primary"
                          />
                          Text
                        </label>
                      </div>

                      {/* Main input */}
                      <div className="flex-1 min-w-0">
                        {row.type === "module" ? (
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                                Module
                              </label>
                              <select
                                value={row.module_code}
                                onChange={(e) => {
                                  const next = [...planHighlights];
                                  next[idx] = { ...next[idx], module_code: e.target.value };
                                  setPlanHighlights(next);
                                }}
                                className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm"
                              >
                                <option value="">Select module...</option>
                                {billingCosts.map((c: any) => (
                                  <option key={c.code} value={c.code}>
                                    {c.name || c.code}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="w-36">
                              <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                                Label (optional)
                              </label>
                              <input
                                type="text"
                                value={row.label}
                                maxLength={64}
                                onChange={(e) => {
                                  const next = [...planHighlights];
                                  next[idx] = { ...next[idx], label: e.target.value };
                                  setPlanHighlights(next);
                                }}
                                placeholder="Override label"
                                className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                              Text
                            </label>
                            <input
                              type="text"
                              value={row.text}
                              maxLength={160}
                              onChange={(e) => {
                                const next = [...planHighlights];
                                next[idx] = { ...next[idx], text: e.target.value };
                                setPlanHighlights(next);
                              }}
                              placeholder="e.g. Priority support"
                              className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm"
                            />
                          </div>
                        )}
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() =>
                          setPlanHighlights(planHighlights.filter((_, i) => i !== idx))
                        }
                        className="text-muted-foreground hover:text-destructive mt-1 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-6">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-dashed"
                    disabled={planHighlights.length >= 5}
                    onClick={() =>
                      setPlanHighlights([
                        ...planHighlights,
                        { type: "module", module_code: "", text: "", label: "" },
                      ])
                    }
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add highlight
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {planHighlights.length} of 5 used
                  </span>
                </div>

                <div className="flex justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleResetHighlights}
                    disabled={highlightsLoading}
                  >
                    Reset to automatic
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowHighlightsModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveHighlights} disabled={highlightsLoading}>
                      {highlightsLoading && (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      )}
                      Save Highlights
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirm Action Component */}
      <ConfirmAction
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        consequence={confirmState.consequence}
        isDanger={confirmState.isDanger}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.action}
      />
    </div>
  );
}
