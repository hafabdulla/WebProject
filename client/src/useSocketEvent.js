import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { getSocket } from "./socket";

// Runs handler(data) every time the server sends this event to the logged in user.
// Example: useSocketEvent("message", (message) => { ... });
export default function useSocketEvent(event, handler) {
  const token = useSelector((state) => state.auth.token);

  // keep the newest handler in a ref, so the listener always calls the
  // latest version without having to be removed and added on every render
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket(token);
    if (!socket) {
      return;
    }
    function listener(data) {
      handlerRef.current(data);
    }
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [event, token]);
}
