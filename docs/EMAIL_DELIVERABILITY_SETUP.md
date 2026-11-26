# Email Deliverability Setup for t27.ai (Unstoppable Domains + Zoho)

## ⚠️ CRITICAL: DNS Records Required Before First Email

**Without SPF/DKIM/DMARC/MX, ~70% of emails from admin@t27.ai will be marked as spam**.

---

## Phase 1: Zoho Admin Console — Get Exact Records

1. Log into **Zoho Mail Admin Console**
2. Navigate to **Domains → [t27.ai]**
3. Keep this open — you'll need records from each tab (MX, SPF, DKIM, DMARC)

---

## Phase 2: Unstoppable Domains — Add DNS Records

### Step 1: MX Records (REQUIRED for replies)

**Zoho Admin Console → Domains → t27.ai → Email Configuration → MX tab**

Open: https://unstoppabledomains.com/manage?page=dns&domain=t27.ai

| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX | @ | `mx.zoho.com` | 10 |
| MX | @ | `mx2.zoho.com` | 20 |
| MX | @ | `mx3.zoho.com` | 50 |

**Add all three** via "Add another record" in one session.

> **⚠️ Without MX:** Scientists' replies will bounce!

### Step 2: SPF Record

**Zoho shows:** `v=spf1 include:zohomail.com ~all`

In Unstoppable Domains → DNS Records → Add new record:
- **Type:** TXT
- **Name:** `@`
- **Value:** `"v=spf1 include:zohomail.com ~all"`

> **⚠️ NOTE:** Use `zohomail.com`, NOT `zoho.com` — different domains!

### Step 3: DKIM Record (NOT Optional!)

**✅ VERIFIED: Actual selector is `zmail._domainkey`**

Current DNS shows:
```
zmail._domainkey.t27.ai.  TXT  "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCVllj/..."
```

**Already configured in Unstoppable Domains!**

Save → Return to Zoho → **Verify**

> **⚠️ DKIM is REQUIRED** — Without it, DMARC alignment fails and emails go to spam.

### Step 4: DMARC Record

**Zoho Admin Console → DMARC tab → Generate policy**

In Unstoppable Domains → DNS Records → Add new record:
- **Type:** TXT
- **Name:** `_dmarc`
- **Value:** `"v=DMARC1; p=none; rua=mailto:admin@t27.ai; ruf=mailto:admin@t27.ai"`

---

## Phase 3: Verify in Zoho

After adding records, wait for propagation (Unstoppable Domains: usually <1 hour, max 48 hours).

**Zoho Admin Console → Domains → t27.ai**
1. Click **Verify** on each tab (MX, SPF, DKIM, DMARC)
2. All four should show green checkmarks ✅

---

## Phase 4: Test Email Score

**Goal: 9+/10 on mail-tester.com**

```bash
# 1. Get unique address from mail-tester.com
# https://www.mail-tester.com/

# 2. Send test email
tri outreach test --to=<unique-address>@mail-tester.com

# 3. Check score
# Should be 9+/10 before proceeding
```

---

## Unstoppable Domains Specifics

| Setting | Value |
|----------|-------|
| **Name field** | Enter `@` or `_dmarc` or `zoho._domainkey` — **WITHOUT** `.t27.ai` suffix |
| **TTL** | Leave default (1 hour) |
| **Quotes** | Include quotes for SPF/DMARC: `"v=spf1..."` |
| **DKIM** | NOT optional — required for DMARC alignment |

---

## 14-Day Manual Warmup (REQUIRED!)

**Even with 10/10 score, new domains get greylisted.**

### Days 1-14: Manual Warmup

| Action | Frequency | Purpose |
|--------|-----------|---------|
| Send to yourself | 2-3/day | Build positive engagement |
| Open replies | Immediately | Signals "real human" |
| Mark "not spam" | If in spam | Train filters |
| Reply to self | Each email | Creates thread signals |

**Target accounts:** Your personal Gmail, Outlook, Yahoo.

```bash
# Example pattern
tri outreach test --to=your-personal@gmail.com
# Then: Open, reply, mark important
```

### Days 15-21: Engaged Contacts (3-5/day)

Sherbon, Pellis (high reply rate expected)

### Days 22-28: Scaling (5-8/day)

VSA experts, LQG physicists

### Day 29+: Full Volume (10/day)

All tiers

---

## RFC 8058 List-Unsubscribe Header

**Gmail requires this since Feb 2024.**

```zig
// In src/tri/outreach/smtp.zig
headers: &.{
    .{ .name = "List-Unsubscribe", .value = "<https://t27.ai/unsubscribe?id={uuid}>" },
    .{ .name = "List-Unsubscribe-Post", .value = "List-Unsubscribe=One-Click" },
}
```

---

## Secondary Domain (Recommended)

**Never use primary domain for cold outreach!**

| Domain | Purpose | Cost |
|--------|---------|------|
| `t27.ai` | Primary — replies, collaborations | — |
| `trynity.ai` or `t27mail.com` | Cold outreach only | ~$10/year |

**From:** `outreach@trynity.ai`
**Reply-To:** `admin@t27.ai`

> **Why:** If secondary domain gets blacklisted, primary remains clean.

---

## ✅ DNS Verification Status (2026-03-28)

All records successfully propagated:

| Record | Status | Details |
|--------|--------|---------|
| **MX** | ✅ Propagated | mx.zoho.com (10), mx2.zoho.com (20), mx3.zoho.com (50) |
| **SPF** | ✅ Propagated | `v=spf1 include:zohomail.com ~all` |
| **DKIM** | ✅ Propagated | `zmail._domainkey.t27.ai` (1024-bit RSA) |
| **DMARC** | ✅ Propagated | `v=DMARC1; p=none; rua=mailto:admin@t27.ai; pct=100` |

---

## Next Steps: Zoho Verification + Testing

### Step 1: Verify in Zoho Admin Console (2 min)
1. Open: **Zoho Admin Console → Domains → t27.ai**
2. Click **Verify** on each tab:
   - **Email Configuration → MX** → Should show green checkmark
   - **Email Authentication → SPF** → Should show green checkmark
   - **Email Authentication → DKIM** → Should show green checkmark
   - **DMARC** → Should show green checkmark

**Expected:** All 4 tabs show ✅ green checkmarks

### Step 2: Test on mail-tester.com (10 min)
1. Get unique address from: https://www.mail-tester.com/
2. Send test email from admin@t27.ai
3. Check score — **Goal: 9+/10**

### Step 3: 14-Day Manual Warmup (Days 1-14)
**REQUIRED** — Even with 10/10 score, new domains get greylisted

```bash
# Send 2-3 emails per day to YOUR personal accounts
tri outreach test --to=your-personal@gmail.com
tri outreach test --to=your-personal@outlook.com
tri outreach test --to=your-personal@yahoo.com

# For each email:
# 1. Open it immediately
# 2. Reply to it
# 3. Mark "not spam" if in spam folder
```

---

## Checklist Before First Real Email

- [x] MX records (10/20/50 priorities)
- [x] SPF with `zohomail.com` (NOT `zoho.com`)
- [x] DKIM with `zmail._domainkey` selector (1024-bit key)
- [x] DMARC with `rua` and `ruf` and `pct=100`
- [ ] Verified in Zoho (4 green checkmarks) ← **NEXT**
- [ ] mail-tester.com score 9+/10 ← **AFTER ZOHO VERIFY**
- [ ] 14-day manual warmup completed
- [x] List-Unsubscribe header implemented
- [ ] Consider secondary domain for outreach

---

## Timeline

| Day | Action |
|-----|--------|
| 0 | Add DNS records in UD (15 min) |
| 1 | DNS propagation (usually <1 hour for UD) |
| 2 | Verify in Zoho (4 green checks) |
| 3 | Test on mail-tester.com → 9+/10 |
| 4-17 | 14-day manual warmup (send to self) |
| 18 | First real emails (Sherbon, Pellis) |

---

## Quick Reference Commands

```bash
# Check DNS propagation
dig mx t27.ai +short
dig txt t27.ai +short
dig txt zoho._domainkey.t27.ai +short
dig txt _dmarc.t27.ai +short

# Test email
tri outreach test --to=admin@t27.ai
tri outreach test --to=<mail-tester-address>

# Check warming status
tri outreach status

# Send first batch (after warmup)
tri outreach send --dry-run  # Preview
tri outreach send --batch=day1  # Actually send
```

---

## Why This Matters

| Problem | Without Records | With Records |
|---------|----------------|--------------|
| Spam filter | ~70% blocked | <5% blocked |
| .edu delivery | Often rejected | Accepted |
| Replies lost | No MX = bounce | Delivered |
| Inbox placement | Spam folder | Inbox |
| Reply rate | 1-2% | 10-20% |

---

## References

- [Zoho MX Setup](https://hackmd.io/@VeZd7WLKSNimxK_Val9mFA/how-to-set-up-zoho-mail-for-my-custom-business-domain)
- [UD DNS Explained](https://support.unstoppabledomains.com/support/solutions/articles/48001273539-dns-records-explained)
- [Domain Warmup Guide](https://leadsmonky.com/warm-up-your-email-domain-for-cold-outreach/)
- [Mail-tester Best Practices](https://inventoryalarm.com/mail-tester-10-out-of-10-score/)
- [Secondary Domain Strategy](https://www.emareach.com/blog/how-to-scale-cold-emailing-using-domain-warm-up-tools)
- [RFC 8058](https://www.rfc-editor.org/rfc/rfc8058.html)

---

**φ² + 1/φ² = 3 = TRINITY**
