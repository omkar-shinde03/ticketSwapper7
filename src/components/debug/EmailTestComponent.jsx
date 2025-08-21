import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { sendKYCEmail, testEmail } from '@/utils/emailService';

export const EmailTestComponent = () => {
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter a test email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await testEmail(testEmail);
      
      if (result.success) {
        toast({
          title: "Success!",
          description: `Test email sent to ${testEmail}. Check your inbox!`,
        });
      } else {
        toast({
          title: "Email Failed",
          description: `Error: ${result.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Exception: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestKYCEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter a test email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const videoLink = 'https://meet.jit.si/test-kyc-call-' + Date.now();
      const result = await sendKYCEmail(testEmail, videoLink);
      
      if (result.success) {
        toast({
          title: "Success!",
          description: `KYC email sent to ${testEmail}. Check your inbox!`,
        });
      } else {
        toast({
          title: "Email Failed",
          description: `Error: ${result.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Exception: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Email Test Component</CardTitle>
        <CardDescription>
          Test EmailJS integration before using KYC functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-email">Test Email Address</Label>
          <Input
            id="test-email"
            type="email"
            placeholder="your-email@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={handleTestEmail} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Sending...' : 'Send Test Email'}
          </Button>
          
          <Button 
            onClick={handleTestKYCEmail} 
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? 'Sending...' : 'Send Test KYC Email'}
          </Button>
        </div>
        
        <div className="text-sm text-gray-600">
          <p>• Test Email: Simple test message</p>
          <p>• KYC Email: Full KYC notification with video link</p>
          <p>• Check your inbox after clicking either button</p>
        </div>
      </CardContent>
    </Card>
  );
};
