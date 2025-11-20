# Design Guidelines: Event Sales Aggregation System

## Design Approach

**Selected Approach**: Design System-based (Fluent Design inspired)
**Rationale**: This is a utility-focused productivity application requiring clarity, efficiency, and data-dense layouts. Drawing from Microsoft Fluent Design principles with modern Japanese business application aesthetics.

**Key Design Principles**:
- Clarity over decoration: Information hierarchy drives all decisions
- Efficiency-first: Minimize clicks, maximize data visibility
- Consistent patterns: Predictable interactions across all screens
- Japanese text optimization: Proper spacing and readability for Japanese characters

---

## Typography

**Font Families**:
- Primary: 'Noto Sans JP' (Google Fonts) - Excellent Japanese character support
- Monospace: 'Roboto Mono' - For numerical data and IDs

**Hierarchy**:
- Page Titles: text-2xl font-bold (24px)
- Section Headers: text-lg font-semibold (18px)
- Data Table Headers: text-sm font-medium uppercase tracking-wide
- Body Text: text-base (16px) - Default weight
- Captions/Labels: text-sm (14px)
- Numerical Data: text-base font-medium tabular-nums

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16**

**Container Structure**:
- App shell: Full viewport with fixed sidebar (w-64) + main content area
- Content padding: p-8 for desktop, p-4 for mobile
- Section spacing: space-y-6 between major sections
- Card padding: p-6 internally
- Form field spacing: space-y-4

**Grid System**:
- Form layouts: Single column with max-w-2xl
- Data tables: Full width within container
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6

---

## Component Library

### Navigation
**Sidebar (Fixed Left)**:
- Width: w-64, full height
- Logo area at top (h-16)
- Navigation items: Full-width links with p-4, rounded-lg on hover
- Active state: Subtle highlight treatment
- Icons: Material Icons via CDN, size 20px, aligned left with mr-3

### Data Tables
**Structure**:
- Full-width with horizontal scroll on mobile
- Sticky header row
- Row padding: py-3 px-4
- Alternating row treatment for readability
- Hover state on rows for interactive tables
- Action buttons (edit/delete): Aligned right in final column, icon buttons size-8

### Modals
**Layout**:
- Overlay: Semi-transparent backdrop blur-sm
- Modal container: max-w-2xl, centered, rounded-xl
- Header: p-6 with title and close button (top-right)
- Content: p-6 with form fields space-y-4
- Footer: p-6 border-t with action buttons aligned right, gap-3

### Forms
**Input Fields**:
- Height: h-12 for all inputs
- Padding: px-4
- Border radius: rounded-lg
- Labels: mb-2 text-sm font-medium
- Helper text: text-sm mt-1
- Required indicator: Red asterisk after label

**Form Groups**:
- Two-column layout where appropriate: grid grid-cols-2 gap-4
- Full-width for textareas and selects
- Submit buttons: Full-width on mobile, auto-width on desktop

### Buttons
**Primary Actions**:
- Height: h-12, padding px-6
- Border radius: rounded-lg
- Font: font-medium
- Min-width: min-w-32 for consistency

**Secondary/Tertiary**:
- Same dimensions, different visual weight
- Icon-only buttons: size-10 rounded-lg (for table actions)

### Cards
**Dashboard Cards**:
- Border radius: rounded-xl
- Padding: p-6
- Shadow: shadow-sm with subtle elevation
- Header: pb-4 border-b with title and optional action
- Content: pt-4

### Toast Notifications
**Position**: Fixed top-right, top-4 right-4
**Structure**:
- Width: w-96 max-w-full
- Padding: p-4
- Border radius: rounded-lg
- Icon: Left-aligned (Material Icons, size 20px), mr-3
- Auto-dismiss: 4 seconds for success, 6 seconds for errors
- Stacking: Stack vertically with gap-2

### Authentication Screen
**Login Layout**:
- Centered card: max-w-md mx-auto, mt-20
- Logo/Title: Centered, mb-8
- Form: space-y-6
- Login button: Full-width
- Minimal decoration, focus on functionality

### Sales Data Input Screen
**Table Structure**:
- Complex multi-dimensional table (items × channels × payment methods)
- Fixed first column (item names) with horizontal scroll
- Input cells: Inline editable number inputs, h-10, text-center
- Monthly tabs or dropdown for period selection
- Summary row: Fixed at bottom with font-semibold

### Analytics Dashboard
**Visualization Layout**:
- Top KPI cards: 3-column grid showing total sales, revenue, items sold
- Chart area: Full-width, h-96
- Use Chart.js via CDN for charts
- Time period selector: Top-right controls
- Table summary below charts

---

## Animations

**Minimal Motion**:
- Modal open/close: Scale + fade (duration-200)
- Toast notifications: Slide-in from right (duration-300)
- Hover states: Instant (no transition)
- Tab switching: Crossfade content (duration-150)

---

## Accessibility

- All form inputs have associated labels with htmlFor
- Focus indicators: ring-2 ring-offset-2 on all interactive elements
- Keyboard navigation: Full support for modals (Esc to close, Tab cycling)
- ARIA labels for icon-only buttons
- Color contrast: Ensure AA compliance minimum for all text
- Skip navigation link for keyboard users

---

## Images

This application does not require hero images. It's a data-management tool where functionality takes precedence. The login screen may include a small logo/brand mark (max 120px height), but no large decorative imagery is needed.

---

**Implementation Notes**:
- Use shadcn/ui or Headless UI for accessible component foundations
- Implement optimistic UI updates for better perceived performance
- Maintain consistent border-radius across all components (rounded-lg standard, rounded-xl for cards/modals)
- Japanese text requires slightly increased line-height (1.7) for optimal readability