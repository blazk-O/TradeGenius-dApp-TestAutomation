# Bug Log — TradeGenius Asset DApp

> Add one entry per bug. Severity scale: **Critical / High / Medium / Low**.
> Pending exploration: deeper smoke + scenario sweeps still to be executed.

---

## Template

```
### [BUG-<id>] <Short Title>

- **Severity:** Critical | High | Medium | Low
- **Environment:** dev.tradegenius.com/asset · Chromium <version> · MetaMask <version>
- **Build / Date:** <commit or date>

**Summary**
One-paragraph plain-language description of the issue.

**Steps to Reproduce**
1. Navigate to `https://dev.tradegenius.com/asset`
2. Click "Connect Wallet"
3. ...

**Expected Result**
What the product should do.

**Actual Result**
What actually happens.

**Evidence**
- Screenshot: `reports/screenshots/<file>.png`
- Console / network notes
- Video (optional)

**Notes**
Any reproduction hints, suspected root cause, related Linear ticket, etc.
```

---

## Bugs

### [BUG-001] Captcha runs on every `Sign In` click

- **Severity:** Low
- **Environment:** dev.tradegenius.com/asset · Chromium 130 · MetaMask 12.x
- **Build / Date:** 2026-05-22

**Summary**
Every time I click `Sign In` button, dismiss the modal, and click `Sign In` again, captcha is always triggered.

**Steps to Reproduce**
1. Navigate to `https://dev.tradegenius.com/asset`.
2. Click **Sign In**.
3. With the modal open, click anywhere on the dimmed page background.
4. Click **Sign In**.
5. With the modal open, click anywhere on the dimmed page background.
6. Click **SIgn In**.


**Expected Result**
User should be verified, and it could use wallet login option right away.

**Actual Result**
Every time captcha is re-triggered.

**Evidence**
- Reproduced consistently across 3 runs.

---

### [BUG-002] `Next` button is enabled for username modal window even if the minimum requirement isn't met.

- **Severity:** Medium
- **Environment:** dev.tradegenius.com/asset · Chromium 130 · MetaMask 12.x
- **Build / Date:** 2026-05-22

**Summary**
After user authenticate and connect a wallet, when it's presented with a modal to enter username, the `Next` button is enabled, even if the minimal requirement of 4 digits isn't met.

**Pre-Requisite**
1. User is authenticated and logged in with wallet

**Steps to Reproduce**
1. Remove the suggestion - leave the field empty
2. Enter one character
3. Enter second character
4. Enter third character
5. Enter fourth character

**Expected Result**
When the field has 0, 1, 2 and 3 characters, `Next` button should be disabled.
Once the user enter 4+ characters, `Next` button should get enabled.

**Actual Result**
`Next` button is by default enabled.

**Evidence**
- Screenshot: `reports/screenshots/Screenshot 2026-05-22 165958.png`

**Notes**
`Welcome Genius` modal is constantly enabled as well.

---

### [BUG-003] dApp fails to perform username check and set up the username which user choose

- **Severity:** Highest
- **Environment:** dev.tradegenius.com/asset · Chromium 130 · MetaMask 12.x
- **Build / Date:** 2026-05-22

**Summary**
When user enter the username which would like to choose on the platform, dApp fail to check and set it for the user.

**Pre-Requisite**
1. User is authenticated and logged in with wallet
2. User enter username which is 4+ characters long

**Steps to Reproduce**
1. User click on `Next` button

**Expected Result**
dApp set the username for the user, and user is able to start using the platform.

**Actual Result**
- `checkUsername` - https://dev.tradegenius.com/api/db/checkUsername?username=@usernameOfTheUser endpoint return HTTP status code 404 (Not Found)
Stack Trace:
```
(anonymous) @ https://dev.tradegenius.com/_next/static/chunks/pages/_app-9dad166377f0a896.js:22991
with @ https://dev.tradegenius.com/_next/static/chunks/pages/_app-9dad166377f0a896.js:22991
with @ https://dev.tradegenius.com/_next/static/chunks/pages/_app-9dad166377f0a896.js:22991
(anonymous) @ https://dev.tradegenius.com/_next/static/chunks/pages/_app-9dad166377f0a896.js:22991
o @ https://dev.tradegenius.com/_next/static/chunks/pages/_app-9dad166377f0a896.js:8753
L @ https://dev.tradegenius.com/_next/static/chunks/pages/_app-9dad166377f0a896.js:6426
onClick @ https://dev.tradegenius.com/_next/static/chunks/pages/_app-9dad166377f0a896.js:2252
eU @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
eH @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
(anonymous) @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
re @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
rn @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
(anonymous) @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
oP @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
eM @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
ro @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
nU @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
nD @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
```
Response: `{"error":"Username not found"}`

- `setProfile` - https://dev.tradegenius.com/api/db/setProfile endpoint return HTTP status code 400 (Bad Request)
Stack Trace:
```
(anonymous) @ https://dev.tradegenius.com/_next/static/chunks/pages/_app-9dad166377f0a896.js:22991
with @ https://dev.tradegenius.com/_next/static/chunks/pages/_app-9dad166377f0a896.js:22991
with @ https://dev.tradegenius.com/_next/static/chunks/pages/_app-9dad166377f0a896.js:22991
(anonymous) @ https://dev.tradegenius.com/_next/static/chunks/pages/_app-9dad166377f0a896.js:22991
s @ https://dev.tradegenius.com/_next/static/chunks/pages/_app-9dad166377f0a896.js:8753
L @ https://dev.tradegenius.com/_next/static/chunks/pages/_app-9dad166377f0a896.js:6426
onClick @ https://dev.tradegenius.com/_next/static/chunks/pages/_app-9dad166377f0a896.js:2252
eU @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
eH @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
(anonymous) @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
re @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
rn @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
(anonymous) @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
oP @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
eM @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
ro @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
nU @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
nD @ https://dev.tradegenius.com/_next/static/chunks/framework-9ac8d7d73407f00e.js:1
```
Response: `{"error":"User ID is required"}`

**Evidence**
- Screenshot: `reports/screenshots/Screenshot 2026-05-22 170123.png`
- Screenshot: `reports/screenshots/Screenshot 2026-05-22 181018.png`