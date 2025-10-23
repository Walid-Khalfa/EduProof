import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, UserPlus, UserX, Settings, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type AdminInstitution = {
  id: string;
  name: string;
  wallet: string | null;
  didUri: string | null;
  min_score: number;
  status: 'approved' | 'revoked';
  certificates_count: number;
  created_at: string;
};

type AdminInstitutionListResponse = {
  items: AdminInstitution[];
  total: number;
  limit: number;
  offset: number;
};

export default function Admin() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  const [newInstitution, setNewInstitution] = useState({
    name: '',
    wallet: '',
    didUri: '',
    min_score: 70,
  });

  const [institutions, setInstitutions] = useState<AdminInstitution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const limit = 10;

  // Fetch institutions
  const fetchInstitutions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        limit,
        offset: page * limit,
      };

      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await axios.get<AdminInstitutionListResponse>(
        `${API_BASE}/api/admin/institutions`,
        {
          params,
          headers: {
            'x-wallet-address': address || '',
          },
        }
      );

      setInstitutions(response.data.items);
      setTotal(response.data.total);
    } catch (err: any) {
      console.error('Error fetching institutions:', err);
      const errorMsg = err.response?.data?.message || 'Failed to load institutions';
      setError(errorMsg);
      
      if (err.response?.status === 401) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchInstitutions();
    }
  }, [isConnected, address, search, statusFilter, page]);

  const handleRegisterInstitution = async () => {
    if (!newInstitution.name) {
      toast({
        title: 'Validation Error',
        description: 'Institution name is required',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading('register');
    try {
      await axios.post(
        `${API_BASE}/api/admin/institutions`,
        {
          name: newInstitution.name,
          wallet: newInstitution.wallet || null,
          didUri: newInstitution.didUri || null,
          min_score: newInstitution.min_score,
          status: 'approved',
        },
        {
          headers: {
            'x-wallet-address': address || '',
          },
        }
      );

      toast({
        title: 'Success',
        description: 'Institution registered successfully',
      });

      setNewInstitution({ name: '', wallet: '', didUri: '', min_score: 70 });
      fetchInstitutions();
    } catch (err: any) {
      console.error('Error registering institution:', err);
      const errorMsg = err.response?.data?.message || 'Failed to register institution';
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeInstitution = async (id: string) => {
    setActionLoading(id);
    try {
      await axios.post(
        `${API_BASE}/api/admin/institutions/${id}/revoke`,
        {},
        {
          headers: {
            'x-wallet-address': address || '',
          },
        }
      );

      toast({
        title: 'Success',
        description: 'Institution revoked successfully',
      });

      fetchInstitutions();
    } catch (err: any) {
      console.error('Error revoking institution:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to revoke institution',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveInstitution = async (id: string) => {
    setActionLoading(id);
    try {
      await axios.post(
        `${API_BASE}/api/admin/institutions/${id}/approve`,
        {},
        {
          headers: {
            'x-wallet-address': address || '',
          },
        }
      );

      toast({
        title: 'Success',
        description: 'Institution approved successfully',
      });

      fetchInstitutions();
    } catch (err: any) {
      console.error('Error approving institution:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to approve institution',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (!isConnected) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto text-center py-16">
          <Settings className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Access Required</h2>
          <p className="text-slate-600">
            Please connect your wallet with admin privileges
          </p>
        </div>
      </Layout>
    );
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-lg text-slate-600">
            Manage institutions and monitor certificate issuance
          </p>
        </div>

        <Tabs defaultValue="institutions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="institutions">Institutions</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Institutions Tab */}
          <TabsContent value="institutions" className="space-y-6">
            {/* Register New Institution */}
            <Card>
              <CardHeader>
                <CardTitle>Register New Institution</CardTitle>
                <CardDescription>
                  Add a new educational institution to the registry
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="institutionName">Institution Name *</Label>
                    <Input
                      id="institutionName"
                      value={newInstitution.name}
                      onChange={(e) => setNewInstitution({ ...newInstitution, name: e.target.value })}
                      placeholder="e.g., Coursera"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="institutionWallet">Wallet Address</Label>
                    <Input
                      id="institutionWallet"
                      value={newInstitution.wallet}
                      onChange={(e) => setNewInstitution({ ...newInstitution, wallet: e.target.value })}
                      placeholder="0x..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="didURI">DID URI</Label>
                    <Input
                      id="didURI"
                      value={newInstitution.didUri}
                      onChange={(e) => setNewInstitution({ ...newInstitution, didUri: e.target.value })}
                      placeholder="did:web:example.org"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minScore">Minimum Score</Label>
                    <Input
                      id="minScore"
                      type="number"
                      min={0}
                      max={100}
                      value={newInstitution.min_score}
                      onChange={(e) => setNewInstitution({ ...newInstitution, min_score: parseInt(e.target.value) || 70 })}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleRegisterInstitution}
                  disabled={actionLoading === 'register'}
                >
                  {actionLoading === 'register' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Register Institution
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Institutions List */}
            <Card>
              <CardHeader>
                <CardTitle>Registered Institutions</CardTitle>
                <CardDescription>
                  Manage and monitor all registered institutions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search institutions..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(0);
                      }}
                    />
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value);
                      setPage(0);
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="revoked">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  </div>
                )}

                {/* Error State */}
                {error && !loading && (
                  <div className="flex items-center justify-center py-8 text-red-600">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                  </div>
                )}

                {/* Empty State */}
                {!loading && !error && institutions.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No institutions found
                  </div>
                )}

                {/* Table */}
                {!loading && !error && institutions.length > 0 && (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Institution</TableHead>
                          <TableHead>Wallet</TableHead>
                          <TableHead>DID URI</TableHead>
                          <TableHead>Min Score</TableHead>
                          <TableHead>Certificates</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {institutions.map((inst) => (
                          <TableRow key={inst.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-500" />
                                {inst.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              {inst.wallet ? (
                                <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                                  {inst.wallet.slice(0, 6)}...{inst.wallet.slice(-4)}
                                </code>
                              ) : (
                                <span className="text-slate-400 text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {inst.didUri || '-'}
                            </TableCell>
                            <TableCell>{inst.min_score}</TableCell>
                            <TableCell>{inst.certificates_count}</TableCell>
                            <TableCell>
                              <Badge variant={inst.status === 'approved' ? 'default' : 'destructive'}>
                                {inst.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {inst.status === 'approved' ? (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRevokeInstitution(inst.id)}
                                  disabled={actionLoading === inst.id}
                                >
                                  {actionLoading === inst.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <UserX className="w-4 h-4 mr-1" />
                                      Revoke
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleApproveInstitution(inst.id)}
                                  disabled={actionLoading === inst.id}
                                >
                                  {actionLoading === inst.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Approve
                                    </>
                                  )}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between pt-4">
                      <div className="text-sm text-slate-600">
                        Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} institutions
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(0, p - 1))}
                          disabled={page === 0}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => p + 1)}
                          disabled={page >= totalPages - 1}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Configuration</CardTitle>
                <CardDescription>
                  Configure admin access and system settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Connected Wallet</Label>
                  <code className="block text-sm bg-slate-100 px-3 py-2 rounded">
                    {address}
                  </code>
                  <p className="text-sm text-slate-500">
                    This wallet must be in the ADMIN_WALLETS allowlist to access admin features
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
