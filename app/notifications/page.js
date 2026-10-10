"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import styles from "./page.module.css";

const supabase = createClient();
const dateText = (value) => new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const actionText = (type) => ({ like: "あなたの投稿にいいねしました", comment: "あなたの投稿にコメントしました", follow: "あなたをフォローしました" }[type] || "あなたに通知があります");

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [actors, setActors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !user) { router.replace("/login"); return; }

      const { data, error: queryError } = await supabase
        .from("notifications")
        .select("id, user_id, actor_id, type, post_id, comment_id, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!active) return;
      if (queryError) {
        setError("通知を読み込めませんでした。再読み込みしてください。");
        setLoading(false);
        return;
      }

      const list = data || [];
      setItems(list);
      const ids = [...new Set(list.map((item) => item.actor_id).filter(Boolean))];
      if (ids.length) {
        const { data: people, error: peopleError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", ids);
        if (!peopleError && active) {
          const map = {};
          (people || []).forEach((person) => { map[person.id] = person; });
          setActors(map);
        }
      }

      const unread = list.filter((item) => !item.is_read).map((item) => item.id);
      if (unread.length) {
        const { error: updateError } = await supabase.from("notifications")
          .update({ is_read: true }).eq("user_id", user.id).in("id", unread);
        if (!updateError && active) setItems((current) => current.map((item) => ({ ...item, is_read: true })));
      }
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [router]);

  if (loading) return <main className={styles.page}><p className={styles.loading}>通知を読み込んでいます...</p></main>;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a href="/sns" className={styles.brand}><span className={styles.mark}>N</span> Neqpola</a>
        <nav><a href="/sns">SNSホーム</a><a href="/profile">プロフィール</a></nav>
      </header>
      <section className={styles.panel}>
        <span className={styles.eyebrow}>NEQPOLA SNS</span>
        <h1>通知</h1>
        <p className={styles.intro}>いいねやコメント、フォローのお知らせを確認できます。</p>
        {error && <p className={styles.error}>{error}</p>}
        {!error && items.length === 0 && <div className={styles.empty}><span>🔔</span><h2>まだ通知はありません</h2><p>誰かがあなたの投稿に反応すると、ここに表示されます。</p></div>}
        <div className={styles.list}>
          {items.map((item) => {
            const actor = actors[item.actor_id];
            const name = actor?.display_name || actor?.username || "Neqpolaユーザー";
            return <button type="button" key={item.id} className={styles.item} onClick={() => router.push("/sns")}>
              <span className={styles.avatar}>{actor?.avatar_url ? <img src={actor.avatar_url} alt="" /> : name.charAt(0)}</span>
              <span className={styles.body}><strong>{name}</strong><span>{actionText(item.type)}</span><small>{dateText(item.created_at)}</small></span>
              {!item.is_read && <span className={styles.unread} aria-label="未読" />}
              <span className={styles.arrow}>›</span>
            </button>;
          })}
        </div>
        <a href="/sns" className={styles.back}>← SNSホームへ戻る</a>
      </section>
    </main>
  );
}
