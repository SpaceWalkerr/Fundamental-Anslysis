# 🎨 FundaVision - Visual Component Guide

## Design System Overview

### 🎨 Color Palette

```css
Primary (Electric Blue):    #3B82F6
Accent (Teal):             #14B8A6
Success (Green):           #16A34A
Destructive (Red):         #DC2626
Background (Deep Navy):    #16213E
Card (Navy):               #1A2642
Text (White):              #F8FAFC
Muted Text (Gray):         #94A3B8
```

### 📐 Spacing Scale
```
xs:  4px   (0.25rem)
sm:  8px   (0.5rem)
md:  16px  (1rem)
lg:  24px  (1.5rem)
xl:  32px  (2rem)
2xl: 48px  (3rem)
```

### 📝 Typography
```
Headings:  DM Serif Display (serif)
Body:      Inter (sans-serif)
Code:      Monospace

Sizes:
text-xs:   12px
text-sm:   14px
text-base: 16px
text-lg:   18px
text-xl:   20px
text-2xl:  24px
text-3xl:  30px
text-4xl:  36px
```

---

## 📄 Page Layouts

### Landing Page
```
┌─────────────────────────────────┐
│        Header (Fixed)           │
├─────────────────────────────────┤
│                                 │
│        Hero Section             │
│    (Large headline + CTA)       │
│                                 │
├─────────────────────────────────┤
│                                 │
│    Features Grid (8 cards)      │
│      [🎯] [🧠] [💬] [🔍]      │
│      [📈] [📄] [🛡️] [⏰]      │
│                                 │
├─────────────────────────────────┤
│                                 │
│   How It Works (4 steps)        │
│    ① → ② → ③ → ④             │
│                                 │
├─────────────────────────────────┤
│                                 │
│  Pricing (3 tiers)              │
│  [Free] [Premium] [Enterprise]  │
│                                 │
├─────────────────────────────────┤
│          Footer                 │
└─────────────────────────────────┘
```

### Dashboard Layout
```
┌───────────────────────────────────────┐
│ [≡] FundaVision          👤 Profile   │  <- Header
├────┬──────────────────────────────────┤
│    │                                  │
│ 🏠 │   Quick Actions                  │
│    │   [📁 Upload] [🔍 Search]       │
│ 📊 │                                  │
│    │   Recent Reports                 │
│ 🔍 │   ┌──────┐ ┌──────┐ ┌──────┐  │
│    │   │ AAPL │ │ MSFT │ │ TSLA │  │
│ 📜 │   └──────┘ └──────┘ └──────┘  │
│    │                                  │
│ ⚙️ │   Watchlist                     │
│    │   AAPL  $225.50  ▲ 2.35%        │
│    │   MSFT  $415.25  ▲ 1.82%        │
│    │   GOOGL $145.80  ▼ 0.45%        │
│    │                                  │
└────┴──────────────────────────────────┘
  ^                    ^
Sidebar            Main Content
```

### Report Page (Split View)
```
┌──────────────────┬──────────────────┐
│                  │                  │
│  Report          │  AI Chat         │
│                  │                  │
│  Score: 8.5/10   │  💬 Ask me       │
│                  │     anything...  │
│  ┌────────────┐  │                  │
│  │Profitabil. │  │  User: Why...?   │
│  │    9.2     │  │                  │
│  └────────────┘  │  AI: Because...  │
│                  │                  │
│  Key Ratios      │  User: And...?   │
│  P/E: 28.5x      │                  │
│  ROE: 89.6%      │  AI: The reason  │
│                  │      is...       │
│  Strengths       │                  │
│  ✓ Strong brand  │  [Type here...]  │
│  ✓ High margins  │  [Send]          │
│                  │                  │
│  Red Flags       │                  │
│  ⚠ High debt     │                  │
│  ⚠ Competition   │                  │
│                  │                  │
└──────────────────┴──────────────────┘
```

### Stock Screener
```
┌─────────────────────────────────────┐
│  Stock Screener (Premium)           │
├─────────────────────────────────────┤
│  Filters:                           │
│  ┌─────────────────────────────┐   │
│  │ P/E Ratio  <  30            │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Revenue Growth  >  15%      │   │
│  └─────────────────────────────┘   │
│                                     │
│  [+ Add Filter]  [Run Screen]      │
├─────────────────────────────────────┤
│  Results (3 stocks)                 │
│  ┌───────────────────────────────┐ │
│  │Ticker│Company│Sector│Match %│ │ │
│  ├──────┼───────┼──────┼───────┤ │ │
│  │MSFT  │Micro… │Tech  │  95%  │ │ │
│  │AAPL  │Apple  │Tech  │  88%  │ │ │
│  │NVDA  │NVIDIA │Tech  │  85%  │ │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🎭 Component Examples

### Button Variants
```jsx
<Button variant="default">Primary CTA</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outlined</Button>
<Button variant="ghost">Subtle</Button>
<Button variant="destructive">Delete</Button>
```

Visual:
```
[  Primary CTA  ]  (Blue gradient)
[  Secondary  ]    (Gray background)
[  Outlined  ]     (Border only)
   Subtle          (No background)
[    Delete    ]   (Red)
```

### Input Variations
```jsx
<Input placeholder="Email" />
<Input type="password" />
<Input disabled />
<Input error="Invalid email" />
```

Visual:
```
┌────────────────────┐
│ email@example.com  │  Normal
└────────────────────┘

┌────────────────────┐
│ ••••••••••         │  Password
└────────────────────┘

┌────────────────────┐
│ Disabled           │  Disabled (gray)
└────────────────────┘

┌────────────────────┐
│ wrong@             │  Error (red border)
└────────────────────┘
❌ Invalid email
```

### Cards
```jsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

Visual:
```
┌────────────────────────────────┐
│  Title                         │
│  Description in gray           │
│  ────────────────────────────  │
│                                │
│  Content goes here...          │
│                                │
└────────────────────────────────┘
```

### Stats Card
```jsx
<StatCard
  label="Market Cap"
  value="$2.8T"
  change={2.35}
  trend="up"
  icon={<TrendingUp />}
/>
```

Visual:
```
┌────────────────────┐
│ Market Cap    📈   │
│ $2.8T   +2.35%    │
└────────────────────┘
```

### Empty State
```jsx
<EmptyState
  icon={FileText}
  title="No reports yet"
  description="Upload your first file"
  actionLabel="Get Started"
  onAction={handleUpload}
/>
```

Visual:
```
        ┌────┐
        │ 📄 │  (Large icon)
        └────┘
    No reports yet
Upload your first file
   [  Get Started  ]
```

---

## 🎞 Animations

### Page Transitions
```tsx
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.5 }}
```
Effect: Fade in + slide up

### Hover Effects
```tsx
hover:scale-105
hover:border-primary
hover:shadow-glow
```
Effect: Slight scale, border color, glow

### Loading States
```tsx
<Loader2 className="animate-spin" />
```
Effect: Spinning loader

---

## 🌈 Special Effects

### Gradient Background
```css
bg-gradient-primary
/* Deep blue to lighter blue */
```

### Glass Effect
```css
backdrop-blur-md bg-opacity-80
/* Frosted glass appearance */
```

### Glow Effect
```css
shadow-glow
/* Soft blue glow around element */
```

### Data Card
```css
data-card
/* Subtle animation on hover */
```

---

## 📊 Data Visualization

### Score Badge
```
┌─────┐
│ 8.5 │  Score ≥ 8 = Green
└─────┘
┌─────┐
│ 6.5 │  Score 6-8 = Yellow
└─────┘
┌─────┐
│ 4.2 │  Score < 6 = Red
└─────┘
```

### Trend Indicators
```
▲ 2.35%  (Green - Up)
▼ 1.45%  (Red - Down)
━ 0.00%  (Gray - Flat)
```

### Progress Bar
```
[████████████░░░░░░░░] 60%
```

### Category Scores
```
Profitability  [██████████] 9.2 Excellent
Liquidity      [████████  ] 7.8 Good
Solvency       [█████████ ] 8.5 Strong
Efficiency     [█████████ ] 8.9 Excellent
```

---

## 🎯 Interactive Elements

### Tabs
```
┌────────┬─────────┬──────────┬──────────┐
│ Active │ Profile │ Security │ Settings │
└────────┴─────────┴──────────┴──────────┘
Content for active tab...
```

### Accordion
```
▼ Section 1 (Expanded)
  Content for section 1...
  
▶ Section 2 (Collapsed)

▶ Section 3 (Collapsed)
```

### Dropdown
```
[  Select option  ▼]

↓ Click opens menu ↓

┌─────────────────┐
│ ✓ Option 1      │
│   Option 2      │
│   Option 3      │
└─────────────────┘
```

---

## 📱 Responsive Breakpoints

### Mobile (< 768px)
```
┌────────────┐
│   Header   │
├────────────┤
│  Stacked   │
│  Content   │
│            │
│  Sidebar   │
│  becomes   │
│  mobile    │
│  menu      │
└────────────┘
```

### Tablet (768px - 1024px)
```
┌──────────────────┐
│     Header       │
├───────────┬──────┤
│ Side │   Main    │
│ bar  │   area    │
│      │           │
└──────┴───────────┘
```

### Desktop (> 1024px)
```
┌─────────────────────────┐
│        Header           │
├──────┬──────────────────┤
│Side  │  Wide main area  │
│bar   │  with more space │
│      │                  │
└──────┴──────────────────┘
```

---

## 🎨 Icon Library (Lucide React)

Common icons used:
```
TrendingUp      📈
TrendingDown    📉
Upload          📤
Download        📥
Search          🔍
Filter          🔽
Settings        ⚙️
User            👤
Lock            🔒
Mail            ✉️
File            📄
Chart           📊
Alert           ⚠️
Check           ✓
X               ✕
```

---

## 🎯 Call-to-Action Patterns

### Primary CTA
```
Large blue gradient button with icon
[  Start Free Analysis  →]
```

### Secondary CTA
```
Outlined button
[  Learn More  ]
```

### Text Link
```
Underlined text with arrow
Get started →
```

---

## 📐 Form Layouts

### Single Column (Mobile)
```
┌──────────────┐
│ Full Name    │
├──────────────┤
│ Email        │
├──────────────┤
│ Password     │
├──────────────┤
│ [Submit]     │
└──────────────┘
```

### Two Column (Desktop)
```
┌─────────┬─────────┐
│ First   │  Last   │
│ Name    │  Name   │
├─────────┴─────────┤
│      Email        │
├───────────────────┤
│     Password      │
├───────────────────┤
│     [Submit]      │
└───────────────────┘
```

---

This visual guide helps understand the layout and design patterns used throughout the application. All components follow these consistent patterns for a cohesive user experience.
