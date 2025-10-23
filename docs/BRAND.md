# EduProof Brand Guidelines

## Overview
EduProof is a blockchain-based academic certificate verification platform. Our brand reflects trust, innovation, and educational excellence.

## Brand Assets Location
All brand assets are located in `/public/brand/`:
- `eduproof-logo.svg` - Full logo for light mode
- `eduproof-logo-dark.svg` - Full logo for dark mode
- `eduproof-icon.svg` - Icon only (color)
- `eduproof-icon-mono.svg` - Icon only (monochrome)
- `og/eduproof-og.svg` - Open Graph social card (1200×630)
- `og/eduproof-og.png` - Open Graph PNG export

## Color Palette

### Primary Colors
- **Brand Blue**: `#1976F3` - Primary brand color, used for CTAs and key UI elements
- **Brand Blue Dark**: `#0F4FD6` - Darker shade for gradients and hover states
- **Brand Blue Light**: `#E7F0FF` - Light tint for backgrounds and subtle highlights

### Secondary Colors
- **Brand Green**: `#2EBD59` - Success states, verification badges
- **Brand Green Dark**: `#1F9847` - Darker green for emphasis

### Neutral Colors
- **Ink**: `#0B1324` - Primary text color (dark mode background)
- **Ink Soft**: `#18223A` - Secondary text, muted elements
- **Cloud**: `#F6F8FB` - Light backgrounds
- **Text Soft**: `#7C8DB5` - Tertiary text, placeholders

## Typography
- **Primary Font**: Inter (system fallback: ui-sans-serif, system-ui)
- **Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)

## Logo Usage

### Full Logo
Use the full wordmark logo in headers, landing pages, and marketing materials:
```tsx
<Logo className="h-8 w-auto" />
```

### Icon Only
Use the icon variant for favicons, app icons, and compact spaces:
```tsx
<Logo variant="icon" className="h-10 w-10" />
```

### Theme Modes
The Logo component automatically adapts to light/dark themes:
- **Light mode**: Uses `eduproof-logo.svg` (dark text on transparent)
- **Dark mode**: Uses `eduproof-logo-dark.svg` (light text on transparent)

### Spacing
- Minimum clear space around logo: 16px
- Never stretch or distort the logo
- Always maintain aspect ratio

## Design Tokens

### Border Radius
- `sm`: 4px
- `md`: 6px
- `lg`: 8px
- `xl`: 12px
- `xl2`: 24px (brand cards)

### Shadows
- **Brand Card**: `0 4px 24px rgba(15, 79, 214, 0.12), 0 2px 8px rgba(15, 79, 214, 0.08)`
- Use for elevated cards and important UI elements

### Glassmorphism
Apply to cards and overlays:
```css
bg-white/70 dark:bg-slate-900/40 backdrop-blur-md
```

## Icon System
- **Library**: Lucide React
- **Size**: 16px (w-4 h-4) for inline, 20px (w-5 h-5) for buttons, 24px (w-6 h-6) for headers
- **Stroke Width**: 2 (default)

## Accessibility
- **Contrast Ratios**: 
  - Body text: ≥4.5:1
  - Large text (18px+): ≥3:1
  - UI components: ≥3:1
- **Focus States**: Always visible with 2px ring
- **ARIA Labels**: All icons and interactive elements must have labels

## Social Media

### Open Graph / Twitter Cards
- **Image**: `/brand/og/eduproof-og.png` (1200×630px)
- **Title**: "EduProof — Smart learning. Verified."
- **Description**: "Mint and verify blockchain-backed academic certificates with AI OCR, IPFS and Ethereum."

### Favicon Sizes
Generated from `eduproof-icon.svg`:
- 16×16, 32×32, 48×48, 64×64, 128×128, 256×256, 512×512

## Usage Examples

### Page Headers
```tsx
<Seo 
  title="Mint Certificate — EduProof"
  description="Create blockchain-verified academic certificates with AI-powered OCR."
/>
```

### Buttons
```tsx
<Button className="bg-brand-blue hover:bg-brand-blueDark">
  Mint Certificate
</Button>
```

### Success States
```tsx
<Badge className="bg-brand-green text-white">
  Verified
</Badge>
```

## Don'ts
- ❌ Don't change logo colors
- ❌ Don't use raster logos where SVG is available
- ❌ Don't apply effects (shadows, gradients) to the logo
- ❌ Don't use brand colors for error states (use destructive tokens)
- ❌ Don't mix light/dark logo variants incorrectly

## Questions?
For brand asset requests or questions, refer to this guide or check `/public/brand/` directory.
