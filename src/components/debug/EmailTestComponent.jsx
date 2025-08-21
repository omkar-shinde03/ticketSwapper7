import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { sendKYCEmail, testEmail, testCSP } from '@/utils/emailService';

export const EmailTestComponent = () => {
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cspTestResult, setCspTestResult] = useState(null);
  const { toast } = useToast();

  const handleTestCSP = async () => {
    setIsLoading(true);
    try {
      const result = await testCSP();
      setCspTestResult(result);
      
      if (result.success) {
        toast({
          title: "CSP Test Passed! ✅",
          description: "Content Security Policy allows EmailJS connections.",
        });
      } else {
        toast({
          title: "CSP Test Failed! ❌",
          description: result.message || "Content Security Policy is blocking EmailJS.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "CSP Test Error",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
        {/* CSP Test Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Content Security Policy Test</Label>
          <Button 
            onClick={handleTestCSP} 
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? 'Testing...' : 'Test CSP for EmailJS'}
          </Button>
          {cspTestResult && (
            <div className={`p-3 rounded-md text-sm ${
              cspTestResult.success 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <strong>{cspTestResult.success ? '✅ ' : '❌ '}</strong>
              {cspTestResult.message}
              {cspTestResult.cspError && (
                <div className="mt-2 text-xs">
                  <strong>Solution:</strong> Add these to your CSP connect-src:
                  <code className="block mt-1 bg-gray-100 p-1 rounded">
                    https://api.emailjs.com https://*.emailjs.com
                  </code>
                </div>
              )}
            </div>
          )}
        </div>

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
          <p>• <strong>CSP Test:</strong> Check if Content Security Policy allows EmailJS</p>
          <p>• <strong>Test Email:</strong> Simple test message</p>
          <p>• <strong>KYC Email:</strong> Full KYC notification with video link</p>
          <p>• Check your inbox after clicking any button</p>
        </div>
      </CardContent>
    </Card>
  );
};
