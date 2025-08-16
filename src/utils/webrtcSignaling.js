import { supabase } from '@/integrations/supabase/client';

let channel = null;

export function joinSignalingChannel(callId, onMessage) {
  if (channel) channel.unsubscribe();
  channel = supabase.channel(`video_call_${callId}`);
  channel.on('broadcast', { event: 'signal' }, (payload) => {
    if (onMessage) onMessage(payload.payload);
  });
  channel.subscribe();
}

export function sendSignal(callId, message) {
  if (!channel) return;
  channel.send({ type: 'broadcast', event: 'signal', payload: message });
}

export function leaveSignalingChannel() {
  if (channel) channel.unsubscribe();
  channel = null;
}
