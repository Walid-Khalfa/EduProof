import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Home, Award, Compass, CheckCircle, Settings, Menu, X, Moon, Sun, Monitor, LogOut, Copy, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NetworkPill } from '@/components/NetworkPill';
import Logo from '@/components/Logo';
import { useTheme } from '@/hooks/useTheme';
import { useDisconnect } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/utils/copyToClipboard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();

  const navItems = [
    { path: '/', label: 'Mint', icon: Home },
    { path: '/my-certificates', label: 'My Certificates', icon: Award },
    { path: '/verify', label: 'Verify', icon: CheckCircle },
    { path: '/admin', label: 'Admin', icon: Settings },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <header className="backdrop-blur-md border-b sticky top-0 z-50" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <Logo className="h-8 w-auto" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 font-medium shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <NetworkPill requiredNetwork="sepolia" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-9 h-9 p-0"
                    style={{ color: 'var(--text)' }}
                    aria-label="Toggle theme"
                  >
                    {theme === 'dark' ? (
                      <Moon className="w-5 h-5" />
                    ) : theme === 'light' ? (
                      <Sun className="w-5 h-5" />
                    ) : (
                      <Monitor className="w-5 h-5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme('light')}>
                    <Sun className="w-4 h-4 mr-2" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>
                    <Moon className="w-4 h-4 mr-2" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>
                    <Monitor className="w-4 h-4 mr-2" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openChainModal,
                  openConnectModal,
                  authenticationStatus,
                  mounted,
                }) => {
                  const ready = mounted && authenticationStatus !== 'loading';
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus ||
                      authenticationStatus === 'authenticated');

                  const handleCopyAddress = async (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!account?.address) return;
                    
                    const success = await copyToClipboard(account.address);
                    if (success) {
                      toast({
                        title: 'Address copied',
                        description: account.address,
                      });
                    } else {
                      toast({
                        title: 'Copy failed',
                        description: 'Please copy manually from the input below',
                        variant: 'destructive',
                      });
                    }
                  };

                  const handleDisconnect = () => {
                    disconnect();
                    toast({
                      title: 'Disconnected',
                      description: 'Wallet disconnected successfully',
                    });
                  };

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        'style': {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <Button onClick={openConnectModal} size="sm">
                              Connect Wallet
                            </Button>
                          );
                        }

                        if (chain.unsupported) {
                          return (
                            <Button onClick={openChainModal} variant="destructive" size="sm">
                              Wrong network
                            </Button>
                          );
                        }

                        return (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="font-mono"
                              >
                                <Wallet className="w-4 h-4 mr-2" />
                                {account.displayName}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel className="font-mono text-xs">
                                {account.address}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <button type="button" onClick={handleCopyAddress} className="w-full">
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy address
                                </button>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handleDisconnect}>
                                <LogOut className="w-4 h-4 mr-2" />
                                Disconnect
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-9 h-9 p-0"
                    style={{ color: 'var(--text)' }}
                    aria-label="Toggle theme"
                  >
                    {theme === 'dark' ? (
                      <Moon className="w-5 h-5" />
                    ) : theme === 'light' ? (
                      <Sun className="w-5 h-5" />
                    ) : (
                      <Monitor className="w-5 h-5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme('light')}>
                    <Sun className="w-4 h-4 mr-2" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>
                    <Moon className="w-4 h-4 mr-2" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>
                    <Monitor className="w-4 h-4 mr-2" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
            <nav className="px-4 py-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 font-medium shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
              <NetworkPill requiredNetwork="sepolia" />
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openChainModal,
                  openConnectModal,
                  authenticationStatus,
                  mounted,
                }) => {
                  const ready = mounted && authenticationStatus !== 'loading';
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus ||
                      authenticationStatus === 'authenticated');

                  const handleCopyAddress = async (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!account?.address) return;
                    
                    const success = await copyToClipboard(account.address);
                    if (success) {
                      toast({
                        title: 'Address copied',
                        description: account.address,
                      });
                    } else {
                      toast({
                        title: 'Copy failed',
                        description: 'Please copy manually from the input below',
                        variant: 'destructive',
                      });
                    }
                  };

                  const handleDisconnect = () => {
                    disconnect();
                    toast({
                      title: 'Disconnected',
                      description: 'Wallet disconnected successfully',
                    });
                  };

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        'style': {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <Button onClick={openConnectModal} className="w-full">
                              Connect Wallet
                            </Button>
                          );
                        }

                        if (chain.unsupported) {
                          return (
                            <Button onClick={openChainModal} variant="destructive" className="w-full">
                              Wrong network
                            </Button>
                          );
                        }

                        return (
                          <div className="space-y-2">
                            <div className="px-3 py-2 text-xs font-mono text-muted-foreground break-all">
                              {account.address}
                            </div>
                            <Button
                              type="button"
                              onClick={handleCopyAddress}
                              variant="outline"
                              className="w-full"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy address
                            </Button>
                            <Button
                              onClick={handleDisconnect}
                              variant="outline"
                              className="w-full"
                            >
                              <LogOut className="w-4 h-4 mr-2" />
                              Disconnect
                            </Button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="backdrop-blur border-t mt-16" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            © 2025 EduProof. AI-verified blockchain certificates.
          </p>
        </div>
      </footer>
    </div>
  );
}
