import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Video, VideoOff, Mic, MicOff, Phone, CheckCircle, XCircle, Eye, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { joinSignalingChannel, sendSignal, leaveSignalingChannel } from '@/utils/webrtcSignaling';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const VideoKYCSystem = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, connected
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const { toast } = useToast();
  const [peerConnection, setPeerConnection] = useState(null);
  const [callId, setCallId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [disconnected, setDisconnected] = useState(false);
  const [adminJoined, setAdminJoined] = useState(false);
  const [authError, setAuthError] = useState('');
  const [incomingCall, setIncomingCall] = useState(null);
  const [showPickCallDialog, setShowPickCallDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Get current user ID on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data?.user?.id || null);
    })();
  }, []);

  // Real-time subscription for incoming calls (user side)
  useEffect(() => {
    if (!activeCall && currentUserId) {
      const channel = supabase
        .channel('video_calls_realtime_user_' + currentUserId)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'video_calls',
          filter: `user_id=eq.${currentUserId}`
        }, payload => {
          if (
            payload.new.status === 'waiting_user' ||
            payload.new.status === 'waiting_admin'
          ) {
            setIncomingCall(payload.new);
            setShowPickCallDialog(true);
          }
          if (payload.new.status === 'completed') {
            endVideoCall();
          }
        })
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [currentUserId, activeCall]);

  useEffect(() => {
    fetchPendingKYC();
  }, []);

  const fetchPendingKYC = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('kyc_status', 'pending')
        .not('kyc_documents', 'is', null);

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error) {
      console.error('Error fetching pending KYC:', error);
    }
  };

  // Helper to create a new WebRTC peer connection
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    });
    pc.onicecandidate = (event) => {
      if (event.candidate && callId) {
        sendSignal(callId, { type: 'ice-candidate', candidate: event.candidate });
      }
    };
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    return pc;
  };

  // Start video call (user side)
  const startVideoCall = async (user) => {
    try {
      setCallStatus('calling');
      setActiveCall(user);
      // 1. Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      // 2. Create video_calls record
      const { data, error } = await supabase
        .from('video_calls')
        .insert({ user_id: user.id, status: 'waiting_admin', call_type: 'kyc_verification' })
        .select()
        .single();
      if (error) throw error;
      setCallId(data.id);
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user || currentUser.data.user.id !== user.id) {
        setAuthError('You are not authorized to join this call.');
        setCallStatus('idle');
        setActiveCall(null);
        return;
      }
      // 3. Set up signaling
      const pc = createPeerConnection();
      setPeerConnection(pc);
      // Add local tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      // 4. Join signaling channel
      joinSignalingChannel(data.id, async (msg) => {
        if (msg.type === 'offer') {
          setStatusMessage('Admin is connecting...');
          await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal(data.id, { type: 'answer', answer });
          setCallStatus('in_call');
          setStatusMessage('In Call');
        } else if (msg.type === 'ice-candidate' && msg.candidate) {
          try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
        } else if (msg.type === 'admin-joined') {
          setStatusMessage('Admin joined. Connecting...');
          setAdminJoined(true);
          toast({ title: 'Admin Joined', description: 'The admin has joined the call.' });
        }
      });
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          setDisconnected(true);
          setStatusMessage('Admin disconnected. Call ended.');
          setCallStatus('ended');
          toast({ title: 'Call Ended', description: 'The admin has left the call.' });
        }
      };
      setCallStatus('waiting');
      toast({ title: 'Waiting for admin...', description: 'Please keep this window open.' });
    } catch (error) {
      setCallStatus('idle');
      setActiveCall(null);
      toast({ title: 'Error', description: 'Failed to start video call', variant: 'destructive' });
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    await supabase
      .from('video_calls')
      .update({ status: 'in_call' })
      .eq('id', incomingCall.id);
    setShowPickCallDialog(false);
    // Start WebRTC connection here (reuse startVideoCall logic)
    startVideoCall({ id: incomingCall.user_id });
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;
    await supabase
      .from('video_calls')
      .update({ status: 'rejected' })
      .eq('id', incomingCall.id);
    setShowPickCallDialog(false);
    setIncomingCall(null);
  };

  // Clean up on end
  const endVideoCall = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    leaveSignalingChannel();
    setActiveCall(null);
    setCallStatus('idle');
    setShowPickCallDialog(false);
    setIncomingCall(null);
    setCallId(null);
    setVerificationNotes('');
    setDisconnected(false);
    setStatusMessage('');
    setAdminJoined(false);
    setAuthError('');
  };

  const approveKYC = async () => {
    if (!activeCall) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'approved',
          kyc_verified_at: new Date().toISOString(),
          kyc_notes: verificationNotes
        })
        .eq('id', activeCall.id);

      if (error) throw error;

      // Send approval email
      await supabase.functions.invoke('send-email', {
        body: {
          to: activeCall.email,
          template: 'kyc_approved',
          templateData: {
            name: activeCall.full_name,
            dashboardUrl: `${window.location.origin}/dashboard`
          }
        }
      });

      toast({
        title: "KYC Approved",
        description: `${activeCall.full_name}'s KYC has been approved`,
      });

      endVideoCall();
      fetchPendingKYC();
    } catch (error) {
      console.error('Error approving KYC:', error);
      toast({
        title: "Error",
        description: "Failed to approve KYC",
        variant: "destructive"
      });
    }
  };

  const rejectKYC = async () => {
    if (!activeCall) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'rejected',
          kyc_notes: verificationNotes
        })
        .eq('id', activeCall.id);

      if (error) throw error;

      // Send rejection email
      await supabase.functions.invoke('send-email', {
        body: {
          to: activeCall.email,
          template: 'kyc_rejected',
          templateData: {
            name: activeCall.full_name,
            reason: verificationNotes,
            dashboardUrl: `${window.location.origin}/dashboard`
          }
        }
      });

      toast({
        title: "KYC Rejected",
        description: `${activeCall.full_name}'s KYC has been rejected`,
        variant: "destructive"
      });

      endVideoCall();
      fetchPendingKYC();
    } catch (error) {
      console.error('Error rejecting KYC:', error);
      toast({
        title: "Error",
        description: "Failed to reject KYC",
        variant: "destructive"
      });
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      }
    }
  };

  const viewDocument = (user) => {
    if (user.kyc_documents) {
      window.open(user.kyc_documents, '_blank');
    }
  };

  // Only show KYC complete if call was actually connected
  const showKYCComplete = callStatus === 'in_call' && !activeCall;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video KYC Verification System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {pendingUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending KYC verifications
                </div>
              ) : (
                pendingUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{user.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">Pending Verification</Badge>
                        <span className="text-sm text-muted-foreground">
                          Submitted: {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewDocument(user)}
                        disabled={!user.kyc_documents}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Docs
                      </Button>
                      <Button
                        onClick={() => startVideoCall(user)}
                        disabled={callStatus !== 'idle'}
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Start Call
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Banner */}
        {statusMessage && (
          <div role="status" aria-live="polite" className={`mb-4 p-2 rounded text-center font-medium ${disconnected ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'} focus:outline-none focus:ring-2 focus:ring-blue-500`}>{statusMessage}</div>
        )}
        {adminJoined && callStatus !== 'ended' && (
          <div className="mb-2 p-2 rounded bg-green-100 text-green-800 text-center font-medium" role="alert">
            Admin has joined the call. Please show your document for verification.
          </div>
        )}
        {authError && (
          <div className="mb-2 p-2 rounded bg-red-100 text-red-800 text-center font-medium" role="alert">
            {authError}
          </div>
        )}
        {showKYCComplete && (
          <div className="mb-2 p-2 rounded bg-green-100 text-green-800 text-center font-medium" role="alert">
            Video Verification Complete! Your video verification has been completed. Admin is reviewing your KYC submission.
          </div>
        )}
        {/* Video Call Dialog */}
        <Dialog open={activeCall !== null} onOpenChange={() => endVideoCall()}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Video KYC Verification - {activeCall?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Video Streams */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    className="w-full h-64 bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Your video preview"
                  />
                  <Badge className="absolute top-2 left-2">You</Badge>
                </div>
                <div className="relative">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    className="w-full h-64 bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Admin video preview"
                  />
                  <Badge className="absolute top-2 left-2">Admin</Badge>
                </div>
              </div>
              {/* Call Controls */}
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={`rounded-full h-12 w-12 flex items-center justify-center ${audioEnabled ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                      tabIndex={0}
                      onClick={toggleAudio}
                    >
                      {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={`rounded-full h-12 w-12 flex items-center justify-center ${videoEnabled ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      aria-label={videoEnabled ? 'Turn off video' : 'Turn on video'}
                      tabIndex={0}
                      onClick={toggleVideo}
                    >
                      {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{videoEnabled ? 'Turn Off Video' : 'Turn On Video'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="rounded-full h-12 w-12 flex items-center justify-center bg-red-100 text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      aria-label="End call"
                      tabIndex={0}
                      onClick={endVideoCall}
                    >
                      <Phone className="h-5 w-5 rotate-45" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>End Call</TooltipContent>
                </Tooltip>
              </div>
              {/* Verification Notes */}
              <div>
                <label className="text-sm font-medium">Verification Notes</label>
                <Textarea
                  placeholder="Add notes about the verification process..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Verification Actions */}
              <div className="flex gap-4">
                <Button
                  onClick={approveKYC}
                  className="flex-1"
                  disabled={!verificationNotes.trim()}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve KYC
                </Button>
                <Button
                  onClick={rejectKYC}
                  variant="destructive"
                  className="flex-1"
                  disabled={!verificationNotes.trim()}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject KYC
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {showPickCallDialog && (
          <Dialog open={showPickCallDialog} onOpenChange={setShowPickCallDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Incoming Video Call</DialogTitle>
              </DialogHeader>
              <div className="mb-4">You have an incoming video KYC call. Would you like to pick the call?</div>
              <div className="flex gap-4 mt-4">
                <Button onClick={handleAcceptCall}>Pick Call</Button>
                <Button variant="outline" onClick={handleRejectCall}>Reject</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  );
};

export default VideoKYCSystem;