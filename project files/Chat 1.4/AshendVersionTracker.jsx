import { useState, useEffect } from "react";

const PLAN = [
  {
    phase: "Phase 1: Foundation", color: "#c9a84c",
    weeks: [
      { week: 1, title: "Dev Environment Setup", tasks: [
        { id: "1-1", text: "Download and install Node.js" },
        { id: "1-2", text: "Verify Node.js: run node --version" },
        { id: "1-3", text: "Download and install VS Code" },
        { id: "1-4", text: "Verify VS Code: run code --version" },
        { id: "1-5", text: "Download and install Git" },
        { id: "1-6", text: "Verify Git: run git --version" },
        { id: "1-7", text: "Configure Git name" },
        { id: "1-8", text: "Configure Git email" },
        { id: "1-9", text: "Create GitHub account" },
        { id: "1-10", text: "Create Vercel account" },
        { id: "1-11", text: "Create Supabase account" },
        { id: "1-12", text: "Deploy prototype to Vercel" },
      ]},
      { week: 2, title: "Database Design", tasks: [
        { id: "2-1", text: "Create Supabase project" },
        { id: "2-2", text: "Build users table" },
        { id: "2-3", text: "Build cigars table" },
        { id: "2-4", text: "Build checkins table" },
        { id: "2-5", text: "Build ratings table" },
        { id: "2-6", text: "Set foreign keys linking all tables" },
        { id: "2-7", text: "Add updated_at column to all four tables" },
      ]},
      { week: 3, title: "Authentication", tasks: [
        { id: "3-1", text: "Install Supabase JS library" },
        { id: "3-2", text: "Create src/supabase.js" },
        { id: "3-3", text: "Build Auth.js -- sign up and login screens" },
        { id: "3-4", text: "Wire authentication into App.js" },
        { id: "3-5", text: "Test: create a real account" },
        { id: "3-6", text: "Test: log in and log out successfully" },
        { id: "3-7", text: "Add forgot password flow" },
        { id: "3-8", text: "Add username vs. real name display preference" },
        { id: "3-9", text: "Test: both users can create accounts" },
      ]},
      { week: 4, title: "Cigar Search + AI Data Layer", tasks: [
        { id: "4-1", text: "Set up Anthropic API key" },
        { id: "4-2", text: "Create .env file with REACT_APP_ANTHROPIC_KEY" },
        { id: "4-3", text: "Create cigarAI.js with searchCigarLines and getVitolas" },
        { id: "4-4", text: "Implement 3-level search flow: search > line > vitola" },
        { id: "4-5", text: "Seamless db+AI merge with onPartialResults callbacks" },
        { id: "4-6", text: "Deduplicated inserts" },
        { id: "4-7", text: "Alphabetical sorting of all results" },
        { id: "4-8", text: "Remove price/msrp from UI and database" },
        { id: "4-9", text: "Autocomplete dropdown in search bar" },
        { id: "4-10", text: "Featured cigars shown on home screen" },
        { id: "4-11", text: "Test: search a cigar, select a line, view vitolas" },
        { id: "4-12", text: "NOTE: Search is DB-first then AI-fill. Pre-seeding the DB with top cigars eliminates AI costs on common searches. Full seed script planned for Week 29 pre-launch." },
      ]},
      { week: 5, title: "Check-In Flow", tasks: [
        { id: "5-1", text: "Build Log a Smoke screen" },
        { id: "5-2", text: "Add rating slider (0-10 scale)" },
        { id: "5-3", text: "Add tasting notes with sub-scores" },
        { id: "5-4", text: "Add tooltip explainers for each rating category" },
        { id: "5-5", text: "Add value for price field" },
        { id: "5-6", text: "Add date and location fields" },
        { id: "5-7", text: "Add voice-to-text microphone button" },
        { id: "5-8", text: "Save check-ins to Supabase" },
        { id: "5-9", text: "Overall score auto-calculates from sub-scores" },
        { id: "5-10", text: "Add personal saved places" },
        { id: "5-11", text: "Test: log a real cigar and see it in profile history" },
      ]},
      { week: 6, title: "Polish & Deploy v1", tasks: [
        { id: "6-1", text: "Connect all screens to real data" },
        { id: "6-2", text: "Build profile page with history and stats" },
        { id: "6-3", text: "General UI polish pass" },
        { id: "6-4", text: "Deploy v1 to Vercel" },
        { id: "6-5", text: "Invite friend to test" },
        { id: "6-6", text: "Create wishlist table in Supabase" },
        { id: "6-7", text: "Add Wishlist button to cigar detail page" },
        { id: "6-8", text: "Add Wishlist button to BandScanner result screen" },
        { id: "6-9", text: "Add Wishlist tab to profile page" },
        { id: "6-10", text: "Allow removing cigars from wishlist" },
        { id: "6-11", text: "Wishlist public by default with private toggle" },
      ]},
    ]
  },
  {
    phase: "Phase 2: AI Features", color: "#7a9a7a",
    weeks: [
      { week: 7, title: "Camera Integration", tasks: [
        { id: "7-1", text: "Camera reserved for AI band identification only" },
        { id: "7-2", text: "No user-submitted photos -- moderation risk" },
        { id: "7-3", text: "Cigar imagery: SVG placeholders now, brand photos at launch" },
      ]},
      { week: 8, title: "AI Band Identification (Part 1)", tasks: [
        { id: "8-1", text: "Send captured band photo to vision AI" },
        { id: "8-2", text: "Write structured identification prompt" },
        { id: "8-3", text: "Parse and display returned cigar data" },
        { id: "8-4", text: "Test: photo a band, get back brand/line/vitola/strength/origin" },
      ]},
      { week: 9, title: "AI Band Identification (Part 2)", tasks: [
        { id: "9-1", text: "Handle low-confidence results -- fallback to manual search" },
        { id: "9-2", text: "Cache identified cigars into database automatically" },
        { id: "9-3", text: "Add Flag incorrect info button" },
        { id: "9-4", text: "Full identification flow working end to end" },
      ]},
      { week: 10, title: "AI Recommendation Engine (Part 1)", tasks: [
        { id: "10-1", text: "Pull user check-in history and ratings from Supabase" },
        { id: "10-2", text: "Design recommendation prompt based on taste profile" },
        { id: "10-3", text: "Test prompt returns quality recommendations" },
      ]},
      { week: 11, title: "AI Recommendation Engine (Part 2)", tasks: [
        { id: "11-1", text: "Build Recommended for You screen" },
        { id: "11-2", text: "Refresh recommendations when new check-ins added" },
        { id: "11-3", text: "Test: personalized recommendations reflect actual ratings" },
      ]},
      { week: 12, title: "AI Tasting Notes Assistant", tasks: [
        { id: "12-1", text: "AI suggests tasting note descriptors during check-in" },
        { id: "12-2", text: "User can tap suggested notes instead of typing" },
        { id: "12-3", text: "Test: faster, smarter check-in experience" },
      ]},
      { week: 13, title: "My Humidor", tasks: [
        { id: "13-1", text: "Create humidor table in Supabase: id, user_id, cigar_id(nullable), cigar_name, cigar_brand, cigar_vitola, quantity, added_at, notes" },
        { id: "13-2", text: "Add Humidor tab to nav alongside Wishlist" },
        { id: "13-3", text: "Add to Humidor button on cigar detail page and BandScanner result screen" },
        { id: "13-4", text: "Add Mark as Purchased on wishlist items -- moves cigar from wishlist to humidor" },
        { id: "13-5", text: "Smoke One button on humidor items -- opens CheckIn pre-filled, decrements quantity by 1, removes at 0" },
        { id: "13-6", text: "Remove button for cigars that left humidor without being smoked" },
        { id: "13-7", text: "Optional aging notes field per cigar (e.g. aging until Christmas)" },
        { id: "13-8", text: "Scan single cigar band to add to humidor -- AI identifies, user confirms, user can edit vitola if not detected" },
        { id: "13-9", text: "Scan multiple cigars at once -- one photo of several bands, AI returns array of identified cigars, user confirms each with quantity before saving" },
        { id: "13-10", text: "Test: add cigars via search, band scan, and wishlist. Smoke one and verify quantity decrements." },
      ]},
      { week: 14, title: "AI Drink Pairing Suggestions", tasks: [
        { id: "14-1", text: "Create pairings table in Supabase: id, cigar_id(FK->cigars), spirits(text), beer(text), coffee(text), non_alcoholic(text), notes(text), created_at. Pairings stored at line level (not per vitola)." },
        { id: "14-2", text: "Add 'Drink Pairings' button on cigar detail page -- tapping opens a modal/popup overlay" },
        { id: "14-3", text: "Pairings modal shows four categories: Spirits, Beer, Coffee, Non-Alcoholic. Each has 2-3 AI suggestions. Close button dismisses modal." },
        { id: "14-4", text: "Modal checks DB first -- if pairings exist for that cigar_id, load instantly. If not, call Haiku, display, and save to DB for all future users." },
        { id: "14-5", text: "AI generates pairings based on strength, wrapper, origin, flavor" },
        { id: "14-6", text: "Add seasonal pairing adjustments" },
        { id: "14-7", text: "Add suggest alternative option within modal if user does not drink a certain category (e.g. does not drink bourbon)" },
        { id: "14-8", text: "Test: view pairings on same cigar twice -- second load should be instant from DB with no API call" },
      ]},
    ]
  },
  {
    phase: "Phase 3: Social & Growth", color: "#7a8a9a",
    weeks: [
      { week: 16, title: "Friend System (Part 1)", tasks: [
        { id: "16-1", text: "Create friends table in Supabase: id, requester_id(FK->users), recipient_id(FK->users), status(pending/accepted), created_at" },
        { id: "16-2", text: "Send friend request by username, email, or QR code" },
        { id: "16-3", text: "Accept/decline friend requests -- pending requests shown on profile page" },
        { id: "16-4", text: "Friend list visible on profile page" },
        { id: "16-5", text: "Search tab: show Find Friends prompt when user has no friends yet. Once friends added, show Feed instead of featured cigars." },
      ]},
      { week: 17, title: "Friend System (Part 2) -- Feed & Fire", tasks: [
        { id: "17-1", text: "Build Feed on Search screen -- hybrid: friends check-ins first, then recent global public check-ins tagged as Community" },
        { id: "17-2", text: "Feed card shows: username, cigar brand/line/vitola, rating, time ago, strength badge" },
        { id: "17-3", text: "Add Fire button on each feed card -- Ashed equivalent of Untappd Toast. Cannot fire your own check-ins." },
        { id: "17-4", text: "Fire count shown on each check-in card. Fires stored in fires table." },
        { id: "17-5", text: "Tap any feed card to open bottom sheet modal -- shows full check-in detail, fire button, comments" },
        { id: "17-6", text: "Comments: load from comments table, post new comments, one comment per user per conversation" },
        { id: "17-7", text: "Private check-ins (is_private = true) never appear in feed" },
        { id: "17-8", text: "Humidor: added Search to Add button alongside Scan to Add -- tapping switches to Search tab" },
        { id: "17-9", text: "Friend request notification badge on Friends button -- red dot with count appears when pending requests exist, clears on open, refreshes after accept/decline" },
      ]},
      { week: 18, title: "Badges & Achievements (Part 1)", tasks: [
        { id: "18-1", text: "Design badge definitions: 17 badges across 4 categories (milestone, variety, social, referral)" },
        { id: "18-2", text: "Create badges table in Supabase: id, key, name, description, icon, category, created_at" },
        { id: "18-3", text: "Create user_badges table in Supabase: id, user_id(FK), badge_key(FK), awarded_at. Unique constraint on user_id+badge_key." },
        { id: "18-4", text: "Seed badges table with all 17 badge definitions" },
        { id: "18-5", text: "Build badgeEngine.js: checkAndAwardBadges(userId, trigger), fetchUserBadges(userId). Triggers: checkin, fire, fire_received, comment." },
        { id: "18-6", text: "Build Badges.js: displays earned/locked badges on profile grouped by category with progress bar. Earned badges show award date." },
        { id: "18-7", text: "Wire badge checks: CheckIn.js fires on save, Feed.js fires on fire toggle (both giver and receiver), FeedModal.js fires on comment post" },
        { id: "18-8", text: "Add Badges section to profile tab in App.js above Smoking History" },
        { id: "18-9", text: "Founding Member badge: awarded to first 100 users by created_at order" },
        { id: "18-10", text: "Referral badges (Ambassador, Recruiter, Legend Maker) stubbed -- will activate when referral tracking built in Week 19" },
      ]},
      { week: 19, title: "Badges & Achievements (Part 2) + Referral Tracking", tasks: [
        { id: "19-1", text: "Build referral tracking: unique referral links per user (ashed.vercel.app?ref=username)" },
        { id: "19-2", text: "Create referrals table: id, referrer_id, referred_id, created_at" },
        { id: "19-3", text: "Award Ambassador/Recruiter/Legend Maker badges automatically when referral milestones hit" },
        { id: "19-4", text: "Test: badges award correctly at right thresholds for all categories" },
        { id: "19-5", text: "Test: referral link flow works end to end" },
      ]},
      { week: 20, title: "Venue & Shop Finder (Part 1)", tasks: [
        { id: "20-1", text: "Set up Google Places API key + Maps JavaScript API + Geocoding API + Places API (New). Added GOOGLE_PLACES_KEY to Vercel environment variables (server-side only, not REACT_APP_ prefix)." },
        { id: "20-2", text: "Build Vercel serverless proxy at api/places.js -- handles geocode, search, and autocomplete actions server-side to avoid CORS and keep API key off frontend" },
        { id: "20-3", text: "Build Venues.js: city/zip search with autocomplete dropdown, GPS location detection, nearby cigar shop results via Google Places textSearch" },
        { id: "20-4", text: "Search query includes: cigar shop, cigar lounge, tobacconist, tobacco shop, tobacco store, smoke shop -- broad enough to catch Tobacco Depot style venues" },
        { id: "20-5", text: "Venue card shows: name, address, distance, Google star rating, open/closed status. Tap to expand: Directions (Apple Maps on iOS, Google Maps elsewhere) and Call buttons." },
        { id: "20-6", text: "Add Venues as 5th nav tab with custom SVG cigar shop icon (storefront + awning, gold when active)" },
        { id: "20-7", text: "iOS-specific location denied message directs to Settings → Privacy & Security → Location Services → Safari" },
        { id: "20-8", text: "vercel.json added to project root for proper API route + SPA routing configuration" },
      ]},
      { week: 21, title: "Venue & Shop Finder (Part 2)", tasks: [
        { id: "21-1", text: "Add List/Map toggle on Venues tab -- toggle only shows when results are loaded" },
        { id: "21-2", text: "Map view using Leaflet + OpenStreetMap tiles -- no additional API key needed" },
        { id: "21-3", text: "Map shows venue pins for current search results, auto-fits bounds to show all results" },
        { id: "21-4", text: "Blue pulsing dot shows user current location on map when GPS was granted" },
        { id: "21-5", text: "Tap a pin to see venue name, address, rating and View Details button that switches to list view" },
        { id: "21-6", text: "Add venue location lookup to CheckIn.js -- Find venue button opens search panel, results tap to set location field" },
        { id: "21-7", text: "Verified partner badge on map pins -- skipped, will build in Week 24 with partner dashboard" },
      ]},
      { week: 22, title: "Notifications", tasks: [
        { id: "22-1", text: "Push notification when friend logs highly rated cigar" },
        { id: "22-2", text: "Notification when your pairing gets upvoted" },
        { id: "22-3", text: "Notification when you earn a badge" },
        { id: "22-4", text: "Birthday notification" },
        { id: "22-5", text: "FRIENDS: Show outgoing (sent) friend requests in the Requests tab of Friends.js alongside incoming requests. Add Cancel button to withdraw a pending sent request. Query: friends table where requester_id = current user AND status = pending." },
      ]},
      { week: 23, title: "Polish, Community & Admin", tasks: [
        { id: "23-1", text: "General UI polish based on real usage feedback" },
        { id: "23-2", text: "Add private mode -- profile visible to friends only" },
        { id: "23-3", text: "Add data export for users (GDPR-friendly)" },
        { id: "23-4", text: "Post on r/cigars to recruit beta users" },
        { id: "23-5", text: "Cigar detail screen: show community average rating at the LINE level (brand + name, not vitola) -- all check-ins for that cigar regardless of size. Only show once 3+ ratings exist." },
        { id: "23-6", text: "Tappable rating drill-down: user taps the community rating and a modal shows a chart breaking down avg rating and count per vitola. Only show vitolas with 3+ ratings, others show not enough data yet." },
        { id: "23-7", text: "Personal fit indicator for users with 5+ check-ins -- High/Medium/Low match with one-line reason based on taste profile. Shown on cigar detail via search AND band scanner result screen." },
        { id: "23-8", text: "Update avg_rating on cigars table automatically when new check-ins are saved" },
        { id: "23-9", text: "Design decision documented: ratings are line-level aggregates (not per-vitola) for clean community data. Vitola breakdown available on demand via drill-down chart." },
        { id: "23-10", text: "ADMIN: Build browser-based admin console at admin.ashed.app (separate React app, password protected)" },
        { id: "23-11", text: "ADMIN: Add admin boolean column to users table (or user_roles table for future flexibility)" },
        { id: "23-12", text: "ADMIN: User management -- search, view, delete, flag accounts" },
        { id: "23-13", text: "ADMIN: Content moderation queue -- reported comments, remove content" },
        { id: "23-14", text: "ADMIN: Badge management -- view who has what, manually award/revoke" },
        { id: "23-15", text: "ADMIN: Stats dashboard -- signups over time, check-ins per day, top cigars" },
        { id: "23-16", text: "ADMIN: Remove test accounts and delete all test data before launch" },
      ]},
    ]
  },
  {
    phase: "Phase 4: Monetization", color: "#9a7a9a",
    weeks: [
      { week: 24, title: "Venue Partner Dashboard (Part 1)", tasks: [
        { id: "24-1", text: "Build web dashboard for lounge owners" },
        { id: "24-2", text: "Lounge can manage their listing and inventory" },
      ]},
      { week: 25, title: "Venue Partner Dashboard (Part 2)", tasks: [
        { id: "25-1", text: "Display lounge inventory to nearby users" },
        { id: "25-2", text: "Push notification capability to lounge followers" },
        { id: "25-3", text: "Check-in data analytics visible to lounge owner" },
      ]},
      { week: 26, title: "Premium Tier", tasks: [
        { id: "26-1", text: "Define free vs paid features -- Free: unlimited check-ins, search, wishlist (20 max), humidor (basic), profile, filters, voice notes. Premium: AI recommendations (auto), band scanner (premium only -- free tier shows upgrade prompt), AI drink pairings, AI Concierge, personal fit score, unlimited wishlist/humidor, advanced stats, data export, Premium badge" },
        { id: "26-2", text: "Integrate Stripe for subscriptions -- $7.99/month or $59.99/year. Founding Member rate $39.99/year locked in forever for first 500 users." },
        { id: "26-3", text: "Build premium feature gates in code" },
        { id: "26-4", text: "Implement 7-day reverse trial -- new users get full premium free, then downgrade (higher conversion rate)" },
        { id: "26-5", text: "Build upgrade prompt screens -- band scanner (premium only), wishlist cap (20), recommendations auto mode" },
        { id: "26-6", text: "Add Premium badge to profile page for subscribers" },
        { id: "26-7", text: "Build advanced stats screen -- monthly trends, flavor profile chart, brand breakdown (premium only)" },
      ]},
      { week: 27, title: "Legal, Compliance & Age Gate", tasks: [
        { id: "27-1", text: "Add age verification gate at registration -- user must confirm they are 21 or older before account is created. One-time only, stored on user record." },
        { id: "27-2", text: "Add one-time onboarding health disclaimer on first login after registration" },
        { id: "27-3", text: "Include tobacco health liability disclaimer in Terms of Service -- app does not encourage smoking, is a journal tool for existing adult enthusiasts only" },
        { id: "27-4", text: "Set up Termly (termly.io, ~$10-20/month) to generate and host ToS and Privacy Policy -- auto-updates for GDPR/CCPA compliance" },
        { id: "27-5", text: "Register Ashed trademark with USPTO" },
        { id: "27-6", text: "Evaluate co-founder NDA and agreement with sales partner -- consult IP/startup attorney for one-time session" },
        { id: "27-7", text: "Lock down social media handles (Instagram, X, Reddit, TikTok)" },
        { id: "27-8", text: "Write first 5 lounge outreach emails" },
        { id: "27-9", text: "Post about Ashed on r/cigars" },
      ]},
      { week: 28, title: "Security Hardening", tasks: [
        { id: "28-1", text: "SECURITY - Move Anthropic API key to Vercel serverless/edge functions -- key is currently exposed in frontend code and visible in browser dev tools. Highest priority security fix before public launch." },
        { id: "28-2", text: "SECURITY - Enable Supabase RLS (Row Level Security) on all tables -- currently disabled. Add user-scoped policies so users can only read/write their own data. Claude will write all RLS SQL policies." },
        { id: "28-3", text: "SECURITY - Rate limiting: add per-user rate limits on AI features (recommendations, concierge, pairings) to prevent abuse." },
        { id: "28-4", text: "SECURITY - Implement server-side premium status verification before allowing band scanner Opus calls -- never trust frontend-only feature gates." },
        { id: "28-5", text: "SECURITY - Input sanitization: audit all text fields that write to Supabase and ensure inputs are sanitized to prevent injection attacks." },
        { id: "28-6", text: "SECURITY - Audit Vercel environment variables -- confirm no secrets exposed in build output. No sensitive keys should be prefixed REACT_APP_ as those are bundled into frontend code." },
      ]},
      { week: 29, title: "Launch Prep & Polish", tasks: [
        { id: "29-1", text: "Set up PostHog analytics (free tier)" },
        { id: "29-2", text: "Configure Supabase custom SMTP (noreply@ashedapp.com)" },
        { id: "29-3", text: "Accessibility pass -- convert all fixed px font sizes to rem units so app respects system font size settings" },
        { id: "29-4", text: "Verify viewport meta tag in public/index.html: width=device-width, initial-scale=1.0" },
        { id: "29-5", text: "Build Help & Support screen -- ToS/Privacy links, bug report form, feedback submission, app help guide" },
        { id: "29-6", text: "Bug report and feedback forms submit to Supabase table and trigger email notification to admin" },
        { id: "29-7", text: "Write app help guide -- how to log a smoke, band scanner, recommendations, humidor, wishlist, AI concierge" },
        { id: "29-8", text: "Build Cigar Guide / Learn screen -- vitola size chart, body/strength guide, wrapper types, origins guide, tasting terms glossary" },
        { id: "29-9", text: "Decide free vs premium for Cigar Guide -- basic definitions free, deep dive content premium" },
        { id: "29-10", text: "Pre-seed cigars database with top 150-200 cigar lines -- PARTIALLY DONE. Batches 1-7 complete: 30 brands, 134 lines, 784 vitolas. Batch 8+ to continue before launch." },
        { id: "29-11", text: "Seed list: top 10 brands by volume plus boutique favorites -- IN PROGRESS. Batch 8 priority gaps: Rocky Patel (Twentieth Anniversary, Burnt Offerings, 1961), Macanudo (Hyde Park, Vintage, Inspirado Blue), LFD (Ligero Oscuro, Reserva Especial), CAO (MX2, Flathead Steel Horse), Montecristo Open line." },
        { id: "29-12", text: "Reach out to cigar brands for press kit images" },
        { id: "29-13", text: "Reach out to retailers for product photography permission" },
        { id: "29-14", text: "Plan native mobile app build (iOS & Android)" },
        { id: "29-15", text: "Build What's New modal -- shown once to users after each app update" },
        { id: "29-16", text: "Write What's New content for v1.0 launch" },
        { id: "29-17", text: "Build Settings screen: account (display name, username, password), privacy (private profile, default check-ins private), appearance (dark/light mode toggle), sign out. Accessed via gear icon on Journal tab." },
        { id: "29-18", text: "Move Sign Out from header into Settings screen" },
        { id: "29-19", text: "Dark/light mode toggle: stores preference in localStorage and users table so it persists across devices" },
        { id: "29-20", text: "Build onboarding tour -- shown once on first login after account confirmation. One screen per major feature with Next and Skip Tour buttons on every screen. Skip dismisses the entire tour immediately. Features covered: Journal, Feed, Band Scanner, Humidor, Wishlist, Recommendations, Drink Pairings, Venues, Badges, Referrals. Mark paid features with a Premium badge." },
        { id: "29-21", text: "Store tour_completed boolean on user record so it never shows again after first viewing" },
        { id: "29-22", text: "Add Replay Tour option in Help & Support screen so users can revisit the tour anytime" },
        { id: "29-23", text: "REVIEW: Complete API cost audit -- review all Anthropic API calls (Haiku vs Opus usage, pairings caching, recommendations), Google Places call frequency, estimate monthly cost at 100/1k/10k users, identify any redundant or over-fetching patterns" },
        { id: "29-24", text: "REVIEW: Complete security audit before iOS/Android publish -- verify all API keys are server-side only, RLS policies cover all tables, rate limiting in place, no sensitive data in frontend bundle, all user inputs sanitized. Run OWASP top 10 checklist." },
        { id: "29-25", text: "FIRST-LOGIN WELCOME MESSAGE: Show a one-time welcome modal on very first login (before onboarding tour). Explains what Ashed is and the problems it solves for cigar enthusiasts. Content TBD. Dismissed with a single Got It button. Stored via first_login_complete boolean on user record. Never shown again." },
        { id: "29-26", text: "USER-SUBMITTED CIGARS: Add submitted_by_user boolean column (default false) and submitted_by_user_id FK to cigars table. When user searches and finds nothing, show a Can't find your cigar? button that opens a submission form (brand, line, vitola, strength, wrapper). Haiku verifies the submission looks like a real cigar before saving -- checks for plausible brand/line combination, not gibberish. Saves to cigars table with submitted_by_user = true. User can immediately check it in." },
        { id: "29-27", text: "USER-SUBMITTED CIGARS -- ADMIN QA: Add user-submitted cigars queue to the Week 23 admin console. Shows all cigars where submitted_by_user = true that have not yet been reviewed. Admin can approve (mark verified = true), edit fields, or delete duplicates/junk. Goal: catch bad data without blocking users from checking in." },
        { id: "29-28", text: "AUTO-DEDUP PROCESS: Build a scheduled Vercel cron job (nightly) that scans for duplicate cigars created by user submissions. Dedup logic: normalize brand + line + vitola (lowercase, trim whitespace, collapse extra spaces), find exact matches, merge all ratings/checkins/humidor/wishlist entries onto the oldest record, delete the duplicate. Runs silently in background. Log results to a dedup_log table for admin review." },
        { id: "29-29", text: "DB REFRESH PROCESS: Determine cadence (recommendation: monthly). Build a Vercel cron that prompts Haiku with the current list of brands in our DB and asks it to identify likely new lines released in the past 30 days based on its training knowledge. Returns a list of candidate lines to review -- does NOT auto-insert. Admin reviews the list in the admin console and manually seeds verified new lines. Cadence: monthly cron, admin reviews within a week of each run." },
      ]},
      { week: 30, title: "Native Mobile App", tasks: [
        { id: "30-1", text: "Set up React Native project" },
        { id: "30-2", text: "Port PWA screens to native components" },
        { id: "30-3", text: "Add biometric / Face ID authentication" },
        { id: "30-4", text: "Submit to Apple App Store" },
        { id: "30-5", text: "Submit to Google Play Store" },
      ]},
    ]
  },
  {
    phase: "Phase 5: Future Features", color: "#6a7a6a",
    weeks: [
      { week: 31, title: "AI Concierge -- What Should I Smoke Tonight", tasks: [
        { id: "31-1", text: "Build AI Concierge as a section within the Humidor tab -- button at top of humidor screen" },
        { id: "31-2", text: "Concierge shows 6 criteria as pill-button rows -- user taps one per row in ~15 seconds" },
        { id: "31-3", text: "Criteria: (1) Time Available: 30min or less / 45-60min / 1.5-2hrs / All the time in the world. (2) Occasion: Solo/unwinding / With friends / Celebrating / After a meal / Morning. (3) Mood: Relaxed and mellow / Focused and complex / Bold and full / Surprise me. (4) Setting: Outdoors/porch / Cigar lounge / Indoors at home / Traveling. (5) Drinking: Nothing / Coffee / Whiskey/bourbon / Beer / Wine / Non-alcoholic. (6) How you feel: Need to unwind / Celebratory / Already relaxed / Adventurous" },
        { id: "31-4", text: "User taps Find My Cigar -- AI receives all 6 criteria plus full humidor inventory and recommends best 1-2 matches with a reason for each" },
        { id: "31-5", text: "Result shows cigar card(s) with brand, line, and why it fits the moment. Smoke One button opens CheckIn directly." },
        { id: "31-6", text: "Test: all criteria combinations return sensible, personalized recommendations from humidor" },
      ]},
      { week: 32, title: "Social Feed Enhancements", tasks: [
        { id: "32-1", text: "Show wishlist adds in feed -- friend added X to their wishlist" },
        { id: "32-2", text: "Show humidor adds in feed -- friend added X to their humidor" },
        { id: "32-3", text: "Show badge earned in feed -- friend earned the Centurion badge" },
        { id: "32-4", text: "Filter feed by type: check-ins only / all activity" },
      ]},
      { week: 33, title: "Cigar Shop -- Order for Delivery", tasks: [
        { id: "33-1", text: "Research cigar retailer affiliate/API partnerships (Famous Smoke Shop, Cigars International, JR Cigars)" },
        { id: "33-2", text: "Build Shop tab -- browse cigars available for purchase/delivery" },
        { id: "33-3", text: "Deep link from cigar detail page to buy that cigar from a partner retailer" },
        { id: "33-4", text: "Affiliate revenue tracking -- commission on purchases driven from Ashed" },
        { id: "33-5", text: "Show shop button on wishlist items -- one tap to buy something on your wishlist" },
      ]},
      { week: 35, title: "Merch Store", tasks: [
        { id: "35-1", text: "Research print-on-demand / dropship partners (Printful, Printify, Spring) for Ashed and cigar-branded merchandise" },
        { id: "35-2", text: "Design initial merch: Ashed logo tee, cigar-themed items, branded accessories" },
        { id: "35-3", text: "Integrate merch store into app -- new Shop tab or section within existing Venues/Shop tab" },
        { id: "35-4", text: "Deep link to external store or embed product listings in-app" },
        { id: "35-5", text: "Merch revenue tracking -- profit margin per item after fulfillment costs" },
      ]},
      { week: 34, title: "Band Scanner Cost Optimization", tasks: [
        { id: "34-1", text: "Test Option 1: Google Cloud Vision OCR to extract band text, then Haiku to identify cigar (~$0.0025/scan vs $0.053 with Opus). Best accuracy at lowest cost." },
        { id: "34-2", text: "Test Option 2: Haiku-only vision -- track accuracy as models improve. Likely to match Opus quality within 12-18 months at a fraction of the cost." },
        { id: "34-3", text: "Switch from Opus to winning architecture when accuracy is acceptable. Band scanner is premium-only so cost only scales with paying users." },
      ]},
      { week: 36, title: "Groups -- Lounge & Shop Communities", tasks: [
        { id: "36-1", text: "DECISION DOCUMENTED: Groups are lounge/shop-only in v1 -- no user-created groups. Rationale: lounge groups tie directly to B2B revenue (venues pay for the dashboard, groups are a feature of that), avoid moderation overhead of user-created groups, and create a natural engagement loop (lounge creates group → members join → check-ins and activity appear in group feed → lounge sees value → stays subscribed). User-created groups deferred to Phase 6 based on demand." },
        { id: "36-2", text: "Create groups table: id, name, venue_id (FK->places), created_by (FK->users), description, is_public, created_at" },
        { id: "36-3", text: "Create group_members table: id, group_id (FK->groups), user_id (FK->users), joined_at, role (member/admin)" },
        { id: "36-4", text: "Lounge partner dashboard (Week 24-25) gets Create Group button -- lounge owner creates and manages the group for their venue" },
        { id: "36-5", text: "Users can discover and join lounge groups from the venue detail screen in the Venues tab. Join button. Members list visible to group members." },
        { id: "36-6", text: "Group feed: DECISION DOCUMENTED -- auto-post. When any group member checks in and tags that venue as the location, the check-in automatically appears in the group feed. No manual post-to-group step required. Rationale: friction kills feeds, especially early when content is sparse. Auto keeps the feed alive from day one without changing user behavior. UI treatment (how prominent the group post is vs the regular feed post) to be iterated over time based on user and lounge owner feedback." },
        { id: "36-7", text: "Group activity visible to lounge owner in their partner dashboard -- engagement metrics, top smokers, popular cigars among members" },
        { id: "36-8", text: "Optional: lounge owner can post announcements to the group (event nights, new inventory, specials)" },
      ]},
    ]
  },
];

const allTasks = PLAN.filter(p => !p.phase.includes("Phase 5")).flatMap(p => p.weeks.flatMap(w => w.tasks));
const futureTasks = PLAN.filter(p => p.phase.includes("Phase 5")).flatMap(p => p.weeks.flatMap(w => w.tasks));

const INITIAL_COMPLETED = new Set([
  "1-1","1-2","1-3","1-4","1-5","1-6","1-7","1-8","1-9","1-10","1-11","1-12",
  "2-1","2-2","2-3","2-4","2-5","2-6","2-7",
  "3-1","3-2","3-3","3-4","3-5","3-6","3-7","3-8","3-9",
  "4-1","4-2","4-3","4-4","4-5","4-6","4-7","4-8","4-9","4-10","4-11",
  "5-1","5-2","5-3","5-4","5-5","5-6","5-7","5-8","5-9","5-10","5-11",
  "6-1","6-2","6-3","6-4","6-5","6-6","6-7","6-8","6-9","6-10","6-11",
  "7-1","7-2","7-3",
  "8-1","8-2","8-3","8-4",
  "9-1","9-2","9-3","9-4",
  "10-1","10-2","10-3",
  "11-1","11-2","11-3",
  "12-1","12-2","12-3",
  "13-1","13-2","13-3","13-4","13-5","13-6","13-7","13-8","13-9","13-10",
  "14-1","14-2","14-3","14-4","14-5","14-6","14-7","14-8",
  "16-1","16-2","16-3","16-4","16-5",
  "17-1","17-2","17-3","17-4","17-5","17-6","17-7","17-8","17-9",
  "18-1","18-2","18-3","18-4","18-5","18-6","18-7","18-8","18-9","18-10",
  "19-1","19-2","19-3","19-4","19-5",
  "20-1","20-2","20-3","20-4","20-5","20-6","20-7","20-8",
  "21-1","21-2","21-3","21-4","21-5","21-6","21-7",
]);

const STORAGE_KEY = "ashed_dashboard_v3";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const FILE_VERSIONS = [
  { name: "App.js", version: "3.9", lastChange: "Week 20 - Venues tab + custom SVG nav icon", history: [
    { v: "1.0", note: "Fixed missing export default and broken fetchCheckins useEffect" },
    { v: "1.1", note: "Centered nav bar" },
    { v: "1.2", note: "SVG lounge scene + 5 rotating cigar icons" },
    { v: "1.3", note: "Removed unused fallbackImg (ESLint)" },
    { v: "1.4", note: "Fixed would_smoke_again display" },
    { v: "1.5", note: "Fixed duplicate featured cigars" },
    { v: "1.6", note: "Added Value for Price + Would Smoke Again filters" },
    { v: "1.7", note: "TASTING NOTES changed to COMMENTS in check-in detail" },
    { v: "1.8", note: "Multi-select filters for value/smoke again" },
    { v: "1.9", note: "Removed unused searchFilterOrigin (ESLint)" },
    { v: "2.0", note: "Added strength filter pills to search tab" },
    { v: "2.1", note: "Removed unused startTransition (ESLint)" },
    { v: "2.2", note: "Removed search strength filter" },
    { v: "2.3", note: "Updated search placeholder text" },
    { v: "2.4", note: "Week 8: BandScanner wired in" },
    { v: "2.5", note: "Wishlist: state, handlers, tab, buttons" },
    { v: "2.6", note: "Fixed fetchWishlist exhaustive-deps ESLint warning" },
    { v: "2.7", note: "Wishlist brand + strength filters" },
    { v: "2.8", note: "Week 9: onSearchManually passed to BandScanner" },
    { v: "2.9", note: "Weeks 10-11: Recommendations import + render, side-by-side buttons" },
    { v: "3.0", note: "Nav bar: Search, Journal, Wishlist labels" },
    { v: "3.1", note: "Week 13: Humidor import, handlers, Add to Humidor, Purchased on wishlist, Humidor nav tab" },
    { v: "3.2", note: "Week 14: Pairings import, Drink Pairings button on cigar detail, Pairings modal render" },
    { v: "3.3", note: "Week 16: Friends import, showFriends state, Friends button on Journal tab profile header" },
    { v: "3.4", note: "Week 17: Feed import replacing featured cigars, CIGAR_ICONS/CigarIcon removed, onSearchToAdd prop wired to Humidor" },
    { v: "3.5", note: "Friend request notification badge: pendingFriendCount state, refreshPendingFriendCount, badge on Friends button, onRequestHandled prop passed to Friends" },
    { v: "3.6", note: "Week 18: Feed and Badges imports added, Badges component rendered on profile tab above Smoking History" },
    { v: "3.7", note: "Week 19: badgeEngine import, processReferral function on login -- reads localStorage referral, looks up referrer, inserts to referrals table, updates referred_by, triggers referral badge check" },
    { v: "3.8", note: "Profile sub-tabs: Journal (check-in history + filters), Stats (insights), Badges. Stat boxes always visible above tabs. Nav label changed from Journal to Me. profileTab state defaults to journal." },
    { v: "3.9", note: "Week 20: Venues import added, venues tab render, custom SVG storefront icon in nav (gold when active, muted when inactive). onSearchToAdd prop added to Humidor." },
  ]},
  { name: "Venues.js", version: "1.3", lastChange: "Week 21 - smart hours, prefetch, ratings count", history: [
    { v: "1.0", note: "New file. GPS auto-detect, city/zip search, Google Places integration, venue cards with directions and call." },
    { v: "1.1", note: "Switched to serverless proxy (/api/places) to fix CORS. iOS-specific location denied message. Autocomplete dropdown on search input." },
    { v: "1.2", note: "Week 21: List/Map toggle. Leaflet + OpenStreetMap map view. Venue pins auto-fit to bounds. Blue pulsing user location dot. Tap pin for popup with View Details button." },
    { v: "1.3", note: "Week 21: Smart hours display (Open/Closing Soon/Opening Soon/Closed with times). Place details fetched on-demand and prefetched in background on load. Ratings count shown next to stars." },
  ]},
  { name: "api/places.js", version: "1.2", lastChange: "Week 21 - details action for smart hours", history: [
    { v: "1.0", note: "New file. Vercel serverless proxy for Google Places API. Handles geocode, search, and autocomplete actions. Keeps GOOGLE_PLACES_KEY server-side only." },
    { v: "1.1", note: "Broadened search query to include tobacco shop, tobacco store, smoke shop alongside cigar shop, cigar lounge, tobacconist." },
    { v: "1.2", note: "Week 21: Added details action -- fetches opening_hours and formatted_phone_number for a place_id. Used for smart hours display (Closing Soon, Opening Soon with times)." },
  ]},
  { name: "badgeEngine.js", version: "1.1", lastChange: "Week 19 - referral badge checks", history: [
    { v: "1.0", note: "New file. checkAndAwardBadges(userId, trigger) checks all applicable badges and inserts to user_badges. fetchUserBadges returns all badge defs with earned status. Triggers: checkin, fire, fire_received, comment. All checks run in background, never block UX." },
    { v: "1.1", note: "Week 19: added checkReferralBadges function and referral trigger. Awards ambassador (1), recruiter (5), legend_maker (25) based on referrals table count." },
  ]},
  { name: "Badges.js", version: "1.0", lastChange: "Week 18 - new file", history: [
    { v: "1.0", note: "New file. Displays all badges grouped by category (milestone, variety, social, referral). Earned badges show gold border, award date. Locked badges shown at 45% opacity with lock indicator. Progress bar shows overall completion." },
  ]},
  { name: "Feed.js", version: "1.1", lastChange: "Week 18 - badge checks on fire toggle", history: [
    { v: "1.0", note: "New file. Hybrid feed: friends check-ins + global community check-ins. Fire button toggle (cannot fire own). Community tag on non-friend posts. Tap card opens FeedModal. getTimeAgo helper." },
    { v: "1.1", note: "Added badge checks on fire: fire_starter for giver, fire_received (well_loved) for check-in owner." },
  ]},
  { name: "FeedModal.js", version: "1.1", lastChange: "Week 18 - badge check on comment post", history: [
    { v: "1.0", note: "New file. Bottom sheet modal for check-in detail. Shows cigar, rating, smoker handle, date, location, notes. Fire button. Comments list with avatars. Post comment input. Cannot fire own check-ins." },
    { v: "1.1", note: "Added badge check on comment post: triggers conversationalist badge check." },
  ]},
  { name: "Friends.js", version: "1.2", lastChange: "Week 19 - functional Share Invite button", history: [
    { v: "1.0", note: "New file. Friend request system: search by username/email, send/accept/decline requests, friend list, sent requests. Three tabs: Find Friends, Requests, My Friends. QR/share link placeholder." },
    { v: "1.1", note: "Added onRequestHandled prop -- called after accept/decline so App.js badge count refreshes immediately." },
    { v: "1.2", note: "Week 19: replaced static friend link with functional Share Invite button. Uses Web Share API on mobile (opens iMessage/WhatsApp etc), falls back to clipboard copy on desktop." },
  ]},
  { name: "Pairings.js", version: "1.0", lastChange: "Week 14 - new file", history: [
    { v: "1.0", note: "New file. Drink pairings modal. DB-first: checks pairings table before calling API. Haiku generates spirits/beer/coffee/non-alcoholic suggestions. Saves to DB for all future users. Seasonal pairing toggle. I don't drink X alternative suggestions." },
  ]},
  { name: "Humidor.js", version: "1.3", lastChange: "Week 17 - Search to Add button", history: [
    { v: "1.0", note: "New file. Humidor inventory list, Smoke One, Remove, tap-to-edit qty, single + multi band scan." },
    { v: "1.1", note: "Split Remove into Remove One (decrements qty) and Remove All (deletes entry)." },
    { v: "1.2", note: "3 scan accuracy fixes: improved prompt conservatism on confidence, editable brand/line + confidence indicator on confirm screen, best results tips recommending max 3 cigars at a time." },
    { v: "1.3", note: "Added Search to Add button alongside Scan button. onSearchToAdd prop switches app to Search tab. Updated empty state text." },
  ]},
  { name: "BandScanner.js", version: "1.4", lastChange: "Week 13 - Add to Humidor button", history: [
    { v: "1.0", note: "Camera > Claude Opus vision > cigar detail > Log This Smoke" },
    { v: "1.1", note: "Changed scanning text to Ashed is reading" },
    { v: "1.2", note: "Added Add to Wishlist button on result screen" },
    { v: "1.3", note: "Week 9: cacheCigarToDB, low confidence fallback, flag button, onSearchManually" },
    { v: "1.4", note: "Week 13: Added Add to Humidor button and onAddToHumidor prop on result screen" },
  ]},
  { name: "Recommendations.js", version: "1.1", lastChange: "Removed unused supabase import", history: [
    { v: "1.0", note: "Two modes: Auto (5+ check-ins) and Survey (under 5). Recommendations with Why this cigar explanation. Add to Wishlist. Refresh." },
    { v: "1.1", note: "Removed unused supabase import (ESLint warning)" },
  ]},
  { name: "Auth.js", version: "1.2", lastChange: "Week 19 - referral code handling", history: [
    { v: "1.0", note: "Login, signup, forgot password, username/display name" },
    { v: "1.1", note: "Changed tagline to CIGAR JOURNAL & COMMUNITY to match app header" },
    { v: "1.2", note: "Week 19: reads ?ref=username from URL, stores in localStorage, shows invited-by banner on signup screen, auto-switches to signup mode when ref param present" },
  ]},
  { name: "CheckIn.js", version: "1.8", lastChange: "Flame rating redesign, sub-scores removed", history: [
    { v: "1.0", note: "Full check-in flow, sub-scores, voice input, saved places, privacy toggle" },
    { v: "1.1", note: "Fixed would_smoke_again to save as text Yes/Maybe/No" },
    { v: "1.2", note: "Added photo capture/upload -- reverted in v1.3" },
    { v: "1.3", note: "Reverted photo upload. Renamed Tasting Notes to Comments." },
    { v: "1.4", note: "Week 12: AI tasting notes assistant. Suggest notes button calls Haiku with cigar profile, returns 6-8 descriptors as tappable chips. Tapping appends to notes and removes chip. One-time per check-in." },
    { v: "1.5", note: "Week 18: Added checkAndAwardBadges call after successful save. Runs in background, never blocks UX." },
    { v: "1.6", note: "Week 21: Added Find venue button to location section. Opens inline search panel with city/zip input. Uses /api/places proxy to geocode and search nearby venues. Tap result to set location. Shows current location with × to clear." },
    { v: "1.7", note: "Quick check-in redesign: stars + Would Smoke Again default visible, all details collapsed under Add details toggle." },
    { v: "1.8", note: "Flame rating redesign: replaced star rating with 1-5 flame icons in 0.5 increments via tap/touch on SVG. Half-flames via SVG linearGradient. Sub-scores removed from UI entirely (DB columns kept nullable). flamesToScore maps 1-5 flames to 2-10 DB scale." },
  ]},
  { name: "cigarAI.js", version: "1.2", lastChange: "AI search + AI DB writes disabled during dev", history: [
    { v: "1.0", note: "searchCigarLines, getVitolas, deduplication, AI+DB merge" },
    { v: "1.1", note: "AI DB writes disabled: getVitolas returns AI results to UI but does NOT write to DB during dev to prevent dirty data." },
    { v: "1.2", note: "AI search disabled: searchCigarLines returns DB-only results. AI was returning duplicate/variant names. Both AI features re-enabled via task 29-0 before launch." },
  ]},
  { name: "supabase.js", version: "1.0", lastChange: "Initial - no edits yet", history: [
    { v: "1.0", note: "Supabase client initialization with project URL and publishable anon key" },
  ]},
];

const BRIEF = [
  "Ashed is a React PWA cigar journal and community app. Built with React (Create React App), Supabase (auth + database), and the Anthropic API. Deployed on Vercel at ashed.vercel.app.",
  "Files: App.js, Auth.js, CheckIn.js, cigarAI.js, supabase.js, BandScanner.js, Recommendations.js, Humidor.js, Pairings.js, Friends.js, Feed.js, FeedModal.js, Badges.js, badgeEngine.js, Venues.js. Plus api/places.js (Vercel serverless function) and vercel.json in project root.",
  "Status: Phase 1 complete (Weeks 1-6) + Phase 2 complete (Weeks 7-14) + Weeks 16-21 done + Week 23 community features done (23-1,2,5-9). Currently on Phase 3 Social & Growth. Next: Week 22 - In-App Notifications + outgoing friend requests.",
  "Completed features: auth (email/password, referral URL param ?ref=username, invited-by banner), cigar search + AI data layer (Haiku), check-in flow with sub-scores + AI tasting notes + Find Venue button, profile/journal (sub-tabs: Journal/Stats/Badges), wishlist, AI band scanner (Opus vision, premium only), AI recommendations (auto 5+ checkins / survey under 5), My Humidor (scan bands, qty tracking, Smoke One, search to add), AI Drink Pairings (DB-cached at line level, seasonal, alternatives), Friend System (mutual model, requests, accept/decline, notification badge, Web Share API invite link), Hybrid Feed (friends + community with tag), Fire button (cannot fire own), Comments modal (FeedModal), Badges & Achievements (17 badges, 4 categories: milestone/variety/social/referral, auto-awarded via badgeEngine.js on checkin/fire/comment/referral triggers), Referral tracking (URL-based, referral badges: Ambassador/Recruiter/Legend Maker), Venue Finder (GPS + city/zip search with autocomplete dropdown, Google Places via Vercel serverless proxy, list/map toggle, Leaflet+OpenStreetMap map with pins + user location dot, smart hours: Open/Closing Soon/Opening Soon/Closed with times, place details prefetched in background, ratings count, directions, call).",
  "Deploy: git add . then git commit -m msg then git push origin master. Repo: github.com/crbyrd87/ashed.git, branch: master. Local path: C:/Users/ChrisByrd/Desktop/ashed. Vercel auto-deploys on push. Test on ashed.vercel.app (not localhost -- serverless functions need Vercel).",
  "Supabase tables: users, cigars, checkins, ratings, places, wishlist, humidor, pairings, friends, fires, comments, badges, user_badges, referrals. RLS disabled (enabling in Week 28). ratings.would_smoke_again is TEXT (Yes/Maybe/No). Test user christest UUID: 244f883d-b875-491a-89fe-8a6718b8c67f.",
  "API keys: REACT_APP_ANTHROPIC_KEY in .env (client-side, to be moved server-side in Week 28). GOOGLE_PLACES_KEY in Vercel env vars only (server-side, no REACT_APP_ prefix -- never in frontend bundle). Band scanning uses claude-opus-4-6 (premium only). Search/recommendations/pairings/tasting notes use claude-haiku-4-5-20251001. Auto recommendations threshold: 5+ check-ins.",
  "Key architecture: Google Places API called server-side via api/places.js Vercel serverless proxy (handles geocode/search/autocomplete/details actions). vercel.json in project root for API route + SPA routing. Leaflet+OpenStreetMap for map rendering (no extra API key). refreshCount pattern for useEffect re-triggers. No user-submitted photos. ESLint must be clean before every deploy.",
  "Plan: 30 weeks across 4 phases + Phase 5 future features. Week 22: In-App Notifications + outgoing friend requests. Week 23: Moderation + Admin Console. Weeks 24-25: Venue Partner Dashboard. Week 26: Premium/Stripe. Week 27: Legal/Age Gate. Week 28: Security (RLS, key hardening). Week 29: Launch Prep (first-login welcome message, user-submitted cigars + AI verification + admin QA queue, auto-dedup nightly cron, monthly DB refresh process, onboarding tour, settings, dark mode, API audit, security audit). Week 30: Native App.",
  "Phase 5 Future: AI Concierge (Week 31), Social Feed Enhancements (Week 32), Cigar Shop affiliate (Week 33), Band Scanner cost optimization (Week 34), Merch Store (Week 35), Groups/Lounge Communities (Week 36 -- lounge/shop-only groups, auto-populated feed from venue-tagged check-ins, lounge owner dashboard integration).",
  "Key decisions: mutual friend model (not follow/follower). Fire = Ashed Toast (cannot fire own). Band scanner premium-only (Opus vision cost). Pairings DB-cached at line level. Hybrid feed (friends first + community fill with tag). Onboarding tour on first login (Skip button on every screen, tour_completed on user record, Replay Tour in Help section). RLS enabling deferred to Week 28 when all features finalized.",
  "ESLint: fix all warnings before deploying. refreshCount useState pattern for useEffect re-triggers. Always provide complete copy-pasteable files, no partial edits. All Supabase schema changes delivered as SQL for SQL Editor.",
];

export default function Dashboard() {
  const [tab, setTab] = useState("plan");
  const [completed, setCompleted] = useState(INITIAL_COMPLETED);
  const [loaded, setLoaded] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState({ 0: true });
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [expandedFiles, setExpandedFiles] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r) setCompleted(new Set(JSON.parse(r.value)));
      } catch (e) {}
      setLoaded(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.storage.set(STORAGE_KEY, JSON.stringify([...completed])).catch(() => {});
  }, [completed, loaded]);

  const toggle = (id) => setCompleted(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const totalDone = allTasks.filter(t => completed.has(t.id)).length;
  const totalPct = Math.round((totalDone / allTasks.length) * 100);

  const phasePct = (weeks) => {
    const tasks = weeks.flatMap(w => w.tasks);
    const done = tasks.filter(t => completed.has(t.id)).length;
    return { done, total: tasks.length, pct: Math.round((done / tasks.length) * 100) };
  };

  const weekPct = (tasks) => {
    const done = tasks.filter(t => completed.has(t.id)).length;
    return { done, total: tasks.length };
  };

  return (
    <div style={{ fontFamily: SANS, background: "#1a0f08", minHeight: "100vh", color: "#e8d5b7", maxWidth: 480, margin: "0 auto", paddingBottom: 70 }}>

      <div style={{ textAlign: "center", padding: "20px 16px 16px", borderBottom: "1px solid #3a2510" }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, color: "#c9a84c" }}>ASHED</div>
        <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, marginTop: 4 }}>PROJECT DASHBOARD</div>
        <div style={{ width: "100%", height: 8, background: "#2a1a0e", borderRadius: 4, overflow: "hidden", margin: "12px 0 4px" }}>
          <div style={{ width: totalPct + "%", height: "100%", background: "linear-gradient(90deg, #c9a84c, #e8cc7a)", borderRadius: 4, transition: "width 0.3s" }} />
        </div>
        <div style={{ fontSize: 12, color: "#8a7055" }}>{totalDone} of {allTasks.length} tasks — {totalPct}%</div>
        <div style={{ fontSize: 11, color: "#4a3020", marginTop: 2 }}>{futureTasks.length} future feature tasks not counted</div>
      </div>

      <div style={{ padding: 16 }}>

        {tab === "plan" && PLAN.map((phase, pi) => {
          const pp = phasePct(phase.weeks);
          const open = expandedPhases[pi];
          return (
            <div key={pi} style={{ background: "#221508", border: "1px solid #3a2510", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
              <div onClick={() => setExpandedPhases(p => ({ ...p, [pi]: !p[pi] }))}
                style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: open ? "1px solid #3a2510" : "none" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: phase.color, letterSpacing: 1 }}>{phase.phase.toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2 }}>{pp.done}/{pp.total} tasks — {pp.pct}%</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 60, height: 6, background: "#3a2510", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: pp.pct + "%", height: "100%", background: phase.color, borderRadius: 3 }} />
                  </div>
                  <span style={{ color: "#8a7055", fontSize: 14 }}>{open ? "-" : "+"}</span>
                </div>
              </div>
              {open && phase.weeks.map(week => {
                const wp = weekPct(week.tasks);
                const wkey = pi + "-" + week.week;
                const wopen = expandedWeeks[wkey];
                const allDone = wp.done === wp.total;
                return (
                  <div key={week.week} style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 8, margin: "10px 12px", overflow: "hidden" }}>
                    <div onClick={() => setExpandedWeeks(p => ({ ...p, [wkey]: !p[wkey] }))}
                      style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1 }}>WEEK {week.week}</span>
                          {allDone && <span style={{ fontSize: 10, color: "#c9a84c", background: "#c9a84c22", padding: "1px 8px", borderRadius: 10 }}>COMPLETE</span>}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#e8d5b7", marginTop: 2 }}>{week.title}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#8a7055" }}>{wp.done}/{wp.total}</span>
                        <span style={{ color: "#5a4535", fontSize: 12 }}>{wopen ? "-" : "+"}</span>
                      </div>
                    </div>
                    {wopen && week.tasks.map(task => {
                      const done = completed.has(task.id);
                      return (
                        <div key={task.id} onClick={() => toggle(task.id)}
                          style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 14px", background: done ? "#c9a84c08" : "transparent", borderTop: "1px solid #3a251022", cursor: "pointer" }}>
                          <div style={{ width: 18, height: 18, borderRadius: 4, border: "2px solid " + (done ? "#c9a84c" : "#4a3020"), background: done ? "#c9a84c" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1, fontSize: 11, color: "#1a0f08", fontWeight: 700 }}>
                            {done ? "✓" : ""}
                          </div>
                          <div style={{ fontSize: 13, color: done ? "#8a7055" : "#e8d5b7", textDecoration: done ? "line-through" : "none", lineHeight: 1.5 }}>{task.text}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}

        {tab === "versions" && FILE_VERSIONS.map((file, fi) => (
          <div key={fi} style={{ background: "#221508", border: "1px solid #3a2510", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
            <div onClick={() => setExpandedFiles(p => ({ ...p, [fi]: !p[fi] }))}
              style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7" }}>{file.name}</span>
                  <span style={{ background: "#c9a84c22", color: "#c9a84c", border: "1px solid #c9a84c55", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>v{file.version}</span>
                </div>
                <div style={{ fontSize: 12, color: "#8a7055", marginTop: 4 }}>{file.lastChange}</div>
              </div>
              <span style={{ color: "#5a4535", fontSize: 14 }}>{expandedFiles[fi] ? "-" : "+"}</span>
            </div>
            {expandedFiles[fi] && (
              <div style={{ borderTop: "1px solid #3a2510", padding: "12px 16px" }}>
                <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 10 }}>CHANGE HISTORY</div>
                {file.history.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, marginBottom: 8, paddingBottom: 8, borderBottom: i < file.history.length - 1 ? "1px solid #3a251033" : "none" }}>
                    <span style={{ background: "#c9a84c22", color: "#c9a84c", border: "1px solid #c9a84c55", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>v{h.v}</span>
                    <span style={{ fontSize: 13, color: "#c8b89a", lineHeight: 1.5 }}>{h.note}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {tab === "brief" && (
          <div style={{ background: "#221508", border: "1px solid #3a2510", borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, marginBottom: 16 }}>PROJECT BRIEF - FOR NEW CHATS</div>
            {BRIEF.map((para, i) => (
              <p key={i} style={{ fontSize: 13, color: "#c8b89a", lineHeight: 1.7, marginBottom: 12, paddingBottom: 12, borderBottom: i < BRIEF.length - 1 ? "1px solid #3a251033" : "none" }}>{para}</p>
            ))}
          </div>
        )}

      </div>

      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#1a0f08", borderTop: "1px solid #3a2510", display: "flex", justifyContent: "center", gap: 40, zIndex: 100 }}>
        {[["plan", "Plan"], ["versions", "Versions"], ["brief", "Brief"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: "12px 0", background: "none", border: "none", color: tab === id ? "#c9a84c" : "#5a4535", fontSize: 11, letterSpacing: 1, cursor: "pointer", fontFamily: SANS, textTransform: "uppercase", fontWeight: tab === id ? 700 : 400 }}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
