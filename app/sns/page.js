"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import styles from "./page.module.css";

const supabase = createClient();

const formatDate = (dateString) => {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getInitial = (name) => {
  const value = (name || "N").trim();
  return value.charAt(0).toUpperCase() || "N";
};

export default function SNSPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState({});

  const [content, setContent] = useState("");

  const [likeCounts, setLikeCounts] = useState({});
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [likeLoading, setLikeLoading] = useState({});

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const [error, setError] = useState("");
  const [postError, setPostError] = useState("");

  const currentUserInitial = useMemo(() => {
    return getInitial(profile?.display_name || profile?.username || "N");
  }, [profile]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setUser(user);

      const { data: ownProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) {
        return;
      }

      if (profileError) {
        setError("プロフィールを読み込めませんでした。");
      } else {
        setProfile(ownProfile);
      }

      await loadPosts(user.id);

      if (mounted) {
        setLoading(false);
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const loadPosts = async (currentUserId = user?.id) => {
    setLoadingPosts(true);
    setError("");

    const { data, error: postsError } = await supabase
      .from("posts")
      .select("id, user_id, content, created_at")
      .order("created_at", { ascending: false });

    if (postsError) {
      setError("投稿を読み込めませんでした。");
      setLoadingPosts(false);
      return;
    }

    const postList = data || [];

    setPosts(postList);

    /*
     * ==========================================
     * いいね情報を取得
     * ==========================================
     */

    const postIds = postList.map((post) => post.id);

    if (postIds.length === 0) {
      setLikeCounts({});
      setLikedPosts(new Set());
    } else {
      const { data: likeData, error: likesError } = await supabase
        .from("likes")
        .select("post_id, user_id")
        .in("post_id", postIds);

      if (likesError) {
        setError("いいね情報を読み込めませんでした。");
      } else {
        const countMap = {};
        const likedSet = new Set();

        for (const like of likeData || []) {
          countMap[like.post_id] = (countMap[like.post_id] || 0) + 1;

          if (like.user_id === currentUserId) {
            likedSet.add(like.post_id);
          }
        }

        setLikeCounts(countMap);
        setLikedPosts(likedSet);
      }
    }

    /*
     * ==========================================
     * 投稿者プロフィールを取得
     * ==========================================
     */

    const userIds = [...new Set(postList.map((post) => post.user_id))];

    if (userIds.length === 0) {
      setProfiles({});
      setLoadingPosts(false);
      return;
    }

    const { data: profileData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);

    if (!profilesError) {
      const profileMap = {};

      for (const item of profileData || []) {
        profileMap[item.id] = item;
      }

      setProfiles(profileMap);
    }

    setLoadingPosts(false);
  };

  /*
   * ==========================================
   * 投稿する
   * ==========================================
   */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setPostError("");
    setError("");

    const cleanContent = content.trim();

    if (!cleanContent) {
      setPostError("投稿内容を入力してください。");
      return;
    }

    if (cleanContent.length > 500) {
      setPostError("投稿は500文字以内にしてください。");
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    setPosting(true);

    const { error: insertError } = await supabase.from("posts").insert({
      user_id: user.id,
      content: cleanContent,
    });

    setPosting(false);

    if (insertError) {
      setPostError("投稿できませんでした。もう一度お試しください。");
      return;
    }

    setContent("");

    await loadPosts(user.id);
  };

  /*
   * ==========================================
   * いいね
   * ==========================================
   */

  const handleLike = async (postId) => {
    if (!user) {
      router.replace("/login");
      return;
    }

    if (likeLoading[postId]) {
      return;
    }

    setError("");

    const isLiked = likedPosts.has(postId);

    setLikeLoading((current) => ({
      ...current,
      [postId]: true,
    }));

    /*
     * ==========================================
     * いいね解除
     * ==========================================
     */

    if (isLiked) {
      const { error: deleteError } = await supabase
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (deleteError) {
        setError("いいねを解除できませんでした。");

        setLikeLoading((current) => ({
          ...current,
          [postId]: false,
        }));

        return;
      }

      setLikedPosts((current) => {
        const next = new Set(current);
        next.delete(postId);
        return next;
      });

      setLikeCounts((current) => ({
        ...current,
        [postId]: Math.max((current[postId] || 0) - 1, 0),
      }));
    } else {
      /*
       * ==========================================
       * いいね追加
       * ==========================================
       */

      const { error: insertError } = await supabase.from("likes").insert({
        user_id: user.id,
        post_id: postId,
      });

      if (insertError) {
        /*
         * すでに存在している場合など
         */
        if (insertError.code === "23505") {
          setLikedPosts((current) => {
            const next = new Set(current);
            next.add(postId);
            return next;
          });

          return;
        }

        setError("いいねできませんでした。");

        setLikeLoading((current) => ({
          ...current,
          [postId]: false,
        }));

        return;
      }

      setLikedPosts((current) => {
        const next = new Set(current);
        next.add(postId);
        return next;
      });

      setLikeCounts((current) => ({
        ...current,
        [postId]: (current[postId] || 0) + 1,
      }));
    }

    setLikeLoading((current) => ({
      ...current,
      [postId]: false,
    }));
  };

  /*
   * ==========================================
   * 投稿削除
   * ==========================================
   */

  const handleDelete = async (postId) => {
    const confirmed = window.confirm("この投稿を削除しますか？");

    if (!confirmed) {
      return;
    }

    setError("");

    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (deleteError) {
      setError("投稿を削除できませんでした。");
      return;
    }

    setPosts((currentPosts) =>
      currentPosts.filter((post) => post.id !== postId)
    );

    setLikeCounts((current) => {
      const next = { ...current };
      delete next[postId];
      return next;
    });

    setLikedPosts((current) => {
      const next = new Set(current);
      next.delete(postId);
      return next;
    });
  };

  /*
   * ==========================================
   * ログアウト
   * ==========================================
   */

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  /*
   * ==========================================
   * 読み込み中
   * ==========================================
   */

  if (loading) {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loadingLogo}>N</div>
        <p>Neqpolaを読み込んでいます...</p>
      </main>
    );
  }

  /*
   * ==========================================
   * SNS画面
   * ==========================================
   */

  return (
    <main className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a href="/" className={styles.logo}>
            <span className={styles.logoMark}>N</span>
            <span className={styles.logoText}>Neqpola</span>
          </a>

          <nav className={styles.nav}>
            <a href="/sns" className={styles.navActive}>
              ホーム
            </a>

            <a href="#">
              通知
            </a>

            <a href="#">
              プロフィール
            </a>
          </nav>

          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleLogout}
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className={styles.layout}>
        {/* Left Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.profileCard}>
            <div className={styles.profileAvatar}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className={styles.avatarImage}
                />
              ) : (
                currentUserInitial
              )}
            </div>

            <div className={styles.profileName}>
              <strong>
                {profile?.display_name || "Neqpolaユーザー"}
              </strong>

              <span>
                @{profile?.username || "user"}
              </span>
            </div>

            {profile?.bio && (
              <p className={styles.bio}>
                {profile.bio}
              </p>
            )}

            <button
              type="button"
              className={styles.profileButton}
              onClick={() => router.push("/")}
            >
              プロフィールを見る
            </button>
          </div>

          <div className={styles.sidebarCard}>
            <span className={styles.sidebarLabel}>
              NEQPOLA
            </span>

            <a
              href="/sns"
              className={styles.sidebarLinkActive}
            >
              <span>🏠</span>
              ホーム
            </a>

            <a
              href="#"
              className={styles.sidebarLink}
            >
              <span>🔔</span>
              通知
            </a>

            <a
              href="#"
              className={styles.sidebarLink}
            >
              <span>👥</span>
              フォロー
            </a>
          </div>
        </aside>

        {/* Feed */}
        <section className={styles.feed}>
          <div className={styles.feedHeading}>
            <div>
              <span className={styles.sectionLabel}>
                NEQPOLA SNS
              </span>

              <h1>ホーム</h1>

              <p>
                みんなの「いま」を見てみよう。
              </p>
            </div>

            <button
              type="button"
              className={styles.refreshButton}
              onClick={() => loadPosts(user?.id)}
              disabled={loadingPosts}
              aria-label="投稿を更新"
              title="投稿を更新"
            >
              ↻
            </button>
          </div>

          {/* Composer */}
          <form
            className={styles.composer}
            onSubmit={handleSubmit}
          >
            <div className={styles.composerTop}>
              <div className={styles.smallAvatar}>
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className={styles.avatarImage}
                  />
                ) : (
                  currentUserInitial
                )}
              </div>

              <div className={styles.composerUser}>
                <strong>
                  {profile?.display_name || "Neqpolaユーザー"}
                </strong>

                <span>
                  @{profile?.username || "user"}
                </span>
              </div>
            </div>

            <textarea
              value={content}
              onChange={(event) =>
                setContent(event.target.value)
              }
              placeholder="いま何してる？"
              maxLength={500}
              rows={4}
            />

            <div className={styles.composerBottom}>
              <span className={styles.characterCount}>
                {content.length}/500
              </span>

              <button
                type="submit"
                className={styles.postButton}
                disabled={posting}
              >
                {posting ? "投稿中..." : "投稿する"}

                {!posting && (
                  <span>→</span>
                )}
              </button>
            </div>

            {postError && (
              <div className={styles.formError}>
                {postError}
              </div>
            )}
          </form>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {/* Timeline */}
          <div className={styles.timeline}>
            {loadingPosts ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  ◌
                </div>

                <p>
                  投稿を読み込んでいます...
                </p>
              </div>
            ) : posts.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  ✦
                </div>

                <h2>
                  まだ投稿がありません
                </h2>

                <p>
                  Neqpola最初の投稿をしてみよう！
                </p>
              </div>
            ) : (
              posts.map((post) => {
                const postProfile =
                  profiles[post.user_id];

                const displayName =
                  postProfile?.display_name ||
                  "Neqpolaユーザー";

                const username =
                  postProfile?.username ||
                  "user";

                const initial =
                  getInitial(displayName);

                const isOwnPost =
                  user?.id === post.user_id;

                const isLiked =
                  likedPosts.has(post.id);

                const likeCount =
                  likeCounts[post.id] || 0;

                return (
                  <article
                    key={post.id}
                    className={styles.postCard}
                  >
                    {/* Post Header */}
                    <div className={styles.postHeader}>
                      <div className={styles.postUser}>
                        <div className={styles.postAvatar}>
                          {postProfile?.avatar_url ? (
                            <img
                              src={postProfile.avatar_url}
                              alt=""
                              className={styles.avatarImage}
                            />
                          ) : (
                            initial
                          )}
                        </div>

                        <div className={styles.postUserText}>
                          <strong>
                            {displayName}
                          </strong>

                          <span>
                            @{username} ・{" "}
                            {formatDate(post.created_at)}
                          </span>
                        </div>
                      </div>

                      {isOwnPost && (
                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() =>
                            handleDelete(post.id)
                          }
                          title="投稿を削除"
                        >
                          •••
                        </button>
                      )}
                    </div>

                    {/* Post Content */}
                    <div className={styles.postContent}>
                      {post.content}
                    </div>

                    {/* Post Actions */}
                    <div className={styles.postActions}>
                      <button
                        type="button"
                        className={`${styles.likeButton} ${
                          isLiked
                            ? styles.liked
                            : ""
                        }`}
                        onClick={() =>
                          handleLike(post.id)
                        }
                        disabled={
                          likeLoading[post.id]
                        }
                        aria-pressed={isLiked}
                      >
                        <span
                          className={styles.likeIcon}
                        >
                          {isLiked ? "♥" : "♡"}
                        </span>

                        <span>
                          いいね
                        </span>

                        <span
                          className={styles.likeCount}
                        >
                          {likeCount}
                        </span>
                      </button>

                      <button type="button">
                        💬 <span>コメント</span>
                      </button>

                      <button type="button">
                        ↗ <span>共有</span>
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* Right Sidebar */}
        <aside className={styles.rightSidebar}>
          <div className={styles.aboutCard}>
            <span className={styles.sidebarLabel}>
              ABOUT NEQPOLA
            </span>

            <h2>
              つながるを、
              <br />
              もっと自由に。
            </h2>

            <p>
              SNS・チャット・掲示板・便利なWebサービスが集まる場所。
            </p>
          </div>

          <div className={styles.tipCard}>
            <span>✦</span>

            <div>
              <strong>
                Neqpola Tips
              </strong>

              <p>
                気軽な投稿から、ゆっくりはじめよう。
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        © {new Date().getFullYear()} Neqpola. All rights reserved.
      </footer>
    </main>
  );
}
