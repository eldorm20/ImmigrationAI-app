# Quick Start: Using WebSocket & Real-Time Features

## For Developers

### Using the WebSocket Hook in React Components

```typescript
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/lib/auth";

export function MyComponent({ recipientId }: { recipientId: string }) {
  const { user } = useAuth();
  const { 
    isConnected, 
    messages, 
    onlineUsers,
    typingUsers,
    sendMessage,
    markMessageRead,
    emitTyping,
    emitStopTyping
  } = useWebSocket();

  const handleSendMessage = async (content: string) => {
    await sendMessage(recipientId, content);
  };

  return (
    <div>
      <div>Status: {isConnected ? "Connected" : "Disconnected"}</div>
      <div>{recipientId} is online: {onlineUsers.includes(recipientId)}</div>
      {typingUsers.includes(recipientId) && <div>Typing...</div>}
      {/* Your UI here */}
    </div>
  );
}
```

### Using the Real-Time Chat Component

```typescript
import { RealtimeChat } from "@/components/realtime-chat";

export function ConsultationView({ consultationId, lawyerId }: Props) {
  return (
    <div>
      <h2>Consultation Details</h2>
      {/* Other content */}
      <RealtimeChat recipientId={lawyerId} />
    </div>
  );
}
```

### Integrating Google Meet Links in Your Code

```typescript
import { generateGoogleMeetLink } from "@/server/lib/googleMeet";

// Generate a unique meeting link
const meetingLink = generateGoogleMeetLink(`consult-${lawyerId}-${userId}`);

// Send in email
const emailContent = `
  Please join the consultation at: ${meetingLink}
`;
```

## For Users

### Sending Messages

1. Open a consultation or lawyer profile
2. Click the chat icon to open Real-Time Chat
3. Type your message in the input box
4. Press Enter to send (or Shift+Enter for multiline)
5. Message appears immediately in real-time

### Joining a Video Consultation

1. When a consultation is scheduled, you receive an email with a Google Meet link
2. Click the link in the email to join
3. Or click "Join Meeting" button in your consultation panel
4. Video meeting starts in a new tab/window

### Knowing When Someone is Online

- Green dot next to lawyer/applicant name = Online now
- No indicator = Offline
- "Typing..." message = Person is typing

### Message Read Status

- Single checkmark (✓) = Your message was sent
- Double checkmark (✓✓) = Recipient read your message

## For System Administrators

### Checking WebSocket Connection

```bash
# In browser console
// Check if socket is connected
const { isConnected } = useWebSocket();
console.log(isConnected); // true/false

// Check online users
const { onlineUsers } = useWebSocket();
console.log(onlineUsers); // ["user1", "user2", ...]
```

### Monitoring WebSocket Server

- WebSocket logs in server: `server/lib/websocket.ts`
- Check `logger.info()` and `logger.error()` calls
- Connection status tracked in memory (Map structure)

### Database

- Messages stored in `messages` table
- Consultation meeting links in `consultations.meetingLink`
- Check `readAt` timestamp to verify read receipts

## Troubleshooting

### Message Not Sending

1. Check internet connection
2. Verify you're authenticated (check localStorage token)
3. Check browser console for errors
4. Verify recipient is online
5. Try refreshing the page

### Meeting Link Not Working

1. Copy link from email again
2. Try different browser
3. Check internet connection
4. Verify Google Meet isn't blocked in your organization
5. Try Jitsi Meet alternative (backup provider)

### Disconnected Status

1. Check internet connection
2. Refresh the page
3. Check browser console for errors
4. Wait 30+ seconds for automatic reconnection
5. Try a different browser

### Not Seeing Online Status

1. Refresh page (online users list updates immediately)
2. Check if person is actually online in another tab/device
3. Check your connection status (must be Connected)

## Configuration

### Environment Variables

In your `.env` file:

```
# For email links in meeting invitations
APP_URL=https://immigrationai.com

# Socket.io will use same origin as client
# No additional config needed
```

### Socket.io Settings

In `server/lib/websocket.ts`:

```typescript
// Customize these settings:
const io = new Server(httpServer, {
  cors: {
    origin: process.env.APP_URL || "https://immigrationai.com",
    methods: ["GET", "POST"]
  }
});
```

### Reconnection Settings

In `client/src/hooks/use-websocket.ts`:

```typescript
// Default settings (can customize):
const [reconnectAttempts, setReconnectAttempts] = useState(0);
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_INTERVAL = 1000; // ms

// Exponential backoff calculation:
const backoffInterval = Math.min(
  RECONNECT_INTERVAL * Math.pow(2, reconnectAttempts),
  32000 // max 32 seconds
);
```

## Performance Tips

1. **Reduce Message Frequency**
   - Don't send rapid messages in succession
   - Group multiple updates into one message

2. **Optimize React Re-renders**
   - Use useCallback for event handlers
   - Memoize components receiving frequent updates

3. **Monitor Network**
   - Check WebSocket tab in browser DevTools
   - Look for "ping/pong" frames (keep-alive)
   - Verify message frame sizes are reasonable

4. **Browser Console**
   - No warnings or errors should appear
   - Check Network tab for WebSocket connection

## Security Reminders

1. Never share your auth token
2. All messages encrypted in transit (HTTPS/WSS)
3. Messages encrypted in database (use HTTPS)
4. Only you and recipient can see your messages
5. Report suspicious activity to support

## FAQ

**Q: Will I lose messages if I close the tab?**
A: No, messages are stored in database. They'll be loaded when you reconnect.

**Q: Can I have multiple conversations at once?**
A: Not yet. One conversation per chat component. Future enhancement.

**Q: Is there a message history limit?**
A: No limit implemented. All messages are stored.

**Q: Can lawyers see other consultations' messages?**
A: No. Messages are only visible to sender and recipient.

**Q: What if someone uses multiple devices?**
A: Each device has independent online status. Messages sync across all devices.

**Q: Can I delete sent messages?**
A: Not yet. Messages are permanent. Future enhancement.

**Q: Does typing indicator show exact words typed?**
A: No, just shows that someone is typing. Not real-time text.

**Q: What if internet connection drops during consultation?**
A: You'll be disconnected but WebSocket will auto-reconnect when connection returns.

**Q: Can I use the chat on mobile?**
A: Yes, fully responsive and optimized for mobile browsers.

**Q: Is there spam prevention?**
A: Rate limiting can be added. Contact admin if issues.

## Support

For technical issues or questions:
1. Check `WEBSOCKET_IMPLEMENTATION.md` for detailed docs
2. Check browser console for error messages
3. Check `SERVER_LOGS` for server-side errors
4. Contact development team with error details

---

**Last Updated:** December 7, 2025  
**Version:** 2.0 - WebSocket Enhancement
