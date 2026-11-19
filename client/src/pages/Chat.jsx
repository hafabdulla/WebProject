import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import useSocketEvent from "../useSocketEvent";

// Chat with friends. /chat shows the list of friends,
// /chat/:userId opens the conversation with one friend.
function Chat() {
  const { userId } = useParams();
  const me = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const [conversations, setConversations] = useState([]);
  const [listError, setListError] = useState("");

  const [friend, setFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [chatError, setChatError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef(null);
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  async function loadConversations() {
    try {
      const res = await fetch("/api/chat/conversations", { headers: headers });
      const data = await res.json();
      if (!res.ok) {
        setListError(data.message);
        return;
      }
      setConversations(data);
    } catch (err) {
      setListError("Could not reach the server");
    }
  }

  // tell the server I have seen this friend's messages
  async function markRead(friendId) {
    try {
      await fetch("/api/chat/" + friendId + "/read", { method: "POST", headers: headers });
    } catch (err) {
      // not important if this fails
    }
  }

  useEffect(() => {
    loadConversations();
  }, [token]);

  // open a conversation when the friend in the URL changes
  useEffect(() => {
    setFriend(null);
    setMessages([]);
    setChatError("");
    setText("");
    if (!userId) {
      return;
    }

    let cancelled = false;
    async function loadMessages() {
      try {
        const res = await fetch("/api/chat/" + userId + "/messages", { headers: headers });
        const data = await res.json();
        if (cancelled) {
          return;
        }
        if (!res.ok) {
          setChatError(data.message);
          return;
        }
        setFriend(data.user);
        setMessages(data.messages);
        setHasMore(data.hasMore);
        await markRead(userId);
        loadConversations();
      } catch (err) {
        if (!cancelled) {
          setChatError("Could not reach the server");
        }
      }
    }
    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [userId, token]);

  // scroll to the newest message whenever the list grows
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ block: "end" });
    }
  }, [messages.length]);

  // adds a message to the open chat, unless it is already there
  // (my own message comes back both from the POST and from the socket)
  function addMessage(message) {
    setMessages(function (old) {
      for (let i = 0; i < old.length; i++) {
        if (old[i]._id === message._id) {
          return old;
        }
      }
      return old.concat(message);
    });
  }

  // a new message arrived from the server
  useSocketEvent("message", (message) => {
    const inOpenChat =
      userId && (message.from === userId || (message.from === me.id && message.to === userId));
    if (inOpenChat) {
      addMessage(message);
      if (message.from === userId) {
        markRead(userId);
      }
    }
    loadConversations();
  });

  // the friend has read my messages: show "Seen"
  useSocketEvent("messages_read", (data) => {
    if (data.by === userId) {
      setMessages(function (old) {
        return old.map((m) => (m.from === me.id ? { ...m, read: true } : m));
      });
    }
  });

  async function loadOlder() {
    if (messages.length === 0) {
      return;
    }
    try {
      const before = encodeURIComponent(messages[0].createdAt);
      const res = await fetch("/api/chat/" + userId + "/messages?before=" + before, {
        headers: headers,
      });
      const data = await res.json();
      if (!res.ok) {
        setChatError(data.message);
        return;
      }
      setMessages(data.messages.concat(messages));
      setHasMore(data.hasMore);
    } catch (err) {
      setChatError("Could not reach the server");
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    if (!text.trim()) {
      return;
    }
    setSending(true);
    setChatError("");
    try {
      const res = await fetch("/api/chat/" + userId + "/messages", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ text: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChatError(data.message);
      } else {
        addMessage(data);
        setText("");
        loadConversations();
      }
    } catch (err) {
      setChatError("Could not reach the server");
    }
    setSending(false);
  }

  // the list of friends on the left
  const conversationItems = [];
  for (let i = 0; i < conversations.length; i++) {
    const c = conversations[i];
    let className = "conversation";
    if (c.user._id === userId) {
      className = "conversation active";
    }
    let preview = "No messages yet";
    if (c.lastMessage) {
      preview = (c.lastMessage.from === me.id ? "You: " : "") + c.lastMessage.text;
    }
    conversationItems.push(
      <Link to={"/chat/" + c.user._id} className={className} key={c.user._id}>
        <span className="conversation-name">
          {c.user.name}
          {c.unread > 0 && <span className="badge">{c.unread}</span>}
        </span>
        <span className="small conversation-preview">{preview}</span>
      </Link>
    );
  }

  // the messages of the open chat
  const messageItems = [];
  let lastMineIndex = -1;
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].from === me.id) {
      lastMineIndex = i;
    }
  }
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const mine = m.from === me.id;
    messageItems.push(
      <div className={mine ? "bubble-row mine" : "bubble-row"} key={m._id}>
        <div className="bubble">
          <p className="post-body">{m.text}</p>
          <span className="bubble-time">
            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        {i === lastMineIndex && m.read && <span className="small">Seen</span>}
      </div>
    );
  }

  let chatArea;
  if (!userId) {
    chatArea = <p className="small chat-empty">Pick a friend to start chatting.</p>;
  } else if (chatError && !friend) {
    chatArea = <p className="error chat-empty">{chatError}</p>;
  } else if (!friend) {
    chatArea = <p className="chat-empty">Loading...</p>;
  } else {
    chatArea = (
      <>
        <div className="chat-header">
          <Link to="/chat" className="chat-back">
            &larr; Back
          </Link>
          <Link to={"/users/" + friend._id}>
            <strong>{friend.name}</strong>
          </Link>
        </div>
        <div className="chat-messages">
          {hasMore && (
            <button className="small-button secondary-button load-older" onClick={loadOlder}>
              Load older messages
            </button>
          )}
          {messages.length === 0 && (
            <p className="small chat-empty">No messages yet. Say hello!</p>
          )}
          {messageItems}
          <div ref={bottomRef} />
        </div>
        {chatError && <p className="error">{chatError}</p>}
        <form className="chat-form" onSubmit={handleSend}>
          <input
            type="text"
            placeholder={"Message " + friend.name}
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" disabled={sending || !text.trim()}>
            Send
          </button>
        </form>
      </>
    );
  }

  return (
    <div className="page-wide">
      <h2>Chat</h2>
      <div className={userId ? "chat-layout chat-open" : "chat-layout"}>
        <div className="chat-list">
          {listError && <p className="error">{listError}</p>}
          {!listError && conversations.length === 0 && (
            <p className="small">
              You can chat with your friends. <Link to="/friends">Find friends</Link>
            </p>
          )}
          {conversationItems}
        </div>
        <div className="chat-box">{chatArea}</div>
      </div>
    </div>
  );
}

export default Chat;
