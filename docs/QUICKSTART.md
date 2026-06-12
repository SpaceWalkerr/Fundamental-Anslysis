# 🚀 Quick Start Guide - FundaVision Frontend

## Get Up and Running in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

The app will open at **http://localhost:5173**

---

## 🎮 Testing the App

### 1. **Landing Page** (http://localhost:5173/)
- View hero section, features, pricing
- Click "Start Free Analysis" → Goes to Register
- Click "Login" → Goes to Login page

### 2. **Register a New Account**
- Go to `/register`
- Fill in any details (mock authentication):
  - Name: `John Analyst`
  - Email: `john@example.com`
  - Password: `Password123`
  - Check "I accept terms"
- Click "Create Account"
- You'll be automatically logged in and redirected to Dashboard

### 3. **Login**
- Go to `/login`
- Use any email/password (mock auth)
- Click "Sign In"
- Redirected to Dashboard

### 4. **Dashboard** (`/dashboard`)
- See recent reports (3 mock reports)
- View watchlist (3 stocks)
- See usage statistics
- Try quick actions:
  - Click "Start New Analysis" → Go to upload page
  - Click "Search Company" → Search functionality

### 5. **New Analysis** (`/dashboard/analyze`)
**Option A: Upload File**
- Drag and drop a PDF/Excel/CSV file
- Or click to browse
- See upload progress animation
- Mock processing takes ~3 seconds
- Redirected to report page

**Option B: Search Company**
- Type "Apple" or "AAPL"
- See search results
- Click a company
- Mock analysis generated

### 6. **Analysis Report** (`/dashboard/report/1`)
- View comprehensive financial analysis:
  - Overall score (8.5/10)
  - 4 category metrics
  - 6 key ratios
  - Strengths and red flags
  - Investment assessment
- **Try the Chat**:
  - Ask: "Why is the debt high?"
  - Ask: "What's driving revenue growth?"
  - Ask: "How are the margins?"
  - AI responds with contextual answers

### 7. **Stock Screener** (`/dashboard/scanner`) - Premium Feature
- Click "Add Filter"
- Select criteria:
  - Field: P/E Ratio
  - Operator: <
  - Value: 30
- Add more filters (e.g., Revenue Growth > 15%)
- Click "Run Screener"
- See results table with 3 mock stocks
- Sort by any column

### 8. **History** (`/dashboard/history`)
- See all past reports (6 mock reports)
- Search by company or ticker
- Click report to view
- Delete reports

### 9. **Settings** (`/dashboard/settings`)
- **Profile Tab**: Update name, email, avatar
- **Subscription Tab**: View plan (Premium), usage, upgrade options
- **Notifications Tab**: Toggle email preferences
- **Security Tab**: Change password, enable 2FA

---

## 🎨 UI Features to Explore

### 1. **Responsive Design**
- Resize browser window
- Sidebar collapses on mobile
- Report view switches to stacked on mobile
- All components adapt smoothly

### 2. **Animations**
- Page transitions (fade + slide)
- Hover effects on cards
- Loading spinners
- Progress bars
- Success animations

### 3. **Interactive Elements**
- Collapsible sidebar (arrow button)
- Tabs in Settings
- Sortable tables in Stock Screener
- Drag-and-drop file upload
- Toast notifications

### 4. **Theme**
- Dark theme by default
- Bloomberg Terminal aesthetic
- Electric blue accent color
- Teal for premium features

---

## 🧪 Mock Data

All data is currently mocked for frontend testing:

### Mock Reports
- Apple Inc. (AAPL) - Score: 8.5
- Microsoft (MSFT) - Score: 9.1
- Tesla (TSLA) - Score: 6.2

### Mock User
- Name: John Analyst
- Email: Whatever you enter
- Plan: Premium (after login)
- Reports Used: 12 / 999

### Mock Chat Responses
The AI responds to keywords:
- "revenue" → Revenue growth explanation
- "debt" → Debt analysis
- "margin" → Margin analysis
- Other → Generic response

---

## 🔧 Development Tips

### Hot Reload
- Save any file → Browser auto-refreshes
- CSS changes → Instant update
- Component changes → Fast refresh

### View State
- Open React DevTools
- Check Zustand stores in console:
```javascript
// In browser console
JSON.parse(localStorage.getItem('auth-storage'))
```

### Check Routes
Available routes:
```
/                          Landing Page
/login                     Login
/register                  Register
/dashboard                 Dashboard
/dashboard/analyze         New Analysis
/dashboard/report/:id      Report Detail
/dashboard/scanner         Stock Screener
/dashboard/history         History
/dashboard/settings        Settings
```

---

## 📦 What's Working

✅ All pages render correctly  
✅ Navigation works  
✅ Forms validate  
✅ Mock authentication  
✅ File upload UI (not processed)  
✅ Chat interface (mock responses)  
✅ Stock screener filtering  
✅ Report history  
✅ Settings management  
✅ Responsive design  
✅ Animations  

---

## ⚠️ Known Limitations (Frontend Only)

❌ No real AI analysis (mock data)  
❌ Files not actually processed  
❌ Auth is simulated (any login works)  
❌ No backend API calls  
❌ Data not persisted (except localStorage)  
❌ Stock prices are hardcoded  

**These will be fixed when backend is integrated!**

---

## 🐛 Common Issues

### Port Already in Use
```bash
# Kill process on port 5173
npx kill-port 5173
npm run dev
```

### Dependencies Not Installing
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
```bash
# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

## 📝 Next Steps

Once you've tested the frontend:

1. ✅ **Frontend Complete** - You're here!
2. 🔄 **Backend Setup** - Build FastAPI server
3. 🤖 **AI Integration** - Connect OpenAI/Claude
4. 🗄️ **Database** - PostgreSQL setup
5. 🔗 **API Connection** - Replace mock API
6. 🧪 **Full Testing** - End-to-end tests
7. 🚀 **Deployment** - Vercel (frontend) + Railway (backend)

---

## 💡 Pro Tips

1. **Use Mock Login**: Any email/password works (saves time)
2. **Check Console**: Logs show state changes and API calls
3. **Test Responsive**: Use Chrome DevTools mobile view
4. **Try Chat**: Ask different questions to see responses
5. **Explore Settings**: All tabs are functional

---

## 🎉 You're Ready!

The frontend is **fully functional** and ready for demo/testing. When you're ready to proceed with backend development, we'll connect these mock API calls to real services.

**Happy Testing! 🚀**
