# Spreadsheet Editor Bug Report

## Critical Bugs

### 1. **Multi-letter Column References Not Supported** (Lines 40, 84-87, 148)
**Issue:** `parseCellRef` and `expandRange` only handle single-letter columns (A-Z). They don't support AA, AB, BA, etc.

**Impact:** Formulas with columns beyond Z (like AA1, AB10) will fail or produce incorrect results.

**Fix:** Implement proper multi-letter column parsing.

---

### 2. **Formula Evaluation Breaks String Literals** (Line 69)
**Issue:** `formula.substring(1).toUpperCase()` converts the entire formula to uppercase, breaking string literals in functions like CONCAT.

**Impact:** `=CONCAT("Hello", A1)` becomes `=CONCAT("HELLO", A1)`.

**Fix:** Only uppercase function names and cell references, not string literals.

---

### 3. **Initial Content Reference Issue** (Line 172)
**Issue:** The `content` prop is directly assigned to the first sheet's cells, creating a reference. If parent changes `content`, the sheet won't update.

**Impact:** Switching between files doesn't update the spreadsheet content.

**Fix:** Deep clone the content when initializing sheets.

---

### 4. **History Management Race Condition** (Lines 242-245)
**Issue:** `pushHistory` uses `historyIdx` from closure, but `setHistoryIdx` is async. Multiple rapid changes can corrupt history.

**Impact:** Undo/redo may not work correctly or jump to wrong history states.

**Fix:** Use functional updates for both history and historyIdx.

---

### 5. **updateCell Loses Cell Properties** (Lines 271-275)
**Issue:** When updating a cell, it spreads properties but then overwrites with `...updates`. Properties like `format` or `comment` can be lost if not in updates.

**Impact:** Cell formatting or comments may disappear after editing value.

**Fix:** Merge updates properly without losing existing properties.

---

### 6. **No Arrow Key Navigation** (Lines 358-385)
**Issue:** `handleKeyDown` doesn't handle arrow keys for cell navigation.

**Impact:** Users can't navigate cells with keyboard, only mouse.

**Fix:** Add arrow key handlers to move selection.

---

### 7. **Clipboard Doesn't Use System Clipboard** (Lines 388-437)
**Issue:** `copyCells` and `pasteCells` only use internal state, not `navigator.clipboard`.

**Impact:** Can't copy/paste between browser tabs or external applications.

**Fix:** Integrate with system clipboard API.

---

### 8. **Row/Column Insert Doesn't Update Dimensions** (Lines 440-456)
**Issue:** `insertRow` and `insertCol` don't update `rowHeights` and `colWidths` arrays.

**Impact:** Array indices become misaligned after insertions.

**Fix:** Update dimension arrays when inserting/deleting rows/columns.

---

### 9. **Sort Includes Header Row** (Lines 471-485)
**Issue:** `sortColumn` sorts all rows, including potential header rows.

**Impact:** Headers get mixed into data during sort.

**Fix:** Add option to exclude first N rows from sort, or detect headers.

---

### 10. **Find Doesn't Scroll to Match** (Lines 488-504)
**Issue:** When a match is found, the view doesn't scroll to show it.

**Impact:** Users can't see the found cell if it's outside viewport.

**Fix:** Scroll the grid container to bring the matched cell into view.

---

### 11. **Inside Borders Logic Error** (Lines 565-569)
**Issue:** The logic for 'inside' borders is incorrect. It adds borders to cells that are NOT on edges, but should add borders BETWEEN cells.

**Impact:** Inside borders don't render correctly.

**Fix:** For inside borders, add right/bottom borders to all cells except last column/row.

---

### 12. **Keyboard Shortcuts Crash When No Cell Selected** (Lines 618-620)
**Issue:** Bold/Italic/Underline shortcuts use `selectedCell!` which could be null.

**Impact:** App crashes if shortcuts are pressed without a selected cell.

**Fix:** Check if selectedCell exists before accessing properties.

---

### 13. **Color Pickers Don't Close on Outside Click** (Lines 767-842)
**Issue:** Text color, background color, and borders dropdowns don't close when clicking outside.

**Impact:** Dropdowns stay open, blocking UI.

**Fix:** Add click-outside handlers to close dropdowns.

---

### 14. **Number Format Select is Uncontrolled** (Lines 865-877)
**Issue:** Uses `defaultValue` instead of `value`, doesn't reflect current cell's format.

**Impact:** Select shows wrong value after changing cell format.

**Fix:** Make it controlled component with proper value binding.

---

### 15. **Formula Insertion Incomplete** (Lines 940-945, 1286-1291)
**Issue:** Inserting functions just adds `=SUM()` without a range.

**Impact:** Users must manually edit the formula to add range.

**Fix:** Insert with current selection range or prompt for range.

---

### 16. **Zoom Breaks Sticky Headers** (Line 1041)
**Issue:** Zoom applies `fontSize` to container, breaking sticky positioning.

**Impact:** Column and row headers don't stay fixed when scrolling.

**Fix:** Apply zoom via transform instead of fontSize, or adjust sticky logic.

---

### 17. **Merged Cells Not Rendered** (Line 1088-1132)
**Issue:** `mergedCells` state is tracked but never used in rendering.

**Impact:** Merged cells don't display correctly.

**Fix:** Implement merged cell rendering with colspan/rowspan.

---

### 18. **Cell Edit Doesn't Sync with Formula Bar** (Lines 1115-1124)
**Issue:** When editing in cell, formula bar doesn't update in real-time.

**Impact:** Formula bar shows stale value during editing.

**Fix:** Sync editValue state between cell input and formula bar.

---

### 19. **Add Sheet Doesn't Notify Parent** (Lines 1143-1154)
**Issue:** When adding a new sheet, `onChange` isn't called.

**Impact:** Parent component doesn't know about new sheet.

**Fix:** Call onChange with new sheet's cells when adding sheet.

---

### 20. **Comment Modal Doesn't Load Existing Comment** (Lines 1303-1347)
**Issue:** When opening comment modal for a cell with existing comment, textarea is empty.

**Impact:** Users can't edit existing comments, only replace them.

**Fix:** Load existing comment into textarea when opening modal.

---

### 21. **Chart Icons Use Dynamic Class Names** (Line 1403)
**Issue:** `text-${chart.color}-500` won't work with Tailwind's JIT compiler.

**Impact:** Chart icons have no color.

**Fix:** Use static class names or inline styles.

---

## Medium Priority Issues

### 22. **No Auto-Save**
**Issue:** No auto-save functionality to prevent data loss.

**Impact:** Users lose work if browser crashes.

**Fix:** Implement localStorage auto-save with debounce.

---

### 23. **No Column/Row Resizing**
**Issue:** Can't resize columns or rows by dragging.

**Impact:** Users stuck with default dimensions.

**Fix:** Add drag handles on column/row headers.

---

### 24. **No Freeze Panes**
**Issue:** Can't freeze rows or columns.

**Impact:** Headers scroll out of view.

**Fix:** Implement freeze panes with sticky positioning.

---

### 25. **No Cell Validation**
**Issue:** No data validation for cell input.

**Impact:** Users can enter invalid data.

**Fix:** Add validation rules (number, date, list, etc.).

---

### 26. **No Conditional Formatting**
**Issue:** Can't format cells based on values.

**Impact:** Can't highlight important data visually.

**Fix:** Implement conditional formatting rules.

---

### 27. **Charts Don't Render**
**Issue:** Chart modal is just a placeholder, no actual chart rendering.

**Impact:** Can't create visual charts.

**Fix:** Integrate chart library (Chart.js, Recharts).

---

### 28. **No Print Functionality**
**Issue:** No print button or print styles.

**Impact:** Can't print spreadsheets.

**Fix:** Add print button and CSS print styles.

---

### 29. **No Auto-Fill/Drag Fill**
**Issue:** Can't drag to fill series (1, 2, 3... or Jan, Feb, Mar...).

**Impact:** Manual data entry required.

**Fix:** Implement fill handle and series detection.

---

### 30. **No Remove Duplicates**
**Issue:** No tool to remove duplicate rows.

**Impact:** Manual duplicate removal.

**Fix:** Add remove duplicates dialog.

---

### 31. **No Text-to-Columns**
**Issue:** Can't split cell content by delimiter.

**Impact:** Manual data parsing.

**Fix:** Add text-to-columns wizard.

---

### 32. **No Named Ranges**
**Issue:** Can't define named ranges for formulas.

**Impact:** Formulas use cell references instead of names.

**Fix:** Implement named range manager.

---

### 33. **No Protection/Locking**
**Issue:** Can't lock cells or sheets.

**Impact:** No protection against accidental changes.

**Fix:** Add cell/sheet protection.

---

### 34. **No Collaboration Features**
**Issue:** No real-time collaboration.

**Impact:** Can't work together on spreadsheet.

**Fix:** Implement WebSocket-based collaboration.

---

### 35. **No Version History**
**Issue:** No version tracking.

**Impact:** Can't revert to previous versions.

**Fix:** Implement version history with snapshots.

---

## Low Priority / UX Issues

### 36. **No Visual Feedback for Merge Mode**
**Issue:** When merge mode is active, no visual indicator.

**Impact:** Users don't know they're in merge mode.

**Fix:** Show cursor change or overlay.

---

### 37. **No Tooltip for Cell Comments**
**Issue:** Comments show red triangle but no tooltip on hover.

**Impact:** Can't read comments without opening modal.

**Fix:** Add hover tooltip for comments.

---

### 38. **No Formula Auto-Complete**
**Issue:** No auto-complete when typing formulas.

**Impact:** Must remember exact function names.

**Fix:** Add formula suggestion dropdown.

---

### 39. **No Range Selection Visual**
**Issue:** When selecting range for formula, no visual feedback.

**Impact:** Hard to see which cells are selected.

**Fix:** Highlight range during selection.

---

### 40. **No Error Indicators**
**Issue:** Formula errors (#ERROR, #DIV/0, etc.) don't show indicators.

**Impact:** Hard to spot errors.

**Fix:** Add error icons and tooltips.

---

### 41. **No Cell Style Presets**
**Issue:** No quick style presets (Header, Currency, Date, etc.).

**Impact:** Manual formatting required.

**Fix:** Add cell style gallery.

---

### 42. **No Keyboard Shortcut Reference**
**Issue:** No way to view all keyboard shortcuts.

**Impact:** Users don't know available shortcuts.

**Fix:** Add shortcut help modal.

---

### 43. **No Dark Mode for Grid**
**Issue:** Grid doesn't fully support dark mode.

**Impact:** Inconsistent dark mode experience.

**Fix:** Improve dark mode styling.

---

### 44. **No Responsive Design**
**Issue:** Toolbar doesn't adapt to small screens.

**Impact:** Poor mobile experience.

**Fix:** Implement responsive toolbar.

---

### 45. **No Loading States**
**Issue:** No loading indicators for large operations.

**Impact:** UI freezes during heavy operations.

**Fix:** Add loading spinners and progress bars.

---

### 46. **No Error Boundaries**
**Issue:** No error boundaries to catch rendering errors.

**Impact:** App crashes on errors.

**Fix:** Add React error boundaries.

---

### 47. **No Accessibility**
**Issue:** No ARIA labels, keyboard navigation, or screen reader support.

**Impact:** Not accessible to users with disabilities.

**Fix:** Add comprehensive accessibility features.

---

### 48. **No Internationalization**
**Issue:** All text is hardcoded in English.

**Impact:** Can't be used in other languages.

**Fix:** Implement i18n with translation files.

---

### 49. **No Performance Optimization**
**Issue:** No virtualization for large spreadsheets.

**Impact:** Slow rendering with 1000+ rows.

**Fix:** Implement windowing/virtualization.

---

### 50. **No Undo/Redo Visual Indicators**
**Issue:** No way to see undo/redo history.

**Impact:** Users don't know what will be undone.

**Fix:** Add undo/redo history dropdown.

---

## Testing Checklist

After fixes, test:
- [ ] Multi-letter column references (AA1, AB10)
- [ ] Formula with string literals
- [ ] File switching updates content
- [ ] Rapid undo/redo operations
- [ ] Cell editing preserves formatting
- [ ] Arrow key navigation
- [ ] Copy/paste with external apps
- [ ] Row/column insert updates dimensions
- [ ] Sort excludes headers
- [ ] Find scrolls to match
- [ ] Inside borders render correctly
- [ ] Keyboard shortcuts without selection
- [ ] Color pickers close on outside click
- [ ] Number format reflects current cell
- [ ] Formula insertion includes range
- [ ] Zoom works with sticky headers
- [ ] Merged cells render correctly
- [ ] Cell edit syncs with formula bar
- [ ] Add sheet notifies parent
- [ ] Comment modal loads existing comment
- [ ] Chart icons have colors
- [ ] Auto-save works
- [ ] Column/row resizing
- [ ] Freeze panes
- [ ] Cell validation
- [ ] Conditional formatting
- [ ] Charts render
- [ ] Print works
- [ ] Auto-fill/drag fill
- [ ] Remove duplicates
- [ ] Text-to-columns
- [ ] Named ranges
- [ ] Cell/sheet protection
- [ ] Real-time collaboration
- [ ] Version history
- [ ] Merge mode visual feedback
- [ ] Comment tooltips
- [ ] Formula auto-complete
- [ ] Range selection visual
- [ ] Error indicators
- [ ] Cell style presets
- [ ] Keyboard shortcut reference
- [ ] Dark mode consistency
- [ ] Responsive design
- [ ] Loading states
- [ ] Error boundaries
- [ ] Accessibility features
- [ ] Internationalization
- [ ] Performance with large data
- [ ] Undo/redo history

---

## Recommended Fix Priority

### Immediate (Critical):
1. Multi-letter column references (#1)
2. Formula string literals (#2)
3. Initial content reference (#3)
4. History race condition (#4)
5. updateCell property loss (#5)
6. Arrow key navigation (#6)
7. System clipboard (#7)
8. Row/column dimensions (#8)
9. Sort headers (#9)
10. Find scroll (#10)
11. Inside borders (#11)
12. Keyboard shortcut crash (#12)
13. Dropdown close (#13)
14. Number format select (#14)

### High Priority:
15. Formula insertion (#15)
16. Zoom sticky headers (#16)
17. Merged cells rendering (#17)
18. Formula bar sync (#18)
19. Add sheet notify (#19)
20. Comment modal (#20)
21. Chart icons (#21)

### Medium Priority:
22. Auto-save (#22)
23. Column/row resizing (#23)
24. Freeze panes (#24)
25. Cell validation (#25)
26. Conditional formatting (#26)
27. Chart rendering (#27)
28. Print (#28)
29. Auto-fill (#29)
30. Remove duplicates (#30)

### Low Priority:
31-50: UX improvements, accessibility, performance, i18n

---

## Conclusion

The spreadsheet editor has **50 identified bugs and missing features**, with **21 critical bugs** that affect core functionality. The most severe issues are:

1. **Multi-letter columns not supported** - breaks formulas with columns beyond Z
2. **Formula evaluation breaks strings** - corrupts string literals
3. **Content not syncing** - file switching doesn't work
4. **History corruption** - undo/redo unreliable
5. **Cell property loss** - formatting disappears after edits
6. **No keyboard navigation** - can't use arrow keys
7. **No system clipboard** - can't copy/paste externally
8. **Dimension misalignment** - arrays out of sync after insert
9. **Sort includes headers** - data corruption
10. **Find doesn't scroll** - matches invisible
11. **Inside borders broken** - incorrect rendering
12. **Keyboard crash** - app crashes without selection
13. **Dropdowns stay open** - UI blocked
14. **Number format wrong** - shows incorrect value

These critical bugs should be fixed immediately. The editor also lacks many professional features found in Excel/OnlyOffice, such as column resizing, freeze panes, conditional formatting, chart rendering, and collaboration.
