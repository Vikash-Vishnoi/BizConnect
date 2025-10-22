# 🚀 Quick Reference - New Utilities

## 📝 Logger Utility

### Import
```typescript
import logger from '../utils/logger';
```

### Usage Examples

#### Development-Only Logs
```typescript
// Regular logging (only in development)
logger.log('User data:', user);
logger.info('Component mounted');
logger.debug('State changed:', newState);

// Warnings (only in development)
logger.warn('Deprecated API used');
```

#### Production-Safe Error Logging
```typescript
// Errors (shows in production, sanitized)
logger.error('API call failed:', error);
```

#### Specialized Loggers
```typescript
// API calls
logger.api('POST', '/campaigns', {name: 'My Campaign'});

// Navigation
logger.navigation('Dashboard', {userId: 123});

// Socket events
logger.socket('new_message', messageData);
```

---

## 🔢 Constants Utility

### Import
```typescript
import {
  TIMEOUTS,
  LIMITS,
  ANIMATION_DURATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STORAGE_KEYS,
  API_ENDPOINTS,
} from '../utils/constants';
```

### Usage Examples

#### Timeouts & Delays
```typescript
// API timeout
axios.get(url, {timeout: TIMEOUTS.API_REQUEST});

// UI delays
setTimeout(callback, TIMEOUTS.SHORT_DELAY);
await new Promise(resolve => setTimeout(resolve, TIMEOUTS.MEDIUM_DELAY));

// Search debounce
const debouncedSearch = debounce(search, TIMEOUTS.SEARCH_DEBOUNCE);

// Toast duration
<Toast duration={TIMEOUTS.TOAST_DURATION} />
```

#### Limits
```typescript
// Password validation
if (password.length < LIMITS.MIN_PASSWORD_LENGTH) {
  // Show error
}

// Pagination
const itemsPerPage = LIMITS.ITEMS_PER_PAGE;

// Text truncation
const preview = text.substring(0, LIMITS.TEMPLATE_PREVIEW_LENGTH);

// Recent activity
const activities = getActivities(LIMITS.RECENT_ACTIVITY_MAX);
```

#### Animation Durations
```typescript
Animated.timing(value, {
  toValue: 1,
  duration: ANIMATION_DURATION.STANDARD,
  useNativeDriver: true,
}).start();

// Different speeds
duration: ANIMATION_DURATION.FAST,     // 150ms - buttons
duration: ANIMATION_DURATION.STANDARD, // 300ms - most UI
duration: ANIMATION_DURATION.SLOW,     // 500ms - modals
duration: ANIMATION_DURATION.SHIMMER,  // 1000ms - loading skeleton
```

#### Error Messages
```typescript
// Network errors
Alert.alert('Error', ERROR_MESSAGES.NETWORK_ERROR);

// Generic errors
Alert.alert('Error', ERROR_MESSAGES.GENERIC_ERROR);

// Specific errors
if (status === 401) {
  Alert.alert('Error', ERROR_MESSAGES.UNAUTHORIZED);
}
```

#### Success Messages
```typescript
// Campaign actions
Alert.alert('Success', SUCCESS_MESSAGES.CAMPAIGN_CREATED);
showToast(SUCCESS_MESSAGES.CAMPAIGN_STARTED);

// Auth actions
Alert.alert('Success', SUCCESS_MESSAGES.LOGIN_SUCCESS);
```

#### Storage Keys
```typescript
// Save data
await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);

// Load data
const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

// Remove data
await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
```

#### API Endpoints
```typescript
// Static endpoints
api.get(API_ENDPOINTS.CAMPAIGNS);
api.post(API_ENDPOINTS.LOGIN, credentials);

// Dynamic endpoints
api.get(API_ENDPOINTS.CAMPAIGN('123'));
api.post(API_ENDPOINTS.TEMPLATE_SUBMIT('abc'));
```

---

## 🛡️ Error Boundary

### Already Implemented
The ErrorBoundary is already wrapping your entire app in `App.tsx`:

```typescript
<ErrorBoundary>
  <SocketProvider>
    <NavigationContainer>
      {/* All screens */}
    </NavigationContainer>
  </SocketProvider>
</ErrorBoundary>
```

### Custom Error Screens
If you need a custom error UI for specific sections:

```typescript
import ErrorBoundary from './components/common/ErrorBoundary';

// Wrap specific component
<ErrorBoundary fallback={<CustomErrorScreen />}>
  <ComplexComponent />
</ErrorBoundary>
```

---

## 🔄 Migration Guide

### Replace console.log

#### Find & Replace (VSCode)
1. Press `Ctrl+Shift+H` (Find and Replace in Files)
2. Find: `console\.log\(`
3. Replace: `logger.log(`
4. Click "Replace All"

Repeat for:
- `console.error(` → `logger.error(`
- `console.warn(` → `logger.warn(`
- `console.info(` → `logger.info(`

#### Manual Replacements Needed
Some require manual review:

```typescript
// Before
console.log('Socket connection initiated');

// After
logger.socket('connect', {status: 'initiated'});
```

```typescript
// Before
console.log('Navigating to:', screenName);

// After
logger.navigation(screenName, params);
```

---

## 📌 Best Practices

### DO ✅
```typescript
// Use logger instead of console
logger.log('Debug info');

// Use constants for magic numbers
setTimeout(callback, TIMEOUTS.SHORT_DELAY);

// Use constants for error messages
Alert.alert('Error', ERROR_MESSAGES.NETWORK_ERROR);
```

### DON'T ❌
```typescript
// Don't use console directly
console.log('Debug info'); // ❌

// Don't use magic numbers
setTimeout(callback, 100); // ❌

// Don't hardcode error messages
Alert.alert('Error', 'Network error'); // ❌
```

---

## 🧪 Testing Utilities

### Test Logger Output
```typescript
// Enable debug mode
const originalDev = __DEV__;
__DEV__ = true;

logger.log('This will show');
logger.debug('This will show');

__DEV__ = false;
logger.log('This will NOT show');

__DEV__ = originalDev; // Restore
```

### Test Error Boundary
```typescript
// Create a component that throws
const BrokenComponent = () => {
  throw new Error('Test error');
  return <Text>Never shows</Text>;
};

// Render it
<ErrorBoundary>
  <BrokenComponent />
</ErrorBoundary>
// Should show error screen instead of crashing
```

---

## 📚 Additional Resources

### Files Location
- **Logger:** `frontend/src/utils/logger.ts`
- **Constants:** `frontend/src/utils/constants.ts`
- **ErrorBoundary:** `frontend/src/components/common/ErrorBoundary.tsx`

### Documentation
- See `SCAN_FIXES_REPORT.md` for implementation details
- See `PROJECT_AUDIT_CHECKLIST.md` for complete audit

---

**Quick Tip:** Import all utilities at the top of your file for easy access:

```typescript
import logger from '../utils/logger';
import {TIMEOUTS, ERROR_MESSAGES, SUCCESS_MESSAGES} from '../utils/constants';
```

---

**Created:** October 22, 2025  
**Version:** 1.0.0
