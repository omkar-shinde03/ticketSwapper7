import { supabase } from "@/integrations/supabase/client";

export const isEmailVerified = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) { return false; }
    return !!user.email_confirmed_at;
  } catch (error) {
    console.error("Error checking email verification:", error);
    return false;
  }
};

export const sendVerificationEmail = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { throw new Error("User not authenticated"); }
    const { error: resendError } = await supabase.auth.resend({ type: 'signup' });
    if (resendError) { throw resendError; }
    return { success: true };
  } catch (error) {
    console.error("Send email verification error:", error);
    return { success: false, error: error.message };
  }
};

export const verifyEmailToken = async (email, token) => {
  // Not needed for Supabase built-in email verification
  return { success: false, error: "Direct token verification not supported. Use the link in your email." };
};

export const resendVerificationEmail = async () => {
  return sendVerificationEmail();
};

export const getVerificationStatus = async () => {
  const verified = await isEmailVerified();
  return { verified };
};