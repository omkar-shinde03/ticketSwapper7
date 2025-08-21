// Simple Email Service using EmailJS
// This replaces the Supabase Edge Function for sending emails

import emailjs from '@emailjs/browser';

// EmailJS configuration
const EMAILJS_SERVICE_ID = 'service_fhvlzuw';
const EMAILJS_TEMPLATE_ID = '__ejs-test-mail-service__';
const EMAILJS_PUBLIC_KEY = 'uAKdrHtZvlr7ohS46';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

/**
 * Send email using EmailJS
 * @param {Object} emailData - Email data
 * @param {string} emailData.to - Recipient email
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.body - Email body
 * @param {string} emailData.video_link - Video call link (optional)
 * @returns {Promise} - EmailJS response
 */
export const sendEmail = async (emailData) => {
  try {
    console.log('Attempting to send email with EmailJS...');
    console.log('Service ID:', EMAILJS_SERVICE_ID);
    console.log('Template ID:', EMAILJS_TEMPLATE_ID);
    console.log('Public Key:', EMAILJS_PUBLIC_KEY);
    
    // Try multiple template variable formats to match common EmailJS templates
    const templateParams = {
      // Standard EmailJS variables
      to_email: emailData.to,
      to_name: 'User',
      from_name: 'TicketSwapper Team',
      reply_to: 'no-reply@ticketswapper.com',
      
      // Common template variables
      subject: emailData.subject,
      message: emailData.body,
      body: emailData.body,
      content: emailData.body,
      
      // Video link variables
      video_link: emailData.video_link || '',
      link: emailData.video_link || '',
      
      // Additional common variables
      user_email: emailData.to,
      user_name: 'User',
      company_name: 'TicketSwapper'
    };

    console.log('Template parameters:', templateParams);

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('Email sent successfully:', response);
    return { success: true, data: response };
  } catch (error) {
    console.error('Email sending failed:', error);
    console.error('Error details:', {
      message: error.message,
      text: error.text,
      status: error.status
    });
    
    // Try with default EmailJS template as fallback
    try {
      console.log('Trying with default EmailJS template...');
      const defaultResponse = await emailjs.send(
        EMAILJS_SERVICE_ID,
        'template_default', // Try default template
        {
          to_email: emailData.to,
          message: emailData.body,
          from_name: 'TicketSwapper Team'
        }
      );
      console.log('Email sent with default template:', defaultResponse);
      return { success: true, data: defaultResponse, usedDefault: true };
    } catch (defaultError) {
      console.error('Default template also failed:', defaultError);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Send KYC verification email
 * @param {string} userEmail - User's email address
 * @param {string} videoLink - Video call link
 * @returns {Promise} - Email result
 */
export const sendKYCEmail = async (userEmail, videoLink) => {
  const emailData = {
    to: userEmail,
    subject: 'Your Video KYC Call Link',
    body: `Dear User,\n\nYour video KYC verification call is ready. Please join the call at your scheduled time using the link below:\n\n${videoLink}\n\nThank you,\nTicketSwapper Team`,
    video_link: videoLink
  };

  return await sendEmail(emailData);
};

/**
 * Test email functionality
 * @param {string} testEmail - Test email address
 * @returns {Promise} - Email result
 */
export const testEmail = async (testEmail) => {
  const emailData = {
    to: testEmail,
    subject: 'Test Email from TicketSwapper',
    body: 'This is a test email to verify EmailJS integration is working.',
    video_link: 'https://test-video-call.com'
  };

  return await sendEmail(emailData);
};
