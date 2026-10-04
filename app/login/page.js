"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import styles from "./page.module.css";

const supabase = createClient();

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace("/");
      }
    };

    checkSession();
  }, [router]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setMessage("");
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setError("ログインできませんでした。メールアドレスまたはパスワードを確認してください。");
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleSignup = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();

    if (!cleanUsername || !email.trim() || !password || !passwordConfirm) {
      setError("必要な項目をすべて入力してください。");
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError(
        "ユーザー名は半角英数字と「_」を使って3〜20文字で入力してください。"
      );
      return;
    }

    if (password.length < 6) {
      setError("パスワードは6文字以上にしてください。");
      return;
    }

    if (password !== passwordConfirm) {
      setError("パスワードが一致していません。");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: cleanUsername,
          display_name: cleanDisplayName || "Neqpolaユーザー",
        },
      },
    });

    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        setError("このメールアドレスはすでに登録されています。");
      } else {
        setError("アカウントを作成できませんでした。時間をおいて再度お試しください。");
      }
      return;
    }

    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }

    setMessage(
      "アカウントを作成しました。確認メールが届いている場合は、メール内のリンクを押して登録を完了してください。"
    );

    setPassword("");
    setPasswordConfirm("");
  };

  return (
    <main className={styles.page}>
      <div className={styles.background}>
        <div className={styles.glowOne} />
        <div className={styles.glowTwo} />
        <div className={styles.grid} />
      </div>

      <a href="/" className={styles.logo}>
        <span className={styles.logoMark}>N</span>
        <span>Neqpola</span>
      </a>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.badge}>NEQPOLA ACCOUNT</span>

          <h1>
            {mode === "login"
              ? "おかえりなさい。"
              : "Neqpolaをはじめよう。"}
          </h1>

          <p>
            {mode === "login"
              ? "アカウントにログインしてください。"
              : "無料でNeqpolaアカウントを作成できます。"}
          </p>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={mode === "login" ? styles.activeTab : ""}
            onClick={() => switchMode("login")}
          >
            ログイン
          </button>

          <button
            type="button"
            className={mode === "signup" ? styles.activeTab : ""}
            onClick={() => switchMode("signup")}
          >
            アカウント作成
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className={styles.form}>
            <label>
              <span>メールアドレス</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label>
              <span>パスワード</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>

            {error && <div className={styles.error}>{error}</div>}
            {message && <div className={styles.message}>{message}</div>}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "ログイン中..." : "ログイン"}
              {!loading && <span>→</span>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className={styles.form}>
            <label>
              <span>ユーザー名</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="neqpola_user"
                maxLength={20}
                autoComplete="username"
              />
              <small>3〜20文字・半角英数字と「_」</small>
            </label>

            <label>
              <span>表示名</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="ねくぽらユーザー"
                maxLength={30}
                autoComplete="nickname"
              />
            </label>

            <label>
              <span>メールアドレス</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label>
              <span>パスワード</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="6文字以上"
                autoComplete="new-password"
              />
            </label>

            <label>
              <span>パスワード（確認）</span>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(event) =>
                  setPasswordConfirm(event.target.value)
                }
                placeholder="もう一度入力"
                autoComplete="new-password"
              />
            </label>

            {error && <div className={styles.error}>{error}</div>}
            {message && <div className={styles.message}>{message}</div>}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "アカウント作成中..." : "アカウントを作成"}
              {!loading && <span>→</span>}
            </button>
          </form>
        )}

        <div className={styles.divider}>
          <span />
          <small>NEQPOLA</small>
          <span />
        </div>

        <a href="/" className={styles.backLink}>
          ← トップページへ戻る
        </a>
      </section>

      <p className={styles.footer}>
        © {new Date().getFullYear()} Neqpola. All rights reserved.
      </p>
    </main>
  );
}