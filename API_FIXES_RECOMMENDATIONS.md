# API Issues - Fix Recommendations

## CRITICAL PRIORITY

### 1. Fix employer-verification.tsx - Replace fetch() with apiRequest()

**Problem:** Using native `fetch()` bypasses authentication and error handling

**Current Code (BROKEN):**
```tsx
// Lines 46, 56, 71
const res = await fetch('/api/employers/history');
const res = await fetch('/api/employers/registries');
const res = await fetch(`/api/employers/${id}`, { method: 'DELETE' });
```

**Fixed Code:**
```tsx
// Replace all three with apiRequest
const res = await apiRequest('/employers/history');
const res = await apiRequest('/employers/registries');
const res = await apiRequest(`/employers/${id}`, { method: 'DELETE' });
```

**Additional Fixes Needed:**
```tsx
// Add error handling
const { data: historyData, isLoading: historyLoading, refetch } = useQuery({
  queryKey: ['employer-history'],
  queryFn: async () => {
    try {
      return await apiRequest('/employers/history');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch verification history',
        variant: 'destructive'
      });
      throw error;
    }
  },
});

// Error state UI
{historyLoading ? (
  <Loader2 className="animate-spin" />
) : error ? (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>Failed to load history. {/* retry button */}</AlertDescription>
  </Alert>
) : (
  /* render data */
)}
```

**Estimated Effort:** 30 minutes
**Files to Change:** 1
**Breaking Changes:** None

---

### 2. Implement contact.tsx - Add API integration

**Problem:** Contact form is completely fake - never sends anything to server

**Current Code (BROKEN):**
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    // Just waits 1 second then shows fake success
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: "Message Sent",
      description: "Thank you for your message. We'll get back to you soon!",
    });
    setFormData({ name: "", email: "", subject: "", message: "" });
  } catch (error) {
    // This catch never happens
    toast({
      title: "Error",
      description: "Failed to send message. Please try again.",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};
```

**Fixed Code:**
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  try {
    // ACTUAL API CALL
    const response = await apiRequest('/contact', {
      method: 'POST',
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
      }),
    });

    if (response?.success) {
      toast({
        title: "Message Sent Successfully",
        description: "Thank you for your message. We'll get back to you within 24 hours.",
        className: "bg-green-50 text-green-900 border-green-200"
      });
      setFormData({ name: "", email: "", subject: "", message: "" });
    } else {
      throw new Error('Failed to send message');
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send message';
    setError(message);
    toast({
      title: "Error Sending Message",
      description: message,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};
```

**Backend Endpoint Required:**
```typescript
// In server/routes/contact.ts or create new file
router.post('/contact', validate(contactSchema), asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  
  // Save to database
  await db.insert(contactMessages).values({
    name,
    email,
    subject,
    message,
    createdAt: new Date(),
  });
  
  // Send email notification
  await emailQueue.add({
    to: 'support@immigrationai.com',
    subject: `New Contact: ${subject}`,
    template: 'contact-message',
    data: { name, email, subject, message }
  });
  
  res.json({ success: true, message: 'Message received' });
}));
```

**Estimated Effort:** 1 hour (includes backend)
**Files to Change:** 3 (contact.tsx, new backend route, database schema)
**Breaking Changes:** None

---

### 3. Fix partner.tsx - Replace mailto with API integration

**Problem:** Partnership form uses email fallback instead of proper API

**Current Code (BROKEN):**
```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // Just opens email client
  window.location.href = `mailto:partners@immigrationai.com?subject=Partnership Interest from ${contactForm.company}&body=${encodeURIComponent(contactForm.message)}`;
  setSubmitted(true);
};
```

**Fixed Code:**
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  try {
    // ACTUAL API CALL
    const response = await apiRequest('/partners/apply', {
      method: 'POST',
      body: JSON.stringify({
        name: contactForm.name,
        email: contactForm.email,
        company: contactForm.company,
        message: contactForm.message,
        type: selectedPartnerType, // If tracking which type
      }),
    });

    if (response?.success) {
      toast({
        title: "Application Submitted",
        description: "Thank you! Our partnership team will review and contact you within 2 business days.",
        className: "bg-green-50 text-green-900 border-green-200"
      });
      setSubmitted(true);
      setContactForm({ name: "", email: "", company: "", message: "" });
    } else {
      throw new Error('Failed to submit application');
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit application';
    setError(message);
    toast({
      title: "Submission Failed",
      description: message,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};
```

**Backend Endpoint Required:**
```typescript
// In server/routes/partners.ts or new file
router.post('/partners/apply', validate(partnerApplicationSchema), asyncHandler(async (req, res) => {
  const { name, email, company, message, type } = req.body;
  
  // Save application
  const application = await db.insert(partnerApplications).values({
    name,
    email,
    company,
    message,
    type,
    status: 'pending',
    createdAt: new Date(),
  });
  
  // Send notification email
  await emailQueue.add({
    to: 'partners@immigrationai.com',
    subject: `Partnership Application from ${company}`,
    template: 'partner-application',
    data: { name, email, company, message, type }
  });
  
  // Send confirmation to applicant
  await emailQueue.add({
    to: email,
    subject: 'Partnership Application Received',
    template: 'partner-confirmation',
    data: { name, company }
  });
  
  res.json({ success: true, message: 'Application received', applicationId: application.id });
}));
```

**Estimated Effort:** 1.5 hours (includes backend)
**Files to Change:** 3 (partner.tsx, new backend route, database schema)
**Breaking Changes:** None

---

## HIGH PRIORITY

### 4. Implement forum.tsx - Complete API integration

**Problem:** Forum page is completely hardcoded with mock data, no backend integration

**Current Code (BROKEN):**
```tsx
const [posts, setPosts] = useState<ForumPost[]>([
  {
    id: "1",
    title: "How to prepare for UK Skilled Worker Visa interview?",
    // ... hardcoded data
  },
  // ... more hardcoded posts
]);
```

**Fixed Implementation:**
```tsx
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function CommunityForum() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory, searchQuery]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      
      const data = await apiRequest<{ posts: ForumPost[] }>(
        `/forum/posts?${params.toString()}`
      );
      setPosts(data.posts || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load forum posts';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (title: string, content: string, category: string) => {
    try {
      const response = await apiRequest('/forum/posts', {
        method: 'POST',
        body: JSON.stringify({ title, content, category })
      });
      
      if (response?.success) {
        toast({
          title: 'Post Created',
          description: 'Your forum post has been published',
          className: 'bg-green-50 text-green-900 border-green-200'
        });
        fetchPosts(); // Refresh list
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create post';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
    }
  };

  const handleMarkHelpful = async (postId: string) => {
    try {
      await apiRequest(`/forum/posts/${postId}/helpful`, {
        method: 'POST'
      });
      // Update local state
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, helpful: p.helpful + 1 } : p
      ));
    } catch (err) {
      console.error('Failed to mark helpful', err);
    }
  };

  // ... rest of component

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} onRetry={fetchPosts} />;
  if (posts.length === 0) return <EmptyState />;

  return (
    // ... JSX with real posts
  );
}
```

**Backend Endpoints Required:**
```typescript
// GET /forum/posts
router.get('/posts', asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  let query = db.select().from(forumPosts);
  
  if (category && category !== 'all') {
    query = query.where(eq(forumPosts.category, category as string));
  }
  
  if (search) {
    query = query.where(
      or(
        like(forumPosts.title, `%${search}%`),
        like(forumPosts.content, `%${search}%`)
      )
    );
  }
  
  const posts = await query.orderBy(desc(forumPosts.createdAt));
  res.json({ posts });
}));

// POST /forum/posts
router.post('/posts', authenticate, validate(forumPostSchema), asyncHandler(async (req, res) => {
  const post = await db.insert(forumPosts).values({
    userId: req.user!.userId,
    title: req.body.title,
    content: req.body.content,
    category: req.body.category,
    createdAt: new Date(),
    helpful: 0,
    replies: 0
  });
  res.json({ success: true, postId: post.id });
}));

// POST /forum/posts/{id}/helpful
router.post('/posts/:id/helpful', authenticate, asyncHandler(async (req, res) => {
  await db.update(forumPosts)
    .set({ helpful: sql`helpful + 1` })
    .where(eq(forumPosts.id, req.params.id));
  res.json({ success: true });
}));
```

**Estimated Effort:** 3-4 hours
**Files to Change:** 3 (forum.tsx, new backend routes, database schema)
**Breaking Changes:** None

---

### 5. Fix admin-dashboard.tsx - Better error handling

**Problem:** Admin dashboard fetches multiple endpoints with poor error handling. If one fails, entire dashboard shows incomplete data.

**Current Code (PROBLEMATIC):**
```tsx
const fetchAdminStats = async () => {
  try {
    const data = await apiRequest<any>("/admin/overview", { skipErrorToast: true });
    setStats(data);
    try {
      const a = await apiRequest<any>("/ai/status", { skipErrorToast: true });
      setAiStatus(a.providers);
    } catch (e) {
      setAiStatus({ error: String(e) });
    }
    try {
      const s = await apiRequest<any>("/stripe/validate", { skipErrorToast: true });
      setStripeStatus(s);
    } catch (e) {
      setStripeStatus({ ok: false, reason: String(e) });
    }
  } catch (error) {
    console.error("Failed to fetch admin stats", error);
    // NO UI FEEDBACK!
  } finally {
    setLoading(false);
  }
};
```

**Fixed Code:**
```tsx
const [overviewError, setOverviewError] = useState<string | null>(null);
const [aiError, setAiError] = useState<string | null>(null);
const [stripeError, setStripeError] = useState<string | null>(null);

const fetchAdminStats = async () => {
  setLoading(true);
  setOverviewError(null);
  setAiError(null);
  setStripeError(null);

  try {
    // Fetch admin overview
    try {
      const data = await apiRequest<any>("/admin/overview");
      setStats(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch overview';
      setOverviewError(message);
      toast({
        title: 'Overview Error',
        description: message,
        variant: 'destructive'
      });
    }

    // Fetch AI status independently
    try {
      const a = await apiRequest<any>("/ai/status");
      setAiStatus(a.providers);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch AI status';
      setAiError(message);
    }

    // Fetch Stripe status independently
    try {
      const s = await apiRequest<any>("/stripe/validate");
      setStripeStatus(s);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch Stripe status';
      setStripeError(message);
    }
  } finally {
    setLoading(false);
  }
};

// In JSX, show errors for each section:
{overviewError && (
  <Alert variant="destructive" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      {overviewError}
      <button onClick={fetchAdminStats} className="ml-2 underline">Retry</button>
    </AlertDescription>
  </Alert>
)}

{aiError && (
  <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
    <AlertCircle className="inline mr-2 text-yellow-600" />
    <span className="text-yellow-800">AI Status: {aiError}</span>
  </div>
)}

{stripeError && (
  <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
    <AlertCircle className="inline mr-2 text-yellow-600" />
    <span className="text-yellow-800">Stripe Status: {stripeError}</span>
  </div>
)}
```

**Estimated Effort:** 1 hour
**Files to Change:** 1
**Breaking Changes:** None

---

## MEDIUM PRIORITY

### 6. Fix applications.tsx - Response type matching

**Problem:** Component expects `{ applications: ... }` wrapper but backend might return different format

**Current Code:**
```tsx
const data = await apiRequest<{ applications: any[] }>(`/applications`);
setApps(data.applications || []);
```

**Fix:**
1. **Check backend response format** in `server/routes/applications.ts`:
   ```typescript
   // Check if this is how backend returns it:
   res.json({ applications: allApps.slice(...) });
   ```

2. **If backend returns just the array**, update client:
   ```tsx
   const data = await apiRequest<any[]>('/applications');
   setApps(Array.isArray(data) ? data : data.applications || []);
   ```

3. **Or normalize in backend** to always return wrapped:
   ```typescript
   res.json({ applications: allApps, total: allApps.length });
   ```

**Estimated Effort:** 30 minutes
**Files to Change:** 1-2
**Breaking Changes:** Possibly

---

### 7. Fix application-view.tsx - Better error UI

**Problem:** Same UI for "loading" and "error" states

**Current Code (BAD):**
```tsx
if (!app) return <div className="p-6">Loading...</div>;
// Shows "Loading..." even when error occurred
```

**Fixed Code:**
```tsx
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [app, setApp] = useState<any | null>(null);

useEffect(() => {
  const fetchApp = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await apiRequest(`/applications/${id}`);
      setApp(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load application';
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  if (id) fetchApp();
}, [id]);

if (loading) return <LoadingSpinner />;

if (error) {
  return (
    <div className="p-6">
      <Alert variant="destructive">
        <AlertCircle />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
      <Button onClick={() => fetchApp()} className="mt-4">Retry</Button>
    </div>
  );
}

if (!app) {
  return (
    <div className="p-6">
      <Alert>
        <AlertDescription>Application not found</AlertDescription>
      </Alert>
    </div>
  );
}

return (
  // ... render app data
);
```

**Estimated Effort:** 30 minutes
**Files to Change:** 1
**Breaking Changes:** None

---

### 8. Fix notifications.tsx - Real data integration

**Problem:** Uses hardcoded mock notifications instead of fetching real data

**Current Code (BROKEN):**
```tsx
const mockNotifications = [...];
const [notifications, setNotifications] = useState(mockNotifications);
```

**Fixed Code:**
```tsx
const [notifications, setNotifications] = useState<Notification[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchNotifications();
}, []);

const fetchNotifications = async () => {
  try {
    setError(null);
    setLoading(true);
    const data = await apiRequest<{ notifications: Notification[] }>('/notifications');
    setNotifications(data.notifications || []);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load notifications';
    setError(message);
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive'
    });
  } finally {
    setLoading(false);
  }
};

const handleMarkAsRead = async (id: number) => {
  try {
    await apiRequest(`/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ read: true })
    });
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  } catch (err) {
    toast({
      title: 'Error',
      description: 'Failed to update notification',
      variant: 'destructive'
    });
  }
};

const handleDelete = async (id: number) => {
  try {
    await apiRequest(`/notifications/${id}`, { method: 'DELETE' });
    setNotifications(prev => prev.filter(n => n.id !== id));
  } catch (err) {
    toast({
      title: 'Error',
      description: 'Failed to delete notification',
      variant: 'destructive'
    });
  }
};
```

**Backend Endpoints Required:**
```typescript
// GET /notifications
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const notifications = await db.query.notifications.findMany({
    where: eq(notifications.userId, req.user!.userId),
    orderBy: [desc(notifications.createdAt)],
  });
  res.json({ notifications });
}));

// PUT /notifications/{id}
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  await db.update(notifications)
    .set({ read: req.body.read })
    .where(and(
      eq(notifications.id, req.params.id),
      eq(notifications.userId, req.user!.userId)
    ));
  res.json({ success: true });
}));

// DELETE /notifications/{id}
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await db.delete(notifications)
    .where(and(
      eq(notifications.id, req.params.id),
      eq(notifications.userId, req.user!.userId)
    ));
  res.json({ success: true });
}));
```

**Estimated Effort:** 1.5 hours
**Files to Change:** 3 (notifications.tsx, backend routes, database)
**Breaking Changes:** None

---

### 9. Fix settings.tsx - Better state management

**Problem:** Single `error` and `loading` state for 5+ different API calls causes issues

**Current Code (PROBLEMATIC):**
```tsx
const [error, setError] = useState<string | null>(null);
const [loading, setLoading] = useState(false);

const handleSaveProfile = async () => {
  setLoading(true);
  // ...
  setError(msg); // This overwrites any previous error
};

const handleChangePassword = async () => {
  setLoading(true); // Affects all form sections
  // ...
};
```

**Fixed Code - Option 1 (Per-function state):**
```tsx
const [profileLoading, setProfileLoading] = useState(false);
const [profileError, setProfileError] = useState<string | null>(null);

const [passwordLoading, setPasswordLoading] = useState(false);
const [passwordError, setPasswordError] = useState<string | null>(null);

const [privacyLoading, setPrivacyLoading] = useState(false);
const [privacyError, setPrivacyError] = useState<string | null>(null);

const handleSaveProfile = async () => {
  setProfileLoading(true);
  setProfileError(null);
  try {
    // ... API call
    toast({ title: 'Saved', ... });
  } catch (err) {
    setProfileError(message);
    toast({ title: 'Error', description: message, variant: 'destructive' });
  } finally {
    setProfileLoading(false);
  }
};
```

**Fixed Code - Option 2 (Object state):**
```tsx
const [formStates, setFormStates] = useState({
  profile: { loading: false, error: null },
  password: { loading: false, error: null },
  privacy: { loading: false, error: null },
  notifications: { loading: false, error: null },
  preferences: { loading: false, error: null },
});

const setFormState = (form: string, updates: any) => {
  setFormStates(prev => ({
    ...prev,
    [form]: { ...prev[form as any], ...updates }
  }));
};

const handleSaveProfile = async () => {
  setFormState('profile', { loading: true, error: null });
  try {
    // ... API call
  } catch (err) {
    setFormState('profile', { error: message });
  } finally {
    setFormState('profile', { loading: false });
  }
};
```

**Estimated Effort:** 1 hour
**Files to Change:** 1
**Breaking Changes:** None

---

## LOW PRIORITY

### 10. Fix help.tsx - Help form API integration

**Problem:** Help form has simulated submission

**Current Code:**
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSending(true);
  await new Promise(resolve => setTimeout(resolve, 1500)); // Fake delay
  setSending(false);
  toast({ title: "Message Sent", ... });
};
```

**Fixed Code:**
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSending(true);

  try {
    const response = await apiRequest('/help/submit', {
      method: 'POST',
      body: JSON.stringify({
        email,
        message,
        urgency: 'normal',
        category: 'general'
      })
    });

    if (response?.success) {
      toast({
        title: "Message Sent",
        description: "We'll respond within 24 hours",
        className: "bg-green-50 text-green-900 border-green-200"
      });
      setEmail("");
      setMessage("");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send message';
    toast({
      title: "Error",
      description: message,
      variant: "destructive"
    });
  } finally {
    setSending(false);
  }
};
```

**Estimated Effort:** 1 hour
**Files to Change:** 2 (help.tsx, new backend route)
**Breaking Changes:** None

---

## VERIFICATION CHECKLIST

Before deploying fixes, verify these endpoints exist in backend:

### Admin Routes
- [ ] GET `/admin/overview` → Check admin.ts line 27
- [ ] GET `/admin/users/analytics` → Check admin.ts
- [ ] GET `/admin/ai-usage` → Check admin.ts
- [ ] POST `/admin/users/{userId}/adjust-tier` → Check admin.ts

### AI Routes
- [ ] GET `/ai/status` → Check ai.ts line 31
- [ ] POST `/ai/documents/generate` → Check ai.ts
- [ ] POST `/ai/chat` → Check ai.ts

### Application Routes
- [ ] GET `/applications` → Check applications.ts
- [ ] GET `/applications/{id}` → Check applications.ts
- [ ] PATCH `/applications/{id}` → Check applications.ts

### Employer Routes
- [ ] GET `/employers/registries` → Check employers.ts
- [ ] POST `/employers/verify` → Check employers.ts
- [ ] GET `/employers/history` → Check employers.ts
- [ ] DELETE `/employers/{id}` → Check employers.ts

### Subscription Routes
- [ ] GET `/subscription/current` → Check subscriptions.ts
- [ ] GET `/subscription/usage` → Check subscriptions.ts
- [ ] GET `/subscription/billing-history` → Check subscriptions.ts
- [ ] POST `/subscription/upgrade` → Check subscriptions.ts
- [ ] POST `/subscription/cancel` → Check subscriptions.ts

### Stripe Routes
- [ ] POST `/stripe/create-intent` → Check stripe.ts
- [ ] POST `/stripe/confirm` → Check stripe.ts
- [ ] GET `/stripe/validate` → Check stripe.ts

### Missing Routes (Must Create)
- [ ] POST `/contact` - NEW
- [ ] POST `/partners/apply` - NEW
- [ ] GET `/forum/posts` - NEW
- [ ] POST `/forum/posts` - NEW
- [ ] POST `/forum/posts/{id}/helpful` - NEW
- [ ] GET `/notifications` - NEW
- [ ] PUT `/notifications/{id}` - NEW
- [ ] DELETE `/notifications/{id}` - NEW
- [ ] POST `/help/submit` - NEW

---

## Testing Recommendations

After implementing fixes:

1. **Unit Tests:**
   ```typescript
   describe('API Calls', () => {
     it('should call /employer/history with apiRequest', async () => {
       // Mock apiRequest and verify it's called correctly
     });
   });
   ```

2. **Integration Tests:**
   - Test each endpoint with real backend
   - Test error handling scenarios
   - Test retry logic

3. **E2E Tests:**
   - Test full user flows
   - Test form submissions
   - Test error recovery

4. **Manual Testing:**
   - Test with slow network
   - Test with offline mode
   - Test error states
   - Test loading states

---

## Deployment Notes

1. **Backward Compatibility:** Some fixes require backend changes. Coordinate deployment.
2. **Database Migrations:** New tables needed for contact, partners, forum, notifications
3. **Environment Variables:** Check for new API endpoints in env config
4. **Error Monitoring:** Enable error tracking (Sentry, LogRocket) to catch issues in production
5. **Gradual Rollout:** Consider feature flags for new implementations

---

## Success Metrics

After implementing all fixes:

- ✅ 100% of API calls use `apiRequest()` helper
- ✅ All pages have proper error states
- ✅ All pages have loading states
- ✅ No console errors related to API
- ✅ All forms submit successfully
- ✅ Error messages are user-friendly
- ✅ Retry functionality works
- ✅ No hardcoded/mock data in production
