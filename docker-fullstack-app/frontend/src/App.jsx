import { useState, useEffect } from "react";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadMessages() {
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      setMessages(await res.json());
      setError("");
    } catch (err) {
      setError("Could not reach the API. Is the backend running?");
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message }),
      });
      if (!res.ok) throw new Error("Request failed");
      setName("");
      setMessage("");
      loadMessages();
    } catch {
      setError("Could not send your message.");
    }
  }

  return (
    <div className="container">
      <h1>🐳 Full-Stack in Docker</h1>
      <p>Frontend → Backend → PostgreSQL — all in containers.</p>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Your message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>

      {error && <p className="error">{error}</p>}

      <h2>Messages</h2>
      {messages.length === 0 && <p>No messages yet — send the first one!</p>}
      <ul>
        {messages.map((m) => (
          <li key={m.id}>
            <strong>{m.name}:</strong> {m.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
