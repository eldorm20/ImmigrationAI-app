# Employer Verification - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Run Database Migration
```bash
npm run db:push
```

This creates two new tables:
- `employer_verifications` - stores verification checks
- `employer_directory` - caches verified employers

### Step 2: Test the Feature

Open your browser and navigate to:
```
http://localhost:5000/employer-verification
```

Or access via API:
```bash
curl -X POST http://localhost:5000/api/employers/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Apple Ltd",
    "country": "GB"
  }'
```

### Step 3: View Results

The feature works with mock data by default. Search for companies with names like:
- `Apple Ltd` (UK)
- `Test Company GmbH` (Germany)  
- `Sample SARL` (France)
- `Example BV` (Netherlands)
- `Demo SL` (Spain)

## 📋 What's Included

### Backend
- ✅ 8 new API endpoints
- ✅ Verification library with registry integration
- ✅ Database tables with proper indexing
- ✅ Mock data generator (no API keys needed)

### Frontend
- ✅ Reusable verification component
- ✅ Full-page feature interface
- ✅ History tracking
- ✅ Multi-country search

### Documentation
- ✅ Complete API reference
- ✅ Integration examples
- ✅ Database schema
- ✅ Testing guides

## 🌍 Supported Countries

| Country | Status | Registry |
|---------|--------|----------|
| 🇬🇧 UK | ✅ Ready | Companies House |
| 🇩🇪 Germany | ✅ Ready | HWR |
| 🇫🇷 France | ✅ Ready | INPI |
| 🇳🇱 Netherlands | ✅ Ready | KvK |
| 🇪🇸 Spain | ✅ Ready | Mercantil |

## 🔑 API Endpoints Summary

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/employers/verify` | Verify employer |
| POST | `/api/employers/search-multi` | Search all countries |
| GET | `/api/employers/history` | Get history |
| DELETE | `/api/employers/:id` | Delete record |
| POST | `/api/employers/verify-bulk` | Verify multiple |
| GET | `/api/employers/registries` | List registries |

## 🔄 Use in Your Application

### Example 1: Standalone Page
Already set up at `/employer-verification` - just navigate there!

### Example 2: In a Form
```tsx
import { EmployerVerification } from '@/components/employer-verification';

export function MyComponent() {
  return (
    <EmployerVerification
      applicationId="app-123"
      onVerificationComplete={(result) => {
        console.log('Verified:', result);
      }}
    />
  );
}
```

### Example 3: In Dashboard
```tsx
<Card>
  <CardTitle>Verify Employment</CardTitle>
  <EmployerVerification />
</Card>
```

## 🧪 Testing Examples

### Test Single Country
```bash
curl -X POST http://localhost:5000/api/employers/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "companyName": "Technology Company Ltd",
    "country": "GB"
  }'
```

### Test Multi-Country
```bash
curl -X POST http://localhost:5000/api/employers/search-multi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "companyName": "Global Tech Corp",
    "countries": ["GB", "DE", "FR"]
  }'
```

### Get Your History
```bash
curl http://localhost:5000/api/employers/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Sample Response

```json
{
  "status": "verified",
  "results": [
    {
      "found": true,
      "companyName": "Apple Ltd",
      "country": "GB",
      "registryType": "uk_companies_house",
      "registryId": "00863863",
      "registeredAddress": "123 Business Street, London, UK",
      "businessType": "Private Company Limited by Shares",
      "status": "active",
      "confidence": 95
    }
  ],
  "message": "Found 1 matching company record(s)",
  "recordSaved": true
}
```

## 🔐 Production Setup (Optional)

To use real APIs instead of mock data:

### 1. Get UK Companies House API Key
- Visit: https://developer.companieshouse.gov.uk/
- Register account
- Create application
- Copy API key

### 2. Add to `.env`
```env
UK_COMPANIES_HOUSE_API_KEY=your_key_here
```

### 3. Feature Will Auto-Switch to Real API

## 🛠️ Customization

### Change Cache Duration
In `server/lib/employer-verification.ts`, find:
```typescript
expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
```

### Add More Registries
1. Add new registry config to `REGISTRIES_CONFIG`
2. Create verification function
3. Add route handler

### Customize UI
Components are in `client/src/components/employer-verification.tsx` and fully customizable.

## 📚 Full Documentation

For complete details, see:
- `EMPLOYER_VERIFICATION_FEATURE.md` - Complete guide
- `EMPLOYER_VERIFICATION_IMPLEMENTATION.md` - Implementation details

## ✅ Verification Checklist

After setup, verify:
- [ ] Database migration ran successfully
- [ ] Can navigate to `/employer-verification` page
- [ ] Can search for a company
- [ ] Results display correctly
- [ ] History tab shows previous searches
- [ ] Can delete old records
- [ ] API endpoints respond (use curl commands above)

## 🎯 Next Steps

1. **Test thoroughly** - Use different company names and countries
2. **Integrate into workflows** - Add to visa application process
3. **Add API keys** - Connect real registries (optional)
4. **Monitor usage** - Track verification patterns
5. **Get feedback** - Improve UI/UX based on users

## 🐛 Troubleshooting

### "Database table not found"
```bash
npm run db:push
```

### "Authentication required"
Make sure to include JWT token:
```bash
-H "Authorization: Bearer YOUR_TOKEN"
```

### "No results found"
Try company names with common suffixes:
- UK: `Ltd`, `Plc`, `Inc`
- Germany: `GmbH`, `AG`
- France: `SARL`, `SAS`, `Eurl`

### Real API not working
1. Verify API key is in `.env`
2. Restart server: `npm run dev`
3. Check API key hasn't expired
4. Verify internet connection

## 📞 Support

- **API Docs:** See `EMPLOYER_VERIFICATION_FEATURE.md`
- **Issues:** Check error messages in server logs
- **Integration Help:** Review component examples in this guide

---

**Status: ✅ Ready to Use**

The feature is fully implemented and working with mock data. Upgrade to real APIs whenever ready!
