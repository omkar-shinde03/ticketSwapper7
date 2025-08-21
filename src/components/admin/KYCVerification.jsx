
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Mail, UserCheck } from "lucide-react";

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

  const sendVerificationEmail = async (userEmail, userName, status) => {
    try {
      // Import the email service dynamically
      const { sendEmail } = await import('@/utils/emailService');
      
      const subject = status === 'verified' 
        ? '🎉 Your KYC Verification is Complete!' 
        : 'KYC Verification Update';
      
      const body = status === 'verified'
        ? `Dear ${userName || 'User'},

🎉 Congratulations! Your KYC verification has been successfully completed.

Your account is now fully verified and you can:
• Access all platform features
• Buy and sell tickets without restrictions
• Enjoy enhanced security and trust

Thank you for your patience during the verification process.

Best regards,
TicketSwapper Team`
        : `Dear ${userName || 'User'},

Your KYC verification has been ${status}.

${status === 'rejected' 
  ? 'Please review your submitted documents and try again with correct information. If you have any questions, please contact our support team.'
  : 'Your verification is currently being processed. We will notify you once it is complete.'
}

Best regards,
TicketSwapper Team`;

      const emailResult = await sendEmail({
        to: userEmail,
        subject: subject,
        body: body
      });

      if (emailResult.success) {
        console.log('Verification email sent successfully');
        return true;
      } else {
        console.error('Failed to send verification email:', emailResult.error);
        return false;
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      return false;
    }
  };

  const handleVerifyKYC = async (user) => {
    setLoading(user.id);
    try {
      // Update user's KYC status to verified
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          kyc_status: 'verified',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Update video_calls status if there are pending calls
      const { error: callsError } = await supabase
        .from('video_calls')
        .update({ 
          status: 'completed',
          verification_result: 'approved',
          verification_notes: 'KYC verified by admin',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .in('status', ['waiting_admin', 'admin_connected', 'in_call']);

      if (callsError) {
        console.warn('Failed to update video calls:', callsError);
      }

      // Send verification confirmation email
      const emailSent = await sendVerificationEmail(
        user.email, 
        user.full_name, 
        'verified'
      );

      toast({
        title: "KYC Verified Successfully! 🎉",
        description: `User ${user.full_name || user.email} has been verified. ${emailSent ? 'Confirmation email sent.' : 'Email notification failed.'}`,
      });

      onUpdate();
    } catch (error) {
      console.error('KYC verification error:', error);
      toast({
        title: "KYC Verification Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleRejectKYC = async (user) => {
    setLoading(user.id);
    try {
      // Update user's KYC status to rejected
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          kyc_status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Update video_calls status if there are pending calls
      const { error: callsError } = await supabase
        .from('video_calls')
        .update({ 
          status: 'completed',
          verification_result: 'rejected',
          verification_notes: 'KYC rejected by admin',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .in('status', ['waiting_admin', 'admin_connected', 'in_call']);

      if (callsError) {
        console.warn('Failed to update video calls:', callsError);
      }

      // Send rejection notification email
      const emailSent = await sendVerificationEmail(
        user.email, 
        user.full_name, 
        'rejected'
      );

      toast({
        title: "KYC Rejected",
        description: `User ${user.full_name || user.email} KYC has been rejected. ${emailSent ? 'Notification email sent.' : 'Email notification failed.'}`,
      });

      onUpdate();
    } catch (error) {
      console.error('KYC rejection error:', error);
      toast({
        title: "KYC Rejection Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          KYC Verification
        </CardTitle>
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
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg mb-2 bg-card">
                <div className="flex-1">
                  <h4 className="font-medium text-lg">{user.full_name || 'Unknown User'}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
                  {user.phone && (
                    <p className="text-sm text-muted-foreground mb-2">📱 {user.phone}</p>
                  )}
                  <Badge 
                    variant="outline" 
                    className={
                      user.kyc_status === 'pending' 
                        ? 'text-orange-700 bg-orange-100 border-orange-300' 
                        : user.kyc_status === 'verified' 
                        ? 'text-green-700 bg-green-100 border-green-300' 
                        : 'text-red-700 bg-red-100 border-red-300'
                    }
                  >
                    {user.kyc_status === 'pending' ? '⏳ Pending' : 
                     user.kyc_status === 'verified' ? '✅ Verified' : 
                     '❌ Rejected'}
                  </Badge>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button 
                    onClick={() => handleVerifyKYC(user)} 
                    disabled={user.kyc_status === 'verified' || loading === user.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading === user.id ? (
                      'Verifying...'
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verify
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleRejectKYC(user)} 
                    disabled={user.kyc_status === 'verified' || user.kyc_status === 'rejected' || loading === user.id}
                  >
                    {loading === user.id ? (
                      'Processing...'
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </>
                    )}
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
