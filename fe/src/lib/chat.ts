export function getRoomName(a: string, b: string) {
  return `chat_${[a, b].sort().join('_')}`;
}

export function getConversationPartnerFromRoom(room: string, me: string) {
  // reverse room name to get partner
  const parts = room.replace(/^chat_/, '').split('_');
  if (parts.length < 2) return room;
  if (parts[0] === me) return parts[1];
  if (parts[1] === me) return parts[0];
  return parts[1];
}

