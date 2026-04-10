import { useEffect } from 'react';
import { MessagesView } from '../ngo/MessagesView';
import { Message } from '../../App';
import { getSocket } from '../../lib/socket';

interface HotelMessagesViewProps {
  messages: Message[];
  addMessage: (message: Message) => void;
}

export function HotelMessagesView({ messages, addMessage }: HotelMessagesViewProps) {
  // Ensure the socket is initialized for hotel pages so incoming events are received
  useEffect(() => {
    try { getSocket(); } catch (e) { console.warn('Failed initializing socket in HotelMessagesView', e); }
  }, []);

  useEffect(() => {
    try { getSocket(); } catch (e) {}
  }, [messages]);

  return <MessagesView messages={messages} addMessage={addMessage} viewerType="hotel" />;
}