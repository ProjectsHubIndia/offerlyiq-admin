"use client";

import { useEffect, useState } from "react";
import { admin } from "@/lib/api";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Edit2, Globe, EyeOff, Package, DollarSign, ListChecks, X, Settings } from "lucide-react";

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  
  const [showPricesModal, setShowPricesModal] = useState(false);
  const [planPrices, setPlanPrices] = useState<any[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [planFeatures, setPlanFeatures] = useState<any[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);

  // Create Plan Modal
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [createPlanData, setCreatePlanData] = useState({
    code: "", name: "", description: "", billing_type: "one_time", credits_granted: 0, credit_validity_days: 30, badge: "", display_order: 0, is_public: true
  });
  const [createPlanLoading, setCreatePlanLoading] = useState(false);

  // Edit Plan Details Modal
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [editPlanData, setEditPlanData] = useState<any>({});
  const [editPlanLoading, setEditPlanLoading] = useState(false);

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

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleTogglePublish = async (id: string, isPublished: boolean) => {
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      if (isPublished) {
        await admin.unpublishPlan(id, token);
      } else {
        await admin.publishPlan(id, token);
      }
      fetchPlans();
    } catch (err) {
      console.error("Failed to toggle publish status", err);
      alert("Error updating plan status");
    }
  };

  const handleOpenPrices = (plan: any) => {
    setSelectedPlan(plan);
    setPlanPrices(plan.prices ? [...plan.prices] : []);
    setShowPricesModal(true);
  };

  const handleSavePrices = async () => {
    if (!selectedPlan) return;
    setPricesLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      await admin.updatePlanPrices(selectedPlan.id, planPrices, token);
      setShowPricesModal(false);
      fetchPlans();
    } catch (err) {
      console.error("Failed to update prices", err);
      alert("Failed to update prices");
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
      alert("Failed to update features");
    } finally {
      setFeaturesLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    setCreatePlanLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      await admin.createPlan({
        ...createPlanData,
        credit_validity_days: createPlanData.credit_validity_days || null,
        badge: createPlanData.badge || null,
      }, token);
      setShowCreatePlanModal(false);
      setCreatePlanData({ code: "", name: "", description: "", billing_type: "one_time", credits_granted: 0, credit_validity_days: 30, badge: "", display_order: 0, is_public: true });
      fetchPlans();
    } catch (err) {
      console.error("Failed to create plan", err);
      alert("Failed to create plan");
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
      is_public: plan.is_public
    });
    setShowEditPlanModal(true);
  };

  const handleSaveEditPlan = async () => {
    if (!selectedPlan) return;
    setEditPlanLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      const data = { ...editPlanData };
      if (!data.credit_validity_days) data.credit_validity_days = null;
      if (!data.badge) data.badge = null;
      await admin.updatePlan(selectedPlan.id, data, token);
      setShowEditPlanModal(false);
      fetchPlans();
    } catch (err) {
      console.error("Failed to update plan", err);
      alert("Failed to update plan");
    } finally {
      setEditPlanLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Plans</h1>
          <p className="text-muted-foreground">Manage subscription tiers and pricing.</p>
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
            <h3 className="text-lg font-medium text-foreground mb-1">No plans found</h3>
            <p>Get started by creating your first subscription plan.</p>
            <Button variant="outline" className="mt-4 gap-2">
              <Plus className="w-4 h-4" /> Create Plan
            </Button>
          </div>
        ) : (
          plans.map((plan) => {
            const isPublished = plan.status === "published";
            const usdPriceObj = plan.prices?.find((p: any) => p.currency_code === "USD");
            const usdPrice = usdPriceObj ? (usdPriceObj.amount_minor / 100).toFixed(2) : "0.00";
            
            return (
              <Card key={plan.id} className="relative overflow-hidden flex flex-col hover:border-primary/50 transition-all">
                <div className={`absolute top-0 inset-x-0 h-1 ${isPublished ? "bg-green-500" : "bg-muted"}`} />
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
                      <CardDescription className="line-clamp-2">{plan.description}</CardDescription>
                    </div>
                    <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                      isPublished 
                        ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                        : "bg-muted text-muted-foreground border border-border"
                    }`}>
                      {isPublished ? "Live" : plan.status || "Draft"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="mb-4">
                    <span className="text-3xl font-bold">${usdPrice}</span>
                    <span className="text-muted-foreground text-sm uppercase ml-1">
                      {plan.billing_type === "one_time" ? "One-Time" : plan.billing_type}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-6 flex-1">
                    <div className="text-sm flex flex-col">
                      <span className="text-muted-foreground text-xs mb-1">Paddle Product ID: </span>
                      <span className="font-mono text-[10px] bg-muted px-1.5 py-1 rounded break-all w-fit">{plan.paddle_product_id || "N/A"}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Credits: </span>
                      <span className="font-medium">{plan.credits_granted} credits</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto pt-4 border-t border-border flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 min-w-[30%] gap-2"
                      onClick={() => handleOpenEditPlan(plan)}
                      title="Edit Info"
                    >
                      <Settings className="w-3.5 h-3.5" /> Info
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 min-w-[30%] gap-2"
                      onClick={() => handleOpenPrices(plan)}
                      title="Edit Prices"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Prices
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 min-w-[30%] gap-2"
                      onClick={() => handleOpenFeatures(plan)}
                      title="Edit Features"
                    >
                      <ListChecks className="w-3.5 h-3.5" /> Features
                    </Button>
                    <Button 
                      variant={isPublished ? "outline" : "default"} 
                      size="sm" 
                      className={`flex-1 min-w-[30%] gap-2 ${isPublished ? "hover:bg-destructive/10 hover:text-destructive hover:border-destructive" : ""}`}
                      onClick={() => handleTogglePublish(plan.id, isPublished)}
                    >
                      {isPublished ? (
                        <><EyeOff className="w-3.5 h-3.5" /> Unpublish</>
                      ) : (
                        <><Globe className="w-3.5 h-3.5" /> Publish</>
                      )}
                    </Button>
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
          <div className="bg-card w-full max-w-2xl p-6 rounded-lg shadow-lg border border-border relative">
            <button 
              onClick={() => setShowPricesModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-2">Edit Prices: {selectedPlan.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">Set prices in different currencies. Amount is in minor units (e.g. 1000 = $10.00).</p>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {planPrices.map((p, idx) => (
                <div key={idx} className="flex items-end gap-3 p-3 border border-border rounded-md bg-muted/20">
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Currency</label>
                    <input 
                      type="text" 
                      value={p.currency_code}
                      onChange={(e) => {
                        const newPrices = [...planPrices];
                        newPrices[idx].currency_code = e.target.value.toUpperCase();
                        setPlanPrices(newPrices);
                      }}
                      className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Minor Amount</label>
                    <input 
                      type="number" 
                      value={p.amount_minor}
                      onChange={(e) => {
                        const newPrices = [...planPrices];
                        newPrices[idx].amount_minor = parseInt(e.target.value) || 0;
                        setPlanPrices(newPrices);
                      }}
                      className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm font-mono"
                    />
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    className="mb-[1px]"
                    onClick={() => {
                      const newPrices = planPrices.filter((_, i) => i !== idx);
                      setPlanPrices(newPrices);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-dashed"
                onClick={() => setPlanPrices([...planPrices, { currency_code: "USD", amount_minor: 0, country_codes: [] }])}
              >
                <Plus className="w-3.5 h-3.5 mr-2" /> Add Price
              </Button>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowPricesModal(false)}>Cancel</Button>
              <Button onClick={handleSavePrices} disabled={pricesLoading}>
                {pricesLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Prices
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
            <h2 className="text-xl font-bold mb-2">Edit Features: {selectedPlan.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">Enable or disable features for this plan.</p>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {planFeatures.map((f, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 border border-border rounded-md bg-muted/20">
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Feature Code</label>
                    <input 
                      type="text" 
                      value={f.feature_code}
                      onChange={(e) => {
                        const newF = [...planFeatures];
                        newF[idx].feature_code = e.target.value;
                        setPlanFeatures(newF);
                      }}
                      className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm font-mono"
                    />
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
                onClick={() => setPlanFeatures([...planFeatures, { feature_code: "", enabled: true, limit_value: null }])}
              >
                <Plus className="w-3.5 h-3.5 mr-2" /> Add Feature
              </Button>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowFeaturesModal(false)}>Cancel</Button>
              <Button onClick={handleSaveFeatures} disabled={featuresLoading}>
                {featuresLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
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
                  <input type="text" value={createPlanData.code} onChange={e => setCreatePlanData({...createPlanData, code: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm" placeholder="e.g. pro_monthly" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input type="text" value={createPlanData.name} onChange={e => setCreatePlanData({...createPlanData, name: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm" placeholder="e.g. Pro Plan" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={createPlanData.description} onChange={e => setCreatePlanData({...createPlanData, description: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm h-20" placeholder="Plan description..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Billing Type</label>
                  <select value={createPlanData.billing_type} onChange={e => setCreatePlanData({...createPlanData, billing_type: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm">
                    <option value="one_time">One-Time</option>
                    <option value="recurring">Recurring</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Credits Granted</label>
                  <input type="number" value={createPlanData.credits_granted} onChange={e => setCreatePlanData({...createPlanData, credits_granted: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Credit Validity Days (Optional)</label>
                  <input type="number" value={createPlanData.credit_validity_days} onChange={e => setCreatePlanData({...createPlanData, credit_validity_days: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Badge (Optional)</label>
                  <input type="text" value={createPlanData.badge} onChange={e => setCreatePlanData({...createPlanData, badge: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm" placeholder="e.g. Most Popular" />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowCreatePlanModal(false)}>Cancel</Button>
              <Button onClick={handleCreatePlan} disabled={createPlanLoading}>
                {createPlanLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
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
            <h2 className="text-xl font-bold mb-4">Edit Info: {selectedPlan.name}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" value={editPlanData.name} onChange={e => setEditPlanData({...editPlanData, name: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={editPlanData.description} onChange={e => setEditPlanData({...editPlanData, description: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm h-20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Credits Granted</label>
                  <input type="number" value={editPlanData.credits_granted} onChange={e => setEditPlanData({...editPlanData, credits_granted: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Credit Validity Days (Optional)</label>
                  <input type="number" value={editPlanData.credit_validity_days} onChange={e => setEditPlanData({...editPlanData, credit_validity_days: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Badge (Optional)</label>
                  <input type="text" value={editPlanData.badge} onChange={e => setEditPlanData({...editPlanData, badge: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowEditPlanModal(false)}>Cancel</Button>
              <Button onClick={handleSaveEditPlan} disabled={editPlanLoading}>
                {editPlanLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
