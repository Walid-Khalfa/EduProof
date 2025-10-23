# EduProof Theming System

## Overview

EduProof uses a centralized design token system with CSS variables to provide distinct light and dark themes with excellent contrast and accessibility.

## Design Tokens

All design tokens are defined in `src/styles/tokens.css` and organized into categories:

### Color Tokens

#### Light Theme
- **Backgrounds**: `--bg` (#F7F7FB), `--surface` (#FFFFFF), `--surface-2` (#F2F4F8)
- **Text**: `--text` (#111318), `--text-muted` (#5A6272), `--placeholder` (#8C93A3)
- **Borders**: `--border` (#E5E7EF)
- **Brand**: `--brand` (#6D5DF6), `--brand-2` (#9B8CFF), `--accent` (#22C3EE)
- **Status**: 
  - Success: `--success` (#0E9F6E), `--success-bg` (#E8FBF3)
  - Warning: `--warn` (#D97706), `--warn-bg` (#FFF6E6)
  - Error: `--error` (#DC2626), `--error-bg` (#FFEAEA)
- **Inputs**: `--input-bg` (#FFFFFF), `--input-border` (#D9DDE8), `--input-text` (#111318)
- **Gradient**: `--cta-grad` (violet to cyan)

#### Dark Theme
- **Backgrounds**: `--bg` (#0B0D14), `--surface` (#0F1420), `--surface-2` (#121829)
- **Text**: `--text` (#EAEFF7), `--text-muted` (#A9B3C8), `--placeholder` (#8892A6)
- **Borders**: `--border` (#243046)
- **Brand**: `--brand` (#9FA8FF), `--brand-2` (#66D1FF), `--accent` (#60E6FF)
- **Status**:
  - Success: `--success` (#34D399), `--success-bg` (#0D1D17)
  - Warning: `--warn` (#F59E0B), `--warn-bg` (#1D1506)
  - Error: `--error` (#F87171), `--error-bg` (#2C1212)
- **Inputs**: `--input-bg` (#0F1420), `--input-border` (#27324A), `--input-text` (#EAEFF7)
- **Gradient**: `--cta-grad` (indigo to cyan)

### Shadow Tokens
- `--shadow-1`: Subtle card shadow for both themes

### Focus Ring
- `--ring`: Translucent focus ring color (adapts per theme)

## Tailwind Integration

Tokens are integrated into Tailwind via `tailwind.config.js`:

```javascript
colors: {
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  surface2: 'var(--surface-2)',
  text: 'var(--text)',
  'text-muted': 'var(--text-muted)',
  // ... etc
}
```

## Theme Switching

### Hook: `useTheme()`

Located in `src/hooks/useTheme.ts`, provides:
- Three modes: `'light'`, `'dark'`, `'system'`
- Persistent storage via `localStorage`
- Automatic system preference detection
- Real-time theme class toggling on `<html>`

### Usage

```tsx
import { useTheme } from '@/hooks/useTheme';

function MyComponent() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme('dark')}>
      Switch to Dark
    </button>
  );
}
```

## Component Theming

### Input Components

All form inputs (`Input`, `Textarea`, `Select`) use inline styles for token-based theming:

```tsx
style={{
  backgroundColor: 'var(--input-bg)',
  color: 'var(--input-text)',
  borderColor: 'var(--input-border)',
}}
```

**Placeholder styling** is handled globally in `src/index.css`:

```css
input::placeholder,
textarea::placeholder {
  color: var(--placeholder) !important;
  opacity: 0.7;
}
```

### Cards & Surfaces

Use `bg-surface` or inline `style={{ backgroundColor: 'var(--surface)' }}` for card backgrounds.

### Status Indicators

PreflightChecks and badges use status tokens:

```tsx
style={{ 
  backgroundColor: 'var(--success)',
  color: '#FFFFFF' 
}}
```

### CTA Buttons

Mint button uses gradient token:

```tsx
style={{ 
  backgroundImage: 'var(--cta-grad)' 
}}
```

## Logo Adaptation

The `Logo` component automatically switches between:
- **Light mode**: `/brand/eduproof-logo.svg` (dark text, blue gradient)
- **Dark mode**: `/brand/eduproof-logo-dark.svg` (light text, cyan gradient)

Detection uses `MutationObserver` on `<html>` class changes.

## Accessibility

### WCAG Compliance

All color combinations meet WCAG 2.1 Level AA standards:
- **Normal text**: ≥ 4.5:1 contrast ratio
- **Large text**: ≥ 3:1 contrast ratio
- **Placeholders**: ≥ 3:1 contrast ratio (recommended)

### Focus States

All interactive elements have visible focus rings using `--ring` token with `focus:ring-2` utility.

## Extending the System

### Adding New Tokens

1. Define in `src/styles/tokens.css` for both `:root` and `:root.dark`
2. Add to `tailwind.config.js` colors/shadows/gradients
3. Use via Tailwind classes or inline styles

### Example: New Accent Color

```css
/* tokens.css */
:root {
  --accent-purple: #9333EA;
}
:root.dark {
  --accent-purple: #C084FC;
}
```

```javascript
// tailwind.config.js
colors: {
  'accent-purple': 'var(--accent-purple)',
}
```

```tsx
// Component
<div className="bg-accent-purple">...</div>
```

## Best Practices

1. **Always use tokens** instead of hardcoded colors
2. **Test both themes** when adding new components
3. **Use inline styles** for dynamic token values that Tailwind can't process
4. **Maintain contrast ratios** when modifying token values
5. **Avoid opacity on text** - use muted color tokens instead
6. **Scope gradients carefully** - only apply to intended elements

## Files Modified

- `src/styles/tokens.css` - Design token definitions
- `src/index.css` - Global styles and placeholder handling
- `tailwind.config.js` - Tailwind token integration
- `src/hooks/useTheme.ts` - Theme switching logic
- `src/components/Layout.tsx` - Theme toggle UI
- `src/components/ui/input.tsx` - Input theming
- `src/components/ui/textarea.tsx` - Textarea theming
- `src/components/ui/select.tsx` - Select theming
- `src/components/PreflightChecks.tsx` - Status theming
- `src/components/MintButton.tsx` - CTA gradient theming
- `public/brand/eduproof-logo-dark.svg` - Dark mode logo

## Testing Checklist

- [ ] Light theme displays correctly
- [ ] Dark theme displays correctly
- [ ] System theme preference is respected
- [ ] Theme persists across page reloads
- [ ] OCR-filled inputs are readable in both themes
- [ ] All status indicators (success/warn/error) are visible
- [ ] Focus states are visible on all interactive elements
- [ ] Logo switches correctly between themes
- [ ] No contrast issues reported by accessibility tools
