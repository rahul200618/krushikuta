import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export function PaymentRequestsPanel() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [uploadingQR, setUploadingQR] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRequests = async () => {
    try {
      const { listPaymentRequests } = await import('@/lib/exam-api');
      const res = await listPaymentRequests();
      setRequests((res.requests || []).filter((r: any) => r.status === 'pending'));
      if (res.error) {
        toast.warning('Failed to load pending payments: ' + res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQR = () => {
    const { data } = supabase.storage.from('public').getPublicUrl('premium_qr.jpg');
    if (data?.publicUrl) {
      setQrUrl(data.publicUrl + `?t=${Date.now()}`);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchQR();

    // Realtime subscription for new payment requests
    const channel = supabase.channel('admin-payment-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_requests' },
        () => {
          // Re-fetch when any change happens
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUploadQR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingQR(true);
    try {
      // Delete old file if exists to prevent caching issues, or just overwrite
      await supabase.storage.from('public').upload('premium_qr.jpg', file, { upsert: true });
      fetchQR();
      toast.success('QR Code updated successfully!');
    } catch (error: any) {
      toast.error('Failed to upload QR code: ' + error.message);
    } finally {
      setUploadingQR(false);
    }
  };

  const handleDeleteQR = async () => {
    try {
      await supabase.storage.from('public').remove(['premium_qr.jpg']);
      setQrUrl(null);
      toast.success('QR Code removed');
    } catch (error) {
      toast.error('Failed to remove QR code');
    }
  };

  const handleAction = async (id: number, email: string, action: 'approved' | 'declined') => {
    try {
      const { updatePaymentRequest } = await import('@/lib/exam-api');
      
      // Update request status (backend will auto-grant access if approved)
      await updatePaymentRequest(id, action);
      
      toast.success(`Request ${action} for ${email}`);

      // Refresh
      fetchRequests();
    } catch (err: any) {
      toast.error('Action failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Settings Section */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Payment Settings (UPI QR Code)</h3>
        <p className="text-muted-foreground text-sm mb-6">Upload your UPI QR code here. It will be shown to students on the checkout page when they try to purchase premium access.</p>
        
        <div className="flex items-start gap-8">
          <div className="w-48 h-48 bg-muted rounded-xl border-2 border-dashed border-border flex items-center justify-center relative overflow-hidden">
            {qrUrl ? (
              <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
            ) : (
              <span className="text-muted-foreground text-sm">No QR Uploaded</span>
            )}
          </div>
          
          <div className="space-y-4">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUploadQR} />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploadingQR} className="w-full">
              {uploadingQR ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {qrUrl ? 'Change QR Code' : 'Upload QR Code'}
            </Button>
            
            {qrUrl && (
              <Button variant="destructive" onClick={handleDeleteQR} className="w-full">
                <Trash2 className="w-4 h-4 mr-2" /> Remove
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Requests Section */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-6">Pending Payment Requests</h3>
        
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
            No payment requests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Student Email</th>
                  <th className="px-4 py-3">UTR / Txn ID</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(req.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">{req.user_email}</td>
                    <td className="px-4 py-3 font-mono">{req.utr}</td>
                    <td className="px-4 py-3">₹{req.amount}</td>
                    <td className="px-4 py-3">
                      <Badge variant={req.status === 'approved' ? 'default' : req.status === 'declined' ? 'destructive' : 'secondary'} className={req.status === 'approved' ? 'bg-green-500 hover:bg-green-600' : ''}>
                        {req.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {req.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleAction(req.id, req.user_email, 'approved')}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleAction(req.id, req.user_email, 'declined')}>
                            <XCircle className="w-4 h-4 mr-1" /> Decline
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
