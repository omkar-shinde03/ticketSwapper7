/**
 * Ticket API Client for verification and data fetching
 */

const API_BASE_URL = 'https://ftsboryogzngqfarbbgu.supabase.co/rest/v1/bus_tickets';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0c2JvcnlvZ3puZ3FmYXJiYmd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMzM0NTEsImV4cCI6MjA2ODkwOTQ1MX0.idJ82x2P4BqQ1VffwQ5nnFYWtGIIo_H8kTidAGhwV0A';

// Enhanced debugging for API client
const DEBUG_MODE = import.meta.env.DEV || false;

const debugLog = (message, data = null) => {
  if (DEBUG_MODE) {
    console.log(`[API Client Debug] ${message}`, data || '');
  }
};

const debugError = (message, error = null) => {
  console.error(`[API Client Error] ${message}`, error || '');
};

export class TicketApiClient {
  /**
   * Fetch all tickets from the API
   */
  static async fetchAllTickets() {
    try {
      debugLog('🔄 Attempting to fetch tickets from API:', API_BASE_URL);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(API_BASE_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'apikey': API_KEY,
          'Authorization': `Bearer ${API_KEY}`
        },
        mode: 'cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      debugLog('📡 API Response status:', response.status);
      debugLog('📡 API Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        debugError('API Error Response:', { status: response.status, statusText: response.statusText, body: errorText });
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Response: ${errorText}`);
      }
      
      const data = await response.json();
      debugLog('✅ API Response data:', data);
      
      // Validate response structure
      if (!Array.isArray(data)) {
        debugError('Invalid API response structure:', typeof data);
        throw new Error('Invalid API response: Expected array of tickets');
      }
      
      // Validate ticket structure and transform to expected format
      if (data.length > 0) {
        const sampleTicket = data[0];
        const requiredFields = ['pnr_number', 'passenger_name', 'source_location', 'destination_location', 'departure_date', 'ticket_price'];
        const missingFields = requiredFields.filter(field => !(field in sampleTicket));
        
        if (missingFields.length > 0) {
          debugError('API tickets missing required fields:', missingFields);
          console.warn('Sample ticket structure:', sampleTicket);
        }
      }
      
      // Transform API response to match expected format
      const transformedData = data.map(ticket => ({
        id: ticket.id,
        pnr: ticket.pnr_number,
        name: ticket.passenger_name,
        from: ticket.source_location,
        to: ticket.destination_location,
        date: `${ticket.departure_date}@${ticket.departure_time}`,
        seat: ticket.seat_number,
        price: ticket.ticket_price,
        operator: ticket.bus_operator
      }));
      
      return transformedData;
    } catch (error) {
      if (error.name === 'AbortError') {
        debugError('❌ API request timed out after 15 seconds');
      } else {
        debugError('❌ API is down or unreachable:', error.message);
      }
      
      throw error; // Re-throw the error instead of returning mock data
    }
  }

  /**
   * Verify ticket credentials against API data
   * @param {Object} ticketData - Complete ticket data object
   * @returns {Object} Verification result with ticket data
   */
  static async verifyTicket(ticketData) {
    try {
      const { pnrNumber, passengerName, transportMode, ...otherFields } = ticketData;
      debugLog('🔍 Starting ticket verification for:', { pnrNumber, passengerName, transportMode, ...otherFields });
      
      // For now, we'll use the existing API for verification
      // In the future, this can be extended to use different APIs for different transport modes
      const tickets = await this.fetchAllTickets();
      debugLog('📊 Total tickets fetched:', tickets?.length || 0);
      
      // Find matching ticket based on PNR and passenger name
      const matchedTicket = tickets.find(ticket => {
        const pnrMatch = ticket.pnr?.toLowerCase().trim() === pnrNumber.toLowerCase().trim();
        const nameMatch = ticket.name?.toLowerCase().trim() === passengerName.toLowerCase().trim();
        
        debugLog('🔍 Checking ticket:', {
          ticketPNR: ticket.pnr,
          ticketName: ticket.name,
          pnrMatch,
          nameMatch
        });
        
        return pnrMatch && nameMatch;
      });

      if (matchedTicket) {
        debugLog('✅ Ticket verification successful:', matchedTicket);
        
        // Create comprehensive ticket data with transport mode and all fields
        const comprehensiveTicketData = {
          id: matchedTicket.id,
          pnr_number: matchedTicket.pnr,
          passenger_name: matchedTicket.name,
          transport_mode: transportMode,
          departure_date: ticketData.departureDate,
          departure_time: ticketData.departureTime,
          from_location: ticketData.fromLocation,
          to_location: ticketData.toLocation,
          seat_number: ticketData.seatNumber,
          ticket_price: ticketData.ticketPrice,
          selling_price: ticketData.sellingPrice,
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          
          // Transport-specific fields
          ...(transportMode === 'train' && {
            train_number: ticketData.trainNumber,
            railway_operator: ticketData.railwayOperator,
            platform_number: ticketData.platformNumber,
            coach_class: ticketData.coachClass,
            berth_type: ticketData.berthType,
            railway_zone: ticketData.railwayZone,
            is_tatkal: ticketData.isTatkal
          }),
          ...(transportMode === 'plane' && {
            flight_number: ticketData.flightNumber,
            airline_operator: ticketData.airlineOperator,
            cabin_class: ticketData.cabinClass,
            airport_terminal: ticketData.airportTerminal,
            baggage_allowance: ticketData.baggageAllowance
          }),
          ...(transportMode === 'bus' && {
            bus_operator: ticketData.busOperator
          })
        };

        return {
          verified: true,
          ticketData: comprehensiveTicketData,
          verificationMethod: 'api_validation',
          verifiedAt: new Date().toISOString(),
          message: `${transportMode.charAt(0).toUpperCase() + transportMode.slice(1)} ticket verified successfully!`
        };
      }

      debugLog('❌ No matching ticket found');
      debugLog('Available tickets for comparison:', tickets.map(t => ({ pnr: t.pnr, name: t.name })));
      return {
        verified: false,
        ticketData: null,
        message: `Ticket not found. Please check your PNR number and passenger name.`
      };
    } catch (error) {
      debugError('❌ Error verifying ticket:', error);
      return {
        verified: false,
        ticketData: null,
        message: 'API verification failed: ' + error.message
      };
    }
  }

  /**
   * Get ticket details by PNR
   * @param {string} pnrNumber
   * @returns {Object|null}
   */
  static async getTicketByPNR(pnrNumber) {
    try {
      const tickets = await this.fetchAllTickets();
      return tickets.find(ticket => 
        ticket.pnr?.toLowerCase().trim() === pnrNumber.toLowerCase().trim()
      );
    } catch (error) {
      debugError('Error fetching ticket by PNR:', error);
      return null;
    }
  }
  
  /**
   * Test API connectivity and response structure
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  static async testConnectivity() {
    try {
      debugLog('Testing API connectivity...');
      const tickets = await this.fetchAllTickets();
      
      return {
        success: true,
        data: tickets,
        message: `Successfully connected to API. Found ${tickets.length} tickets.`,
        endpoint: `${API_BASE_URL}/tickets`
      };
    } catch (error) {
      debugError('Connectivity test failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to connect to API',
        endpoint: `${API_BASE_URL}/tickets`
      };
    }
  }
}