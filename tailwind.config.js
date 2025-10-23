/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class', '[data-theme="dark"]'],
    content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			xl2: '1.5rem'
  		},
  		colors: {
  			bg: 'var(--bg)',
  			surface: 'var(--surface)',
  			surface2: 'var(--surface-2)',
  			text: 'var(--text)',
  			'text-muted': 'var(--text-muted)',
  			placeholder: 'var(--placeholder)',
  			brand: {
  				DEFAULT: 'var(--brand)',
  				2: 'var(--brand-2)',
  				blue: '#1976F3',
  				blueDark: '#0F4FD6',
  				blueLight: '#E7F0FF',
  				green: '#2EBD59',
  				greenDark: '#1F9847',
  				ink: '#0B1324',
  				cloud: '#F6F8FB',
  				inkSoft: '#18223A',
  				textSoft: '#7C8DB5'
  			},
  			success: {
  				DEFAULT: 'var(--success)',
  				bg: 'var(--success-bg)'
  			},
  			warn: {
  				DEFAULT: 'var(--warn)',
  				bg: 'var(--warn-bg)'
  			},
  			error: {
  				DEFAULT: 'var(--error)',
  				bg: 'var(--error-bg)'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		boxShadow: {
  			'brand-card': '0 4px 24px rgba(15, 79, 214, 0.12), 0 2px 8px rgba(15, 79, 214, 0.08)',
  			card: 'var(--shadow-1)'
  		},
  		backgroundImage: {
  			'cta-grad': 'var(--cta-grad)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
