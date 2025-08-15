
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, User, Shield } from "lucide-react";
import { handleUserSignup, ADMIN_EMAIL } from "@/utils/authUtils";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import EmailVerification from "./EmailVerification";

const SignupForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    isAdmin: false
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  // Auto-check admin checkbox when admin email is entered
  useEffect(() => {
    if (signupData.email === ADMIN_EMAIL) {
      setSignupData(prev => ({ ...prev, isAdmin: true }));
    } else {
      setSignupData(prev => ({ ...prev, isAdmin: false }));
    }
  }, [signupData.email]);

  const handleSignup = async (e) => {
    e.preventDefault();
    
    setIsLoading(true);

    try {
      const isAdmin = await handleUserSignup(signupData);

      if (isAdmin) {
        toast({
          title: "Admin account created successfully!",
          description: "You can now log in with your admin credentials.",
        });
        
        // Reset form
        setSignupData({
          email: "",
          password: "",
          fullName: "",
          phone: "",
          isAdmin: false
        });
      } else {
        // For regular users, show email verification UI if needed
        setSignupEmail(signupData.email);
        setShowEmailVerification(true);
        toast({
          title: "Account created!",
          description: "Please check your email to complete verification.",
        });
      }

    } catch (error) {
      console.error("Signup error:", error);
      
      // Provide more specific error messages
      let errorMessage = "An unexpected error occurred. Please try again.";
      
      if (error.message) {
        if (error.message.includes("rate limit")) {
          errorMessage = "Too many attempts. Please wait a moment before trying again.";
        } else if (error.message.includes("already exists") || error.message.includes("already registered")) {
          errorMessage = "An account with this email or phone number already exists. Please log in instead.";
        } else if (error.message.includes("Password should be at least")) {
          errorMessage = "Password must be at least 6 characters long.";
        } else if (error.message.includes("Invalid email")) {
          errorMessage = "Please enter a valid email address.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Signup failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailVerificationComplete = () => {
    setShowEmailVerification(false);
    setSignupEmail("");
    // Reset form
    setSignupData({
      email: "",
      password: "",
      fullName: "",
      phone: "",
      isAdmin: false
    });
    
    toast({
      title: "Account setup complete!",
      description: "You can now log in to your account.",
    });
    navigate("/login"); // Redirect to login page after successful verification
  };

  const handleBackToSignup = () => {
    setShowEmailVerification(false);
  };

  // Phone verification is now handled in the combined email
  // We only show email verification UI

  if (showEmailVerification) {
    return (
      <EmailVerification
        email={signupEmail}
        onVerified={handleEmailVerificationComplete}
        onBack={handleBackToSignup}
      />
    );
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="signup-name"
            type="text"
            placeholder="Enter your full name"
            className="pl-10"
            value={signupData.fullName}
            onChange={(e) => setSignupData({...signupData, fullName: e.target.value})}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="signup-email"
            type="email"
            placeholder="Enter your email"
            className="pl-10"
            value={signupData.email}
            onChange={(e) => setSignupData({...signupData, email: e.target.value})}
            required
          />
        </div>
      </div>
      
      {!signupData.isAdmin && (
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="signup-password"
              type="password"
              placeholder="Create a password"
              className="pl-10"
              value={signupData.password}
              onChange={(e) => setSignupData({...signupData, password: e.target.value})}
              required={!signupData.isAdmin}
            />
          </div>
        </div>
      )}

      {signupData.email === ADMIN_EMAIL && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="admin-signup"
            checked={signupData.isAdmin}
            onCheckedChange={(checked) => setSignupData({...signupData, isAdmin: !!checked})}
          />
          <label
            htmlFor="admin-signup"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
          >
            <Shield className="h-4 w-4 mr-2 text-red-600" />
            Create Admin Account
          </label>
        </div>
      )}

      {signupData.isAdmin && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">
            <strong>Note:</strong> Admin accounts have elevated privileges and use a fixed secure password.
          </p>
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isLoading}
        size="lg"
      >
        {isLoading ? "Creating account..." : "Create Account"}
      </Button>
    </form>
  );
};

export default SignupForm;
