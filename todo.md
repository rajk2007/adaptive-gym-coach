# Adaptive Gym Coach - Project TODO

## Phase 1: Database Schema & Infrastructure
- [x] Database schema (users, profiles, workout_plans, workout_logs, progress_logs, ai_generations)
- [x] Environment variables setup (Supabase, OpenRouter, Manus APIs)
- [x] Request secrets (OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_KEY)

## Phase 2: Authentication System
- [x] Manus OAuth integration (built-in)
- [x] Auth middleware and protected routes (tRPC protectedProcedure)
- [x] Session management (Manus OAuth cookie)

## Phase 3: Onboarding Wizard
- [x] Step 1: Body Info form (age, gender, height, weight)
- [x] Step 2: Goal Selection (muscle gain, fat loss, strength, recomposition)
- [x] Step 3: Experience Level (beginner, intermediate, advanced)
- [x] Step 4: Days Per Week & Equipment Access
- [x] Step 5: Generate First Workout Plan
- [x] Wizard progress bar and navigation
- [x] Save profile data to database

## Phase 4: AI Integration API Routes
- [x] Base plan generation endpoint (with JSON validation & retry)
- [x] Weekly adjustment endpoint (Pro only)
- [x] Diet generator endpoint (Pro only)
- [x] JSON validation utility with retry logic
- [x] Error handling and logging

## Phase 5: Dashboard
- [ ] Dashboard layout with bottom navigation
- [ ] Workout calendar view
- [ ] Progress cards
- [ ] Upcoming sessions display
- [ ] Free vs Pro dashboard variants

## Phase 6: Workout & Progress Pages
- [ ] Workout execution page (exercise details, sets/reps tracking, rest timer)
- [ ] Progress tracking page (body measurements, workout history, analytics charts)
- [ ] Profile page with user settings

## Phase 7: Subscription System
- [x] Subscription tier logic (free vs pro) - database schema
- [x] Generation count tracking - database schema
- [ ] Premium upgrade modal
- [x] Subscription guard middleware (requirePro function)
- [x] Free user generation limit enforcement (checkGenerationLimit)

## Phase 8: Admin Panel
- [x] Admin route protection (requireAdmin function)
- [x] User list with subscription status (getAllUsers)
- [x] User analytics dashboard (getAnalytics)
- [x] Subscription metrics (pro/free counts, conversion rate)
- [x] Manual tier toggle (toggleSubscription)
- [x] System health monitoring (getSystemHealth)

## Phase 9: UI Polish
- [x] Scandinavian aesthetic implementation (pale gray, bold black, pastel accents)
- [x] Dark mode default (dark theme colors)
- [ ] Mobile-first responsive design
- [ ] Smooth animations and transitions
- [ ] Loading skeletons
- [ ] Toast notifications
- [ ] Bottom navigation styling
- [ ] Geometric shapes and visual interest

## Phase 10: Testing & Delivery
- [ ] Vitest unit tests for critical functions
- [ ] End-to-end testing of user flows
- [ ] Environment variable documentation
- [ ] Deployment guide
- [ ] Final review and delivery
