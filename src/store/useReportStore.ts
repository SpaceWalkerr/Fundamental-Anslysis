import { create } from 'zustand';

export interface Report {
  id: string;
  company: string;
  ticker: string;
  exchange: string;
  date: string;
  overallScore: number;
  summary: string;
  metrics: {
    profitability: { score: number; label: string };
    liquidity: { score: number; label: string };
    solvency: { score: number; label: string };
    efficiency: { score: number; label: string };
  };
  keyRatios: Array<{
    name: string;
    value: string;
    benchmark: string;
  }>;
  strengths: string[];
  redFlags: string[];
  investmentAssessment: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface ReportState {
  reports: Report[];
  currentReport: Report | null;
  isLoading: boolean;
  addReport: (report: Report) => void;
  setCurrentReport: (report: Report | null) => void;
  getReportById: (id: string) => Report | undefined;
  deleteReport: (id: string) => void;
}

export const useReportStore = create<ReportState>((set, get) => ({
  reports: [
    {
      id: '1',
      company: 'Apple Inc.',
      ticker: 'AAPL',
      exchange: 'NASDAQ',
      date: 'Jan 28, 2026',
      overallScore: 8.5,
      trend: 'up',
      summary:
        'Strong profitability with robust cash flow generation. Premium valuation warranted by ecosystem strength.',
      metrics: {
        profitability: { score: 9.2, label: 'Excellent' },
        liquidity: { score: 7.8, label: 'Good' },
        solvency: { score: 8.5, label: 'Strong' },
        efficiency: { score: 8.9, label: 'Excellent' },
      },
      keyRatios: [
        { name: 'P/E Ratio', value: '28.5x', benchmark: 'Industry: 25.2x' },
        { name: 'ROE', value: '89.6%', benchmark: 'Industry: 18.4%' },
        { name: 'Gross Margin', value: '46.2%', benchmark: 'Industry: 42.1%' },
        { name: 'Current Ratio', value: '1.08', benchmark: 'Industry: 1.35' },
        { name: 'Debt/Equity', value: '1.98', benchmark: 'Industry: 0.85' },
        { name: 'Operating Margin', value: '31.5%', benchmark: 'Industry: 22.3%' },
      ],
      strengths: [
        'Exceptional brand value and customer loyalty',
        'Dominant ecosystem with high switching costs',
        'Services segment growing at 15%+ annually',
        'Strong free cash flow generation ($100B+ annually)',
      ],
      redFlags: [
        'High debt levels relative to historical norms',
        'Slowing iPhone growth in mature markets',
        'Regulatory scrutiny on App Store practices',
      ],
      investmentAssessment:
        'Apple represents a quality holding for long-term investors seeking exposure to a dominant technology franchise.',
    },
    {
      id: '2',
      company: 'Microsoft Corporation',
      ticker: 'MSFT',
      exchange: 'NASDAQ',
      date: 'Jan 25, 2026',
      overallScore: 9.1,
      trend: 'up',
      summary:
        'Exceptional cloud growth with expanding margins. Well-positioned for AI monetization.',
      metrics: {
        profitability: { score: 9.5, label: 'Excellent' },
        liquidity: { score: 8.2, label: 'Strong' },
        solvency: { score: 9.0, label: 'Excellent' },
        efficiency: { score: 8.8, label: 'Excellent' },
      },
      keyRatios: [
        { name: 'P/E Ratio', value: '32.5x', benchmark: 'Industry: 25.2x' },
        { name: 'ROE', value: '42.3%', benchmark: 'Industry: 18.4%' },
        { name: 'Gross Margin', value: '68.4%', benchmark: 'Industry: 42.1%' },
      ],
      strengths: [
        'Azure cloud platform with 30%+ growth',
        'Strong enterprise relationships',
        'Leading AI positioning with OpenAI partnership',
      ],
      redFlags: [
        'Increased competition in cloud services',
        'High valuation multiples',
      ],
      investmentAssessment:
        'Microsoft remains a core holding for technology investors with its cloud and AI leadership.',
    },
    {
      id: '3',
      company: 'Tesla Inc.',
      ticker: 'TSLA',
      exchange: 'NASDAQ',
      date: 'Jan 20, 2026',
      overallScore: 6.2,
      trend: 'down',
      summary:
        'Revenue growth slowing amid competition. Margin compression concerns but strong balance sheet.',
      metrics: {
        profitability: { score: 6.5, label: 'Fair' },
        liquidity: { score: 7.0, label: 'Good' },
        solvency: { score: 8.0, label: 'Strong' },
        efficiency: { score: 5.8, label: 'Fair' },
      },
      keyRatios: [
        { name: 'P/E Ratio', value: '45.2x', benchmark: 'Industry: 12.5x' },
        { name: 'ROE', value: '18.2%', benchmark: 'Industry: 14.2%' },
        { name: 'Gross Margin', value: '18.2%', benchmark: 'Industry: 15.8%' },
      ],
      strengths: [
        'Market leader in EV technology',
        'Strong brand recognition',
        'Vertical integration advantages',
      ],
      redFlags: [
        'Increasing competition from traditional automakers',
        'Margin pressure from price cuts',
        'High valuation relative to auto peers',
      ],
      investmentAssessment:
        'Tesla faces near-term headwinds but maintains long-term potential in sustainable transportation.',
    },
  ],
  currentReport: null,
  isLoading: false,

  addReport: (report) =>
    set((state) => ({
      reports: [report, ...state.reports],
    })),

  setCurrentReport: (report) =>
    set({
      currentReport: report,
    }),

  getReportById: (id) => {
    return get().reports.find((report) => report.id === id);
  },

  deleteReport: (id) =>
    set((state) => ({
      reports: state.reports.filter((report) => report.id !== id),
    })),
}));
