# VendorHub pre-launch end-to-end checklist

Target launch: late January 2027. Tick each item once tested. Add new sections as features land.

## 1. Anti-cloning phase 2b: buyer access to listings removed

Setup:
- [ ] As a seller, add one open home and one public document to a live listing.
- [ ] Create a new buyer account that owns no listings. Make an enquiry, send a reply and make an offer.

Database checks (Supabase SQL Editor):
- [ ] Test A (signed out): offers_visible = 0, enquiries_visible = 0, open_homes_visible = 1, documents_visible = 1.
- [ ] Test B (real buyer): listings_visible = 0, my_enquiries >= 1, my_replies >= 1, my_offers >= 1.
- [x] Step 15 (made-up signed-in user): listings_visible = 0, photos_visible = 8, offers_visible = 0, enquiries_visible = 0. Passed.

App checks (npm run dev):
- [ ] Signed out: /buy, a suburb page and a listing page show photos, open homes and price.
- [ ] Buyer: "My offers" loads, can make an offer, can reply to an enquiry.
- [ ] Buyer: private viewing requests respect the seller's on/off setting (getBuyerRequestState fixed; create_viewing_request enforces the setting).
- [ ] Buyer: with requests switched off, sending a request directly is rejected (not just hidden).
- [ ] Seller: previewing own draft listing shows viewing requests as off (expected).
- [ ] Seller: dashboard and "Offers on my listings" load, can upload and delete a photo.
- [ ] Seller: can switch viewing requests on and off, and the viewings page loads.

Undo if needed (SQL):
  create policy listings_public_read on public.listings for select to public
  using (status = any (array['live'::listing_status, 'under_offer'::listing_status]));

## 2. Database clean-up (carried over - confirm status)

- [ ] Viewing functions that run with owner rights only act on live listings or listings the caller is involved in (step 19).
- [ ] Remove the duplicate is_admin(uuid) overload so admin rights come only from profiles.role.
- [ ] Reduce the duplicated SELECT and UPDATE policies on profiles.
- [ ] Add a WITH CHECK to offers_participant_update.
- [ ] Empty migration files backfilled (marketplace_admin, suburbs_seed), so the database can be rebuilt from source control.
- [ ] Decide whether buyers whose offers are auto-declined by accept_offer get an email.

## 3. Build and deployment (carried over - confirm status)

- [ ] Node version pinned in package.json (engines).
- [ ] SENTRY_AUTH_TOKEN set in Vercel; source maps upload on production builds.
- [ ] Sentry does not send query strings (urlQueryParams: false).
- [ ] Plan the middleware -> proxy rename and @react-email package updates.

## 4. Final sign-off

- [ ] npx tsc --noEmit passes.
- [ ] npm run build passes locally and on Vercel.
- [ ] Full click-through on the production URL: sign up, list, search, enquire, view, offer, accept.