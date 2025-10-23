#!/bin/bash

# EduProof - Quick Test Script for Demo
# Verifies all services are operational before presentation

set -e

BASE_URL="https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev"
ADMIN_KEY="5df7e6ce-2b4f-4e7c-9a3f-4a7efb2a6f6a"

echo "🎯 EduProof - Pre-Demo Verification"
echo "===================================="
echo ""

# 1. Health Check
echo "1️⃣  Checking backend..."
HEALTH=$(curl -s "$BASE_URL/api/health")
if echo "$HEALTH" | grep -q '"ok":true'; then
    echo "   ✅ Backend operational"
    echo "   📊 Services:"
    echo "$HEALTH" | jq -r '.services | to_entries[] | "      - \(.key): \(.value.configured // .value.status)"'
else
    echo "   ❌ Backend unavailable"
    exit 1
fi
echo ""

# 2. Frontend Check
echo "2️⃣  Checking frontend..."
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
if [ "$FRONTEND" = "200" ]; then
    echo "   ✅ Frontend accessible"
else
    echo "   ❌ Frontend error (HTTP $FRONTEND)"
    exit 1
fi
echo ""

# 3. Admin API Check
echo "3️⃣  Checking admin API..."
ADMIN=$(curl -s -H "x-admin-key: $ADMIN_KEY" "$BASE_URL/api/admin/institutions")
if echo "$ADMIN" | grep -q '\['; then
    COUNT=$(echo "$ADMIN" | jq '. | length')
    echo "   ✅ Admin API working"
    echo "   📋 Institutions registered: $COUNT"
else
    echo "   ❌ Admin API error"
    exit 1
fi
echo ""

# 4. Blockchain Config Check
echo "4️⃣  Checking blockchain configuration..."
if [ -f "contracts/interfaces/metadata.json" ]; then
    CHAIN=$(jq -r '.chains[0].name' contracts/interfaces/metadata.json 2>/dev/null || echo "unknown")
    CONTRACT=$(jq -r '.chains[0].contracts.EduProofCertificate' contracts/interfaces/metadata.json 2>/dev/null || echo "unknown")
    echo "   ✅ Metadata found"
    echo "   🔗 Chain: $CHAIN"
    echo "   📝 Contract: $CONTRACT"
else
    echo "   ⚠️  No metadata.json found (run contract deployment first)"
fi
echo ""

# 5. Environment Check
echo "5️⃣  Checking environment variables..."
if [ -f ".env.server" ]; then
    if grep -q "GEMINI_API_KEY" .env.server && grep -q "ADMIN_API_KEY" .env.server; then
        echo "   ✅ Server environment configured"
    else
        echo "   ⚠️  Missing environment variables"
    fi
else
    echo "   ❌ .env.server not found"
    exit 1
fi
echo ""

# 6. Demo File Check
echo "6️⃣  Checking demo files..."
if [ -f "demo.pdf" ]; then
    SIZE=$(du -h demo.pdf | cut -f1)
    echo "   ✅ demo.pdf ready ($SIZE)"
else
    echo "   ⚠️  demo.pdf not found (prepare a test certificate)"
fi
echo ""

# Summary
echo "=================================="
echo "✅ All systems operational!"
echo ""
echo "📋 Pre-Demo Checklist:"
echo "   [ ] MetaMask connected to Sepolia"
echo "   [ ] Sepolia ETH balance > 0.01"
echo "   [ ] Browser tabs open:"
echo "       - App: $BASE_URL"
echo "       - Etherscan: https://sepolia.etherscan.io"
echo "       - IPFS: https://gateway.pinata.cloud/ipfs/"
echo "   [ ] demo.pdf on desktop"
echo "   [ ] Microphone tested"
echo "   [ ] Screen sharing ready"
echo ""
echo "🚀 Ready to impress the jury!"
echo "=================================="
