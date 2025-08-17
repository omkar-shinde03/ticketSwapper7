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
  const [adminConnected, setAdminConnected] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [uploadStep, setUploadStep] = useState('verify');
  const [isInCall, setIsInCall] = useState(false);
  const [userCall, setUserCall] = useState(null);
  const [canRequest, setCanRequest] = useState(false);
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);

  // Get current user ID and check for existing call
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data?.user?.id || null);
      if (data?.user?.id) {
        // Check for existing call
        const { data: calls } = await supabase
          .from('video_calls')
          .select('*')
          .eq('user_id', data.user.id)
          .in('status', ['waiting_admin', 'admin_connected', 'in_call'])
          .order('created_at', { ascending: false })
          .limit(1);
        if (calls && calls.length > 0) {
          setUserCall(calls[0]);
          setCanRequest(false);
        } else {
          setCanRequest(true);
        }
      }
    })();
  }, []);

  // User requests a video call (no camera, no dialog)
  const handleRequestVideoKYC = async () => {
    if (!currentUserId) return;
    setCanRequest(false);
    const { error, data } = await supabase
      .from('video_calls')
      .insert({
        user_id: currentUserId,
        status: 'waiting_admin',
        call_type: 'kyc_verification'
      })
      .select('*')
      .single();
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setCanRequest(true);
    } else {
      setUserCall(data);
      setCanRequest(false);
    }
  };

  // Real-time subscription for user's latest call
  useEffect(() => {
    if (!currentUserId) return;
    let callChannel;
    let callIdRef = null;
    const fetchAndSubscribe = async () => {
      const { data: calls } = await supabase
        .from('video_calls')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (calls && calls.length > 0) {
        callIdRef = calls[0].id;
        setUserCall(calls[0]);
        setCanRequest(false);
        callChannel = supabase
          .channel('video_call_' + callIdRef)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'video_calls',
            filter: `id=eq.${callIdRef}`
          }, async (payload) => {
            setUserCall(payload.new);
            // When admin starts the call, show join prompt
            if (payload.new.status === 'admin_connected') {
              setShowJoinPrompt(true);
            }
            if (payload.new.status === 'completed' || payload.new.status === 'rejected') {
              setShowVideoDialog(false);
              setShowJoinPrompt(false);
              setCallStatus('idle');
              setCanRequest(true);
            }
          })
          .subscribe();
      } else {
        setCanRequest(true);
      }
    };
    fetchAndSubscribe();
    return () => {
      if (callChannel) supabase.removeChannel(callChannel);
    };
  }, [currentUserId]);

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
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' }
      ],
    });
    pc.onicecandidate = (event) => {
      if (event.candidate && callId) {
        console.log('[User] Sending ICE candidate:', event.candidate);
        sendSignal(callId, { type: 'ice-candidate', candidate: event.candidate });
      }
    };
    pc.ontrack = (event) => {
      console.log('[User] ontrack event:', event);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    pc.onconnectionstatechange = () => {
      console.log('[User] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
        setAdminConnected(true);
        toast({ title: 'Admin Connected', description: 'Please show your Aadhaar card to the camera for verification.' });
      }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        endVideoCall();
      }
    };
    return pc;
  };

  // Start video call (user side)
  const startVideoCall = async (user) => {
    setShowVideoDialog(true);
    setUploadStep('video-call');
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setIsInCall(true);
      setCallStatus('waiting');
      // Create a video call record in the database
      const { error } = await supabase
        .from('video_calls')
        .insert({
          user_id: user.id,
          status: 'waiting_admin',
          call_type: 'kyc_verification'
        });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({
        title: "Camera Access Required",
        description: "Please allow camera and microphone access for video verification.",
        variant: "destructive",
      });
      setShowVideoDialog(false);
      setUploadStep('verify');
    }
  };

  // Handler for accepting the call
  const handleAcceptCall = async () => {
    setShowJoinPrompt(false);
    setShowVideoDialog(true);
    setCallStatus('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      // Start WebRTC as answerer (existing logic)
      if (!peerConnection) {
        const pc = createPeerConnection();
        setPeerConnection(pc);
        // Add local stream
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
        }
        joinSignalingChannel(callId, async (msg) => {
          console.log('[User] Signaling message received:', msg);
          if (msg.type === 'offer') {
            console.log('[User] Received offer');
            await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal(callId, { type: 'answer', answer });
            console.log('[User] Sent answer');
          } else if (msg.type === 'ice-candidate' && msg.candidate) {
            console.log('[User] Received ICE candidate:', msg.candidate);
            try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
          }
        });
        pc.onconnectionstatechange = () => {
          console.log('[User] Connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            setCallStatus('connected');
            setAdminConnected(true);
            toast({ title: 'Admin Connected', description: 'Please show your Aadhaar card to the camera for verification.' });
          }
          if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
            endVideoCall();
          }
        };
        pc.ontrack = (event) => {
          console.log('[User] ontrack event:', event);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            console.log('[User] Remote stream set');
          }
        };
      }
      // Optionally update status to 'in_call'
      await supabase.from('video_calls').update({ status: 'in_call' }).eq('id', userCall.id);
    } catch (err) {
      toast({ title: 'Camera Error', description: err.message, variant: 'destructive' });
      setShowVideoDialog(false);
    }
  };

  // Handler for declining the call
  const handleDeclineCall = async () => {
    setShowJoinPrompt(false);
    await supabase.from('video_calls').update({ status: 'rejected' }).eq('id', userCall.id);
    toast({ title: 'Call declined', description: 'You declined the video KYC call.' });
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
    setAdminConnected(false);
    setShowVideoDialog(false);
    setUploadStep('verify');
    setIsInCall(false);
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
              {/* UI: Only show request button if canRequest is true */}
              {canRequest && (
                <Button onClick={handleRequestVideoKYC} className="mb-4">Request Video KYC</Button>
              )}
              {userCall && (
                <div className="mb-4 p-2 rounded bg-blue-50 text-blue-800 text-center">
                  {userCall.status === 'waiting_admin' && 'Waiting for admin to start the call...'}
                  {userCall.status === 'admin_connected' && 'Admin is ready. Please join the call.'}
                  {userCall.status === 'in_call' && 'In call with admin.'}
                  {userCall.status === 'completed' && 'Video KYC completed.'}
                  {userCall.status === 'rejected' && 'Video KYC request was rejected.'}
                </div>
              )}
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
        {adminConnected && callStatus === 'connected' && (
          <div className="mb-2 p-2 rounded bg-green-100 text-green-800 text-center font-medium" role="alert">
            Admin has connected. Please show your Aadhaar card to the camera for verification.
          </div>
        )}
        {/* Video Call Dialog only opens when admin starts the call */}
        <Dialog open={showVideoDialog} onOpenChange={() => endVideoCall()}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Video KYC Verification</DialogTitle>
            </DialogHeader>
            {/* Video call UI here, only shown when admin starts the call */}
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
        {/* Add join prompt dialog */}
        <Dialog open={showJoinPrompt} onOpenChange={setShowJoinPrompt}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Incoming Video KYC Call</DialogTitle>
            </DialogHeader>
            <div className="mb-4">Admin is calling you for Video KYC. Would you like to join?</div>
            <div className="flex gap-4 mt-4">
              <Button onClick={handleAcceptCall}>Accept</Button>
              <Button variant="outline" onClick={handleDeclineCall}>Decline</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default VideoKYCSystem;