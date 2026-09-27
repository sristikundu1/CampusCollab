import {
  ArrowLeft,
  LoaderCircle,
  MessageCircle,
  Paperclip,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../layouts/AppShell.jsx";
import { apiError, attachmentApi, messagingApi } from "../services/api.js";

const time = (value) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value))
    : "";

export function MessagesPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState("");
  const messagePaneRef = useRef(null);
  const preserveScrollRef = useRef(null);
  const lastMarkedReadRef = useRef(null);
  const selected = conversations.find((item) => item.id === conversationId);

  const loadConversations = useCallback(async () => {
    try {
      const response = await messagingApi.list();
      setConversations(response.data.data.conversations);
      setError("");
    } catch (reason) {
      setError(apiError(reason).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(
    async ({ quiet = false } = {}) => {
      if (!conversationId) return;
      if (!quiet) setMessagesLoading(true);
      try {
        const response = await messagingApi.messages(conversationId);
        const next = response.data.data.messages;
        setMessages(next);
        setCursor(response.data.meta.pagination.nextCursor);
        setHasMore(response.data.meta.pagination.hasMore);
        const latest = next.at(-1);
        if (latest && lastMarkedReadRef.current !== latest.id) {
          lastMarkedReadRef.current = latest.id;
          await messagingApi.markRead(conversationId, latest.id).catch(() => {
            if (lastMarkedReadRef.current === latest.id)
              lastMarkedReadRef.current = null;
          });
        }
        setError("");
      } catch (reason) {
        setError(apiError(reason).message);
      } finally {
        if (!quiet) setMessagesLoading(false);
      }
    },
    [conversationId],
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);
  useEffect(() => {
    setMessages([]);
    setCursor(null);
    setHasMore(false);
    lastMarkedReadRef.current = null;
    void loadMessages();
  }, [loadMessages]);
  useEffect(() => {
    const poll = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadConversations();
      if (conversationId) void loadMessages({ quiet: true });
    }, 2_000);
    return () => window.clearInterval(poll);
  }, [conversationId, loadConversations, loadMessages]);
  useLayoutEffect(() => {
    const pane = messagePaneRef.current;
    if (!pane || messagesLoading) return;
    if (preserveScrollRef.current) {
      const previous = preserveScrollRef.current;
      pane.scrollTop = previous.top + (pane.scrollHeight - previous.height);
      preserveScrollRef.current = null;
      return;
    }
    pane.scrollTop = pane.scrollHeight;
  }, [messages.length, messagesLoading]);

  const older = async () => {
    if (!cursor || !conversationId) return;
    setMessagesLoading(true);
    try {
      const response = await messagingApi.messages(conversationId, { cursor });
      const pane = messagePaneRef.current;
      if (pane)
        preserveScrollRef.current = {
          height: pane.scrollHeight,
          top: pane.scrollTop,
        };
      setMessages((current) => [
        ...response.data.data.messages,
        ...current.filter(
          (existing) =>
            !response.data.data.messages.some(
              (item) => item.id === existing.id,
            ),
        ),
      ]);
      setCursor(response.data.meta.pagination.nextCursor);
      setHasMore(response.data.meta.pagination.hasMore);
    } catch (reason) {
      setError(apiError(reason).message);
    } finally {
      setMessagesLoading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const text = body.trim();
    if ((!text && !attachments.length) || sending || !conversationId) return;
    setSending(true);
    try {
      const response = await messagingApi.send(conversationId, {
        clientMessageId: crypto.randomUUID(),
        ...(text ? { body: text } : {}),
        attachmentIds: attachments.map((item) => item.id),
      });
      const sent = response.data.data.message;
      setMessages((current) =>
        current.some((item) => item.id === sent.id)
          ? current
          : [...current, sent],
      );
      setBody("");
      setAttachments([]);
      void loadConversations();
    } catch (reason) {
      setError(apiError(reason).message);
    } finally {
      setSending(false);
    }
  };

  const attach = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !conversationId) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("Choose a PNG or JPEG image.");
      return;
    }
    if (file.size > 80 * 1024) {
      setError("Image attachments must be 80 KB or smaller.");
      return;
    }
    setSending(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const uploaded = await attachmentApi.uploadMessage(
        conversationId,
        file.name,
        file.type,
        btoa(binary),
      );
      setAttachments((current) => [...current, uploaded.data.data.attachment]);
      setError("");
    } catch (reason) {
      setError(apiError(reason).message);
    } finally {
      setSending(false);
    }
  };

  const removeAttachment = async (attachment) => {
    setAttachments((current) =>
      current.filter((item) => item.id !== attachment.id),
    );
    await attachmentApi.remove(attachment.id).catch(() => {});
  };

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100vh-8rem)] min-h-[34rem] max-w-6xl flex-col">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Collaboration</p>
            <h1 className="mt-2 text-3xl font-black">Messages</h1>
          </div>
          <button
            className="btn-secondary !px-3"
            onClick={() => {
              void loadConversations();
              void loadMessages();
            }}
            aria-label="Refresh messages"
          >
            <RefreshCw size={17} />
          </button>
        </div>
        {error && (
          <div
            className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            role="alert"
          >
            {error}
          </div>
        )}
        <div className="surface grid min-h-0 flex-1 overflow-hidden md:grid-cols-[310px_minmax(0,1fr)]">
          <aside
            className={`${conversationId ? "hidden md:block" : "block"} min-h-0 overflow-y-auto border-r border-slate-200`}
            aria-label="Conversations"
          >
            {loading ? (
              <div className="grid h-48 place-items-center text-slate-500">
                <LoaderCircle className="animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="mx-auto text-slate-400" />
                <h2 className="mt-3 font-black">No conversations yet</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  A conversation becomes available after a gig proposal or
                  project membership is accepted.
                </p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={`w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 ${conversation.id === conversationId ? "bg-brand-50" : ""}`}
                  onClick={() =>
                    navigate(`/dashboard/messages/${conversation.id}`)
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="truncate font-black text-slate-900">
                      {conversation.title}
                    </span>
                    {conversation.unreadCount > 0 && (
                      <span className="grid min-w-6 place-items-center rounded-full bg-brand-600 px-1.5 py-0.5 text-xs font-black text-white">
                        {conversation.unreadCount > 99
                          ? "99+"
                          : conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {conversation.lastMessagePreview ||
                      (conversation.contextType === "PROJECT"
                        ? "Project conversation"
                        : "Gig conversation")}
                  </p>
                  <time className="mt-2 block text-xs text-slate-400">
                    {time(conversation.lastMessageAt)}
                  </time>
                </button>
              ))
            )}
          </aside>
          <section
            className={`${conversationId ? "flex" : "hidden md:flex"} min-h-0 flex-col`}
          >
            {!conversationId ? (
              <div className="grid flex-1 place-items-center p-8 text-center text-slate-500">
                <div>
                  <MessageCircle className="mx-auto" size={36} />
                  <p className="mt-3 font-bold">Choose a conversation</p>
                </div>
              </div>
            ) : (
              <>
                <header className="flex items-center gap-3 border-b border-slate-200 p-4">
                  <button
                    className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
                    onClick={() => navigate("/dashboard/messages")}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="min-w-0">
                    <h2 className="truncate font-black">
                      {selected?.title || "Conversation"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {selected?.contextType === "PROJECT"
                        ? "Project team"
                        : "Accepted gig"}
                    </p>
                  </div>
                </header>
                <div
                  ref={messagePaneRef}
                  className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6"
                  aria-live="polite"
                >
                  {hasMore && (
                    <div className="mb-4 text-center">
                      <button
                        className="btn-secondary !py-2"
                        disabled={messagesLoading}
                        onClick={older}
                      >
                        Load older messages
                      </button>
                    </div>
                  )}
                  {messagesLoading && messages.length === 0 ? (
                    <div className="grid h-full place-items-center text-slate-500">
                      <LoaderCircle className="animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="grid h-full place-items-center text-center text-slate-500">
                      <div>
                        <p className="font-black text-slate-700">
                          Start the conversation
                        </p>
                        <p className="mt-1 text-sm">
                          Messages are visible only to authorized participants.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <article
                          key={message.id}
                          className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${message.isOwn ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}
                          >
                            {!message.isOwn && (
                              <p className="mb-1 text-xs font-black text-brand-700">
                                {message.sender.displayName}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {message.body}
                            </p>
                            {message.attachments?.map((attachment) => (
                              <a
                                key={attachment.id}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 block overflow-hidden rounded-xl border border-white/30"
                              >
                                <img
                                  src={attachment.url}
                                  alt={attachment.fileName}
                                  className="max-h-64 w-full object-contain"
                                  loading="lazy"
                                />
                              </a>
                            ))}
                            <time
                              className={`mt-1 block text-right text-[11px] ${message.isOwn ? "text-blue-100" : "text-slate-400"}`}
                            >
                              {time(message.sentAt)}
                            </time>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
                <form
                  className="border-t border-slate-200 bg-white p-3 sm:p-4"
                  onSubmit={submit}
                >
                  {attachments.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {attachments.map((attachment) => (
                        <span
                          key={attachment.id}
                          className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700"
                        >
                          {attachment.fileName}
                          <button
                            type="button"
                            aria-label={`Remove ${attachment.fileName}`}
                            onClick={() => removeAttachment(attachment)}
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <label
                      className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                      aria-label="Attach image"
                    >
                      <Paperclip size={19} />
                      <input
                        className="sr-only"
                        type="file"
                        accept="image/png,image/jpeg"
                        disabled={
                          selected?.canSend === false ||
                          sending ||
                          attachments.length >= 3
                        }
                        onChange={attach}
                      />
                    </label>
                    <textarea
                      className="field max-h-36 min-h-12 resize-none"
                      aria-label="Message"
                      maxLength={5000}
                      rows={1}
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                      placeholder={
                        selected?.canSend === false
                          ? "This conversation is read-only"
                          : "Write a message…"
                      }
                      disabled={selected?.canSend === false || sending}
                    />
                    <button
                      className="btn-primary !size-12 !p-0"
                      disabled={
                        (!body.trim() && !attachments.length) ||
                        sending ||
                        selected?.canSend === false
                      }
                      aria-label="Send message"
                    >
                      {sending ? (
                        <LoaderCircle className="animate-spin" size={19} />
                      ) : (
                        <Send size={19} />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Enter to send · Shift+Enter for a new line · PNG/JPEG up to
                    80 KB
                  </p>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
