

export enum View {
  DASHBOARD = 'DASHBOARD',
  ANALYZER = 'ANALYZER',
  CHAT = 'CHAT',
  KNOWLEDGE = 'KNOWLEDGE',
  ADMIN = 'ADMIN'
}

export type UserRole = 
  | 'admin' 
  | 'platform_manager' 
  | 'meta_lead' 
  | 'meta_specialist' 
  | 'google_lead' 
  | 'google_specialist' 
  | 'account_manager';

export interface User {
  name: string;
  surname: string;
  email: string;
  role: UserRole;
  assignedBrands?: string[];
}

// --- LC WAIKIKI SPECIFIC DATA STRUCTURE ---
export interface LCWRow {
  date: string;       // Mapped from 'tarih' (YYYY-MM-DD)
  brand: string;      // Mapped from 'co_marka'
  account: string;    // Mapped from 'hesap_adi'
  channel: string;    // Mapped from 'platform' (Mecra)
  device: string;     // Mapped from 'cihaz_platformu'
  campaignName: string; // Mapped from 'kampanya_adi'
  spend: number;      // Mapped from 'harcama'
  revenue: number;    // Mapped from 'gelir'
  clicks: number;     // Mapped from 'tiklama'
  impressions: number;// Mapped from 'gosterim'
  conversions: number;// Mapped from 'donusum'
}

export interface FilterState {
  startDate: string;
  endDate: string;
  brand: string;
  account: string;
  channels: string[]; // Multi-select
  devices: string[];  // Multi-select
}

export interface MetricResult {
  ctr: string;
  cpc: string;
  cpa: string;
  roas: string;
  aov: string;
  cvr: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  user?: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  dateAdded: string;
}

export interface ActivityLog {
  id: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface CampaignData {
  date: string;
  brandName: string;
  accountName: string;
  platform: string;
  device: string;
  campaignName: string;
  spend: number;
  conversionValue: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

// Global Context to share analysis data between Analyzer and Chat
export interface GlobalAnalysisContext {
  report: string;
  rawData: LCWRow[]; // Limited rows for context
  filters: FilterState;
}