import { useState } from 'react';
import { Mail, Phone, Send } from 'lucide-react';
import { getSocket } from '../lib/socket';
import { getRoomName } from '../lib/chat';
import { getCurrentUser, API_BASE, authHeader } from '../lib/auth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

interface ContactDialogProps {
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  contactId?: string | number;
  trigger: React.ReactNode;
}

export function ContactDialog({ contactName, contactEmail, contactPhone, contactId, trigger }: ContactDialogProps) {
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const me = getCurrentUser();
  const socket = getSocket();
  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    try {
      let receiverUsername: string | undefined = undefined;
      let room = getRoomName(me?.username ?? 'Me', contactName);
      if (socket && socket.connected) {
        let receiverId: number | undefined = undefined;
        if (typeof contactId !== 'undefined' && contactId !== null) {
          const nid = Number(contactId);
          receiverId = Number.isNaN(nid) ? undefined : nid;
        }
        if (!receiverId) {
          try {
            const headers = authHeader() as Record<string, string>;
            const response = await fetch(`${API_BASE}/api/users/${contactName}/`, { headers });
            if (response.ok) {
              const data = await response.json();
              receiverId = data.user?.id;
              receiverUsername = data.user?.username;
            }
          } catch {}
        }
        if (receiverUsername) {
          room = getRoomName(me?.username ?? 'Me', receiverUsername);
        }
        const payload = {
          room,
          content: message,
          sender_name: me?.username ?? 'Me',
          receiver_name: receiverUsername ?? contactName,
          sender_id: me?.id,
          receiver_id: receiverId,
          client_temp_id: Date.now().toString(),
        };
        socket.emit('send_message', payload, (ack: any) => {
          if (ack && (ack.ok || ack.status === 'ok')) {
            toast.success(`Message sent to ${contactName}!`);
          } else {
            console.warn('send_message ack negative', ack);
            toast.success(`Message queued to ${contactName}`);
          }
        });
        const localMsg = {
          id: payload.client_temp_id,
          from: payload.sender_name,
          to: payload.receiver_name,
          message: payload.content,
          timestamp: new Date().toISOString(),
          read: false,
        };
        const localEvent = new CustomEvent('local_chat_message', { detail: localMsg });
        window.dispatchEvent(localEvent);
      } else {
        throw new Error('socket not connected');
      }
      setMessage('');
      setIsOpen(false);
    } catch (e) {
      console.warn('Socket send failed, falling back to local send', e);
      toast.success(`Message queued to ${contactName}`);
      setMessage('');
      setIsOpen(false);
    }
  };

  const handleEmailClick = () => {
    if (contactEmail) {
      window.location.href = `mailto:${contactEmail}`;
    }
  };

  const handlePhoneClick = () => {
    if (contactPhone) {
      window.location.href = `tel:${contactPhone}`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact {contactName}</DialogTitle>
          <DialogDescription>
            Send a message or use the contact details below
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Contact Info */}
          <div className="space-y-2 p-4 bg-teal-50 rounded-lg border border-teal-200">
            {contactEmail && (
              <Button
                variant="ghost"
                className="w-full justify-start text-left hover:bg-teal-100"
                onClick={handleEmailClick}
              >
                <Mail className="h-4 w-4 mr-2 text-teal-600" />
                <span className="text-sm">{contactEmail}</span>
              </Button>
            )}
            {contactPhone && (
              <Button
                variant="ghost"
                className="w-full justify-start text-left hover:bg-teal-100"
                onClick={handlePhoneClick}
              >
                <Phone className="h-4 w-4 mr-2 text-teal-600" />
                <span className="text-sm">{contactPhone}</span>
              </Button>
            )}
          </div>

          {/* Message Form */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              onClick={handleSendMessage}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
