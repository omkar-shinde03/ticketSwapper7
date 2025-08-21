import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { sendKYCEmail, testEmail, testCSP, testEmailJSTemplates } from '@/utils/emailService';

export const EmailTestComponent = () => {
  const [emailAddress, setEmailAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cspTestResult, setCspTestResult] = useState(null);
  const [templateTestResults, setTemplateTestResults] = useState(null);
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

  const handleTestTemplates = async () => {
    if (!emailAddress) {
      toast({
        title: "Error",
        description: "Please enter a test email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const results = await testEmailJSTemplates(emailAddress);
      setTemplateTestResults(results);
      
      const workingTemplates = results.filter(r => r.success);
      if (workingTemplates.length > 0) {
        toast({
          title: "Template Test Complete! ✅",
          description: `${workingTemplates.length} template(s) are working. Check results below.`,
        });
      } else {
        toast({
          title: "No Working Templates Found! ❌",
          description: "All templates failed. Check your EmailJS configuration.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Template Test Error",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!emailAddress) {
      toast({
        title: "Error",
        description: "Please enter a test email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await testEmail(emailAddress);
      
      if (result.success) {
        toast({
          title: "Success!",
          description: `Test email sent to ${emailAddress}. Check your inbox!`,
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
    if (!emailAddress) {
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
      const result = await sendKYCEmail(emailAddress, videoLink);
      
      if (result.success) {
        toast({
          title: "Success!",
          description: `KYC email sent to ${emailAddress}. Check your inbox!`,
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

        {/* Template Test Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">EmailJS Template Test</Label>
          <Button 
            onClick={handleTestTemplates} 
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? 'Testing...' : 'Test All EmailJS Templates'}
          </Button>
          {templateTestResults && (
            <div className="space-y-2">
              {templateTestResults.map((result, index) => (
                <div key={index} className={`p-2 rounded-md text-xs ${
                  result.success 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  <strong>{result.template}:</strong> {result.success ? '✅ Working' : `❌ ${result.error}`}
                  {result.status && <span className="ml-2">(Status: {result.status})</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-email">Test Email Address</Label>
          <Input
            id="test-email"
            type="email"
            placeholder="your-email@example.com"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
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
          <p>• <strong>Template Test:</strong> Test all available EmailJS templates</p>
          <p>• <strong>Test Email:</strong> Simple test message</p>
          <p>• <strong>KYC Email:</strong> Full KYC notification with video link</p>
          <p>• Check your inbox after clicking any button</p>
        </div>
      </CardContent>
    </Card>
  );
};
