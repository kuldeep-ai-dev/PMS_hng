# AI Handoff & Project Context

## 🏢 Project Overview
This project (`pms`) is a Property Management System (PMS) designed for managing users, staff, and other entities.

## 🛠️ Tech Stack
- **Framework:** Next.js (Version 16, App Router)
- **Frontend library:** React 19
- **Styling:** Tailwind CSS (v4), Custom UI components with `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`
- **Backend/Database/Auth:** Supabase (PostgreSQL, Edge Functions, Auth)
- **Forms & Validation:** `react-hook-form`, `zod`
- **Charts/Visuals:** `recharts`
- **Other Key Packages:** `puppeteer`, `nodemailer`, `react-day-picker`, `react-signature-canvas`, `sonner` for toasts.

## 📂 Key Architecture Notes
- The app uses Supabase for authentication and connects to PostgreSQL directly sometimes for data operations or via `@supabase/ssr` / `@supabase/supabase-js`.
- The database heavily relies on **PostgreSQL Triggers** and **Functions** to automate tasks, especially around user creation and activity logging.

---

## 🛑 Recent Issues & Fixes (March 2026)

### 1. Supabase Auth User Creation Error
**Symptom:** Creating a new user via Supabase Auth resulted in a "Database error creating new user".
**Root Cause:** A database trigger `auth_user_changes_trigger` (created via `setup_custom_logs.js`) fired on `INSERT` to `auth.users` and tried to immediately insert a log into `public.staff_activity_logs`. This failed with a foreign key constraint violation because the profile didn't exist yet in `public.profiles`.
**Fix Applied:** Removed the `INSERT` hook for account creation in the `log_auth_user_changes()` trigger. Also added an `IF EXISTS` check to ensure we only log `UPDATE` events (logins) if the user actually exists in the `public.profiles` table. 

### 2. Missing Profiles on Signup
**Symptom:** New users created in Supabase Auth did not appear in the `public.profiles` table.
**Root Cause:** A trigger named `handle_new_user` runs automatically "on auth user created". This function had an exception block that swallowed errors silently (`EXCEPTION WHEN OTHERS THEN RAISE WARNING...`). After logging the error to `staff_activity_logs`, we discovered it was failing with `type "user_role" does not exist`. Because the function runs as `SECURITY DEFINER`, it does not automatically search the `public` schema for custom types like Enums.
**Fix Applied:** We explicitly scoped the enum cast to the public schema: `::public.user_role` within the `handle_new_user` PL/pgSQL function. Now, when an Auth user is created, the profile is correctly generated in `public.profiles`.

---

## 🚀 How to continue
1. **Local Server:** The development server is run via `npm run dev` and starts on `localhost:3000`.
2. **Database Scripts:** Any changes to DB schemas or triggers generally have corresponding node scripts (e.g., `setup_custom_logs.js`, `scripts/extend-schema.js`). Use `node <script_name>` to apply DB changes directly via `pg` connecting with the connection string.
3. **Environment:** Key variables like `NEXT_PUBLIC_SUPABASE_URL` and keys are stored in `.env.local`.

If you are an AI agent picking up from here, make sure you double-check Database Triggers if you encounter any "silent" failures or foreign key constraints while developing feature workflows.
