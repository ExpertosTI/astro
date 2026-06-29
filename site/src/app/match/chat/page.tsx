"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMatch } from "@/components/match/MatchProvider";
import { QuickReplies } from "@/components/match/QuickReplies";
import { canAccessChat } from "@/lib/match-store";
import styles from "../match.module.css";

function ChatContent() {
  const router = useRouter();
  const params = useSearchParams();
  const matchId = params.get("id");
  const { state, ready, chat, block, getProfile } = useMatch();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, matchId]);

  if (!match || !me || !matchId) return null;

  const otherId = match.tatuadorId === me ? match.lienzoId : match.tatuadorId;
  const other = getProfile(otherId);
  const messages = state.messages
    .filter((m) => m.matchId === matchId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const result = chat(matchId, text);
    if (!result.ok) {
      setError(result.error ?? "Error al enviar");
      return;
    }
    setError("");
    setText("");
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
      <header className={styles.matchHeader}>
        <span className={styles.matchLogo}>{other?.displayName ?? "Chat"}</span>
        <button type="button" className={styles.blockBtnSmall} onClick={handleBlock}>
          Bloquear
        </button>
      </header>

      <div className={styles.chatWrap}>
        <div className={styles.chatMessages}>
          {messages.length === 0 && (
            <p className={styles.emptyState} style={{ padding: "1rem" }}>
              ¡Match confirmado! Coordina fecha, zona y diseño.
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.chatBubble} ${
                msg.senderId === me ? styles.chatBubbleMine : styles.chatBubbleTheirs
              }`}
            >
              {msg.text}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <QuickReplies onSelect={setText} />

        {error && <p className={styles.chatError}>{error}</p>}

        <form className={styles.chatInputRow} onSubmit={send}>
          <input
            className={styles.chatInput}
            value={text}
            onChange={(e) => setText(e.target.value)}
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
