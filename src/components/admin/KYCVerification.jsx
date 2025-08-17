
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle } from "lucide-react";

/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string|null} full_name
 * @property {string|null} phone
 * @property {string} user_type
 * @property {string} kyc_status
 * @property {string} created_at
 */

/**
 * @typedef {Object} KYCVerificationProps
 * @property {Profile[]} users
 * @property {Function} onUpdate
 */

export const KYCVerification = ({ users, onUpdate }) => {
  const [loading, setLoading] = useState(null);
  const { toast } = useToast();

  const handleVerifyKYC = async (user) => {
    setLoading(user.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ kyc_status: 'verified' })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "KYC Verified",
        description: `User KYC has been verified successfully.`,
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "KYC action failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleRejectKYC = async (user) => {
    setLoading(user.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ kyc_status: 'rejected' })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "KYC Rejected",
        description: `User KYC has been rejected successfully.`,
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "KYC action failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>KYC Verification</CardTitle>
        <CardDescription>Review and approve pending KYC verifications</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No users found for KYC verification
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg mb-2">
                <div>
                  <h4 className="font-medium">{user.full_name || user.email}</h4>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <Badge variant="outline" className={user.kyc_status === 'pending' ? 'text-orange-700 bg-orange-100' : user.kyc_status === 'verified' ? 'text-green-700 bg-green-100' : 'text-gray-700 bg-gray-100'}>
                    {user.kyc_status}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleVerifyKYC(user)} disabled={user.kyc_status === 'verified'}>
                    Verify
                  </Button>
                  <Button variant="destructive" onClick={() => handleRejectKYC(user)} disabled={user.kyc_status === 'verified' || user.kyc_status === 'rejected'}>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
