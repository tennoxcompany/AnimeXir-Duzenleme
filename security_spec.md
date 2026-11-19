# AnimeXir Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Single Verified Admin**: Only a verified Google-authenticated account with `request.auth.token.email == 'kagangirgin43@gmail.com' && request.auth.token.email_verified == true` has `isAdmin()`.
2. **PII Isolation**: User email addresses and private lists live exclusively under `/userPrivate/{userId}` (`read`/`write` strictly restricted to owner or admin). `/publicProfiles/{userId}` NEVER stores `email` or `passwordHash`.
3. **No Self-Privilege Escalation**: Users creating `/publicProfiles/{userId}` cannot set `isAdmin: true` or `isPremium: true` unless `isAdmin()`. Users updating `/publicProfiles/{userId}` cannot alter `isAdmin`, `isPremium`, `roleBadge`, or `premiumPlanName`.
4. **Private DMs**: `/directMessages/{msgId}` requires `request.auth.uid in resource.data.participants` on `get` and `list`, and `senderId == request.auth.uid` on `create`. Only `receiverId` may toggle `readByReceiver`.
5. **Catalog Integrity**: Only `isAdmin()` can create, update, or delete `/animes/{animeId}`, `/premiumPlans/{planId}`, or resolve `/premiumOrders/{orderId}`.
6. **Order Integrity**: Users can only create `/premiumOrders/{orderId}` with `userId == request.auth.uid` and `status == 'pending'`, and can only read/list orders where `resource.data.userId == request.auth.uid`.

## 2. Dirty Dozen Attack Payloads (Expected: PERMISSION_DENIED)
1. **Self-Admin Escalation on Create**: Create `/publicProfiles/{uid}` with `isAdmin: true` as non-admin user.
2. **Self-Admin Escalation on Update**: Update `/publicProfiles/{uid}` affecting `isAdmin` or `roleBadge`.
3. **Free Self-Premium Attack**: Update `/publicProfiles/{uid}` affecting `isPremium` or `premiumPlanName`.
4. **Email Spoofing Attack**: Request with `email == 'kagangirgin43@gmail.com'` and `email_verified == false`.
5. **PII Snooping**: Read `/userPrivate/{otherUid}` as a non-owner non-admin user.
6. **Blanket DM Scraping**: List `/directMessages` without participant ownership matching `request.auth.uid`.
7. **DM Sender Impersonation**: Create `/directMessages/{id}` with `senderId != request.auth.uid`.
8. **Shadow Field Injection**: Create `/publicProfiles/{uid}` with undocumented field `extraPrivilege: true`.
9. **Unauthorized Catalog Tampering**: Create or update `/animes/123` as a regular user.
10. **Order Auto-Approval**: Create `/premiumOrders/{id}` with `status: 'approved'` or update existing order `status`.
11. **ID Poisoning**: Write to `/animes/{1500_char_id}` violating `isValidId()`.
12. **Comment Author Spoofing**: Create `/comments/{id}` with `userId != request.auth.uid`.
