'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Percent,
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart3,
  Banknote,
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface PlanLevel {
  minActiveDirects?: number;
  level: number;
  rate: number;
}

interface ReportRow {
  compressedCount?: number;
  compressedAmount?: number;
  agentId: string;
  agent: string;
  email: string;
  earned: number;
  paid: number;
  reversed: number;
  count: number;
}

interface PayoutBatch {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
  commissionCount: number;
}

export default function AdminCommissionsPage() {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Plan editor state
  const [planName, setPlanName] = useState('Default plan');
  const [levels, setLevels] = useState<PlanLevel[]>([{ level: 1, rate: 20, minActiveDirects: 0 }]);
  const [planLoading, setPlanLoading] = useState(true);
  const [planSaving, setPlanSaving] = useState(false);
  const [activePlanName, setActivePlanName] = useState<string | null>(null);

  // Report state
  const [report, setReport] = useState<ReportRow[]>([]);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [drill, setDrill] = useState<{ agent: string; rows: any[] } | null>(null);

  // Payout state
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [batchFrom, setBatchFrom] = useState('');
  const [batchTo, setBatchTo] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    try {
      const response = await apiClient.adminGetCommissionPlan();
      const plan = response.data as any;
      if (plan) {
        setActivePlanName(plan.name);
        setPlanName(plan.name);
        setLevels(plan.levels.map((l: any) => ({ level: l.level, rate: Number(l.rate), minActiveDirects: Number(l.minActiveDirects ?? 0) })));
      }
    } finally {
      setPlanLoading(false);
    }
  }, []);

  const loadReport = useCallback(async () => {
    const response = await apiClient.adminGetCommissionReport({
      from: reportFrom || undefined,
      to: reportTo || undefined,
    });
    setReport((response.data as ReportRow[]) ?? []);
  }, [reportFrom, reportTo]);

  const loadBatches = useCallback(async () => {
    const response = await apiClient.adminListPayoutBatches();
    setBatches((response.data as PayoutBatch[]) ?? []);
  }, []);

  useEffect(() => {
    loadPlan();
    loadReport().catch(() => {});
    loadBatches().catch(() => {});
  }, [loadPlan, loadReport, loadBatches]);

  const savePlan = async () => {
    setPlanSaving(true);
    setMessage(null);
    try {
      await apiClient.adminSaveCommissionPlan({ name: planName, isActive: true, levels });
      setMessage({ type: 'success', text: 'Compensation plan saved and activated.' });
      await loadPlan();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save plan' });
    } finally {
      setPlanSaving(false);
    }
  };

  const createBatch = async () => {
    if (!batchFrom || !batchTo) {
      setMessage({ type: 'error', text: 'Choose the payout period first.' });
      return;
    }
    setActionLoading('create-batch');
    setMessage(null);
    try {
      await apiClient.adminCreatePayoutBatch(
        new Date(batchFrom).toISOString(),
        new Date(`${batchTo}T23:59:59`).toISOString()
      );
      setMessage({ type: 'success', text: 'Payout batch created.' });
      await loadBatches();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to create batch' });
    } finally {
      setActionLoading(null);
    }
  };

  const downloadCsv = async (batchId: string) => {
    setActionLoading(`csv-${batchId}`);
    try {
      const blob = await apiClient.adminDownloadPayoutBatchCsv(batchId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payout-batch-${batchId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      await loadBatches();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Export failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const markPaid = async (batchId: string) => {
    setActionLoading(`paid-${batchId}`);
    try {
      await apiClient.adminMarkPayoutBatchPaid(batchId);
      setMessage({ type: 'success', text: 'Batch marked as paid - commissions moved to PAID.' });
      await Promise.all([loadBatches(), loadReport()]);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Mark paid failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const openDrilldown = async (row: ReportRow) => {
    const response = await apiClient.adminGetAgentCommissions(row.agentId);
    setDrill({ agent: row.agent, rows: (response.data as any[]) ?? [] });
  };

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <p className="eyebrow">Revenue</p>
        <h1 className="page-title">Commissions</h1>
        <p className="page-subtitle">
          Compensation plan, per-agent reports and payout management.
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-3 rounded-xl p-4 text-sm font-medium ${
            message.type === 'success'
              ? 'border border-success/25 bg-success/10 text-success'
              : 'border border-destructive/20 bg-destructive/10 text-destructive'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <Tabs defaultValue="plan">
        <TabsList>
          <TabsTrigger value="plan">
            <Percent className="h-4 w-4 mr-1" /> Compensation Plan
          </TabsTrigger>
          <TabsTrigger value="report">
            <BarChart3 className="h-4 w-4 mr-1" /> Report
          </TabsTrigger>
          <TabsTrigger value="payouts">
            <Banknote className="h-4 w-4 mr-1" /> Payouts
          </TabsTrigger>
        </TabsList>

        {/* ---------------- Plan editor ---------------- */}
        <TabsContent value="plan" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Compensation Plan</CardTitle>
              <CardDescription>
                Configure the levels, the percentage per level and the qualification threshold
                (minimum active paying directs to receive that level - unqualified beneficiaries are
                skipped via dynamic compression). Commissions apply to the first sale AND every
                renewal. Saving activates this plan (only one plan is active at a time).
                {activePlanName && (
                  <span className="block mt-1">
                    Currently active: <strong>{activePlanName}</strong>
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {planLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <>
                  <div className="space-y-2 max-w-sm">
                    <Label htmlFor="planName">Plan name</Label>
                    <Input id="planName" value={planName} onChange={e => setPlanName(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Levels</Label>
                    {levels.map((level, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="w-20 text-sm text-muted-foreground">Level {level.level}</span>
                        <div className="relative w-32">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={level.rate}
                            onChange={e => {
                              const rate = Number(e.target.value);
                              setLevels(prev => prev.map((l, i) => (i === index ? { ...l, rate } : l)));
                            }}
                          />
                          <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={1000}
                            step={1}
                            className="w-24"
                            value={level.minActiveDirects ?? 0}
                            onChange={e => {
                              const minActiveDirects = Math.max(0, Math.floor(Number(e.target.value)));
                              setLevels(prev => prev.map((l, i) => (i === index ? { ...l, minActiveDirects } : l)));
                            }}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            min active directs{(level.minActiveDirects ?? 0) === 0 ? ' (always)' : ''}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={levels.length === 1 || index !== levels.length - 1}
                          onClick={() => setLevels(prev => prev.slice(0, -1))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={levels.length >= 10}
                      onClick={() =>
                        setLevels(prev => [...prev, { level: prev.length + 1, rate: 0, minActiveDirects: 0 }])
                      }
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add level
                    </Button>
                  </div>

                  <Button onClick={savePlan} disabled={planSaving}>
                    {planSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                    Save & activate plan
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Report ---------------- */}
        <TabsContent value="report" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="font-display text-lg">Commission Report</CardTitle>
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="date"
                    value={reportFrom}
                    onChange={e => setReportFrom(e.target.value)}
                    className="border border-input rounded px-2 py-1 bg-background"
                  />
                  <span className="text-muted-foreground">→</span>
                  <input
                    type="date"
                    value={reportTo}
                    onChange={e => setReportTo(e.target.value)}
                    className="border border-input rounded px-2 py-1 bg-background"
                  />
                  <Button size="sm" variant="outline" onClick={() => loadReport()}>
                    Apply
                  </Button>
                </div>
              </div>
              <CardDescription>Aggregated by agent - click a row for the detail.</CardDescription>
            </CardHeader>
            <CardContent>
              {report.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent</th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Earned (unpaid)</th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paid</th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reversed</th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Compressed</th>
                        <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.map(row => (
                        <tr
                          key={row.agentId}
                          className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/50"
                          onClick={() => openDrilldown(row)}
                        >
                          <td className="py-2 pr-4">
                            <p className="font-medium">{row.agent}</p>
                            <p className="text-xs text-muted-foreground">{row.email}</p>
                          </td>
                          <td className="py-2 pr-4 font-semibold">{row.earned.toFixed(2)}</td>
                          <td className="py-2 pr-4">{row.paid.toFixed(2)}</td>
                          <td className="py-2 pr-4 text-red-600">{row.reversed.toFixed(2)}</td>
                          <td className="py-2 pr-4">
                            {(row.compressedCount ?? 0) > 0 ? (
                              <span className="rounded-md bg-exo-verdigris-soft px-1.5 py-0.5 text-xs font-semibold text-exo-verdigris tabular-nums">
                                {row.compressedCount} · {(row.compressedAmount ?? 0).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No commissions in this period.</p>
              )}
            </CardContent>
          </Card>

          {drill && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Detail: {drill.agent}</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setDrill(null)}>
                  Close
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment ref</th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Level</th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                        <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drill.rows.map((row: any) => (
                        <tr key={row.id} className="border-b border-border/50 transition-colors hover:bg-muted/50">
                          <td className="py-2 pr-4 text-muted-foreground">
                            {new Date(row.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2 pr-4">
                            {row.sourceUser.firstName} {row.sourceUser.lastName}
                          </td>
                          <td className="py-2 pr-4 font-mono text-xs">{row.paymentRef}</td>
                          <td className="py-2 pr-4">
                            L{row.level}
                            {row.wasCompressed && (
                              <span
                                className="ml-1.5 rounded-md bg-exo-verdigris-soft px-1.5 py-0.5 text-xs font-semibold text-exo-verdigris"
                                title={`Compression: original beneficiary ${row.originalBeneficiaryName ?? 'unknown'} was not qualified`}
                              >
                                ⇡ {row.originalBeneficiaryName ?? 'compressed'}
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-4 font-medium">
                            {Number(row.amount).toFixed(2)} {row.currency}
                          </td>
                          <td className="py-2">
                            <Badge variant="outline">{row.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---------------- Payouts ---------------- */}
        <TabsContent value="payouts" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Create Payout Batch</CardTitle>
              <CardDescription>
                Aggregates all unpaid (EARNED) commissions in the period. Export the CSV, pay by
                bank transfer, then mark the batch as paid.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Period start</Label>
                <input
                  type="date"
                  value={batchFrom}
                  onChange={e => setBatchFrom(e.target.value)}
                  className="border border-input rounded px-2 py-1.5 bg-background block"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Period end</Label>
                <input
                  type="date"
                  value={batchTo}
                  onChange={e => setBatchTo(e.target.value)}
                  className="border border-input rounded px-2 py-1.5 bg-background block"
                />
              </div>
              <Button onClick={createBatch} disabled={actionLoading !== null}>
                {actionLoading === 'create-batch' ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Create batch
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Payout Batches</CardTitle>
            </CardHeader>
            <CardContent>
              {batches.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Period</th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commissions</th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                        <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map(batch => (
                        <tr key={batch.id} className="border-b border-border/50 transition-colors hover:bg-muted/50">
                          <td className="py-2 pr-4">
                            {new Date(batch.periodStart).toLocaleDateString()} –{' '}
                            {new Date(batch.periodEnd).toLocaleDateString()}
                          </td>
                          <td className="py-2 pr-4">{batch.commissionCount}</td>
                          <td className="py-2 pr-4 font-semibold">{batch.totalAmount.toFixed(2)}</td>
                          <td className="py-2 pr-4">
                            <Badge
                              className={
                                batch.status === 'PAID'
                                  ? 'border-success/25 bg-success/15 text-success'
                                  : batch.status === 'EXPORTED'
                                    ? 'border-primary/20 bg-primary/10 text-primary'
                                    : ''
                              }
                              variant="outline"
                            >
                              {batch.status}
                            </Badge>
                          </td>
                          <td className="py-2">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionLoading !== null}
                                onClick={() => downloadCsv(batch.id)}
                              >
                                {actionLoading === `csv-${batch.id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Download className="h-4 w-4 mr-1" /> CSV
                                  </>
                                )}
                              </Button>
                              {batch.status !== 'PAID' && (
                                <Button
                                  size="sm"
                                  disabled={actionLoading !== null}
                                  onClick={() => markPaid(batch.id)}
                                >
                                  {actionLoading === `paid-${batch.id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Mark paid'
                                  )}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No payout batches yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
