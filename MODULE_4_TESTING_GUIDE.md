# 🧪 Module 4: Template Management - Testing Guide

## Quick Start Testing

### Prerequisites
- App is running on Android emulator or device
- User is logged in
- Dashboard is visible

---

## 🎯 Test Scenarios

### 1. Navigate to Templates Screen
**Steps:**
1. From Dashboard, tap on "Templates" card
2. Verify templates list loads with 6 dummy templates

**Expected Result:**
- ✅ Templates screen opens
- ✅ Header shows "Templates" with back button and "+ New" button
- ✅ Search bar is visible
- ✅ Status and Category filters are visible
- ✅ 6 templates are displayed in cards
- ✅ Each card shows: name, category, status badge, body preview, component tags, date

---

### 2. Test Search Functionality
**Steps:**
1. In Templates screen, tap search bar
2. Type "health"
3. Observe filtered results

**Expected Result:**
- ✅ List filters to show only "health_reminder" template
- ✅ Search is case-insensitive
- ✅ Clear button (X) appears when typing
- ✅ Tapping X clears search and shows all templates

---

### 3. Test Status Filters
**Steps:**
1. Tap "Approved" filter chip
2. Observe filtered results
3. Tap "Pending" filter chip
4. Tap "Draft" filter chip
5. Tap "Rejected" filter chip
6. Tap "All" to reset

**Expected Results:**
- ✅ Approved: Shows 3 templates (health_reminder, appointment_confirmation, prescription_ready)
- ✅ Pending: Shows 1 template (seasonal_checkup)
- ✅ Draft: Shows 1 template (test_results_available)
- ✅ Rejected: Shows 1 template (vaccination_reminder)
- ✅ Active filter chip is highlighted in blue
- ✅ All: Shows all 6 templates

---

### 4. Test Category Filters
**Steps:**
1. Tap "Marketing" filter chip
2. Observe filtered results
3. Tap "Utility" filter chip
4. Tap "All" to reset

**Expected Results:**
- ✅ Marketing: Shows 1 template (seasonal_checkup)
- ✅ Utility: Shows 5 templates
- ✅ Active filter chip is highlighted in blue
- ✅ All: Shows all 6 templates

---

### 5. Test Combined Filters
**Steps:**
1. Type "reminder" in search
2. Tap "Approved" status filter
3. Observe results

**Expected Result:**
- ✅ Shows only "health_reminder" (matches both search and status)
- ✅ Other templates are hidden

---

### 6. View Template Details (Approved)
**Steps:**
1. Clear all filters
2. Tap on "health_reminder" card
3. Review template details

**Expected Results:**
- ✅ Template details screen opens
- ✅ Header shows template name with "Approved" badge
- ✅ Category shows "UTILITY"
- ✅ Language shows "en"
- ✅ Created/Updated dates are displayed
- ✅ WhatsApp-style preview shows:
  - Header: "Health Reminder"
  - Body: "Hello [Value 1], your health check is due on [Value 2]..."
  - Footer: "City Hospital - Your Health Partner"
  - Buttons: "Confirm" and "📞 Call Us"
- ✅ Green info box shows "This template is approved..."
- ✅ "Use in Campaign" button is visible

---

### 7. View Template Details (Rejected)
**Steps:**
1. Go back to Templates screen
2. Tap on "vaccination_reminder" card
3. Review rejection details

**Expected Results:**
- ✅ Template details screen opens
- ✅ Red rejection banner appears at top
- ✅ Rejection reason is displayed: "Message content violates WhatsApp policies..."
- ✅ "Create New Template" button is visible
- ✅ Preview shows the rejected template content

---

### 8. View Template Details (Draft)
**Steps:**
1. Go back to Templates screen
2. Tap on "test_results_available" card
3. Review draft template

**Expected Results:**
- ✅ Template details screen opens
- ✅ "Draft" badge is displayed
- ✅ Two action buttons visible:
  - "✏️ Edit" (shows coming soon alert)
  - "📤 Submit for Approval"
- ✅ Preview shows the draft template

---

### 9. View Template Details (Pending)
**Steps:**
1. Go back to Templates screen
2. Tap on "seasonal_checkup" card
3. Review pending template

**Expected Results:**
- ✅ Template details screen opens
- ✅ "Pending" badge is displayed
- ✅ Yellow info box shows: "⏳ This template is pending WhatsApp approval..."
- ✅ No edit/submit buttons (template is under review)
- ✅ Preview shows template with image header placeholder

---

### 10. Submit Template for Approval
**Steps:**
1. Navigate to "test_results_available" (draft template)
2. Tap "📤 Submit for Approval" button
3. Confirm submission in alert dialog

**Expected Results:**
- ✅ Confirmation dialog appears with warning
- ✅ After confirming, success alert shows
- ✅ Template status changes to "Pending"
- ✅ Action buttons change to pending info box

---

### 11. Delete Template
**Steps:**
1. In any template details screen, tap 🗑️ icon
2. Confirm deletion in alert dialog

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ After confirming, success message shows
- ✅ User is navigated back to Templates screen
- ✅ Deleted template is removed from list

---

### 12. Create New Template - Basic
**Steps:**
1. From Templates screen, tap "+ New" or FAB
2. Enter template name: "test_template"
3. Select category: "UTILITY"
4. Select language: "en"
5. Tap "+ Body" button
6. Enter body text: "Hello {{1}}, this is a test message."
7. Tap "Save Template"

**Expected Results:**
- ✅ Create Template screen opens
- ✅ Template Builder is displayed
- ✅ Name field accepts lowercase and underscores
- ✅ Category and language can be selected
- ✅ Body component editor appears when added
- ✅ Success alert shows after saving
- ✅ Options to view details or go back to templates

---

### 13. Create Template with All Components
**Steps:**
1. Tap "+ New" from Templates screen
2. Enter name: "complete_template"
3. Select category: "MARKETING"
4. Select language: "en_US"
5. Add components in order:
   - Tap "+ Header", select "TEXT", enter "Special Offer"
   - Tap "+ Body", enter "Hi {{1}}, get {{2}}% off!"
   - Tap "+ Footer", enter "Valid until {{3}}"
   - Tap "+ Buttons", add 2 buttons:
     - Quick Reply: "Claim Now"
     - URL: "Learn More" with URL "https://example.com"
6. Tap "Preview" tab to see preview
7. Tap "Save Template"

**Expected Results:**
- ✅ All components can be added in correct order
- ✅ Component editors show appropriate fields
- ✅ Preview tab shows all components correctly
- ✅ Variables are replaced with placeholders in preview
- ✅ Template saves successfully
- ✅ Created as "draft" status

---

### 14. Template Validation - Invalid Name
**Steps:**
1. Tap "+ New"
2. Enter name: "Test Template" (with space and capital)
3. Add body component
4. Tap "Save Template"

**Expected Results:**
- ✅ Validation error alert appears
- ✅ Error message: "Template name must be lowercase and contain only letters, numbers, and underscores"
- ✅ Template is not saved

---

### 15. Template Validation - No Body
**Steps:**
1. Tap "+ New"
2. Enter valid name: "test_no_body"
3. Add only Header component
4. Tap "Save Template"

**Expected Results:**
- ✅ Validation error alert appears
- ✅ Error message: "Template must have a BODY component"
- ✅ Template is not saved

---

### 16. Template Validation - Wrong Order
**Steps:**
1. Add Body component first
2. Try to add Header component after Body

**Expected Results:**
- ✅ Alert shows: "Components must be in order: HEADER, BODY, FOOTER, BUTTONS"
- ✅ Header component is not added
- ✅ User can continue editing

---

### 17. Template Validation - Character Limits
**Steps:**
1. Add Header component (TEXT)
2. Try entering more than 60 characters
3. Add Footer component
4. Try entering more than 60 characters
5. Add Button
6. Try entering more than 20 characters in button text

**Expected Results:**
- ✅ Character counter shows current count / max limit
- ✅ Input stops accepting text at limit
- ✅ If exceeding limit, validation error on save

---

### 18. Template Validation - Max Buttons
**Steps:**
1. Add Buttons component
2. Add 3 buttons successfully
3. Try to add 4th button

**Expected Results:**
- ✅ "Add Button" button is disabled/hidden after 3 buttons
- ✅ Only 3 buttons can be added

---

### 19. Template Preview - Variable Replacement
**Steps:**
1. Create template with body: "Hi {{1}}, your appointment is on {{2}}"
2. Add example values: "John, Dec 25"
3. Switch to Preview tab

**Expected Results:**
- ✅ Preview shows: "Hi John, your appointment is on Dec 25"
- ✅ Variables are replaced with example values
- ✅ WhatsApp-style bubble is displayed

---

### 20. Template Component Deletion
**Steps:**
1. In template builder, add multiple components
2. Tap 🗑️ Delete button on any component
3. Verify component is removed

**Expected Results:**
- ✅ Component is immediately removed
- ✅ Other components remain intact
- ✅ Can continue editing

---

### 21. Cancel Template Creation
**Steps:**
1. Start creating a template
2. Add some data
3. Tap back button or "Cancel"
4. Confirm discard in alert

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ After confirming, returns to Templates screen
- ✅ Template is not saved

---

### 22. Pull to Refresh
**Steps:**
1. In Templates screen, pull down the list
2. Release to refresh

**Expected Results:**
- ✅ Loading spinner appears
- ✅ Templates list refreshes
- ✅ Any changes are reflected

---

### 23. Empty State - No Templates
**Steps:**
1. Apply filters that result in no templates
   (e.g., search for "xyz")

**Expected Results:**
- ✅ Empty state appears
- ✅ Shows "📝" icon
- ✅ Shows "No Templates Found" message
- ✅ Shows "Try adjusting your filters" subtitle

---

### 24. Dashboard Templates Integration
**Steps:**
1. Navigate to Dashboard
2. Observe Templates card

**Expected Results:**
- ✅ Templates card shows approved templates count (3)
- ✅ Green badge with count is displayed
- ✅ Subtitle: "Create and manage message templates"
- ✅ Tapping card navigates to Templates screen

---

### 25. Navigation Flow
**Test complete navigation:**
1. Dashboard → Templates → Template Details → Back → Create Template → Back → Templates → Dashboard

**Expected Results:**
- ✅ All navigation works smoothly
- ✅ Back buttons work correctly
- ✅ No navigation errors
- ✅ State is preserved where needed

---

## 🐛 Edge Cases to Test

### 26. Network Error Handling
**Steps:**
1. Turn off internet/backend
2. Try to load templates
3. Try to create template

**Expected Results:**
- ✅ Dummy data is shown (fallback)
- ✅ No app crashes
- ✅ User can still interact with app

---

### 27. Long Template Names
**Steps:**
1. Create template with very long name (50+ characters)

**Expected Results:**
- ✅ Name wraps in cards
- ✅ UI doesn't break
- ✅ Still readable

---

### 28. Special Characters in Body
**Steps:**
1. Create template with emojis, special chars in body: "Hello 👋 {{1}}! Get 50% off 🎉"

**Expected Results:**
- ✅ Special characters and emojis are preserved
- ✅ Preview shows correctly
- ✅ No encoding issues

---

### 29. Multiple Variables
**Steps:**
1. Create body with many variables: "{{1}} {{2}} {{3}} {{4}} {{5}}"

**Expected Results:**
- ✅ All variables are recognized
- ✅ Can add example values for each
- ✅ Preview replaces all correctly

---

### 30. Rapid Navigation
**Steps:**
1. Quickly navigate between screens
2. Rapidly tap buttons

**Expected Results:**
- ✅ No duplicate navigations
- ✅ No crashes
- ✅ Loading states handle properly

---

## ✅ Success Criteria

All 30 test scenarios should pass without errors. The module is production-ready when:

- [ ] All navigation flows work correctly
- [ ] All filters and search work as expected
- [ ] Template creation validates properly
- [ ] Template preview displays correctly
- [ ] Status changes work (draft → pending)
- [ ] Deletion works with confirmation
- [ ] No crashes or errors
- [ ] UI is responsive and smooth
- [ ] Empty states display correctly
- [ ] Error handling works gracefully

---

## 📸 Screenshots Checklist

When testing, verify these screens look good:
- [ ] Templates List (with templates)
- [ ] Templates List (empty state)
- [ ] Template Details (all statuses)
- [ ] Create Template - Build tab
- [ ] Create Template - Preview tab
- [ ] WhatsApp-style preview
- [ ] Status badges
- [ ] Filter chips active/inactive
- [ ] Dashboard with Templates card

---

## 🚀 Ready for Production

Once all tests pass:
1. Update `API_BASE_URL` to production backend
2. Remove dummy data if backend is ready
3. Test with real WhatsApp Business API credentials
4. Monitor for any runtime errors
5. Gather user feedback

**Happy Testing! 🎉**
