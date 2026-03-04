  "use client";

  import { useEffect, useRef, useState } from "react";
  import { io, Socket } from "socket.io-client";
  import Sidebar from "./components/sidebar/Sidebar";
  import ChatSidebar from "./components/sidebar/ChatSidebar";
  import ChatHistory from "./components/chat/ChatHistory";
  import type { Message as PageMessage } from "./page";

  import ChatInput from "./components/chat/ChatInput";

  // ================== TIPOS ==================

  type Chat = {
    id: number;
    name: string;
  };

  export type Message = {
    id: number;
    content: string;
    url?: string;
    type: "text" | "image" | "file";
    sender_id: number;
    sender_name: string;
    created_at: string;
  };

  // ================== SOCKET SINGLETON ==================

  let socket: Socket | null = null;

  function getSocket() {
    if (!socket) {
      socket = io("http://localhost:3000", {
        path: "/api/socket",
        transports: ["websocket"], // 🔥 SIN POLLING
      });
    }
    return socket;
  }

  // ================== PAGE ==================

  export default function ChatsPage() {
    const [userId, setUserId] = useState(0);
    const [authStatus, setAuthStatus] = useState<
      "loading" | "authorized" | "unauthorized"
    >("loading");

    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const socketRef = useRef<Socket | null>(null);

    // ================== AUTH ==================

    useEffect(() => {
      const verify = async () => {
        const res = await fetch("/api/auth/verify");
        const data = await res.json();

        if (!data.ok || !data.user) {
          setAuthStatus("unauthorized");
          return;
        }

        setUserId(data.user.id);
        setAuthStatus("authorized");
      };

      verify();
    }, []);

    // ================== CONECTAR SOCKET ==================

    useEffect(() => {
      if (authStatus !== "authorized" || !userId) return;

      const s = getSocket();
      socketRef.current = s;

      // Registrar usuario en socket
      s.emit("register", { userId });

      // Recibir mensajes en tiempo real
      s.on("newMessage", (msg: Message) => {
        setMessages((prev) => [...prev, msg]);
      });

      return () => {
        s.off("newMessage");
      };
    }, [authStatus, userId]);

    // ================== CARGAR MENSAJES SOLO 1 VEZ ==================

    useEffect(() => {
      if (!activeChat) return;

      const load = async () => {
        const res = await fetch(`/api/messages/${activeChat.id}`);
        const data = await res.json();
        setMessages(data);

        // Unirse al room del chat
        socketRef.current?.emit("joinChat", { chatId: activeChat.id });
      };

      load();

      return () => {
        if (activeChat) {
          socketRef.current?.emit("leaveChat", { chatId: activeChat.id });
        }
      };
    }, [activeChat]);

    // ================== ENVIAR TEXTO ==================

    const sendText = async (content: string) => {
      if (!activeChat || !content.trim()) return;

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: activeChat.id,
          senderId: userId,
          content,
        }),
      });

      const msg = await res.json();

      // Emitir por socket
      socketRef.current?.emit("sendMessage", msg);

      // Mostrar localmente
      setMessages((prev) => [...prev, msg]);
    };

    // ================== ENVIAR IMAGEN ==================

    const sendImage = async (file: File) => {
      if (!activeChat) return;

      const formData = new FormData();
      formData.append("chatId", String(activeChat.id));
      formData.append("senderId", String(userId));
      formData.append("image", file);

      const res = await fetch("/api/messages/image", {
        method: "POST",
        body: formData,
      });

      const msg = await res.json();

      socketRef.current?.emit("sendMessage", msg);
      setMessages((prev) => [...prev, msg]);
    };

    // ================== ENVIAR ARCHIVO ==================

    const sendFile = async (file: File) => {
      if (!activeChat) return;

      const formData = new FormData();
      formData.append("chatId", String(activeChat.id));
      formData.append("senderId", String(userId));
      formData.append("file", file);

      const res = await fetch("/api/messages/file", {
        method: "POST",
        body: formData,
      });

      const msg = await res.json();

      socketRef.current?.emit("sendMessage", msg);
      setMessages((prev) => [...prev, msg]);
    };

    // ================== UI ==================

    if (authStatus === "loading") {
      return (
        <div className="h-screen grid place-items-center bg-black text-white">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-4 shadow-2xl">
            Cargando…
          </div>
        </div>
      );
    }

    if (authStatus === "unauthorized") return null;

    return (
      <div
        className="h-screen overflow-hidden text-white"
        style={{
          backgroundImage: "url('/fondo-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Overlay para que se lea el texto */}
        <div className="h-full w-full bg-black/55">
          <div className="relative flex h-full">
            <Sidebar />

            <main className="flex-1 h-full overflow-hidden p-4 md:p-6">
              <div className="flex h-full gap-4">
                <aside className="w-80 shrink-0 h-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden">
                  <div className="h-full bg-black/25">
                    <ChatSidebar
                      userId={userId}
                      onSelectChat={(chat) => {
                        setActiveChat(chat);
                        setMessages([]);
                      }}
                    />
                  </div>
                </aside>

                <section className="flex-1 h-full flex flex-col rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden min-h-0">
                  {!activeChat ? (
                    <div className="flex flex-1 items-center justify-center text-white/45">
                      Selecciona un chat
                    </div>
                  ) : (
                    <>
                      <div className="shrink-0 h-14 flex items-center px-4 border-b border-white/10 bg-black/25">
                        <div className="font-semibold text-white/90">
                          {activeChat.name}
                        </div>
                      </div>

                      {/* ✅ BG de imagen solo en el área del chat */}
                      <div
                        className="flex-1 min-h-0 overflow-hidden"
                        style={{
                          backgroundImage: "url('/chat-bg.png')",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }}
                      >
                        <div className="h-full w-full bg-black/35">
                          <ChatHistory
                            messages={messages as any}
                            userId={userId}
                            chatId={activeChat.id}
                            setMessages={setMessages as any}
                          />

                        </div>
                      </div>

                      <div className="shrink-0 border-t border-white/10 bg-black/25">
                        <ChatInput
                          onSendText={sendText}
                          onSendImage={sendImage}
                          onSendFile={sendFile}
                        />
                      </div>
                    </>
                  )}
                </section>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
