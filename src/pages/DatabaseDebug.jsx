import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DatabaseHealthChecker } from '@/components/debug/DatabaseHealthChecker';
import { DatabaseMigrationHelper } from '@/components/debug/DatabaseMigrationHelper';
import { PNRDebugPanel } from '@/components/debug/PNRDebugPanel';
import { DeploymentChecklist } from '@/components/debug/DeploymentChecklist';

const DatabaseDebug = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Database Debug Center
            </h1>
            <p className="text-muted-foreground">
              Comprehensive tools for analyzing and fixing Supabase database issues
            </p>
          </div>
        </div>

        <Tabs defaultValue="health" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="health">Health Check</TabsTrigger>
            <TabsTrigger value="migrations">Migrations</TabsTrigger>
            <TabsTrigger value="api-debug">API Debug</TabsTrigger>
            <TabsTrigger value="deployment">Deployment</TabsTrigger>
          </TabsList>

          <TabsContent value="health">
            <DatabaseHealthChecker />
          </TabsContent>

          <TabsContent value="migrations">
            <DatabaseMigrationHelper />
          </TabsContent>

          <TabsContent value="api-debug">
            <PNRDebugPanel />
          </TabsContent>

          <TabsContent value="deployment">
            <DeploymentChecklist />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DatabaseDebug;