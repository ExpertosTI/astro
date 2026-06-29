"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMatch } from "@/components/match/MatchProvider";
import { ChatBubble } from "@/components/match/ChatBubble";
import { EmojiPicker } from "@/components/match/EmojiPicker";
import { QuickReplies } from "@/components/match/QuickReplies";
import { TypingIndicator } from "@/components/match/TypingIndicator";
import { canAccessChat } from "@/lib/match-store";
import { formatMessageTime, groupMessagesByDay } from "@/lib/chat-utils";
import styles from "../match.module.css";

function ChatContent() {
  const router = useRouter();
  const params = useSearchParams();
  const matchId = params.get("id");
  const {
    state,
    ready,
    chat,
    block,
    getProfile,
    markChatRead,
    signalTyping,
    isOtherTyping,
  } = useMatch();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [typingMsgId, setTypingMsgId] = useState<string | null>(null);

  const match = state.matches.find((m) => m.id === matchId);
  const me = state.session?.userId;

  useEffect(() => {
    if (!ready) return;
    if (!state.session) router.replace("/match/onboarding/");
    else if (!matchId || !me || !canAccessChat(state, matchId, me)) {
      router.replace("/match/matches/");
    }
  }, [ready, state, matchId, me, router]);

  useEffect(() => {
    if (!matchId || !me) return;
    markChatRead(matchId);
    const id = window.setInterval(() => markChatRead(matchId), 4000);
    return () => window.clearInterval(id);
  }, [matchId, me, markChatRead, state.messages]);

  useEffect(() => {
    if (!matchId || !me) return;
    const thread = state.messages
      .filter((m) => m.matchId === matchId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const latestIncoming = [...thread].reverse().find((m) => m.senderId !== me);
    if (latestIncoming && !seenIdsRef.current.has(latestIncoming.id)) {
      seenIdsRef.current.add(latestIncoming.id);
      setTypingMsgId(latestIncoming.id);
    }
  }, [state.messages, matchId, me]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, matchId, typingMsgId]);

  if (!match || !me || !matchId) return null;

  const otherId = match.tatuadorId === me ? match.lienzoId : match.tatuadorId;
  const other = getProfile(otherId);
  const messages = state.messages
    .filter((m) => m.matchId === matchId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const groups = groupMessagesByDay(messages);
  const otherTyping = isOtherTyping(matchId);

  const send = (value?: string) => {
    const payload = (value ?? text).trim();
    if (!payload) return;
    const result = chat(matchId, payload);
    if (!result.ok) {
      setError(result.error ?? "Error al enviar");
      return;
    }
    setError("");
    setText("");
    setEmojiOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send();
  };

  const handleInput = (value: string) => {
    setText(value);
    signalTyping(matchId);
  };

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setText((prev) => `${prev}${emoji}`);
      return;
    }
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    const next = `${text.slice(0, start)}${emoji}${text.slice(end)}`;
    setText(next);
    signalTyping(matchId);
    window.requestAnimationFrame(() => {
      input.focus();
      const pos = start + emoji.length;
      input.setSelectionRange(pos, pos);
    });
  };

  const handleBlock = () => {
    if (!confirm("¿Bloquear a este usuario? Se cerrará el chat.")) return;
    block(otherId, "Bloqueado desde chat");
    router.push("/match/matches/");
  };

  return (
    <>
      <Link href="/match/matches/" className={styles.backLink}>
        ← Matches
      </Link>
      <header className={styles.chatHeader}>
        <div className={styles.chatHeaderInfo}>
          {other?.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={other.avatarUrl} alt="" className={styles.chatHeaderAvatar} />
          )}
          <div>
            <span className={styles.chatHeaderName}>{other?.displayName ?? "Chat"}</span>
            <span className={styles.chatHeaderStatus}>
              {otherTyping ? "escribiendo…" : "● en línea"}
            </span>
          </div>
        </div>
        <button type="button" className={styles.blockBtnSmall} onClick={handleBlock}>
          Bloquear
        </button>
      </header>

      <div className={styles.chatWrap}>
        <div className={styles.chatMessages}>
          {messages.length === 0 && (
            <p className={styles.chatEmptyHint}>
              ¡Match confirmado! Coordina fecha, zona y diseño ✨
            </p>
          )}
          {groups.map((group) => (
            <div key={group.day} className={styles.chatDayGroup}>
              <div className={styles.chatDayDivider}>
                <span>{group.day}</span>
              </div>
              {group.messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  text={msg.text}
                  mine={msg.senderId === me}
                  time={formatMessageTime(msg.createdAt)}
                  readAt={msg.readAt}
                  animate={msg.id === typingMsgId && msg.senderId !== me}
                />
              ))}
            </div>
          ))}
          {otherTyping && other && <TypingIndicator name={other.displayName} />}
          <div ref={bottomRef} />
        </div>

        <QuickReplies
          onSelect={(reply) => {
            setText(reply);
            send(reply);
          }}
        />

        {error && <p className={styles.chatError}>{error}</p>}

        <form className={styles.chatInputRow} onSubmit={handleSubmit}>
          <EmojiPicker
            open={emojiOpen}
            onToggle={() => setEmojiOpen((o) => !o)}
            onSelect={insertEmoji}
          />
          <input
            ref={inputRef}
            className={styles.chatInput}
            value={text}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            maxLength={1000}
          />
          <button type="submit" className={styles.chatSend} aria-label="Enviar">
            ↑
          </button>
        </form>
      </div>
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatContent />
    </Suspense>
  );
}
