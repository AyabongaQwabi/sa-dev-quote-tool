'use client';

/**
 * Developer-centric quote tool: set hourly rate and experience, select features,
 * adjust timeline. Pricing is dynamic (getTotals from pricing.js); we do not
 * use price_zar in calculations, only days_to_complete and config.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ProgressSteps } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Info,
  LayoutGrid,
  Zap,
  Rocket,
  Sparkles,
  FileText,
  Calendar,
  Send,
  CheckCircle,
  User,
} from 'lucide-react';

import appData from '@/config/pricing/app.json';
import websiteData from '@/config/pricing/website.json';
import {
  DEFAULT_HOURLY_RATE_ZAR,
  HOURS_PER_DAY,
  BUFFER_PERCENT_OPTIONS,
  CURRENCY_OPTIONS,
  MAX_DESIRED_TIME_MULTIPLIER,
} from '@/config/config';
import { getTotals, getFeatureBreakdown } from '@/lib/pricing';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'quote-tool-draft';

// Wizard: step 1 = Your Details, 2 = App type, 3 = Core, 4 = Advanced, 5 = Polish, 6 = Quote
const WIZARD_STEPS = [
  { label: 'Your details', shortLabel: '0. You', icon: '👤' },
  { label: 'App type', shortLabel: '1. Type', icon: '📱' },
  { label: 'Core features', shortLabel: '2. Core', icon: '⚙️' },
  { label: 'Advanced features', shortLabel: '3. Advanced', icon: '🚀' },
  { label: 'Polish', shortLabel: '4. Polish', icon: '✨' },
  { label: 'Quote & summary', shortLabel: '5. Quote', icon: '📋' },
];

const STAGE_2_TYPES = new Set([
  'auth',
  'auth-claims',
  'entity-crud',
  'user-personal-data-crud',
  'entity-crud-and-entity-state',
  'entity-states',
  'entity-collections',
  'date-entity-range',
  'learning-management-system',
]);

const STAGE_3_TYPES = new Set([
  'payment-api',
  'ecommerce',
  'payment-api-and-entity-crud',
  'entity-aggregates',
  'financial-math',
  'comms',
  'chat',
  'notifications',
  'media',
  'api-intergration',
  'entity-feed-infinite-scroll',
  'entity-metadata-collection-to-new-entity-build',
  'sub-entity-same-entity-type-interaction',
  'voting-and-support',
  'entity-collections-and-claims',
  'entity-query',
  'entity-action-job-scheduling',
  'physical-sensors',
  'gamification',
  'date-time',
  'entity-collections-metadata',
]);

const STAGE_4_TYPES = new Set([
  'entity-configuration',
  'data-conversion',
  'pdf-templating',
  'data-parse',
  'data-read',
  'privacy',
  'ux',
  'data-compliance',
  'performance',
  'content',
]);

const RECOMMENDED_BUNDLES = [
  {
    id: 'starter-invoicing',
    label: 'Starter Invoicing Pack',
    featureIds: ['user-auth', 'invoice-creation', 'client-management'],
    projectTypes: ['Invoicing App'],
  },
  {
    id: 'starter-website',
    label: 'Essential Website',
    featureIds: ['fixed-content', 'basic-navigation', 'responsive-design'],
    projectTypes: ['Static Website'],
  },
];

const CROSS_CUTTING_LABEL = 'Cross-cutting / Common';

const PROJECT_TYPE_HINTS = {
  'Fintech / Personal Finance App':
    'Banking, savings groups, loans, wallets — money made simple',
  'On-Demand Service / Gig Economy App':
    'Uber, SweepSouth style — book and track local services',
  'Healthcare / Telemedicine App':
    'Video consultations, appointments, patient records',
  'Food Delivery / Restaurant App': 'Menus, orders, drivers, and delivery tracking',
  'Real Estate / Property Management App':
    'Listings, leases, rent collection, tenant portal',
  'Agriculture / Farm Management App':
    'Fields, crops, weather, and marketplace for produce',
  'Event Management / Ticketing App': 'Tickets, RSVPs, check-in, and seating',
  'Job Board / Recruitment / HR App':
    'Post jobs, track applicants, schedule interviews',
  'Marketplace App': 'Sellers, products, orders, and commissions',
  'Invoicing App': 'Invoices, clients, payments, and reminders',
  'Quotations App': 'Quotes, proposals, e-signatures, and templates',
  'Social Media App': 'Feed, stories, chat, and communities',
  'Project Management App': 'Tasks, timelines, Gantt charts, and team workload',
  'Educational App': 'Courses, progress, certificates, and discussions',
  'Messaging App': 'SMS, email, push, and in-app chat',
  'Fitness App': 'Workouts, GPS, tracking, and personal records',
  'E-commerce App': 'Products, cart, checkout, and wishlists',
  'Static Website': 'Brochure sites, landing pages, and fast static hosting',
  'Custom / Mixed': 'Show every feature (perfect for mixed ideas)',
};

const PROJECT_TYPE_EMOJI = {
  'Fintech / Personal Finance App': '💳',
  'On-Demand Service / Gig Economy App': '🚗',
  'Healthcare / Telemedicine App': '🏥',
  'Food Delivery / Restaurant App': '🍕',
  'Real Estate / Property Management App': '🏠',
  'Agriculture / Farm Management App': '🌾',
  'Event Management / Ticketing App': '🎫',
  'Job Board / Recruitment / HR App': '💼',
  'Marketplace App': '🛒',
  'Invoicing App': '📄',
  'Quotations App': '📝',
  'Social Media App': '👥',
  'Project Management App': '📊',
  'Educational App': '📚',
  'Messaging App': '💬',
  'Fitness App': '💪',
  'E-commerce App': '🛍️',
  'Static Website': '🌐',
  'Custom / Mixed': '🎯',
};

function buildGroupedAndSortedFeatures() {
  const byComplexity = (a, b) =>
    (a.complexity ?? 0) !== (b.complexity ?? 0)
      ? (a.complexity ?? 0) - (b.complexity ?? 0)
      : (a.days_to_complete || 0) - (b.days_to_complete || 0);

  const appGroups = appData.app_types.map((appType) => ({
    label: appType.type,
    features: [...appType.features]
      .map((f) => ({ ...f, type: f.type || 'entity-crud' }))
      .sort(byComplexity),
  }));

  const websiteFeatures = websiteData.features.map((f) => ({
    ...f,
    id: f.name.toLowerCase().replace(/\s/g, '-'),
    survey_question: `Would you like ${f.name.toLowerCase()}?`,
    type: f.type || 'entity-crud',
  }));
  const websiteGroup = {
    label: websiteData.type || 'Static Website',
    features: websiteFeatures.sort(byComplexity),
  };

  const groups = [...appGroups, websiteGroup];
  return groups.flatMap((g) =>
    g.features.map((f) => ({ ...f, groupLabel: g.label }))
  );
}

const allFeatures = buildGroupedAndSortedFeatures();

function getProjectTypeOptions() {
  const types = appData.app_types.map((t) => t.type);
  return [...types, websiteData.type || 'Static Website', 'Custom / Mixed'];
}

function getFeaturesForStage(selectedProjectTypes, stageNum) {
  if (!selectedProjectTypes?.length) return [];

  const isCustom = selectedProjectTypes.includes('Custom / Mixed');

  if (isCustom) {
    if (stageNum === 2) {
      return allFeatures.filter(
        (f) =>
          f.groupLabel === CROSS_CUTTING_LABEL || STAGE_2_TYPES.has(f.type)
      );
    }
    if (stageNum === 3) {
      return allFeatures.filter(
        (f) =>
          f.groupLabel === CROSS_CUTTING_LABEL || STAGE_3_TYPES.has(f.type)
      );
    }
    if (stageNum === 4) {
      return allFeatures.filter(
        (f) =>
          f.groupLabel === CROSS_CUTTING_LABEL || STAGE_4_TYPES.has(f.type)
      );
    }
    return allFeatures;
  }

  const set = new Set(selectedProjectTypes);
  const filtered = allFeatures.filter(
    (f) => set.has(f.groupLabel) || f.groupLabel === CROSS_CUTTING_LABEL
  );
  if (stageNum === 2) {
    return filtered.filter(
      (f) => f.groupLabel === CROSS_CUTTING_LABEL || STAGE_2_TYPES.has(f.type)
    );
  }
  if (stageNum === 3) {
    return filtered.filter(
      (f) => f.groupLabel === CROSS_CUTTING_LABEL || STAGE_3_TYPES.has(f.type)
    );
  }
  if (stageNum === 4) {
    return filtered.filter(
      (f) => f.groupLabel === CROSS_CUTTING_LABEL || STAGE_4_TYPES.has(f.type)
    );
  }
  return [];
}

function groupFeaturesByLabel(features) {
  const byGroup = {};
  features.forEach((f) => {
    if (!byGroup[f.groupLabel]) byGroup[f.groupLabel] = [];
    byGroup[f.groupLabel].push(f);
  });
  return byGroup;
}

/** Format amount in selected currency (display only; math is always ZAR). */
function formatMoney(amountZar, currencyCode) {
  const opt = CURRENCY_OPTIONS.find((c) => c.code === currencyCode) || CURRENCY_OPTIONS[0];
  const value = amountZar * (opt.code === 'ZAR' ? 1 : opt.rateToZar);
  const symbol = opt.code === 'ZAR' ? 'R' : opt.code === 'USD' ? '$' : '€';
  return `${symbol}${Math.round(value).toLocaleString()}`;
}

export default function GetAQuote({ trustStats = null }) {
  const [wizardStep, setWizardStep] = useState(1);
  const [hourlyRate, setHourlyRate] = useState(String(DEFAULT_HOURLY_RATE_ZAR));
  const [yearsExperience, setYearsExperience] = useState('5');
  const [hoursPerDay, setHoursPerDay] = useState(String(HOURS_PER_DAY));
  const [bufferPercent, setBufferPercent] = useState(0);
  const [currency, setCurrency] = useState('ZAR');
  const [selectedProjectTypes, setSelectedProjectTypes] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [buildTime, setBuildTime] = useState('');
  const [showEnquiryForm, setShowEnquiryForm] = useState(null);
  const [projectDetailsSent, setProjectDetailsSent] = useState(false);
  const [buildRequestForm, setBuildRequestForm] = useState({
    name: '',
    email: '',
    cellphone: '',
    projectDetails: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.selectedProjectTypes?.length)
        setSelectedProjectTypes(data.selectedProjectTypes);
      if (Array.isArray(data.selectedFeatures))
        setSelectedFeatures(data.selectedFeatures);
      if (data.buildTime != null) setBuildTime(String(data.buildTime));
      if (data.wizardStep >= 1 && data.wizardStep <= 6) setWizardStep(data.wizardStep);
      if (data.hourlyRate != null) setHourlyRate(String(data.hourlyRate));
      if (data.yearsExperience != null) setYearsExperience(String(data.yearsExperience));
      if (data.hoursPerDay != null) setHoursPerDay(String(data.hoursPerDay));
      if (data.bufferPercent != null && BUFFER_PERCENT_OPTIONS.includes(data.bufferPercent))
        setBufferPercent(data.bufferPercent);
      if (data.currency && CURRENCY_OPTIONS.some((c) => c.code === data.currency))
        setCurrency(data.currency);
    } catch (_) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          selectedProjectTypes,
          selectedFeatures,
          buildTime,
          wizardStep,
          hourlyRate,
          yearsExperience,
          hoursPerDay,
          bufferPercent,
          currency,
        })
      );
    } catch (_) {}
  }, [
    selectedProjectTypes,
    selectedFeatures,
    buildTime,
    wizardStep,
    hourlyRate,
    yearsExperience,
    hoursPerDay,
    bufferPercent,
    currency,
  ]);

  // Dynamic pricing: getTotals uses hourly rate, experience, hours/day, desired days; no price_zar in math
  const totals = useMemo(() => {
    const rate = Math.max(1, parseInt(hourlyRate, 10) || DEFAULT_HOURLY_RATE_ZAR);
    const years = Math.max(0, parseInt(yearsExperience, 10) || 0);
    const hoursDay = Math.max(1, parseInt(hoursPerDay, 10) || HOURS_PER_DAY);
    const desiredDays = buildTime.trim() ? parseInt(buildTime, 10) : null;
    return getTotals(
      selectedFeatures,
      allFeatures,
      {
        hourlyRate: rate,
        yearsExperience: years,
        hoursPerDay: hoursDay,
        desiredDays: desiredDays ?? undefined,
      },
      bufferPercent
    );
  }, [
    selectedFeatures,
    hourlyRate,
    yearsExperience,
    hoursPerDay,
    buildTime,
    bufferPercent,
  ]);

  const getQuoteSummaryText = useCallback(() => {
    const featureNames = selectedFeatures
      .map((id) => allFeatures.find((f) => f.id === id)?.name)
      .filter(Boolean)
      .join(', ');
    return [
      `Selected features: ${featureNames || 'None'}`,
      `Hourly rate: R${hourlyRate} | Years experience: ${yearsExperience}`,
      `Estimated (our time): R${Math.round(totals.base_price).toLocaleString()} over ${Math.round(totals.estimated_days)} days`,
      `Adjusted (desired time): R${Math.round(totals.adjusted_price).toLocaleString()} over ${totals.effective_desired_days} days`,
    ].join('\n');
  }, [selectedFeatures, hourlyRate, yearsExperience, totals]);

  const handleBuildRequestSubmit = async (e) => {
    e.preventDefault();
    if (!buildRequestForm.name?.trim() || !buildRequestForm.email?.trim()) {
      setSubmitError('Please enter your name and email.');
      return;
    }
    setSubmitError(null);
    setSubmitLoading(true);
    try {
      // Open-source: no backend by default; use mailto. Replace with your API if needed.
      const subject = encodeURIComponent('Quote / Build request');
      const body = encodeURIComponent(
        [
          buildRequestForm.projectDetails?.trim() || '(No additional details provided)',
          '',
          '--- Quote summary ---',
          getQuoteSummaryText(),
        ].join('\n')
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      setProjectDetailsSent(true);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (_) {}
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleFeatureToggle = (featureId) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId]
    );
  };

  const handleGroupSelectAll = (featureIds, checked) => {
    setSelectedFeatures((prev) => {
      const set = new Set(prev);
      featureIds.forEach((id) => (checked ? set.add(id) : set.delete(id)));
      return [...set];
    });
  };

  const applyBundle = (featureIds) => {
    setSelectedFeatures((prev) => {
      const set = new Set(prev);
      featureIds.forEach((id) => set.add(id));
      return [...set];
    });
  };

  const projectTypeOptions = useMemo(() => getProjectTypeOptions(), []);
  const featuresStage2 = useMemo(
    () => getFeaturesForStage(selectedProjectTypes, 2),
    [selectedProjectTypes]
  );
  const featuresStage3 = useMemo(
    () => getFeaturesForStage(selectedProjectTypes, 3),
    [selectedProjectTypes]
  );
  const featuresStage4 = useMemo(
    () => getFeaturesForStage(selectedProjectTypes, 4),
    [selectedProjectTypes]
  );

  const visibleBundles = useMemo(
    () =>
      RECOMMENDED_BUNDLES.filter((b) =>
        b.projectTypes.some((t) => selectedProjectTypes.includes(t))
      ),
    [selectedProjectTypes]
  );

  const maxDesiredTimeForDiscount = Math.max(
    Math.ceil(totals.estimated_days * MAX_DESIRED_TIME_MULTIPLIER),
    90
  );
  const desiredTimeNum = totals.effective_desired_days;
  const isRush =
    totals.hasFeatures &&
    totals.estimated_days > 0 &&
    desiredTimeNum < totals.estimated_days * 0.6;
  const showMiniSummary =
    wizardStep >= 2 && wizardStep <= 5 && selectedFeatures.length > 0;

  // Complexity for UI flair only (not used in pricing)
  const complexityTotal = selectedFeatures.reduce((acc, id) => {
    const f = allFeatures.find((x) => x.id === id);
    return acc + (f?.complexity ?? 0);
  }, 0);
  const totalComplexity = Math.max(selectedFeatures.length * 5, 1);
  const complexityPerc = Math.round((complexityTotal / totalComplexity) * 100);

  function renderStage0YourDetails() {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl text-cyan-800 flex items-center gap-2">
            <User className="h-5 w-5" aria-hidden />
            Your details
          </CardTitle>
          <CardDescription>
            Set your hourly rate and experience. Time estimates and prices are
            driven by these values.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="hourlyRate">Hourly rate (ZAR) *</Label>
            <Input
              id="hourlyRate"
              type="number"
              min={1}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder={String(DEFAULT_HOURLY_RATE_ZAR)}
              className="mt-2 max-w-[140px]"
            />
          </div>
          <div>
            <Label htmlFor="yearsExperience">Years of experience</Label>
            <Input
              id="yearsExperience"
              type="number"
              min={0}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              placeholder="5"
              className="mt-2 max-w-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Affects time estimates: juniors take longer, seniors faster (see config).
            </p>
          </div>
          <div>
            <Label htmlFor="hoursPerDay">Hours per day (billable)</Label>
            <Input
              id="hoursPerDay"
              type="number"
              min={1}
              max={24}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(e.target.value)}
              placeholder={String(HOURS_PER_DAY)}
              className="mt-2 max-w-[80px]"
            />
          </div>
          <div>
            <Label>Buffer for unknowns</Label>
            <div className="flex gap-2 mt-2">
              {BUFFER_PERCENT_OPTIONS.map((pct) => (
                <Button
                  key={pct}
                  type="button"
                  variant={bufferPercent === pct ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBufferPercent(pct)}
                >
                  {pct === 0 ? 'None' : `${pct}%`}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="currency">Display currency</Label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-2 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={() => setWizardStep(2)}>Next: App type →</Button>
        </CardFooter>
      </Card>
    );
  }

  function renderStage1() {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl text-cyan-800 flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" aria-hidden />
            What kind of project are you building?
          </CardTitle>
          <CardDescription>
            Pick one or more that best match your idea — or choose &quot;Custom /
            Mixed&quot; if your app combines several things.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            role="group"
            aria-label="Project type"
          >
            {projectTypeOptions.map((type) => {
              const isSelected = selectedProjectTypes.includes(type);
              const emoji = PROJECT_TYPE_EMOJI[type] ?? '📌';
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    if (type === 'Custom / Mixed') {
                      setSelectedProjectTypes((prev) =>
                        prev.includes('Custom / Mixed')
                          ? prev.filter((t) => t !== 'Custom / Mixed')
                          : ['Custom / Mixed']
                      );
                    } else {
                      setSelectedProjectTypes((prev) =>
                        prev.includes(type)
                          ? prev.filter((t) => t !== type)
                          : [...prev, type]
                      );
                    }
                  }}
                  className={cn(
                    'rounded-lg border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]',
                    isSelected
                      ? 'border-cyan-600 bg-cyan-50 text-cyan-900'
                      : 'border-gray-200 hover:border-cyan-300 bg-white'
                  )}
                  aria-pressed={isSelected}
                >
                  <span className="font-medium">{emoji} {type}</span>
                  {PROJECT_TYPE_HINTS[type] && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {PROJECT_TYPE_HINTS[type]}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => setWizardStep(1)}>
            ← Back
          </Button>
          <Button
            onClick={() => setWizardStep(3)}
            disabled={selectedProjectTypes.length === 0}
            aria-disabled={selectedProjectTypes.length === 0}
          >
            Next: Core features →
          </Button>
        </CardFooter>
      </Card>
    );
  }

  function renderFeatureStage(stageNum, title, subtitle, features, IconComponent) {
    const byGroup = groupFeaturesByLabel(features);
    const groupLabels = Object.keys(byGroup).sort((a, b) => {
      if (a === CROSS_CUTTING_LABEL) return 1;
      if (b === CROSS_CUTTING_LABEL) return -1;
      return a.localeCompare(b);
    });

    const hasFeatures = groupLabels.length > 0;

    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl text-cyan-800 flex items-center gap-2">
            {IconComponent && <IconComponent className="h-5 w-5" aria-hidden />}
            {title}
          </CardTitle>
          <CardDescription>
            {stageNum === 2 && 'The everyday basics your app probably needs'}
            {stageNum === 3 && 'Things that make money or connect people'}
            {stageNum === 4 && 'Nice extras that make it feel modern and trustworthy'}
          </CardDescription>
          {visibleBundles.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {visibleBundles.map((bundle) => (
                <Badge
                  key={bundle.id}
                  variant="secondary"
                  className="cursor-pointer hover:bg-cyan-100"
                  onClick={() => applyBundle(bundle.featureIds)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      applyBundle(bundle.featureIds);
                    }
                  }}
                >
                  ✨ Recommended: {bundle.label}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!hasFeatures ? (
            <p className="text-muted-foreground text-sm py-4">
              No features in this category for your project type. Click Next to
              continue.
            </p>
          ) : (
            <Accordion type="multiple" defaultValue={[]}>
              {groupLabels.map((groupLabel) => {
                const groupFeatures = byGroup[groupLabel];
                const ids = groupFeatures.map((f) => f.id);
                const selectedCount = ids.filter((id) =>
                  selectedFeatures.includes(id)
                ).length;
                const allSelected = selectedCount === ids.length;

                return (
                  <AccordionItem key={groupLabel} value={groupLabel}>
                    <AccordionTrigger
                      value={groupLabel}
                      className="hover:no-underline"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(checked) =>
                            handleGroupSelectAll(ids, checked === true)
                          }
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select all ${groupLabel}`}
                        />
                        <span className="font-semibold">{groupLabel}</span>
                        {selectedCount > 0 && (
                          <span className="text-muted-foreground text-xs">
                            ({selectedCount} selected)
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent value={groupLabel}>
                      <ul className="space-y-1">
                        {groupFeatures.map((feature) => (
                          <li key={feature.id}>
                            <div
                              className={cn(
                                'flex items-center gap-3 rounded-md p-3 min-h-[44px] border border-transparent hover:bg-muted/50 hover:border-muted transition-colors',
                                selectedFeatures.includes(feature.id) && 'bg-cyan-50/50'
                              )}
                            >
                              <Checkbox
                                id={feature.id}
                                checked={selectedFeatures.includes(feature.id)}
                                onCheckedChange={() =>
                                  handleFeatureToggle(feature.id)
                                }
                                aria-describedby={`${feature.id}-desc`}
                              />
                              <label
                                htmlFor={feature.id}
                                className="flex-1 text-sm text-foreground cursor-pointer"
                                id={`${feature.id}-desc`}
                              >
                                {feature.survey_question}
                              </label>
                              <Popover>
                                <PopoverTrigger
                                  type="button"
                                  className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                  aria-label={`Info about ${feature.name}`}
                                >
                                  <Info className="h-4 w-4" />
                                </PopoverTrigger>
                                <PopoverContent align="end" className="max-w-xs">
                                  <p className="text-sm">{feature.survey_question}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Baseline: {feature.days_to_complete ?? '—'} days (mid-level). Your
                                    estimate depends on your experience and rate.
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Common in: {feature.groupLabel}
                                  </p>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => setWizardStep(stageNum - 1)}>
            ← Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setWizardStep(stageNum + 1)}
            >
              None of these → Next
            </Button>
            <Button onClick={() => setWizardStep(stageNum + 1)}>Next →</Button>
          </div>
        </CardFooter>
      </Card>
    );
  }

  function renderStage5Quote() {
    const rate = Math.max(1, parseInt(hourlyRate, 10) || DEFAULT_HOURLY_RATE_ZAR);
    const years = Math.max(0, parseInt(yearsExperience, 10) || 0);
    const hoursDay = Math.max(1, parseInt(hoursPerDay, 10) || HOURS_PER_DAY);
    const breakdown = getFeatureBreakdown(
      selectedFeatures,
      allFeatures,
      {
        hourlyRate: rate,
        yearsExperience: years,
        hoursPerDay: hoursDay,
        desiredDays: buildTime.trim() ? parseInt(buildTime, 10) : undefined,
      },
      bufferPercent
    );

    const complexityCopy =
      complexityPerc <= 20
        ? 'Straightforward scope — good to go.'
        : complexityPerc <= 40
          ? 'Moderate complexity — well within reach.'
          : complexityPerc <= 60
            ? 'Substantial scope — plan accordingly.'
            : complexityPerc <= 80
              ? 'High complexity — consider phasing.'
              : 'Very high complexity — break into phases.';

    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-cyan-800 flex items-center gap-2">
              <Calendar className="h-5 w-5" aria-hidden />
              Timeline
            </CardTitle>
            <CardDescription>
              How many days would you like to aim for? Longer timelines get a
              discount (with a floor); shorter timelines add a premium.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="buildTime">Desired build time (days)</Label>
            <Input
              id="buildTime"
              type="number"
              min={1}
              max={maxDesiredTimeForDiscount}
              value={buildTime}
              onChange={(e) => setBuildTime(e.target.value)}
              placeholder={String(
                totals.hasFeatures ? Math.max(1, Math.round(totals.estimated_days)) : 1
              )}
              className="mt-2 max-w-[120px]"
              aria-describedby="buildTime-hint"
            />
            <p id="buildTime-hint" className="text-xs text-muted-foreground mt-1">
              Our estimate: {Math.round(totals.estimated_days)} days. Max discount
              timeline: {maxDesiredTimeForDiscount} days (price floor applies beyond).
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setWizardStep(5)}>
              ← Back
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-cyan-800 flex items-center gap-2">
              <FileText className="h-5 w-5" aria-hidden />
              Summary
            </CardTitle>
            <CardDescription>
              Your selected features and estimated costs (currency: {currency})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              <strong>Complexity:</strong> {Math.round(complexityTotal)} /{' '}
              {Math.round(totalComplexity)} = {complexityPerc}%
            </p>
            <p className="text-emerald-600 text-sm italic">{complexityCopy}</p>
            <p>
              <strong>Our time:</strong> {Math.round(totals.estimated_days)} days ·{' '}
              {formatMoney(totals.base_price, currency)}
            </p>
            <p>
              <strong>Desired time:</strong> {Math.round(desiredTimeNum)} days ·{' '}
              {formatMoney(totals.adjusted_price, currency)}
            </p>

            {isRush && (
              <div
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                role="alert"
              >
                Faster delivery increases cost; we&apos;ve applied a rush multiplier.
              </div>
            )}

            {totals.time_ratio < 1 && totals.effective_ratio === 0.4 && (
              <p className="text-xs text-muted-foreground">
                Discount floor applied for this timeline.
              </p>
            )}

            {trustStats && (
              <p className="text-sm text-muted-foreground">
                Typical range for projects like this: {trustStats.range}.
              </p>
            )}

            {breakdown.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Complexity</TableHead>
                      <TableHead>Adjusted days</TableHead>
                      <TableHead>Hours (ours)</TableHead>
                      <TableHead>Price (base)</TableHead>
                      <TableHead>Price (desired)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakdown.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.complexity ?? '—'}</TableCell>
                        <TableCell>{row.adjusted_days.toFixed(1)}</TableCell>
                        <TableCell>
                          {Math.round(row.adjusted_days * (parseInt(hoursPerDay, 10) || HOURS_PER_DAY))}
                        </TableCell>
                        <TableCell>
                          {formatMoney(row.feature_base_price, currency)}
                        </TableCell>
                        <TableCell>
                          {formatMoney(row.feature_adjusted_price, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!totals.hasFeatures && (
              <p className="text-sm text-amber-700">
                Select at least one feature to see a quote. Go back to Core /
                Advanced / Polish to add features.
              </p>
            )}
          </CardContent>
        </Card>

        {showEnquiryForm === null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-cyan-800 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" aria-hidden />
                Export or send this quote?
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                onClick={() => setShowEnquiryForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]"
              >
                Send / export quote
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEnquiryForm(false)}
                className="min-h-[44px]"
              >
                No, thanks
              </Button>
            </CardContent>
          </Card>
        )}

        {showEnquiryForm === false && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-cyan-700">
                You can copy the summary from the table above or come back to
                export later.
              </p>
            </CardContent>
          </Card>
        )}

        {showEnquiryForm === true && !projectDetailsSent && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-cyan-800 flex items-center gap-2">
                <Send className="h-5 w-5" aria-hidden />
                Export quote (mailto)
              </CardTitle>
              <CardDescription>
                Opens your email client with the quote summary. You can also copy
                the numbers from the table.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBuildRequestSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="build-name">Name *</Label>
                  <Input
                    id="build-name"
                    value={buildRequestForm.name}
                    onChange={(e) =>
                      setBuildRequestForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Your name"
                    className="mt-1 min-h-[44px]"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="build-email">Email *</Label>
                  <Input
                    id="build-email"
                    type="email"
                    value={buildRequestForm.email}
                    onChange={(e) =>
                      setBuildRequestForm((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="your@email.com"
                    className="mt-1 min-h-[44px]"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="build-details">Notes (included in email body)</Label>
                  <textarea
                    id="build-details"
                    value={buildRequestForm.projectDetails}
                    onChange={(e) =>
                      setBuildRequestForm((p) => ({
                        ...p,
                        projectDetails: e.target.value,
                      }))
                    }
                    placeholder="Optional notes..."
                    rows={4}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                {submitError && (
                  <p className="text-sm text-red-600" role="alert">
                    {submitError}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={submitLoading}
                  className="bg-cyan-600 hover:bg-cyan-700 min-h-[44px]"
                >
                  {submitLoading ? 'Opening...' : 'Open email with quote'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {showEnquiryForm === true && projectDetailsSent && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-emerald-600 font-medium flex items-center gap-2">
                <CheckCircle className="h-5 w-5 shrink-0" aria-hidden />
                Email client opened. Send the message to save or share your quote.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="relative pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-3 border-b mb-6">
        <ProgressSteps
          steps={WIZARD_STEPS}
          currentStep={wizardStep}
          onStepClick={(step) => setWizardStep(step)}
          className="max-w-4xl mx-auto px-4"
        />
      </div>

      <div className="px-4">
        {wizardStep === 1 && renderStage0YourDetails()}
        {wizardStep === 2 && renderStage1()}
        {wizardStep === 3 &&
          renderFeatureStage(
            3,
            'Core features',
            'Auth, users, and basic CRUD.',
            featuresStage2,
            Zap
          )}
        {wizardStep === 4 &&
          renderFeatureStage(
            4,
            'Advanced features',
            'Payments, integrations, media.',
            featuresStage3,
            Rocket
          )}
        {wizardStep === 5 &&
          renderFeatureStage(
            5,
            'Polish & cross-cutting',
            'Dark mode, i18n, compliance.',
            featuresStage4,
            Sparkles
          )}
        {wizardStep === 6 && renderStage5Quote()}
      </div>

      {showMiniSummary && (
        <div
          className="fixed bottom-0 left-0 right-0 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-20 bg-card border shadow-lg rounded-lg p-4 sm:rounded-xl"
          role="complementary"
          aria-label="Quote summary"
        >
          <p className="text-sm font-medium">
            📋 {selectedFeatures.length} features ·{' '}
            {formatMoney(totals.adjusted_price, currency)} · ~
            {Math.round(totals.estimated_days)} days
          </p>
          <Button className="w-full mt-2 min-h-[44px]" onClick={() => setWizardStep(6)}>
            View full summary →
          </Button>
        </div>
      )}
    </div>
  );
}
