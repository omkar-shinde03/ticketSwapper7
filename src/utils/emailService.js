// Simple Email Service using EmailJS
// This replaces the Supabase Edge Function for sending emails

import emailjs from '@emailjs/browser';

// EmailJS configuration
const EMAILJS_SERVICE_ID = 'service_fhvlzuw';
const EMAILJS_TEMPLATE_ID = 'template_5iac2xk'; // User's new template ID
const EMAILJS_PUBLIC_KEY = 'uAKdrHtZvlr7ohS46';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

// Special configuration to ensure emails go to the correct recipient
const emailjsConfig = {
  serviceId: EMAILJS_SERVICE_ID,
  templateId: EMAILJS_TEMPLATE_ID,
  publicKey: EMAILJS_PUBLIC_KEY,
  // Force EmailJS to use our recipient email
  templateParams: {
    to_email: '',
    user_email: '',
    email: ''
  }
};

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
    console.log('📧 Attempting to send email with EmailJS...');
    console.log('📧 Recipient email:', emailData.to);
    console.log('📧 Service ID:', EMAILJS_SERVICE_ID);
    console.log('📧 Template ID:', EMAILJS_TEMPLATE_ID);
    console.log('📧 Public Key:', EMAILJS_PUBLIC_KEY);
    
    // Create template parameters with ALL possible variable names
    const templateParams = {
      // Primary recipient variables - CRITICAL for routing
      to_email: emailData.to,
      to_name: 'User',
      user_email: emailData.to,
      email: emailData.to,
      recipient_email: emailData.to,
      to: emailData.to,
      
      // Sender variables
      from_name: 'TicketSwapper Team',
      from_email: 'no-reply@ticketswapper.com',
      reply_to: 'no-reply@ticketswapper.com',
      
      // Content variables
      subject: emailData.subject,
      message: emailData.body,
      body: emailData.body,
      content: emailData.body,
      text: emailData.body,
      html: emailData.body.replace(/\n/g, '<br>'),
      
      // Video link variables (multiple formats)
      video_link: emailData.video_link || '',
      link: emailData.video_link || '',
      video_url: emailData.video_link || '',
      call_link: emailData.video_link || '',
      meeting_link: emailData.video_link || '',
      
      // User information
      user_name: 'User',
      name: 'User',
      company_name: 'TicketSwapper',
      
      // Additional common variables
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString()
    };

    console.log('📋 Template parameters being sent:');
    Object.entries(templateParams).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    // Send email using EmailJS
    console.log('🚀 Sending email...');
    console.log('📧 Template ID:', EMAILJS_TEMPLATE_ID);
    console.log('📧 Service ID:', EMAILJS_SERVICE_ID);
    console.log('📧 Recipient:', emailData.to);
    
    // Use EmailJS with explicit configuration
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('✅ Email sent successfully:', response);
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    console.error('Error details:', {
      message: error.message,
      text: error.text,
      status: error.status
    });
    
    // Check if it's a CSP error
    if (error.message && error.message.includes('Content Security Policy')) {
      console.error('CSP Error detected! Please check your Content Security Policy settings.');
      console.error('Add these domains to your CSP connect-src directive:');
      console.error('- https://api.emailjs.com');
      console.error('- https://*.emailjs.com');
      return { 
        success: false, 
        error: 'Content Security Policy blocked EmailJS connection. Please contact support.',
        cspError: true 
      };
    }
    
    // Check if it's a 400 Bad Request error (template/parameter issue)
    if (error.status === 400) {
      console.error('400 Bad Request - Template or parameter issue detected');
      console.error('This usually means:');
      console.error('1. Template ID is incorrect');
      console.error('2. Required template variables are missing');
      console.error('3. Service ID is incorrect');
      
      // Try with minimal template variables
      try {
        console.log('🔄 Trying with minimal template variables...');
        const minimalParams = {
          to_email: emailData.to,
          message: emailData.body,
          from_name: 'TicketSwapper Team',
          video_link: emailData.video_link || ''
        };
        
        const minimalResponse = await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          minimalParams
        );
        
        console.log('✅ Email sent with minimal params:', minimalResponse);
        return { success: true, data: minimalResponse, usedMinimal: true };
      } catch (minimalError) {
        console.error('❌ Minimal params also failed:', minimalError);
        
        // Try with default EmailJS template as last resort
        try {
          console.log('🔄 Trying with default EmailJS template...');
          const defaultResponse = await emailjs.send(
            EMAILJS_SERVICE_ID,
            'template_default', // Try default template
            {
              to_email: emailData.to,
              message: emailData.body,
              from_name: 'TicketSwapper Team',
              video_link: emailData.video_link || ''
            }
          );
          console.log('✅ Email sent with default template:', defaultResponse);
          return { success: true, data: defaultResponse, usedDefault: true };
        } catch (defaultError) {
          console.error('❌ Default template also failed:', defaultError);
          return { 
            success: false, 
            error: `Template error: ${error.message}. Please check your EmailJS template configuration.`,
            templateError: true 
          };
        }
      }
    }
    
    return { success: false, error: error.message };
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
 * Test different EmailJS templates to find one that works
 * @param {string} testEmail - Test email address
 * @returns {Promise} - Template test results
 */
export const testEmailJSTemplates = async (testEmail) => {
  const testData = {
    to: testEmail,
    subject: 'Template Test',
    body: 'Testing different EmailJS templates',
    video_link: 'https://test-video-call.com'
  };

  const templates = [
    { id: EMAILJS_TEMPLATE_ID, name: 'Your KYC Template' },
    { id: 'template_default', name: 'Default Template' },
    { id: 'template_contact', name: 'Contact Template' }
  ];

  const results = [];

  for (const template of templates) {
    try {
      console.log(`Testing template: ${template.name} (${template.id})`);
      
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        template.id,
        {
          to_email: testData.to,
          message: testData.body,
          from_name: 'TicketSwapper Team'
        }
      );
      
      results.push({
        template: template.name,
        id: template.id,
        success: true,
        response: response
      });
      
      console.log(`✅ ${template.name} worked!`);
      
    } catch (error) {
      console.error(`❌ ${template.name} failed:`, error);
      console.error('Full error object:', error);
      console.error('Error status:', error.status);
      console.error('Error text:', error.text);
      console.error('Error message:', error.message);
      
      results.push({
        template: template.name,
        id: template.id,
        success: false,
        error: error.text || error.message || 'Unknown error',
        status: error.status
      });
    }
  }

  return results;
};

/**
 * Find a working EmailJS template by trying common template IDs
 * @returns {Promise} - Working template ID or null
 */
export const findWorkingTemplate = async () => {
  const commonTemplateIds = [
    'template_default',
    'template_contact',
    'template_support',
    'template_kyc',
    'template_verification',
    'template_notification'
  ];

  console.log('🔍 Searching for working EmailJS template...');

  for (const templateId of commonTemplateIds) {
    try {
      console.log(`Trying template: ${templateId}`);
      
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        templateId,
        {
          to_email: 'test@example.com',
          message: 'Template test',
          from_name: 'Test'
        }
      );
      
      console.log(`✅ Found working template: ${templateId}`);
      return templateId;
      
    } catch (error) {
      console.log(`❌ Template ${templateId} failed:`, error.text || error.message);
      continue;
    }
  }
  
  console.log('❌ No working templates found');
  return null;
};

/**
 * Diagnose EmailJS account configuration
 * @returns {Object} - Diagnostic results
 */
export const diagnoseEmailJS = async () => {
  try {
    console.log('🔍 Diagnosing EmailJS configuration...');
    console.log('Service ID:', EMAILJS_SERVICE_ID);
    console.log('Template ID:', EMAILJS_TEMPLATE_ID);
    console.log('Public Key:', EMAILJS_PUBLIC_KEY);
    
    // Test basic EmailJS initialization
    if (!emailjs.init) {
      return { success: false, error: 'EmailJS not properly loaded' };
    }
    
    // Test with minimal parameters
    const testParams = {
      to_email: 'test@example.com',
      message: 'Test message',
      from_name: 'Test'
    };
    
    console.log('Testing with minimal parameters:', testParams);
    
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      testParams
    );
    
    return { success: true, data: response };
    
  } catch (error) {
    console.error('EmailJS diagnosis failed:', error);
    return {
      success: false,
      error: error.text || error.message || 'Unknown error',
      status: error.status,
      details: {
        serviceId: EMAILJS_SERVICE_ID,
        templateId: EMAILJS_TEMPLATE_ID,
        publicKey: EMAILJS_PUBLIC_KEY
      }
    };
  }
};

/**
 * Test Content Security Policy for EmailJS
 * @returns {Object} - CSP test result
 */
export const testCSP = async () => {
  try {
    console.log('Testing CSP for EmailJS...');
    
    // Test if we can connect to EmailJS API
    const testUrl = 'https://api.emailjs.com/api/v1.0/email/send';
    
    // Try a simple fetch to test CSP
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true })
    });
    
    console.log('CSP test successful - can connect to EmailJS');
    return { success: true, message: 'CSP allows EmailJS connections' };
  } catch (error) {
    console.error('CSP test failed:', error);
    
    if (error.message && error.message.includes('Content Security Policy')) {
      return { 
        success: false, 
        error: 'CSP blocked EmailJS connection',
        message: 'Please add https://api.emailjs.com to your CSP connect-src directive',
        cspError: true
      };
    }
    
    return { 
      success: false, 
      error: error.message,
      message: 'Connection failed for unknown reason'
    };
  }
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

/**
 * Test KYC email with video call link
 * @param {string} testEmail - Test email address
 * @returns {Promise} - Email result
 */
export const testKYCEmailWithVideoLink = async (testEmail) => {
  const videoLink = 'https://meet.jit.si/kyc-test-' + Date.now();
  
  console.log('🧪 Testing KYC email with video link...');
  console.log('Video link:', videoLink);
  console.log('Test email:', testEmail);
  
  const emailData = {
    to: testEmail,
    subject: '🎥 Your Video KYC Verification Call',
    body: `Dear User,

Your video KYC verification call is ready! 

📹 Join your verification call using this link:
${videoLink}

⏰ Please be ready at your scheduled time.

📋 What to prepare:
• Valid ID document (Aadhaar, PAN, etc.)
• Good internet connection
• Quiet environment for the call

If you have any questions, please contact our support team.

Thank you,
TicketSwapper Team`,
    video_link: videoLink
  };

  console.log('📧 Email data prepared:', emailData);
  
  const result = await sendEmail(emailData);
  
  console.log('📤 Email send result:', result);
  
  return result;
};

/**
 * Debug EmailJS template variables - Test different parameter combinations
 * @param {string} testEmail - Test email address
 * @returns {Promise} - Debug results
 */
export const debugEmailJSTemplate = async (testEmail) => {
  console.log('🔍 Debugging EmailJS template variables...');
  
  const testCases = [
    {
      name: 'Basic Test',
      params: {
        to_email: testEmail,
        message: 'Test message',
        from_name: 'Test'
      }
    },
    {
      name: 'Full KYC Test',
      params: {
        to_email: testEmail,
        user_email: testEmail,
        email: testEmail,
        message: 'Your KYC verification is ready',
        video_link: 'https://meet.jit.si/kyc-debug-' + Date.now(),
        from_name: 'TicketSwapper Team'
      }
    },
    {
      name: 'Minimal Test',
      params: {
        to_email: testEmail,
        message: 'Simple test'
      }
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    try {
      console.log(`🧪 Testing: ${testCase.name}`);
      console.log('📋 Parameters:', testCase.params);
      
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        testCase.params
      );
      
      console.log(`✅ ${testCase.name} succeeded:`, response);
      results.push({
        name: testCase.name,
        success: true,
        params: testCase.params,
        response: response
      });
      
    } catch (error) {
      console.error(`❌ ${testCase.name} failed:`, error);
      results.push({
        name: testCase.name,
        success: false,
        params: testCase.params,
        error: error.text || error.message,
        status: error.status
      });
    }
  }

  return results;
};

/**
 * Test the new template with explicit recipient routing
 * @param {string} testEmail - Test email address
 * @returns {Promise} - Email result
 */
export const testNewTemplate = async (testEmail) => {
  console.log('🧪 Testing new template with explicit routing...');
  console.log('📧 Template ID:', EMAILJS_TEMPLATE_ID);
  console.log('📧 Test email:', testEmail);
  
  const videoLink = 'https://meet.jit.si/kyc-new-template-' + Date.now();
  
  const emailData = {
    to: testEmail,
    subject: '🎥 KYC Verification - New Template Test',
    body: `Dear User,

Your KYC verification is ready with our new template!

📹 Video Call Link: ${videoLink}

⏰ Please be ready for your verification call.

📋 Required Documents:
• Valid ID (Aadhaar, PAN, etc.)
• Good internet connection
• Quiet environment

Thank you,
TicketSwapper Team`,
    video_link: videoLink
  };

  console.log('📧 Email data prepared:', emailData);
  
  const result = await sendEmail(emailData);
  
  console.log('📤 Email send result:', result);
  
  return result;
};
