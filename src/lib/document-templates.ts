export type Template = 'classic' | 'minimal' | 'modern' | 'elegant' | 'bold' | 'stripe' | 'bureau' | 'ligne'

export type HeaderType = 'standard' | 'dark' | 'centered' | 'stripe' | 'bureau' | 'ligne'
export type AccentMode = 'solid' | 'tint' | 'text' | 'rule'

export interface TemplateConfig {
    headerType:           HeaderType
    accentMode:           AccentMode
    titleFontFamily:      string   // CSS font-family
    titleFontSize:        string   // CSS font-size, e.g. '48px'
    titleFontWeight:      number   // 100–900
    titleLetterSpacing:   string   // CSS letter-spacing
    titleItalic:          boolean
    titleUppercase:       boolean
    sectionLabelBranded:  boolean  // true → label color = brandColor
    sectionLabelHidden:   boolean  // true → replace label with thin divider (minimal)
    tableZebra:           boolean  // true → alternating row tint (bureau)
    tableTopBorder:       string   // full CSS border value, or 'none'
    rowBorder:            string   // CSS border-bottom for body rows
    lastRowBorder:        string   // CSS border-bottom for last row
    footerTopBorder:      string   // CSS border-top for page footer
}

export const TEMPLATE_META: Record<Template, string> = {
    classic: 'Classique',
    minimal: 'Minimal',
    modern:  'Moderne',
    elegant: 'Élégant',
    bold:    'Bold',
    stripe:  'Stripe',
    bureau:  'Bureau',
    ligne:   'Ligne',
}

export const DEFAULT_BRAND_COLOR = '#2563EB'

export const BRAND_PALETTE: { name: string; hex: string }[] = [
    { name: 'Cobalt',   hex: '#2563EB' },
    { name: 'Indigo',   hex: '#4338CA' },
    { name: 'Violet',   hex: '#7C3AED' },
    { name: 'Rose',     hex: '#E11D48' },
    { name: 'Crimson',  hex: '#DC2626' },
    { name: 'Orange',   hex: '#EA580C' },
    { name: 'Amber',    hex: '#D97706' },
    { name: 'Emerald',  hex: '#059669' },
    { name: 'Forest',   hex: '#15803D' },
    { name: 'Teal',     hex: '#0D9488' },
    { name: 'Cyan',     hex: '#0891B2' },
    { name: 'Navy',     hex: '#1E3A5F' },
    { name: 'Slate',    hex: '#475569' },
    { name: 'Charcoal', hex: '#1F2937' },
    { name: 'Coffee',   hex: '#92400E' },
    { name: 'Mauve',    hex: '#9D174D' },
]

export const TEMPLATES: Record<Template, TemplateConfig> = {
    // ── Standard layout, bold borders, tinted TTC box
    classic: {
        headerType:          'standard',
        accentMode:          'tint',
        titleFontFamily:     "'Inter', sans-serif",
        titleFontSize:       '48px',
        titleFontWeight:     900,
        titleLetterSpacing:  '-2px',
        titleItalic:         false,
        titleUppercase:      true,
        sectionLabelBranded: false,
        sectionLabelHidden:  false,
        tableZebra:          false,
        tableTopBorder:      '2px solid #18181b',
        rowBorder:           '1px solid #e5e7eb',
        lastRowBorder:       '1px solid #18181b',
        footerTopBorder:     '1px solid #e5e7eb',
    },
    // ── Bare layout, ultra-light borders, amount text only
    minimal: {
        headerType:          'standard',
        accentMode:          'text',
        titleFontFamily:     "'Inter', sans-serif",
        titleFontSize:       '30px',
        titleFontWeight:     300,
        titleLetterSpacing:  '10px',
        titleItalic:         false,
        titleUppercase:      true,
        sectionLabelBranded: false,
        sectionLabelHidden:  true,
        tableZebra:          false,
        tableTopBorder:      'none',
        rowBorder:           '1px solid #f3f4f6',
        lastRowBorder:       '1px solid #d1d5db',
        footerTopBorder:     '1px solid #f3f4f6',
    },
    // ── Full-width dark slate header, brand color only on TTC box
    modern: {
        headerType:          'dark',
        accentMode:          'tint',
        titleFontFamily:     "'Inter', sans-serif",
        titleFontSize:       '40px',
        titleFontWeight:     900,
        titleLetterSpacing:  '-2px',
        titleItalic:         false,
        titleUppercase:      true,
        sectionLabelBranded: false,
        sectionLabelHidden:  false,
        tableZebra:          false,
        tableTopBorder:      '2px solid #475569',
        rowBorder:           '1px solid #f1f5f9',
        lastRowBorder:       '1px solid #475569',
        footerTopBorder:     '1px solid #e2e8f0',
    },
    // ── Centered layout, serif italic title, soft borders
    elegant: {
        headerType:          'centered',
        accentMode:          'tint',
        titleFontFamily:     "Georgia, 'Times New Roman', serif",
        titleFontSize:       '36px',
        titleFontWeight:     700,
        titleLetterSpacing:  '6px',
        titleItalic:         true,
        titleUppercase:      false,
        sectionLabelBranded: false,
        sectionLabelHidden:  false,
        tableZebra:          false,
        tableTopBorder:      '1px solid #cbd5e1',
        rowBorder:           '1px solid #f1f5f9',
        lastRowBorder:       '1px solid #cbd5e1',
        footerTopBorder:     '1px solid #f1f5f9',
    },
    // ── Massive title, heavy black borders, solid brand TTC fill
    bold: {
        headerType:          'standard',
        accentMode:          'solid',
        titleFontFamily:     "'Inter', sans-serif",
        titleFontSize:       '56px',
        titleFontWeight:     900,
        titleLetterSpacing:  '4px',
        titleItalic:         false,
        titleUppercase:      true,
        sectionLabelBranded: false,
        sectionLabelHidden:  false,
        tableZebra:          false,
        tableTopBorder:      '3px solid #0f172a',
        rowBorder:           '1px solid #e2e8f0',
        lastRowBorder:       '3px solid #0f172a',
        footerTopBorder:     '2px solid #0f172a',
    },
    // ── Left brand-color panel header, brand-colored section labels in body
    stripe: {
        headerType:          'stripe',
        accentMode:          'tint',
        titleFontFamily:     "'Inter', sans-serif",
        titleFontSize:       '44px',
        titleFontWeight:     900,
        titleLetterSpacing:  '-2px',
        titleItalic:         false,
        titleUppercase:      true,
        sectionLabelBranded: true,
        sectionLabelHidden:  false,
        tableZebra:          false,
        tableTopBorder:      '2px solid #18181b',
        rowBorder:           '1px solid #e5e7eb',
        lastRowBorder:       '1px solid #18181b',
        footerTopBorder:     '1px solid #e5e7eb',
    },
    // ── Full-width brand-color header, branded labels, zebra table rows
    bureau: {
        headerType:          'bureau',
        accentMode:          'tint',
        titleFontFamily:     "'Inter', sans-serif",
        titleFontSize:       '40px',
        titleFontWeight:     900,
        titleLetterSpacing:  '-2px',
        titleItalic:         false,
        titleUppercase:      true,
        sectionLabelBranded: true,
        sectionLabelHidden:  false,
        tableZebra:          true,
        tableTopBorder:      '2px solid #18181b',
        rowBorder:           '1px solid #e5e7eb',
        lastRowBorder:       '1px solid #18181b',
        footerTopBorder:     '1px solid #e5e7eb',
    },
    // ── Standard header + thick brand-color rule, left-border TTC, no boxes
    ligne: {
        headerType:          'ligne',
        accentMode:          'rule',
        titleFontFamily:     "'Inter', sans-serif",
        titleFontSize:       '44px',
        titleFontWeight:     700,
        titleLetterSpacing:  '-2px',
        titleItalic:         false,
        titleUppercase:      true,
        sectionLabelBranded: false,
        sectionLabelHidden:  false,
        tableZebra:          false,
        tableTopBorder:      'none',
        rowBorder:           '1px solid #f3f4f6',
        lastRowBorder:       '1px solid #cbd5e1',
        footerTopBorder:     '1px solid #f3f4f6',
    },
}
