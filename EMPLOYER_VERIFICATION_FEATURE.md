# Employer Verification Feature - Implementation Guide

## Overview

The Employer Verification feature enables users to verify employers across European company registries. This is particularly useful for immigration applications where employment verification is required.

## Supported European Registries

| Country | Registry | Registry Type | Status |
|---------|----------|---------------|--------|
| United Kingdom | Companies House | `uk_companies_house` | ✓ Integrated |
| Germany | HWR Register (Handelsregister) | `eu_germany_hwr` | ✓ Integrated |
| France | INPI Register | `eu_france_inpi` | ✓ Integrated |
| Netherlands | KvK Register (Kamer van Koophandel) | `eu_netherlands_kvk` | ✓ Integrated |
| Spain | Mercantil Register | `eu_spain_mercantil` | ✓ Integrated |

## Architecture

### Backend Components

#### 1. Database Schema (`shared/schema.ts`)

Two new tables added:

**`employer_verifications`** - Stores individual verification checks
- `id` - UUID primary key
- `userId` - Reference to user who performed verification
- `applicationId` - Optional reference to visa application
- `companyName` - Company name searched
- `country` - ISO country code
- `registryType` - Which registry was queried
- `registryId` - Company registration number from registry
- `verificationStatus` - pending, verified, invalid, error
- `companyData` - Full response from registry API
- `registeredAddress` - Company's registered address
- `businessType` - Type of business entity
- `directorNames` - Array of director names (if available)
- `sic_codes` - Standard Industrial Classification codes
- `expiresAt` - Cache expiration (90 days)
- `metadata` - Additional data including confidence score

**`employer_directory`** - Cached list of frequently verified employers
- `id` - UUID primary key
- `companyName` - Company name
- `country` - ISO country code
- `registryType` - Registry type
- `registryId` - Registration number
- `companyData` - Cached company information
- `verificationsCount` - How many times verified
- `lastVerifiedAt` - Last verification date

#### 2. Employer Verification Library (`server/lib/employer-verification.ts`)

**Core Functions:**

```typescript
// Main verification function
async function verifyEmployer(
  params: CompanySearchParams
): Promise<EmployerVerificationResponse>

// Query specific registries
async function verifyUKCompany(companyName: string)
async function verifyGermanCompany(companyName: string)
async function verifyFrenchCompany(companyName: string)
async function verifyDutchCompany(companyName: string)
async function verifySpanishCompany(companyName: string)

// Search across multiple registries
async function searchEmployersMultiRegistry(
  companyName: string,
  countries?: string[]
): Promise<EmployerVerificationResponse>

// Get registry information
function getRegistriesInfo()
```

**Response Format:**

```typescript
interface CompanyVerificationResult {
  found: boolean;
  companyName: string;
  country: string;
  registryType: string;
  registryId: string | null;
  registeredAddress?: string;
  businessType?: string;
  status?: string;
  registrationDate?: Date;
  directors?: string[];
  sic_codes?: string[];
  raw_data?: any;
  verifiedAt: Date;
  confidence?: number;
}

interface EmployerVerificationResponse {
  status: 'verified' | 'unverified' | 'error';
  results: CompanyVerificationResult[];
  message: string;
  timestamp: Date;
}
```

#### 3. API Routes (`server/routes/employers.ts`)

**Endpoints:**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|----------------|
| POST | `/api/employers/verify` | Verify employer in specific country | ✓ Yes |
| POST | `/api/employers/search-multi` | Search across all European registries | ✓ Yes |
| GET | `/api/employers/registries` | Get list of available registries | ✗ No |
| GET | `/api/employers/history` | Get user's verification history | ✓ Yes |
| GET | `/api/employers/:id` | Get specific verification record | ✓ Yes |
| DELETE | `/api/employers/:id` | Delete verification record | ✓ Yes |
| GET | `/api/employers/directory/top` | Get frequently verified employers | ✗ No |
| POST | `/api/employers/verify-bulk` | Verify multiple employers at once | ✓ Yes |

### Frontend Components

#### 1. Employer Verification Component (`client/src/components/employer-verification.tsx`)

Reusable React component with:
- Company name input field
- Country selection dropdown
- Single country verification
- Multi-country search capability
- Real-time results display
- Confidence scores
- Director information
- Business type details

#### 2. Employer Verification Page (`client/src/pages/employer-verification.tsx`)

Full-page component featuring:
- **Verify Tab** - Main search interface with supported countries list
- **History Tab** - User's verification history with delete capability
- **Registries Tab** - Information about available registries and documentation links

## API Usage Examples

### Single Country Verification

```bash
curl -X POST http://localhost:5000/api/employers/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d {
    "companyName": "Apple Ltd",
    "country": "GB",
    "applicationId": "app-uuid-123"
  }
```

**Response:**
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
      "registrationDate": "2015-01-15T00:00:00Z",
      "directors": ["John Smith", "Jane Doe"],
      "sic_codes": ["62010", "62020"],
      "confidence": 95,
      "verifiedAt": "2024-12-12T10:30:00Z"
    }
  ],
  "message": "Found 1 matching company record(s)",
  "timestamp": "2024-12-12T10:30:00Z",
  "recordSaved": true
}
```

### Multi-Registry Search

```bash
curl -X POST http://localhost:5000/api/employers/search-multi \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d {
    "companyName": "TechCorp",
    "countries": ["GB", "DE", "FR", "NL", "ES"]
  }
```

### Get Verification History

```bash
curl http://localhost:5000/api/employers/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Available Registries

```bash
curl http://localhost:5000/api/employers/registries
```

**Response:**
```json
{
  "success": true,
  "registries": [
    {
      "id": "uk_companies_house",
      "name": "UK Companies House",
      "country": "GB",
      "documentationUrl": "https://find-and-update.company-information.service.gov.uk/",
      "available": true
    },
    ...
  ],
  "message": "Available European company registries"
}
```

### Bulk Verification

```bash
curl -X POST http://localhost:5000/api/employers/verify-bulk \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d {
    "employers": [
      {
        "companyName": "Company A Ltd",
        "country": "GB"
      },
      {
        "companyName": "Company B GmbH",
        "country": "DE"
      }
    ],
    "applicationId": "app-uuid-123"
  }
```

## Database Migrations

Run the migration to create the new tables:

```bash
npm run db:push
```

Or manually run:

```bash
psql $DATABASE_URL < migrations/add_employer_verification_tables.sql
```

## Environment Variables

To enable real API integration with company registries, add the following environment variables:

```env
# UK Companies House API
UK_COMPANIES_HOUSE_API_KEY=your_uk_api_key

# EU Registry APIs (optional for future integration)
EU_GERMANY_HWR_API_KEY=your_germany_api_key
EU_FRANCE_INPI_API_KEY=your_france_api_key
EU_NETHERLANDS_KVK_API_KEY=your_netherlands_api_key
EU_SPAIN_MERCANTIL_API_KEY=your_spain_api_key
```

### Getting API Keys

**UK Companies House:**
1. Visit https://developer.companieshouse.gov.uk/
2. Register for a developer account
3. Create an application
4. Get your API key
5. Add to environment variables

**Other European Registries:**
- Contact registry administrators for API access
- Some registries may have public data available via web scraping or public APIs
- Consult registry documentation for integration details

## Integration in Dashboard

To add the Employer Verification feature to the applicant dashboard:

```tsx
import { EmployerVerification } from '@/components/employer-verification';

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* ... other dashboard sections ... */}
      
      <Card>
        <CardHeader>
          <CardTitle>Employer Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployerVerification
            applicationId={applicationId}
            onVerificationComplete={handleVerificationComplete}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

## Features

### Current Implementation

✓ Single country employer search
✓ Multi-country employer search
✓ Verification history tracking
✓ Verification caching (90-day expiration)
✓ Employer directory with popularity tracking
✓ Bulk verification
✓ Director and SIC code extraction
✓ Confidence scoring
✓ Mock data for development (when API keys not available)

### Future Enhancements

- [ ] Real-time API integration with all European registries
- [ ] Webhook integration with applicant's employment verification process
- [ ] Automatic employment verification during application submission
- [ ] Email notifications when employer verification completes
- [ ] Advanced filtering and search in employer directory
- [ ] Employer reputation scores based on verification data
- [ ] Integration with employment verification services
- [ ] Multi-language support for employer information
- [ ] Audit logs for regulatory compliance

## Security Considerations

1. **Authentication Required** - All verification endpoints require JWT authentication (except public endpoints like `/registries`)

2. **Rate Limiting** - Implement rate limiting to prevent abuse:
   ```typescript
   // Add to routes
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   
   router.post('/verify', limiter, ...);
   ```

3. **Data Privacy** - Verification records are tied to users and contain sensitive business information
   - Only show users their own verification records
   - Implement proper access controls
   - Log all verification activities for audit trails

4. **API Key Management** - Keep registry API keys secure:
   - Store in environment variables
   - Never commit to git
   - Rotate keys regularly
   - Use separate keys for different environments

## Testing

### Unit Tests Example

```typescript
import { verifyEmployer, verifyUKCompany } from '@/lib/employer-verification';

describe('Employer Verification', () => {
  it('should find a valid UK company', async () => {
    const result = await verifyUKCompany('Apple Ltd');
    expect(result?.found).toBe(true);
    expect(result?.country).toBe('GB');
  });

  it('should return null for non-existent company', async () => {
    const result = await verifyUKCompany('NonExistentCompany123XYZ');
    expect(result?.found).toBe(false);
  });

  it('should search multiple registries', async () => {
    const result = await searchEmployersMultiRegistry('TechCorp');
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.status).toBe('verified');
  });
});
```

### Integration Tests Example

```typescript
describe('Employer Verification API', () => {
  it('should verify employer via POST /api/employers/verify', async () => {
    const response = await request(app)
      .post('/api/employers/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        companyName: 'Test Company Ltd',
        country: 'GB'
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('verified');
  });
});
```

## Performance Optimization

### Caching Strategy

1. **Database Caching** - Verified results cached for 90 days in `employer_directory`
2. **Directory Lookups** - Before API calls, check if company already verified
3. **Batch Processing** - Bulk verification endpoint for multiple checks

### Optimization Example

```typescript
// Check cache first
const cached = await db
  .select()
  .from(employerDirectory)
  .where(
    and(
      eq(employerDirectory.registryId, registryId),
      eq(employerDirectory.registryType, registryType),
      gt(employerDirectory.lastVerifiedAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
    )
  )
  .limit(1);

if (cached.length > 0) {
  // Return cached result
  return cached[0].companyData;
}

// Otherwise, call API
const result = await verifyUKCompany(companyName);
```

## Troubleshooting

### No Results Found
- Verify exact company name spelling
- Try searching with partial name
- Ensure correct country is selected
- Check if company is listed in registry

### API Connection Errors
- Verify API keys are correctly set in environment variables
- Check API rate limits haven't been exceeded
- Ensure network connectivity to registry services
- Review API service status

### Missing Director Information
- Not all registries provide director names
- Some jurisdictions have privacy restrictions
- Check registry-specific data availability

## Support & Documentation

- **UK Companies House API Docs:** https://developer.companieshouse.gov.uk/
- **Feature Requests:** Create issues in project repository
- **Bug Reports:** Include logs from `/api/employers/verify` responses

## License

This feature is part of the ImmigrationAI platform and is subject to the same license terms.
