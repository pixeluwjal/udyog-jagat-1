'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';

export default function SocketInitializer() {
  useEffect(() => {
    // This component helps initialize the socket connection
    console.log('🔌 Socket initializer mounted');
  }, []);

  return null;
}