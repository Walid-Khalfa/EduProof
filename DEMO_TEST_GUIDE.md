# 🧪 EduProof Demo Testing Guide - Step by Step

## Pre-Demo Setup ✅

### 1. Check Backend Health
```bash
curl https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev/api/health
```

**Expected Result:**
```json
{
  "ok": true,
  "services": {
    "gemini": { "configured": true },
    "pinata": { "configured": true },
    "supabase": { "configured": true, "status": "connected" }
  }
}
```

✅ **Status:** Backend is operational

---

## Test 1: Wallet Connection (Sepolia) 🦊

### Steps:
1. **Open the app:** https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev
2. **Click "Connect Wallet"** button in top right
3. **Select MetaMask** from wallet options
4. **Approve connection** in MetaMask popup

### Expected Results:
- ✅ MetaMask popup appears
- ✅ After approval, wallet address shows in header
- ✅ Network indicator shows "Sepolia" or chain icon
- ✅ No console errors

### Troubleshooting:
- **If MetaMask doesn't open:** Refresh page and try again
- **If wrong network:** MetaMask will prompt to switch to Sepolia
- **If no Sepolia ETH:** Get from https://sepoliafaucet.com

---

## Test 2: Upload PDF → OCR → Pre-checks ✅

### Steps:
1. **Prepare test file:** Use `demo.pdf` from project root
2. **Drag & drop** PDF into upload area OR click to browse
3. **Wait for upload** (should be instant)
4. **Click "Extract Data with AI"** button
5. **Wait for OCR** (2-5 seconds)

### Expected Results:
- ✅ File preview appears after upload
- ✅ "Extract Data with AI" button is enabled
- ✅ Loading spinner shows during OCR
- ✅ Extracted fields populate:
  - Student Name
  - Institution
  - Course/Degree
  - Issue Date
- ✅ Confidence scores show (ideally >80%)
- ✅ Pre-flight checks turn green:
  - ✅ Wallet Connected
  - ✅ Correct Network
  - ✅ Certificate Data Extracted

### Troubleshooting:
- **If OCR fails:** Check browser console for errors
- **If "OCR processing failed":** Backend may be restarting, wait 10 seconds and retry
- **If fields are empty:** Try a different PDF with clear text
- **If confidence is low:** You can manually edit fields before minting

### Test OCR Manually:
```bash
# Create a test file
echo "Test certificate content" > test.txt

# Test OCR endpoint
curl -X POST https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev/api/ocr \
  -F "file=@demo.pdf"
```

---

## Test 3: Mint → Sign → Success Modal → Links 🎨

### Steps:
1. **After OCR extraction**, review the data
2. **Edit any fields** if needed (optional)
3. **Click "Mint Certificate"** button
4. **Approve transaction** in MetaMask popup
5. **Wait for minting** (15-30 seconds)
6. **View success modal**

### Expected Results:

#### During Minting:
- ✅ "Mint Certificate" button shows loading state
- ✅ Progress indicators show:
  - 🔄 Uploading to IPFS...
  - 🔄 Minting NFT...
- ✅ MetaMask popup appears for signature
- ✅ After signing, transaction is submitted

#### Success Modal:
- ✅ Success modal appears with confetti/celebration
- ✅ Certificate details shown:
  - Token ID (e.g., #42)
  - Owner address
  - Mint timestamp
  - IPFS hash
- ✅ Action buttons present:
  - "View on Etherscan"
  - "View on IPFS"
  - "View Certificate"
  - "Share" or "Copy Link"

#### Links Work:
- ✅ **Etherscan link** opens: `https://sepolia.etherscan.io/tx/[hash]`
  - Shows transaction details
  - Contract interaction visible
  - Token ID matches
- ✅ **IPFS link** opens: `https://gateway.pinata.cloud/ipfs/[hash]`
  - Shows JSON metadata
  - Contains certificate data
  - Image URL present
- ✅ **Certificate page** shows full details

### Troubleshooting:
- **If MetaMask doesn't popup:** Check if MetaMask is locked
- **If transaction fails:** Check Sepolia ETH balance (need ~0.01 ETH)
- **If "insufficient funds":** Get more Sepolia ETH from faucet
- **If IPFS upload fails:** Check backend logs, retry
- **If modal doesn't appear:** Check browser console for errors

### Manual Transaction Check:
```bash
# Check if certificate was indexed in DB
curl "https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev/api/certificates/owner/YOUR_WALLET_ADDRESS"
```

---

## Test 4: My Certificates Page 📜

### Steps:
1. **Navigate to "My Certificates"** page (menu or `/my-certificates`)
2. **Ensure wallet is connected**
3. **Wait for certificates to load**

### Expected Results:
- ✅ Page shows loading state initially
- ✅ Your minted certificate(s) appear as cards
- ✅ Each card shows:
  - Certificate preview image
  - Student name
  - Institution
  - Issue date
  - Token ID
- ✅ Click on certificate opens detail view
- ✅ Links work (Etherscan, IPFS)
- ✅ If no certificates: "No certificates found" message

### Troubleshooting:
- **If no certificates show:** 
  - Check wallet is connected
  - Check you're on correct network (Sepolia)
  - Verify transaction was successful on Etherscan
  - Wait a few minutes for indexing
- **If loading forever:** Check browser console, backend may be down
- **If wrong certificates show:** Check wallet address is correct

### Manual Check:
```bash
# List certificates for your address
curl "https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev/api/certificates/owner/0xYourAddress"
```

---

## Test 5: Verify Page (DB + Chain Fallback) 🔍

### Steps:
1. **Navigate to "Verify"** page (menu or `/verify`)
2. **Enter Token ID** from your minted certificate (e.g., `42`)
3. **Click "Verify Certificate"**
4. **View verification results**

### Expected Results:

#### Successful Verification (DB):
- ✅ Certificate details load quickly (<1 second)
- ✅ Shows:
  - ✅ "Verified" badge/status
  - Student name
  - Institution
  - Degree/Course
  - Issue date
  - Token ID
  - Owner address
  - Mint timestamp
- ✅ Links to Etherscan and IPFS work
- ✅ Certificate preview image displays

#### Fallback to Chain:
- ✅ If not in DB, fetches from blockchain
- ✅ Shows loading state "Checking blockchain..."
- ✅ Retrieves metadata from IPFS
- ✅ Displays same information as DB verification
- ✅ May take 2-5 seconds longer

#### Invalid Token ID:
- ✅ Shows "Certificate not found" message
- ✅ Suggests checking token ID

### Test Cases:

**Test Case 1: Valid Token ID (in DB)**
```
Token ID: [Your minted token ID]
Expected: Instant verification from database
```

**Test Case 2: Valid Token ID (not in DB)**
```
Token ID: [Any valid on-chain token]
Expected: Fallback to blockchain, then IPFS
```

**Test Case 3: Invalid Token ID**
```
Token ID: 999999
Expected: "Certificate not found" error
```

### Troubleshooting:
- **If "not found" for valid token:** Check token ID is correct
- **If blockchain fallback fails:** Check RPC connection
- **If IPFS metadata fails:** Check IPFS gateway is accessible
- **If shows revoked:** Certificate was revoked by institution

### Manual Verification:
```bash
# Verify via API
curl "https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev/api/certificates/verify?tokenId=42"
```

---

## Test 6: Admin Panel - Institution Management 🔐

### Steps:
1. **Navigate to Admin page:** `/admin`
2. **Authenticate** (if required)
3. **Test CRUD operations**

### Authentication:
- **Method 1:** API Key in header
  ```
  x-admin-key: 5df7e6ce-2b4f-4e7c-9a3f-4a7efb2a6f6a
  ```
- **Method 2:** Admin wallet address (if configured)

### Test Case 1: List Institutions ✅

**Steps:**
1. Open Admin page
2. View institutions list

**Expected:**
- ✅ Table/list of institutions shows
- ✅ Columns: Name, Domain, Status, Actions
- ✅ Status shows: Approved, Pending, Revoked

**Manual Test:**
```bash
curl -H "x-admin-key: 5df7e6ce-2b4f-4e7c-9a3f-4a7efb2a6f6a" \
  https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev/api/admin/institutions
```

### Test Case 2: Create Institution ✅

**Steps:**
1. Click "Add Institution" button
2. Fill form:
   - Name: "Test University"
   - Domain: "test.edu"
   - Wallet Address: "0x..." (optional)
3. Click "Create"

**Expected:**
- ✅ Form validates inputs
- ✅ Success message appears
- ✅ New institution appears in list
- ✅ Status is "Pending" by default

**Manual Test:**
```bash
curl -X POST \
  -H "x-admin-key: 5df7e6ce-2b4f-4e7c-9a3f-4a7efb2a6f6a" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test University","domain":"test.edu"}' \
  https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev/api/admin/institutions
```

### Test Case 3: Edit Institution ✅

**Steps:**
1. Click "Edit" on an institution
2. Modify fields (e.g., change name)
3. Click "Save"

**Expected:**
- ✅ Form pre-fills with current data
- ✅ Changes save successfully
- ✅ Updated data shows in list

**Manual Test:**
```bash
curl -X PATCH \
  -H "x-admin-key: 5df7e6ce-2b4f-4e7c-9a3f-4a7efb2a6f6a" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated University Name"}' \
  https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev/api/admin/institutions/1
```

### Test Case 4: Approve Institution ✅

**Steps:**
1. Find institution with "Pending" status
2. Click "Approve" button
3. Confirm action

**Expected:**
- ✅ Status changes to "Approved"
- ✅ Success notification
- ✅ Institution can now mint certificates

**Manual Test:**
```bash
curl -X POST \
  -H "x-admin-key: 5df7e6ce-2b4f-4e7c-9a3f-4a7efb2a6f6a" \
  https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev/api/admin/institutions/1/approve
```

### Test Case 5: Revoke Institution ✅

**Steps:**
1. Find approved institution
2. Click "Revoke" button
3. Confirm action (may require reason)

**Expected:**
- ✅ Status changes to "Revoked"
- ✅ Warning/confirmation dialog appears
- ✅ Institution cannot mint new certificates
- ✅ Existing certificates remain but marked

**Manual Test:**
```bash
curl -X POST \
  -H "x-admin-key: 5df7e6ce-2b4f-4e7c-9a3f-4a7efb2a6f6a" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Fraud detected"}' \
  https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev/api/admin/institutions/1/revoke
```

### Troubleshooting:
- **If "Unauthorized":** Check admin API key is correct
- **If actions don't work:** Check browser console for errors
- **If changes don't persist:** Check database connection
- **If UI doesn't update:** Refresh page after action

---

## Test 7: Certificate Idempotency (Duplicate Prevention) 🔒

### Purpose:
Prevent users from minting the same certificate multiple times.

### Steps:
1. **Mint a certificate** (follow Test 3)
2. **Note the certificate details** (student name, institution, date)
3. **Upload the SAME PDF again**
4. **Extract data with OCR**
5. **Try to mint again**

### Expected Results:

#### Option A: Frontend Prevention
- ✅ System detects duplicate before minting
- ✅ Warning message: "This certificate has already been minted"
- ✅ Shows existing token ID
- ✅ "Mint" button is disabled or shows "Already Minted"
- ✅ Link to existing certificate provided

#### Option B: Backend Prevention
- ✅ Mint transaction is submitted
- ✅ Backend checks fingerprint/hash
- ✅ Returns error: "Certificate already exists"
- ✅ Shows existing token ID
- ✅ No duplicate NFT is created

#### Option C: Smart Contract Prevention
- ✅ Transaction is submitted to blockchain
- ✅ Smart contract reverts with error
- ✅ MetaMask shows error message
- ✅ No gas is wasted (or minimal)

### How It Works:

**Certificate Fingerprint:**
```
Hash = keccak256(
  studentName + 
  institution + 
  courseName + 
  issueDate
)
```

**Check Methods:**
1. **Database lookup:** Query by fingerprint hash
2. **Blockchain lookup:** Check if hash already minted
3. **IPFS content addressing:** Same content = same CID

### Test Cases:

**Test Case 1: Exact Duplicate**
```
Upload: demo.pdf
Extract: Same data
Expected: Rejection with existing token ID
```

**Test Case 2: Modified Certificate**
```
Upload: demo.pdf
Extract: Change student name slightly
Expected: Allowed (different certificate)
```

**Test Case 3: Different File, Same Data**
```
Upload: different-file.pdf with same content
Extract: Identical data
Expected: Rejection (same fingerprint)
```

### Manual Check:
```bash
# Check certificate availability before minting
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "student_name": "John Doe",
    "institution": "MIT",
    "course_name": "Computer Science",
    "issue_date": "2024-01-15"
  }' \
  https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev/api/certificates/availability
```

**Expected Response:**
```json
{
  "available": false,
  "existing_token_id": 42,
  "message": "Certificate already minted"
}
```

### Troubleshooting:
- **If duplicates are allowed:** Idempotency not implemented yet
- **If false positives:** Fingerprint algorithm too strict
- **If false negatives:** Hash collision (very rare)

---

## 🎯 Complete Demo Checklist

Use this checklist during your demo:

### Pre-Demo (5 minutes before)
- [ ] Backend health check passes
- [ ] MetaMask connected to Sepolia
- [ ] Sepolia ETH balance > 0.01
- [ ] `demo.pdf` ready on desktop
- [ ] Browser tabs open:
  - [ ] App
  - [ ] Etherscan
  - [ ] IPFS Gateway
- [ ] Admin API key copied (if needed)

### During Demo (3-5 minutes)
- [ ] **Intro** (30 sec): Explain problem
- [ ] **Upload** (10 sec): Drag & drop PDF
- [ ] **OCR** (10 sec): Extract data, show confidence
- [ ] **Mint** (30 sec): Sign transaction, show progress
- [ ] **Success** (20 sec): Show modal, links
- [ ] **Verify** (20 sec): Etherscan + IPFS
- [ ] **My Certs** (15 sec): Show portfolio
- [ ] **Verify Page** (15 sec): Instant verification
- [ ] **Admin** (20 sec - optional): Institution management
- [ ] **Conclusion** (30 sec): Impact & next steps

### Post-Demo
- [ ] Answer questions confidently
- [ ] Provide demo link
- [ ] Share documentation
- [ ] Follow up with judges

---

## 🚨 Common Issues & Quick Fixes

### Issue: Backend 500/502 Error
**Fix:** Restart backend server
```bash
# Via sandbox MCP
restart_server
```

### Issue: OCR Fails
**Fix:** Check Gemini API key and model
```bash
curl https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev/api/health
# Verify gemini.configured = true
```

### Issue: Transaction Fails
**Fix:** Check Sepolia ETH balance
```
MetaMask → Assets → ETH
Should have > 0.01 ETH
```

### Issue: IPFS Upload Fails
**Fix:** Check Pinata JWT
```bash
curl https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev/api/health
# Verify pinata.configured = true
```

### Issue: Wallet Won't Connect
**Fix:** 
1. Unlock MetaMask
2. Refresh page
3. Clear browser cache
4. Try different browser

### Issue: Wrong Network
**Fix:** MetaMask will prompt to switch
- Click "Switch Network"
- Select "Sepolia Test Network"

---

## 📊 Success Metrics

Track these during testing:

- ✅ **Backend Uptime:** 100%
- ✅ **OCR Accuracy:** >90%
- ✅ **Mint Success Rate:** >95%
- ✅ **Average Mint Time:** <30 seconds
- ✅ **Verification Speed:** <2 seconds (DB), <5 seconds (chain)
- ✅ **Zero Duplicates:** Idempotency working

---

## 🎬 Ready to Demo!

Once all tests pass, you're ready to impress the jury! 🚀

**Remember:**
- Practice the flow 2-3 times
- Have backup plans for each step
- Stay calm if something fails
- Focus on the impact, not just the tech

**Good luck! You've got this! 🏆**
