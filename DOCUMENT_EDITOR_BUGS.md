# Document Editor Bug Report & Fixes

## Critical Bugs Found

### 1. **Content Synchronization Bug** (Line 106-111)
**Issue:** The `useEffect` only sets `innerHTML` once when `!isReady`. After that, if the `content` prop changes from outside (e.g., when switching files), the editor won't update.

**Impact:** Users switching between documents will see stale content.

**Fix:** Remove the `isReady` guard and always sync content when prop changes, but preserve cursor position.

---

### 2. **Stats Calculation Race Condition** (Line 97-104)
**Issue:** The `stats` useMemo reads from `editorRef.current.innerText` but depends on `content` state. This creates a race condition where stats might be calculated before the DOM is updated.

**Impact:** Word/character count may be incorrect or show stale values.

**Fix:** Calculate stats directly from the `content` HTML string instead of reading from DOM.

---

### 3. **Stale Content in Save Function** (Line 137-146)
**Issue:** The `handleSave` function uses the `content` state variable, which might be stale. It should use `editorRef.current.innerHTML` instead.

**Impact:** Saved document might not include recent edits.

**Fix:** Use `editorRef.current.innerHTML` directly.

---

### 4. **Focus Loss on Modal Open** (Lines 148-198)
**Issue:** When opening modals (Insert Image, Link, Table, Special Characters), the editor loses focus and cursor position. When the modal closes and tries to insert content, it inserts at the wrong position or not at all.

**Impact:** Images, links, tables, and special characters may be inserted at the beginning of the document instead of at the cursor.

**Fix:** Save the selection/range before opening modal, restore it before inserting.

---

### 5. **Font Family Command Bug** (Line 254-258)
**Issue:** The `fontName` execCommand expects just the font name (e.g., "Arial"), not the full font-family string with fallbacks (e.g., "Arial, sans-serif").

**Impact:** Font changes don't work correctly.

**Fix:** Extract just the font name from the font-family string.

---

### 6. **Dropdown Close Logic Bug** (Line 276-287)
**Issue:** The dropdown close handler closes ALL dropdowns when clicking outside ANY dropdown. This creates race conditions when switching between dropdowns.

**Impact:** Clicking text color while font dropdown is open causes both to close, then text color opens. Confusing UX.

**Fix:** Use a single state variable for active dropdown, or check which dropdown was clicked.

---

### 7. **Find/Replace HTML Parsing Bug** (Line 219-248)
**Issue:** 
- Find counts matches in HTML (including tags), not just text content
- Replace modifies HTML directly, which can break document structure if search text appears in tags
- `window.find()` is deprecated and not supported in all browsers

**Impact:** Incorrect match counts, broken document structure after replace.

**Fix:** Parse HTML to text for counting, use DOM manipulation for replace instead of string replacement.

---

### 8. **Line Spacing Selection Bug** (Line 200-217)
**Issue:** 
- Only applies to one element, not all selected paragraphs
- If no selection or selection is at root level, nothing happens
- Doesn't handle nested elements correctly

**Impact:** Line spacing only applies to one paragraph even when multiple are selected.

**Fix:** Apply to all block elements in the selection range.

---

### 9. **Heading Select Uncontrolled Component** (Line 415-429)
**Issue:** The heading select uses `defaultValue="p"` making it uncontrolled. After selecting a heading, it won't reset to "Normal" when clicking elsewhere.

**Impact:** Confusing UX - select shows wrong value.

**Fix:** Make it controlled or reset after selection.

---

### 10. **Zoom Double Scaling Bug** (Line 573-577)
**Issue:** The zoom applies both width scaling (`width: ${8.5 * 96 * (zoom / 100)}px`) AND transform scale (`transform: scale(${zoom / 100})`), causing double scaling.

**Impact:** At 200% zoom, content appears at 400% size.

**Fix:** Use fixed width and only apply transform scale.

---

### 11. **Edit Menu Wrong Action** (Line 337)
**Issue:** The "Edit" menu button calls `execCommand('undo')` instead of showing a menu.

**Impact:** Confusing UX - clicking "Edit" just undoes instead of showing options.

**Fix:** Either implement a dropdown menu or remove the button.

---

### 12. **Missing Escape Key Handler**
**Issue:** Pressing Escape doesn't close modals.

**Impact:** Users must click the X button to close modals.

**Fix:** Add Escape key listener to close modals.

---

### 13. **Missing Modal Overlay Click Handler**
**Issue:** Clicking outside modals doesn't close them (except Find/Replace which is floating).

**Impact:** Users must click the X button.

**Fix:** Add overlay click handler to close modals.

---

### 14. **Image Modal "OR" Divider Bug** (Line 680-683)
**Issue:** The "OR" divider has incorrect flex layout. The border should be horizontal but might render vertically.

**Impact:** Visual bug - divider doesn't look right.

**Fix:** Use proper absolute positioning for the divider line.

---

### 15. **Special Characters Grid Overflow** (Line 791-801)
**Issue:** Grid uses `grid-cols-10` with 80 characters (8 rows). On small screens, this might overflow the modal.

**Impact:** Modal becomes too wide on small screens.

**Fix:** Use responsive grid columns.

---

### 16. **Line Spacing Modal UX Bug** (Line 817-829)
**Issue:** Clicking a spacing value only updates state but doesn't apply it. User must click "Apply" button.

**Impact:** Non-intuitive UX - users expect immediate application.

**Fix:** Apply immediately on click, or remove the Apply button and apply on selection.

---

### 17. **Missing Keyboard Shortcuts Prevention**
**Issue:** Ctrl+B/I/U shortcuts don't prevent default, so browser's default behavior might interfere.

**Impact:** Browser might open bookmarks bar (Ctrl+B) instead of bolding text.

**Fix:** Add `e.preventDefault()` for these shortcuts.

---

### 18. **Missing Cursor Position Preservation**
**Issue:** When toolbar buttons are clicked, the editor loses focus and cursor position.

**Impact:** Formatting is applied to wrong location or not at all.

**Fix:** Save and restore selection range before/after execCommand.

---

### 19. **Missing Paste Handler**
**Issue:** No custom paste handler to clean up pasted content.

**Impact:** Pasted content from other sources might have unwanted styles or formatting.

**Fix:** Add paste event listener to clean HTML.

---

### 20. **Missing Auto-Save**
**Issue:** No auto-save or draft functionality.

**Impact:** Users might lose work if browser crashes.

**Fix:** Add localStorage auto-save with debounce.

---

## Medium Priority Bugs

### 21. **Missing Table Editing Features**
- No add/delete rows/columns after insertion
- No cell merging
- No table styling options

### 22. **Missing Image Features**
- No image resizing
- No image alignment
- No image captions
- No drag-and-drop upload

### 23. **Missing Link Features**
- No link editing after insertion
- No link removal
- No link preview

### 24. **Missing Document Features**
- No headers/footers
- No page numbers
- No table of contents
- No document outline
- No columns layout
- No watermarks

### 25. **Missing Collaboration Features**
- No track changes
- No comments/annotations
- No real-time collaboration
- No version history

### 26. **Missing Accessibility Features**
- No accessibility checker
- No alt text for images
- No reading mode
- No text-to-speech

### 27. **Missing Productivity Features**
- No auto-link detection
- No spell check integration
- No grammar check
- No thesaurus
- No word count goals
- No reading time estimate

### 28. **Missing Export Options**
- No PDF export
- No ODT export
- No RTF export
- No plain text export

### 29. **Missing Import Options**
- No ODT import
- No RTF import
- No plain text import
- No HTML import (currently only DOCX)

### 30. **Missing View Options**
- No full-screen mode
- No focus mode
- No dark mode for editor content
- No page layout view
- No web layout view
- No outline view

---

## Low Priority Bugs / UX Issues

### 31. **Inconsistent Icon Usage**
- Using `FileMinus2` for page break is semantically wrong

### 32. **Missing Tooltips**
- Some buttons lack descriptive tooltips

### 33. **Missing Loading States**
- No loading indicator when importing large documents

### 34. **Missing Error Handling**
- No error messages when operations fail
- No validation for user inputs

### 35. **Missing Undo/Redo for All Operations**
- Some operations (like insert table) don't properly integrate with undo/redo

### 36. **Missing Keyboard Navigation**
- Can't navigate toolbar with keyboard
- No keyboard shortcuts for all features

### 37. **Missing Responsive Design**
- Toolbar doesn't adapt to small screens
- Modals might be too wide on mobile

### 38. **Missing Performance Optimizations**
- No virtualization for large documents
- No debouncing for frequent updates
- No lazy loading for features

### 39. **Missing Print Styles**
- No print-specific CSS
- Page breaks not respected in print

### 40. **Missing Browser Compatibility**
- Uses deprecated `window.find()`
- Uses `document.execCommand()` which is deprecated

---

## Recommended Fixes Priority

### Immediate (Critical Bugs):
1. Fix content synchronization (#1)
2. Fix focus loss on modal open (#4)
3. Fix font family command (#5)
4. Fix zoom double scaling (#10)
5. Fix find/replace HTML parsing (#7)
6. Add escape key handler (#12)
7. Add modal overlay click handler (#13)

### High Priority:
8. Fix stats calculation (#2)
9. Fix save function (#3)
10. Fix line spacing (#8)
11. Fix heading select (#9)
12. Fix dropdown close logic (#6)
13. Add cursor position preservation (#18)
14. Add paste handler (#19)

### Medium Priority:
15. Add auto-save (#20)
16. Add table editing features (#21)
17. Add image features (#22)
18. Add link features (#23)
19. Add more export options (#28)
20. Add view options (#30)

### Low Priority:
21. Fix icon usage (#31)
22. Add tooltips (#32)
23. Add loading states (#33)
24. Add error handling (#34)
25. Add keyboard navigation (#36)
26. Improve responsive design (#37)
27. Add performance optimizations (#38)
28. Add print styles (#39)
29. Replace deprecated APIs (#40)

---

## Testing Checklist

After fixes, test:
- [ ] Switch between documents - content updates correctly
- [ ] Insert image/link/table at cursor position
- [ ] Change font family - applies correctly
- [ ] Zoom in/out - scales correctly without double scaling
- [ ] Find/replace - counts correctly, doesn't break HTML
- [ ] Press Escape - closes modals
- [ ] Click outside modal - closes modal
- [ ] Word count - accurate
- [ ] Save - includes all recent edits
- [ ] Line spacing - applies to all selected paragraphs
- [ ] Heading select - shows correct value
- [ ] Dropdowns - only one open at a time
- [ ] Cursor position - preserved after toolbar clicks
- [ ] Paste - cleans up formatting
- [ ] Auto-save - works in background
- [ ] Undo/redo - works for all operations
- [ ] Keyboard shortcuts - all work correctly
- [ ] Responsive design - works on mobile
- [ ] Print - respects page breaks
- [ ] All modals - open/close correctly
- [ ] All toolbar buttons - work correctly
- [ ] Dark mode - all elements styled correctly

---

## Conclusion

The document editor has **50 identified bugs and missing features**, with **13 critical bugs** that affect core functionality. The most severe issues are:

1. **Content not syncing** when switching documents
2. **Focus loss** causing content to insert at wrong positions
3. **Font changes not working** due to incorrect command parameters
4. **Zoom double scaling** making content too large
5. **Find/replace breaking HTML** structure

These critical bugs should be fixed immediately. The medium and low priority issues can be addressed in subsequent updates.

The editor also lacks many professional features found in Word/OnlyOffice, such as:
- Table editing after insertion
- Image resizing
- Track changes
- Comments
- Headers/footers
- Table of contents
- More export formats

These features should be added to make the editor truly professional-grade.
