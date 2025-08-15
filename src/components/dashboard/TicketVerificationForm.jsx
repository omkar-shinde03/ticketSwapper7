import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, CheckCircle, XCircle, Train, Bus, Plane, Calendar, Clock, MapPin, User, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TicketApiClient } from '@/utils/ticketApiClient';

export const TicketVerificationForm = ({ transportMode = 'bus', onVerificationComplete }) => {
  const [selectedTicketType, setSelectedTicketType] = useState(transportMode);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [formData, setFormData] = useState({
    pnrNumber: '',
    passengerName: '',
    busOperator: '',
    sellingPrice: '',
    trainNumber: '',
    coachClass: '',
    flightNumber: '',
    cabinClass: '',
  });
  
  const { toast } = useToast();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (verificationResult) {
      setVerificationResult(null);
    }
  };

  const getRequiredFields = () => {
    const commonFields = ['pnrNumber', 'passengerName', 'departureDate', 'departureTime', 'fromLocation', 'toLocation', 'seatNumber', 'ticketPrice'];
    
    if (selectedTicketType === 'train') {
      return [...commonFields, 'trainNumber', 'railwayOperator'];
    } else if (selectedTicketType === 'plane') {
      return [...commonFields, 'flightNumber', 'airlineOperator'];
    }
    return [...commonFields, 'busOperator'];
  };

  const isFormValid = () => {
    const requiredFields = getRequiredFields();
    return requiredFields.every(field => formData[field] && formData[field].trim());
  };

  const handleVerifyTicket = async () => {
    if (!isFormValid()) {
      toast({
        title: 'Missing Information',
        description: `Please fill in all required fields for ${selectedTicketType} ticket verification`,
        variant: 'destructive'
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      let verificationData = {
        ticket_type: selectedTicketType,
        pnrNumber: formData.pnrNumber,
        passengerName: formData.passengerName,
        transportMode: selectedTicketType,
        departureDate: formData.departureDate,
        departureTime: formData.departureTime,
        fromLocation: formData.fromLocation,
        toLocation: formData.toLocation,
        seatNumber: formData.seatNumber,
        ticketPrice: parseFloat(formData.ticketPrice),
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : parseFloat(formData.ticketPrice)
      };

      // Add transport-specific data
      if (selectedTicketType === 'train') {
        verificationData = {
          ...verificationData,
          trainNumber: formData.trainNumber,
          railwayOperator: formData.railwayOperator,
          platformNumber: formData.platformNumber,
          coachClass: formData.coachClass,
          berthType: formData.berthType,
          railwayZone: formData.railwayZone,
          isTatkal: formData.isTatkal
        };
      } else if (selectedTicketType === 'plane') {
        verificationData = {
          ...verificationData,
          flightNumber: formData.flightNumber,
          airlineOperator: formData.airlineOperator,
          cabinClass: formData.cabinClass,
          airportTerminal: formData.airportTerminal,
          baggageAllowance: formData.baggageAllowance
        };
      } else {
        verificationData = {
          ...verificationData,
          busOperator: formData.busOperator
        };
      }

      const result = await TicketApiClient.verifyTicket(verificationData);

      if (result.verified && result.ticketData) {
        const enhancedTicketData = {
          ...result.ticketData,
          ...verificationData,
          verification_status: 'verified',
          verified_at: new Date().toISOString()
        };

        setVerificationResult({
          verified: true,
          ticketData: enhancedTicketData,
          message: `${selectedTicketType.charAt(0).toUpperCase() + selectedTicketType.slice(1)} ticket verified successfully!`
        });

        toast({
          title: 'Verification Successful!',
          description: `Your ${selectedTicketType} ticket has been verified and is ready for listing.`,
          variant: 'default'
        });

        if (onVerificationComplete) {
          onVerificationComplete(enhancedTicketData);
        }
      } else {
        setVerificationResult({
          verified: false,
          message: result.message || `Failed to verify ${selectedTicketType} ticket. Please check your details and try again.`
        });

        toast({
          title: 'Verification Failed',
          description: result.message || `Unable to verify ${selectedTicketType} ticket. Please check your details.`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        verified: false,
        message: `Error during verification: ${error.message}`
      });

      toast({
        title: 'Verification Error',
        description: 'An error occurred during verification. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getTransportIcon = (mode) => {
    switch (mode) {
      case 'train':
        return <Train className="h-5 w-5 text-green-600" />;
      case 'plane':
        return <Plane className="h-5 w-5 text-purple-600" />;
      default:
        return <Bus className="h-5 w-5 text-blue-600" />;
    }
  };

  const getTransportColor = (mode) => {
    switch (mode) {
      case 'train':
        return 'green';
      case 'plane':
        return 'purple';
      default:
        return 'blue';
    }
  };

  // Update ticket type and reset form fields when changed
  const handleTicketTypeChange = (value) => {
    setSelectedTicketType(value);
    setFormData({
      pnrNumber: '',
      passengerName: '',
      busOperator: '',
      sellingPrice: '',
      trainNumber: '',
      coachClass: '',
      flightNumber: '',
      cabinClass: '',
    });
    setVerificationResult(null);
  };

  // Only show minimal fields for each ticket type, arranged horizontally, with no duplicate fields
  const renderFields = () => {
    switch (selectedTicketType) {
      case 'bus':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="pnrNumber">PNR Number *</Label>
              <Input id="pnrNumber" value={formData.pnrNumber} onChange={e => setFormData({ ...formData, pnrNumber: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passengerName">Passenger Name *</Label>
              <Input id="passengerName" value={formData.passengerName} onChange={e => setFormData({ ...formData, passengerName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="busOperator">Bus Operator *</Label>
              <Input id="busOperator" value={formData.busOperator} onChange={e => setFormData({ ...formData, busOperator: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price *</Label>
              <Input id="sellingPrice" type="number" value={formData.sellingPrice} onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })} required />
            </div>
          </div>
        );
      case 'train':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="pnrNumber">PNR Number *</Label>
              <Input id="pnrNumber" value={formData.pnrNumber} onChange={e => setFormData({ ...formData, pnrNumber: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passengerName">Passenger Name *</Label>
              <Input id="passengerName" value={formData.passengerName} onChange={e => setFormData({ ...formData, passengerName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainNumber">Train Number *</Label>
              <Input id="trainNumber" value={formData.trainNumber} onChange={e => setFormData({ ...formData, trainNumber: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coachClass">Coach Class *</Label>
              <Input id="coachClass" value={formData.coachClass} onChange={e => setFormData({ ...formData, coachClass: e.target.value })} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sellingPrice">Selling Price *</Label>
              <Input id="sellingPrice" type="number" value={formData.sellingPrice} onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })} required />
            </div>
          </div>
        );
      case 'plane':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="pnrNumber">PNR Number *</Label>
              <Input id="pnrNumber" value={formData.pnrNumber} onChange={e => setFormData({ ...formData, pnrNumber: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passengerName">Passenger Name *</Label>
              <Input id="passengerName" value={formData.passengerName} onChange={e => setFormData({ ...formData, passengerName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flightNumber">Flight Number *</Label>
              <Input id="flightNumber" value={formData.flightNumber} onChange={e => setFormData({ ...formData, flightNumber: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cabinClass">Cabin Class *</Label>
              <Input id="cabinClass" value={formData.cabinClass} onChange={e => setFormData({ ...formData, cabinClass: e.target.value })} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sellingPrice">Selling Price *</Label>
              <Input id="sellingPrice" type="number" value={formData.sellingPrice} onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })} required />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (verificationResult?.verified) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-green-900">Verification Successful!</CardTitle>
          <CardDescription>
            Your {selectedTicketType} ticket has been verified and is ready for listing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Verified Ticket Details</h4>
            <div className="space-y-2 text-sm text-green-800">
              <div className="flex justify-between">
                <span>PNR Number:</span>
                <span className="font-medium">{verificationResult.ticketData.pnrNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Passenger:</span>
                <span className="font-medium">{verificationResult.ticketData.passengerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Route:</span>
                <span className="font-medium">{verificationResult.ticketData.fromLocation} → {verificationResult.ticketData.toLocation}</span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span className="font-medium">{verificationResult.ticketData.departureDate} at {verificationResult.ticketData.departureTime}</span>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <Button 
              onClick={() => onVerificationComplete(verificationResult.ticketData)}
              size="lg"
              className="w-full"
            >
              Continue to Listing
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getTransportIcon(selectedTicketType)}
          <span>Verify {selectedTicketType.charAt(0).toUpperCase() + selectedTicketType.slice(1)} Ticket</span>
        </CardTitle>
        <CardDescription>
          Fill in your ticket details and we'll verify them through our secure API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ticket Type Dropdown */}
        <div className="space-y-2">
          <Label htmlFor="ticketType">Ticket Type *</Label>
          <Select value={selectedTicketType} onValueChange={handleTicketTypeChange} required>
            <SelectTrigger>
              <SelectValue placeholder="Select ticket type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bus">Bus</SelectItem>
              <SelectItem value="train">Train</SelectItem>
              <SelectItem value="plane">Plane</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Minimal Required Fields Only */}
        {renderFields()}
        {/* Verification Button */}
        <div className="pt-4">
          <Button 
            onClick={handleVerifyTicket}
            disabled={!isFormValid() || isVerifying}
            className={`w-full bg-${getTransportColor(selectedTicketType)}-600 hover:bg-${getTransportColor(selectedTicketType)}-700`}
            size="lg"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying Ticket...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Verify {selectedTicketType.charAt(0).toUpperCase() + selectedTicketType.slice(1)} Ticket
              </>
            )}
          </Button>
        </div>
        {/* Error Display */}
        {verificationResult && !verificationResult.verified && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-900">Verification Failed</span>
            </div>
            <p className="text-red-700 mt-2">{verificationResult.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};