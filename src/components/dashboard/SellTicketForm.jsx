import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EmailVerificationGuard from "./EmailVerificationGuard";
import { TicketVerificationForm } from "./TicketVerificationForm";

export const SellTicketForm = ({ user, onTicketAdded }) => {
  const handleVerificationComplete = (ticket) => {
    if (onTicketAdded) {
      onTicketAdded(ticket);
    }
  };

  return (
    <EmailVerificationGuard requiredFor="sell tickets">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2 text-2xl">
            <span>Sell Your Ticket</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TicketVerificationForm onVerificationComplete={handleVerificationComplete} />
        </CardContent>
      </Card>
    </EmailVerificationGuard>
  );
};