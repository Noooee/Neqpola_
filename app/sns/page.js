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

  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [commentText, setCommentText] = useState({});
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [commentLoading, setCommentLoading] = useState({});
  const [replyingTo, setReplyingTo] = useState({});

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

      const { data: ownProfile, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id, username, display_name, bio, avatar_url"
          )
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
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace("/login");
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const loadPosts = async (currentUserId = user?.id) => {
    setLoadingPosts(true);
    setError("");

    const { data, error: postsError } =
      await supabase
        .from("posts")
        .select(
          "id, user_id, content, created_at"
        )
        .order("created_at", {
          ascending: false,
        });

    if (postsError) {
      setError("投稿を読み込めませんでした。");
      setLoadingPosts(false);
      return;
    }

    const postList = data || [];

    setPosts(postList);

    /*
     * ==========================================
     * いいね情報
     * ==========================================
     */

    const postIds = postList.map(
      (post) => post.id
    );

    if (postIds.length === 0) {
      setLikeCounts({});
      setLikedPosts(new Set());
      setCommentsByPost({});
      setCommentCounts({});
      setProfiles({});
      setLoadingPosts(false);
      return;
    }

    const {
      data: likeData,
      error: likesError,
    } = await supabase
      .from("likes")
      .select("post_id, user_id")
      .in("post_id", postIds);

    if (likesError) {
      setError(
        "いいね情報を読み込めませんでした。"
      );
    } else {
      const countMap = {};
      const likedSet = new Set();

      for (const like of likeData || []) {
        countMap[like.post_id] =
          (countMap[like.post_id] || 0) + 1;

        if (
          like.user_id === currentUserId
        ) {
          likedSet.add(like.post_id);
        }
      }

      setLikeCounts(countMap);
      setLikedPosts(likedSet);
    }

    /*
     * ==========================================
     * コメント情報
     * ==========================================
     */

    const {
      data: commentData,
      error: commentsError,
    } = await supabase
      .from("comments")
      .select(
        "id, post_id, user_id, content, created_at, parent_comment_id"
      )
      .in("post_id", postIds)
      .order("created_at", {
        ascending: true,
      });

    if (commentsError) {
      setError(
        "コメント情報を読み込めませんでした。"
      );
    } else {
      const commentsMap = {};
      const commentCountMap = {};

      for (const comment of commentData || []) {
        if (!commentsMap[comment.post_id]) {
          commentsMap[comment.post_id] = [];
        }

        commentsMap[comment.post_id].push(
          comment
        );

        commentCountMap[comment.post_id] =
          (commentCountMap[comment.post_id] || 0) +
          1;
      }

      setCommentsByPost(commentsMap);
      setCommentCounts(commentCountMap);
    }

    /*
     * ==========================================
     * 投稿者・コメント投稿者プロフィール
     * ==========================================
     */

    const userIds = new Set(
      postList.map((post) => post.user_id)
    );

    for (const comment of commentData || []) {
      userIds.add(comment.user_id);
    }

    const allUserIds = [...userIds];

    if (allUserIds.length === 0) {
      setProfiles({});
      setLoadingPosts(false);
      return;
    }

    const {
      data: profileData,
      error: profilesError,
    } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url"
      )
      .in("id", allUserIds);

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
      setPostError(
        "投稿内容を入力してください。"
      );
      return;
    }

    if (cleanContent.length > 500) {
      setPostError(
        "投稿は500文字以内にしてください。"
      );
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    setPosting(true);

    const { error: insertError } =
      await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: cleanContent,
        });

    setPosting(false);

    if (insertError) {
      setPostError(
        "投稿できませんでした。もう一度お試しください。"
      );
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

    if (isLiked) {
      const {
        error: deleteError,
      } = await supabase
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (deleteError) {
        setError(
          "いいねを解除できませんでした。"
        );

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
        [postId]: Math.max(
          (current[postId] || 0) - 1,
          0
        ),
      }));
    } else {
      const {
        error: insertError,
      } = await supabase
        .from("likes")
        .insert({
          user_id: user.id,
          post_id: postId,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          setLikedPosts((current) => {
            const next = new Set(current);
            next.add(postId);
            return next;
          });

          setLikeLoading((current) => ({
            ...current,
            [postId]: false,
          }));

          return;
        }

        setError(
          "いいねできませんでした。"
        );

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
        [postId]:
          (current[postId] || 0) + 1,
      }));
    }

    setLikeLoading((current) => ({
      ...current,
      [postId]: false,
    }));
  };

  /*
   * ==========================================
   * コメント欄開閉
   * ==========================================
   */

  const toggleComments = (postId) => {
    setExpandedComments((current) => {
      const next = new Set(current);

      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }

      return next;
    });
  };

  /*
   * ==========================================
   * コメント入力
   * ==========================================
   */

  const handleCommentTextChange = (
    postId,
    value
  ) => {
    setCommentText((current) => ({
      ...current,
      [postId]: value,
    }));
  };

  /*
   * ==========================================
   * コメント投稿
   * ==========================================
   */

  const handleCommentSubmit = async (
    event,
    postId
  ) => {
    event.preventDefault();

    if (!user) {
      router.replace("/login");
      return;
    }

    const cleanText = (
      commentText[postId] || ""
    ).trim();

    if (!cleanText) {
      return;
    }

    if (cleanText.length > 300) {
      setError(
        "コメントは300文字以内にしてください。"
      );
      return;
    }

    if (commentLoading[postId]) {
      return;
    }

    setCommentLoading((current) => ({
      ...current,
      [postId]: true,
    }));

    const parentCommentId =
      replyingTo[postId] || null;

    const {
      error: insertError,
    } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        content: cleanText,
        parent_comment_id:
          parentCommentId,
      });

    setCommentLoading((current) => ({
      ...current,
      [postId]: false,
    }));

    if (insertError) {
      setError(
        "コメントを投稿できませんでした。"
      );
      return;
    }

    setCommentText((current) => ({
      ...current,
      [postId]: "",
    }));

    setReplyingTo((current) => ({
      ...current,
      [postId]: null,
    }));

    setExpandedComments((current) => {
      const next = new Set(current);
      next.add(postId);
      return next;
    });

    await loadPosts(user.id);
  };

  /*
   * ==========================================
   * 返信開始
   * ==========================================
   */

  const handleReply = (
    postId,
    comment
  ) => {
    setReplyingTo((current) => ({
      ...current,
      [postId]: comment.id,
    }));

    setCommentText((current) => ({
      ...current,
      [postId]:
        current[postId] || "",
    }));

    setExpandedComments((current) => {
      const next = new Set(current);
      next.add(postId);
      return next;
    });
  };

  /*
   * ==========================================
   * 返信キャンセル
   * ==========================================
   */

  const cancelReply = (postId) => {
    setReplyingTo((current) => ({
      ...current,
      [postId]: null,
    }));
  };

  /*
   * ==========================================
   * コメント削除
   * ==========================================
   */

  const handleDeleteComment = async (
    commentId,
    postId
  ) => {
    const confirmed = window.confirm(
      "このコメントを削除しますか？"
    );

    if (!confirmed) {
      return;
    }

    const {
      error: deleteError,
    } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      setError(
        "コメントを削除できませんでした。"
      );
      return;
    }

    await loadPosts(user?.id);
  };

  /*
   * ==========================================
   * 投稿削除
   * ==========================================
   */

  const handleDelete = async (postId) => {
    const confirmed = window.confirm(
      "この投稿を削除しますか？"
    );

    if (!confirmed) {
      return;
    }

    setError("");

    const {
      error: deleteError,
    } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (deleteError) {
      setError(
        "投稿を削除できませんでした。"
      );
      return;
    }

    setPosts((currentPosts) =>
      currentPosts.filter(
        (post) => post.id !== postId
      )
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

    setCommentCounts((current) => {
      const next = { ...current };
      delete next[postId];
      return next;
    });

    setCommentsByPost((current) => {
      const next = { ...current };
      delete next[postId];
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
   * 読み込み
   * ==========================================
   */

  if (loading) {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loadingLogo}>
          N
        </div>

        <p>
          Neqpolaを読み込んでいます...
        </p>
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
          <a
            href="/"
            className={styles.logo}
          >
            <span
              className={styles.logoMark}
            >
              N
            </span>

            <span
              className={styles.logoText}
            >
              Neqpola
            </span>
          </a>

          <nav className={styles.nav}>
            <a
              href="/sns"
              className={styles.navActive}
            >
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

      {/* Main */}
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
                {profile?.display_name ||
                  "Neqpolaユーザー"}
              </strong>

              <span>
                @{profile?.username ||
                  "user"}
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
            <span
              className={styles.sidebarLabel}
            >
              NEQPOLA
            </span>

            <a
              href="/sns"
              className={
                styles.sidebarLinkActive
              }
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
              <span
                className={styles.sectionLabel}
              >
                NEQPOLA SNS
              </span>

              <h1>ホーム</h1>

              <p>
                みんなの「いま」を見てみよう。
              </p>
            </div>

            <button
              type="button"
              className={
                styles.refreshButton
              }
              onClick={() =>
                loadPosts(user?.id)
              }
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
            <div
              className={styles.composerTop}
            >
              <div
                className={styles.smallAvatar}
              >
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

              <div
                className={styles.composerUser}
              >
                <strong>
                  {profile?.display_name ||
                    "Neqpolaユーザー"}
                </strong>

                <span>
                  @{profile?.username ||
                    "user"}
                </span>
              </div>
            </div>

            <textarea
              value={content}
              onChange={(event) =>
                setContent(
                  event.target.value
                )
              }
              placeholder="いま何してる？"
              maxLength={500}
              rows={4}
            />

            <div
              className={
                styles.composerBottom
              }
            >
              <span
                className={
                  styles.characterCount
                }
              >
                {content.length}/500
              </span>

              <button
                type="submit"
                className={styles.postButton}
                disabled={posting}
              >
                {posting
                  ? "投稿中..."
                  : "投稿する"}

                {!posting && (
                  <span>→</span>
                )}
              </button>
            </div>

            {postError && (
              <div
                className={styles.formError}
              >
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
              <div
                className={styles.emptyState}
              >
                <div
                  className={styles.emptyIcon}
                >
                  ◌
                </div>

                <p>
                  投稿を読み込んでいます...
                </p>
              </div>
            ) : posts.length === 0 ? (
              <div
                className={styles.emptyState}
              >
                <div
                  className={styles.emptyIcon}
                >
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
                  profiles[
                    post.user_id
                  ];

                const displayName =
                  postProfile?.display_name ||
                  "Neqpolaユーザー";

                const username =
                  postProfile?.username ||
                  "user";

                const initial =
                  getInitial(
                    displayName
                  );

                const isOwnPost =
                  user?.id ===
                  post.user_id;

                const isLiked =
                  likedPosts.has(
                    post.id
                  );

                const likeCount =
                  likeCounts[post.id] ||
                  0;

                const postComments =
                  commentsByPost[
                    post.id
                  ] || [];

                const commentCount =
                  commentCounts[
                    post.id
                  ] || 0;

                const commentsOpen =
                  expandedComments.has(
                    post.id
                  );

                const replyTarget =
                  replyingTo[
                    post.id
                  ] || null;

                const topLevelComments =
                  postComments.filter(
                    (comment) =>
                      !comment.parent_comment_id
                  );

                const replies =
                  postComments.filter(
                    (comment) =>
                      comment.parent_comment_id
                  );

                return (
                  <article
                    key={post.id}
                    className={
                      styles.postCard
                    }
                  >
                    {/* Post Header */}
                    <div
                      className={
                        styles.postHeader
                      }
                    >
                      <div
                        className={
                          styles.postUser
                        }
                      >
                        <div
                          className={
                            styles.postAvatar
                          }
                        >
                          {postProfile?.avatar_url ? (
                            <img
                              src={
                                postProfile.avatar_url
                              }
                              alt=""
                              className={
                                styles.avatarImage
                              }
                            />
                          ) : (
                            initial
                          )}
                        </div>

                        <div
                          className={
                            styles.postUserText
                          }
                        >
                          <strong>
                            {displayName}
                          </strong>

                          <span>
                            @{username} ・{" "}
                            {formatDate(
                              post.created_at
                            )}
                          </span>
                        </div>
                      </div>

                      {isOwnPost && (
                        <button
                          type="button"
                          className={
                            styles.deleteButton
                          }
                          onClick={() =>
                            handleDelete(
                              post.id
                            )
                          }
                          title="投稿を削除"
                        >
                          •••
                        </button>
                      )}
                    </div>

                    {/* Post */}
                    <div
                      className={
                        styles.postContent
                      }
                    >
                      {post.content}
                    </div>

                    {/* Actions */}
                    <div
                      className={
                        styles.postActions
                      }
                    >
                      <button
                        type="button"
                        className={`${styles.likeButton} ${
                          isLiked
                            ? styles.liked
                            : ""
                        }`}
                        onClick={() =>
                          handleLike(
                            post.id
                          )
                        }
                        disabled={
                          likeLoading[
                            post.id
                          ]
                        }
                        aria-pressed={
                          isLiked
                        }
                      >
                        <span
                          className={
                            styles.likeIcon
                          }
                        >
                          {isLiked
                            ? "♥"
                            : "♡"}
                        </span>

                        <span>
                          いいね
                        </span>

                        <span
                          className={
                            styles.likeCount
                          }
                        >
                          {likeCount}
                        </span>
                      </button>

                      <button
                        type="button"
                        className={
                          commentsOpen
                            ? styles.commentButtonActive
                            : ""
                        }
                        onClick={() =>
                          toggleComments(
                            post.id
                          )
                        }
                        aria-expanded={
                          commentsOpen
                        }
                      >
                        💬
                        <span>
                          コメント
                        </span>

                        <span
                          className={
                            styles.likeCount
                          }
                        >
                          {commentCount}
                        </span>
                      </button>

                      <button
                        type="button"
                      >
                        ↗ <span>共有</span>
                      </button>
                    </div>

                    {/* Comments */}
                    {commentsOpen && (
                      <div
                        className={
                          styles.commentsSection
                        }
                      >
                        <div
                          className={
                            styles.commentsTitle
                          }
                        >
                          <strong>
                            コメント
                          </strong>

                          <span>
                            {commentCount}件
                          </span>
                        </div>

                        <div
                          className={
                            styles.commentList
                          }
                        >
                          {topLevelComments.length ===
                          0 ? (
                            <div
                              className={
                                styles.noComments
                              }
                            >
                              まだコメントはありません。
                            </div>
                          ) : (
                            topLevelComments.map(
                              (comment) => {
                                const commentProfile =
                                  profiles[
                                    comment.user_id
                                  ];

                                const commentName =
                                  commentProfile?.display_name ||
                                  "Neqpolaユーザー";

                                const commentUsername =
                                  commentProfile?.username ||
                                  "user";

                                const commentInitial =
                                  getInitial(
                                    commentName
                                  );

                                const commentReplies =
                                  replies.filter(
                                    (reply) =>
                                      reply.parent_comment_id ===
                                      comment.id
                                  );

                                const ownComment =
                                  user?.id ===
                                  comment.user_id;

                                return (
                                  <div
                                    key={
                                      comment.id
                                    }
                                    className={
                                      styles.commentThread
                                    }
                                  >
                                    <div
                                      className={
                                        styles.commentItem
                                      }
                                    >
                                      <div
                                        className={
                                          styles.commentAvatar
                                        }
                                      >
                                        {commentProfile?.avatar_url ? (
                                          <img
                                            src={
                                              commentProfile.avatar_url
                                            }
                                            alt=""
                                            className={
                                              styles.avatarImage
                                            }
                                          />
                                        ) : (
                                          commentInitial
                                        )}
                                      </div>

                                      <div
                                        className={
                                          styles.commentBody
                                        }
                                      >
                                        <div
                                          className={
                                            styles.commentMeta
                                          }
                                        >
                                          <strong>
                                            {
                                              commentName
                                            }
                                          </strong>

                                          <span>
                                            @
                                            {
                                              commentUsername
                                            }{" "}
                                            ・{" "}
                                            {formatDate(
                                              comment.created_at
                                            )}
                                          </span>
                                        </div>

                                        <p
                                          className={
                                            styles.commentContent
                                          }
                                        >
                                          {
                                            comment.content
                                          }
                                        </p>

                                        <div
                                          className={
                                            styles.commentActions
                                          }
                                        >
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleReply(
                                                post.id,
                                                comment
                                              )
                                            }
                                          >
                                            ↩ 返信
                                          </button>

                                          {ownComment && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleDeleteComment(
                                                  comment.id,
                                                  post.id
                                                )
                                              }
                                            >
                                              削除
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Replies */}
                                    {commentReplies.length >
                                      0 && (
                                      <div
                                        className={
                                          styles.replyList
                                        }
                                      >
                                        {commentReplies.map(
                                          (
                                            reply
                                          ) => {
                                            const replyProfile =
                                              profiles[
                                                reply.user_id
                                              ];

                                            const replyName =
                                              replyProfile?.display_name ||
                                              "Neqpolaユーザー";

                                            const replyUsername =
                                              replyProfile?.username ||
                                              "user";

                                            const replyInitial =
                                              getInitial(
                                                replyName
                                              );

                                            const ownReply =
                                              user?.id ===
                                              reply.user_id;

                                            return (
                                              <div
                                                key={
                                                  reply.id
                                                }
                                                className={
                                                  styles.commentItem
                                                }
                                              >
                                                <div
                                                  className={
                                                    styles.commentAvatar
                                                  }
                                                >
                                                  {replyProfile?.avatar_url ? (
                                                    <img
                                                      src={
                                                        replyProfile.avatar_url
                                                      }
                                                      alt=""
                                                      className={
                                                        styles.avatarImage
                                                      }
                                                    />
                                                  ) : (
                                                    replyInitial
                                                  )}
                                                </div>

                                                <div
                                                  className={
                                                    styles.commentBody
                                                  }
                                                >
                                                  <div
                                                    className={
                                                      styles.commentMeta
                                                    }
                                                  >
                                                    <strong>
                                                      {
                                                        replyName
                                                      }
                                                    </strong>

                                                    <span>
                                                      @
                                                      {
                                                        replyUsername
                                                      }{" "}
                                                      ・{" "}
                                                      {formatDate(
                                                        reply.created_at
                                                      )}
                                                    </span>
                                                  </div>

                                                  <p
                                                    className={
                                                      styles.commentContent
                                                    }
                                                  >
                                                    {
                                                      reply.content
                                                    }
                                                  </p>

                                                  {ownReply && (
                                                    <div
                                                      className={
                                                        styles.commentActions
                                                      }
                                                    >
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          handleDeleteComment(
                                                            reply.id,
                                                            post.id
                                                          )
                                                        }
                                                      >
                                                        削除
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          }
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            )
                          )}
                        </div>

                        {/* Reply status */}
                        {replyTarget && (
                          <div
                            className={
                              styles.replyingBar
                            }
                          >
                            <span>
                              返信モード
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                cancelReply(
                                  post.id
                                )
                              }
                            >
                              キャンセル
                            </button>
                          </div>
                        )}

                        {/* Comment Form */}
                        <form
                          className={
                            styles.commentForm
                          }
                          onSubmit={(event) =>
                            handleCommentSubmit(
                              event,
                              post.id
                            )
                          }
                        >
                          <div
                            className={
                              styles.commentFormAvatar
                            }
                          >
                            {profile?.avatar_url ? (
                              <img
                                src={
                                  profile.avatar_url
                                }
                                alt=""
                                className={
                                  styles.avatarImage
                                }
                              />
                            ) : (
                              currentUserInitial
                            )}
                          </div>

                          <div
                            className={
                              styles.commentFormMain
                            }
                          >
                            <textarea
                              value={
                                commentText[
                                  post.id
                                ] || ""
                              }
                              onChange={(event) =>
                                handleCommentTextChange(
                                  post.id,
                                  event.target.value
                                )
                              }
                              placeholder={
                                replyTarget
                                  ? "返信を書く..."
                                  : "コメントを書く..."
                              }
                              maxLength={300}
                              rows={2}
                            />

                            <div
                              className={
                                styles.commentFormBottom
                              }
                            >
                              <span>
                                {(commentText[
                                  post.id
                                ] || "").length}
                                /300
                              </span>

                              <button
                                type="submit"
                                disabled={
                                  commentLoading[
                                    post.id
                                  ] ||
                                  !(
                                    commentText[
                                      post.id
                                    ] || ""
                                  ).trim()
                                }
                              >
                                {commentLoading[
                                  post.id
                                ]
                                  ? "送信中..."
                                  : replyTarget
                                  ? "返信する"
                                  : "コメントする"}
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* Right Sidebar */}
        <aside
          className={styles.rightSidebar}
        >
          <div
            className={styles.aboutCard}
          >
            <span
              className={styles.sidebarLabel}
            >
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

          <div
            className={styles.tipCard}
          >
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
        © {new Date().getFullYear()} Neqpola.
        All rights reserved.
      </footer>
    </main>
  );
}
