# 🔑 WhatsApp Access Token Management Guide

## 🚨 Quick Fix: Token Expired

Your token has expired! Here's the fastest way to get back up and running:

### ⚡ Quick Steps (5 minutes)

1. **Run the token helper script:**
   ```powershell
   .\get-new-token.ps1
   ```
   This will guide you through getting a new token automatically.

2. **Or manually:**
   - Go to: https://developers.facebook.com/apps/
   - Select your app → WhatsApp → API Setup
   - Click "Generate Token"
   - Copy the token
   - Update `.env`: `WHATSAPP_ACCESS_TOKEN=your_new_token`
   - Restart backend: `npm start`

3. **Verify it works:**
   ```bash
   node validate-token.js
   ```

---

## 📊 Two Types of Access Tokens

### 1. Temporary Token (24 Hours) ⏰

**Best for:** Quick testing, initial setup

**Pros:**
- ✅ Quick to generate (2 minutes)
- ✅ No additional setup needed
- ✅ Good for learning/experimenting

**Cons:**
- ❌ Expires every 24 hours
- ❌ Need to regenerate daily
- ❌ Not suitable for production

**How to get:**
```
1. Meta App Dashboard → WhatsApp → API Setup
2. Click "Generate Token"
3. Copy and use immediately
```

---

### 2. Permanent Token (Never Expires) ♾️

**Best for:** Development, staging, production

**Pros:**
- ✅ NEVER expires
- ✅ Perfect for continuous development
- ✅ No daily maintenance
- ✅ Production-ready

**Cons:**
- ❌ Requires Business Manager setup (5-10 minutes)
- ❌ Slightly more complex initial setup

**How to get:** See detailed guide below ⬇️

---

## 🎯 RECOMMENDED: Create Permanent Token

### Step-by-Step Guide

#### Step 1: Access Meta Business Manager
```
URL: https://business.facebook.com/
```

1. Log in with your Facebook account
2. Select your business (or create one if you don't have)

#### Step 2: Navigate to Business Settings
```
Settings Icon (⚙️) → Business Settings
```

#### Step 3: Create System User
```
Left Sidebar: Users → System Users → Click "Add"
```

**Configuration:**
- **System User Name:** `WhatsApp API System User`
- **System User Role:** `Admin`
- Click **"Create System User"**

#### Step 4: Assign App to System User
```
Click on newly created system user → Add Assets → Apps
```

1. Select your WhatsApp app from the list
2. Choose **"Full Control"** permission
3. Click **"Save Changes"**

#### Step 5: Generate Permanent Token
```
Click "Generate New Token" button
```

**Select Permissions:**
- ✅ `whatsapp_business_messaging` (Required)
- ✅ `whatsapp_business_management` (Required)
- ✅ `business_management` (Recommended)

**Click "Generate Token"**

#### Step 6: Copy and Save Token

⚠️ **CRITICAL:** You can only see this token ONCE!

```
Token format: EAAa1b2c3d4e5f6g7h8i9j0...
Length: Usually 200-300 characters
```

**Save it:**
1. Copy the entire token
2. Save in password manager (recommended)
3. Update your `.env` file immediately

#### Step 7: Update .env File

```bash
# Open .env file
# Find this line:
WHATSAPP_ACCESS_TOKEN=old_token_here

# Replace with:
WHATSAPP_ACCESS_TOKEN=EAAa1b2c3d4e5f6g7h8i9j0...your_new_permanent_token
```

#### Step 8: Verify Token

```bash
# Validate the token
node validate-token.js

# Should show:
# ✅ TOKEN IS VALID
# ✅ Expires: NEVER (System User Token)
```

---

## 🔧 Using the Automated Script

### get-new-token.ps1

This PowerShell script guides you through the entire process interactively.

**Run:**
```powershell
.\get-new-token.ps1
```

**Features:**
- ✅ Interactive step-by-step guide
- ✅ Opens URLs for you
- ✅ Automatically updates .env file
- ✅ Validates token after setup
- ✅ Shows both temporary and permanent options

**What it does:**
1. Guides you through Meta Developer Dashboard
2. Prompts you to paste the new token
3. Automatically updates your `.env` file
4. Runs validation to confirm it works
5. Offers to show permanent token setup

---

## 🧪 Testing After Token Update

### Quick Validation

```bash
# 1. Validate token
node validate-token.js

# Expected output:
# ✅ TOKEN IS VALID
# ✅ Expires: <date> or NEVER
# ✅ Token works with WhatsApp API

# 2. Test API access
node test-api.js

# Expected output:
# ✅ Health check passed
# ✅ User registered successfully
# ... all tests pass

# 3. Run full test suite
node quick-test.js

# Expected output:
# 🎉 Tests Passed: 5/5 (100%)
```

---

## 🛠️ Troubleshooting

### Issue: Token Still Invalid After Update

**Check:**
```bash
# 1. Verify token is actually updated
cat .env | grep WHATSAPP_ACCESS_TOKEN

# 2. Restart backend (important!)
# Stop: Ctrl+C
# Start: npm start

# 3. Clear any caches
rm -rf node_modules/.cache
```

### Issue: Token Copied Incorrectly

**Common mistakes:**
- ❌ Extra spaces before/after token
- ❌ Line breaks in the middle
- ❌ Only copied part of the token
- ❌ Copied with quotes around it

**Correct format in .env:**
```bash
# ❌ Wrong:
WHATSAPP_ACCESS_TOKEN=" EAALhd... "
WHATSAPP_ACCESS_TOKEN=EAALhd
  ...rest of token

# ✅ Correct:
WHATSAPP_ACCESS_TOKEN=EAALhdLoZAWWsBPqsYltTQ4VaQVA6ZAIlatuRxTdZCV...
```

### Issue: Can't Generate Token

**Possible causes:**
1. **App not set up:** Make sure WhatsApp product is added to your Meta app
2. **Business not verified:** Some features require verified business
3. **Permissions:** Make sure you have admin access to the app
4. **App suspended:** Check Meta app dashboard for any warnings

---

## 📋 Token Checklist

### Before Using Token
- [ ] Token copied completely (no missing characters)
- [ ] No extra spaces or quotes
- [ ] Updated in .env file correctly
- [ ] Backend restarted after update
- [ ] Token length is 200+ characters

### After Setting Token
- [ ] `node validate-token.js` passes
- [ ] Shows correct expiration (24h or NEVER)
- [ ] WhatsApp API test succeeds
- [ ] Business account details retrieved
- [ ] Backend health check passes

---

## 🔐 Token Security Best Practices

### DO ✅
- Store tokens in `.env` file (not in code)
- Add `.env` to `.gitignore`
- Use System User tokens for production
- Save permanent tokens in password manager
- Rotate tokens if compromised
- Use different tokens for dev/staging/prod

### DON'T ❌
- Commit `.env` to git
- Share tokens publicly
- Hardcode tokens in source code
- Use same token across multiple projects
- Store tokens in plaintext files in cloud storage

---

## 📊 Token Status Monitoring

### Daily Check (If Using Temporary Token)
```bash
# Check expiration
node validate-token.js

# Look for:
⏰ Time Remaining: X hour(s) Y minute(s)
```

### Automated Monitoring (Optional)

Create a scheduled task to check token daily:

**Windows Task Scheduler:**
```powershell
# Create daily task
schtasks /create /tn "WhatsApp Token Check" /tr "node C:\path\to\validate-token.js" /sc daily /st 09:00
```

**Or add to your startup script:**
```bash
# Add to package.json scripts:
"check-token": "node validate-token.js",
"start": "node validate-token.js && node server.js"
```

---

## 🎯 Quick Reference

### Generate Temporary Token
```
Meta App → WhatsApp → API Setup → Generate Token
Expires: 24 hours
Time: 2 minutes
```

### Generate Permanent Token
```
Business Manager → System Users → Create → Generate Token
Expires: Never
Time: 10 minutes
```

### Validate Token
```bash
node validate-token.js
```

### Update Token
```bash
# Edit .env
WHATSAPP_ACCESS_TOKEN=new_token_here

# Restart backend
npm start
```

### Get Help
```powershell
.\get-new-token.ps1
```

---

## 📚 Additional Resources

### Meta Documentation
- **Access Tokens:** https://developers.facebook.com/docs/facebook-login/access-tokens/
- **System Users:** https://developers.facebook.com/docs/development/create-an-app/app-dashboard/system-user-tokens
- **WhatsApp API:** https://developers.facebook.com/docs/whatsapp/business-management-api/get-started

### Your Project Documentation
- `validate-token.js` - Token validation script
- `get-new-token.ps1` - Interactive token setup
- `quick-test.js` - Full environment test
- `WHATSAPP_TESTING_GUIDE.md` - Complete testing guide

---

## 🎉 Success Checklist

After following this guide, you should have:

- [ ] Working access token (temporary or permanent)
- [ ] Token updated in `.env` file
- [ ] Backend running successfully
- [ ] `validate-token.js` passes all checks
- [ ] `test-api.js` completes successfully
- [ ] `quick-test.js` shows 100% pass rate
- [ ] Understanding of token types and expiration
- [ ] Plan for token management going forward

---

## 🆘 Still Having Issues?

1. **Check backend logs:**
   ```bash
   npm start
   # Watch for any error messages
   ```

2. **Enable debug mode:**
   ```bash
   # In .env
   WHATSAPP_DEBUG_MODE=true
   LOG_LEVEL=debug
   ```

3. **Run diagnostics:**
   ```bash
   node quick-test.js
   ```

4. **Review guides:**
   - `WHATSAPP_TESTING_GUIDE.md`
   - `TROUBLESHOOTING.md`

5. **Meta support:**
   - https://developers.facebook.com/support/

---

**🎉 You're all set! Your WhatsApp API is ready for testing.**

**Next steps:**
```bash
# Validate everything works
node quick-test.js

# Start your backend
npm start

# Start testing!
node test-api.js
```
