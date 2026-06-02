# Supreme Packages — Business Finance Tracker

A modern web app to track income, expenses, cashflow, profit/loss, receivables, payables, and employee salaries for **Supreme Packages** (Sohaib Ahmad).

## Features

- **CSV Upload**: Upload Meezan Bank CSV statements with automatic deduplication
- **Auto-Tagging**: Transactions matched to clients/suppliers/staff using bank account numbers, Raast IDs, and name keywords
- **Unknown Account Detection**: New accounts flagged and assignable via UI
- **Interactive Dashboard**: Charts for income/expense trends, category breakdown, cash position, top counterparties
- **Client Receivables**: Track invoices sent vs payments received
- **Supplier Ledger**: Track payments + aging report (days since last payment)
- **Employee Management**: Factory workers with monthly wages
- **Cash Expense Log**: Track ATM withdrawal purposes
- **Owner Loan Tracker**: Track personal funds loaned to business
- **Transaction Filters**: Search, filter by category/type/date
- **Anomaly Detection**: Large transactions highlighted automatically
- **Reset**: Clear all transactions while preserving entity mappings
- **Password Protected**: Simple password gate for security

## Tech Stack

- **Next.js 14** (App Router, Server Actions)
- **TypeScript**
- **Tailwind CSS** + shadcn/ui components
- **Recharts** (interactive charts)
- **Drizzle ORM** + **Turso** (libSQL, free hosted SQLite)
- **iron-session** (cookie-based auth)

---

## Deployment Guide (Step by Step)

### 1. Create a Turso Database (Free)

1. Go to [app.turso.tech](https://app.turso.tech) and sign up (free)
2. Click **Create Database** → name it `supreme-packages`
3. Once created, click the database → **Settings** tab
4. Copy the **Database URL** (looks like `libsql://supreme-packages-yourname.turso.io`)
5. Create a token: click **Generate Token** → copy it

### 2. Deploy to Vercel (Free)

1. Push this project to a **GitHub repository**:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/supreme-packages.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) and sign up (free) with GitHub

3. Click **Add New** → **Project** → Import your `supreme-packages` repo

4. Before deploying, add **Environment Variables** in Vercel:

   | Key | Value |
   |-----|-------|
   | `TURSO_DATABASE_URL` | `libsql://supreme-packages-yourname.turso.io` |
   | `TURSO_AUTH_TOKEN` | The token you generated |
   | `SESSION_SECRET` | Any random 32+ character string |
   | `APP_PASSWORD` | Your login password (pick anything) |

5. Click **Deploy** — Vercel will build and deploy automatically

### 3. Set Up the Database Schema

After deploying:

```bash
# Clone the repo locally if not already
git clone https://github.com/YOUR_USERNAME/supreme-packages.git
cd supreme-packages

# Install dependencies
npm install

# Create .env.local with same values as Vercel
cp .env.example .env.local
# Edit .env.local with your Turso URL, token, session secret, and password

# Push database schema to Turso
npm run db:push

# Seed with your clients/suppliers/employees
npm run db:seed
```

### 4. Done!

Visit your Vercel URL and log in with your `APP_PASSWORD`.

**First time**: Go to **Upload Statement** → upload your Meezan CSV → the dashboard populates.

---

## Monthly Workflow

1. **Download** CSV from Meezan internet banking (Accounts → Statement → CSV)
2. **Upload** via the Upload page — duplicates auto-filtered
3. **Check** Unknown Accounts → assign any new ones
4. **Log** cash expenses in Cash Expense Log
5. **Update** receivables on Clients page (set outstanding amounts)
6. **Review** Dashboard for monthly performance

## Local Development

```bash
npm install
cp .env.example .env.local
# Fill in your Turso credentials in .env.local
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (app)/           # Authenticated routes (behind password)
│   │   ├── dashboard/   # Main dashboard with charts
│   │   ├── transactions/# Transaction list with filters
│   │   ├── upload/      # CSV upload with dedup
│   │   ├── clients/     # Client management + receivables
│   │   ├── suppliers/   # Supplier management + aging
│   │   ├── employees/   # Factory workers
│   │   ├── cash/        # Cash expense log
│   │   ├── unknown/     # Unknown account assignment
│   │   └── settings/    # Reset transactions
│   ├── login/           # Password gate
│   └── api/             # API routes
├── components/          # Shared UI components
├── db/                  # Database schema + client
├── lib/                 # Utilities, parsers, taggers, actions
└── scripts/             # Seed script
```
