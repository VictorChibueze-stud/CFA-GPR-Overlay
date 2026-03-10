export interface GPRDataPoint {
  date: string
  gprd: number
  gprd_act: number
  gprd_threat: number
  gprd_ma30: number
  gprd_ma7: number
  event: string | null
  is_spike: boolean
  percentile: number
}

export interface IndustryImpact {
  fed_industry_id: string
  fed_industry_name: string
  portfolio_weight: number
  gpr_beta: number
  impact_score: number
  direction: 'positive' | 'negative' | 'neutral'
}

export interface EventSummary {
  event_id?: string
  peak_date?: string
  severity_score: number
  percentile: number
  net_impact?: number
  portfolio_vulnerability_baseline: number
  fund_name?: string
  as_of_date: string
}

export interface Holding {
  security_name_report: string
  ticker_guess: string
  weight_pct: number
  fed_industry_name: string
  fed_industry_id: string
  industry_weight_share_for_holding: number
  region_guess: string | null
  country_guess: string | null
  gpr_beta?: number | null
}

export interface EconomicChannel {
  channel_id: string
  channel_type: string
  description: string
  linked_industries: Array<{
    industry_name: string
    role: string
    rationale: string
  }>
  evidence_found?: boolean
}

export interface ThreatCluster {
  cluster_id: string
  threat_category: string
  primary_actors: string[]
  region: string
  time_range: string
  economic_channels: EconomicChannel[]
}

export interface WatchlistHolding {
  company_name: string
  resolved_symbol: string
  weight_pct: number
  fed_industry_name: string
  final_exposure_verdict: string
  recommendation_action: string
  news_angle: string
  confidence: number
}

export interface DeepDiveHolding {
  company_name: string
  resolved_symbol: string
  weight_pct: number
  fed_industry_name: string
  exposure_verdict: string
  impact_direction: string
  confidence: number
  rationale: string
  linked_evidence_titles: string[]
}
