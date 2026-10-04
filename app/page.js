import styles from "./page.module.css";

const services = [
  {
    icon: "🌐",
    title: "Neqpola SNS",
    description: "みんなとつながって、好きなことを共有しよう。",
    href: "#",
    className: styles.sns,
  },
  {
    icon: "💬",
    title: "Neqpola Chat",
    description: "リアルタイムで気軽に話せるチャット。",
    href: "#",
    className: styles.chat,
  },
  {
    icon: "📋",
    title: "Neqpola 掲示板",
    description: "質問、雑談、情報交換。みんなの掲示板。",
    href: "#",
    className: styles.bbs,
  },
  {
    icon: "🛠️",
    title: "Neqpola 便利サイト",
    description: "毎日のちょっとした困りごとを便利に。",
    href: "#",
    className: styles.tools,
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <a href="/" className={styles.logo}>
          <span className={styles.logoMark}>N</span>
          <span className={styles.logoText}>Neqpola</span>
        </a>

        <nav className={styles.nav}>
          <a href="#services">サービス</a>
          <a href="#about">Neqpolaとは</a>
          <a href="/login" className={styles.loginButton}>
            ログイン
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.glowOne} />
          <div className={styles.glowTwo} />
          <div className={styles.gridPattern} />
        </div>

        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <div className={styles.badge}>
              <span className={styles.badgeDot} />
              Neqpola、はじめよう。
            </div>

            <h1>
              つながるを、
              <br />
              <span>もっと自由に。</span>
            </h1>

            <p className={styles.heroDescription}>
              Neqpolaは、SNS・チャット・掲示板・
              <br className={styles.desktopBreak} />
              便利なWebサービスが集まる場所です。
            </p>

            <div className={styles.heroActions}>
              <a href="/login" className={styles.primaryButton}>
                <span>Neqpolaをはじめる</span>
                <span className={styles.buttonArrow}>→</span>
              </a>

              <a href="#services" className={styles.secondaryButton}>
                サービスを見る
              </a>
            </div>

            <div className={styles.heroNote}>
              <span>✦</span>
              ひとつの場所から、いろいろな楽しさへ。
            </div>
          </div>

          {/* Visual */}
          <div className={styles.heroVisual}>
            <div className={styles.visualGlow} />

            <div className={styles.socialCard}>
              <div className={styles.socialHeader}>
                <div className={styles.avatar}>N</div>

                <div className={styles.socialUser}>
                  <strong>Neqpola</strong>
                  <span>@neqpola</span>
                </div>

                <div className={styles.more}>•••</div>
              </div>

              <div className={styles.postBody}>
                <p>
                  みんなで楽しく
                  <br />
                  つながろう！ ✨
                </p>
              </div>

              <div className={styles.postImage}>
                <div className={styles.postImageCenter}>
                  <span>N</span>
                  <small>Neqpola</small>
                </div>
              </div>

              <div className={styles.postActions}>
                <span>♡ 128</span>
                <span>💬 24</span>
                <span>↗ 12</span>
              </div>
            </div>

            <div className={styles.floatingChat}>
              💬
            </div>

            <div className={styles.floatingHeart}>
              ♥
            </div>

            <div className={styles.floatingSpark}>
              ✦
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className={styles.services}>
        <div className={styles.sectionHeading}>
          <span className={styles.sectionLabel}>
            NEQPOLA SERVICES
          </span>

          <h2>Neqpolaのサービス</h2>

          <p>
            ひとつの場所から、
            <br className={styles.mobileBreak} />
            いろいろな「楽しい」へ。
          </p>
        </div>

        <div className={styles.serviceGrid}>
          {services.map((service) => (
            <a
              href={service.href}
              key={service.title}
              className={`${styles.serviceCard} ${service.className}`}
            >
              <div className={styles.serviceTop}>
                <div className={styles.serviceIcon}>
                  {service.icon}
                </div>

                <span className={styles.serviceArrow}>↗</span>
              </div>

              <div className={styles.serviceInfo}>
                <h3>{service.title}</h3>

                <p>{service.description}</p>
              </div>

              <div className={styles.cardLine} />
            </a>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className={styles.about}>
        <div className={styles.aboutBackground}>
          <div className={styles.aboutGlow} />
        </div>

        <div className={styles.aboutCard}>
          <div className={styles.aboutContent}>
            <span className={styles.aboutLabel}>
              ABOUT NEQPOLA
            </span>

            <h2>
              Neqpolaは、
              <br />
              <span>みんなの居場所</span>
              <br />
              をつくります。
            </h2>

            <p>
              SNSだけじゃない。
              <br />
              話したり、遊んだり、調べたり。
              <br />
              毎日のインターネットを、
              <br />
              もっと楽しく。
            </p>
          </div>

          <div className={styles.aboutMark}>
            <span>N</span>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <span className={styles.ctaLabel}>
            LET&apos;S CONNECT
          </span>

          <h2>
            さあ、
            <br />
            Neqpolaへ。
          </h2>

          <p>
            これから始まる、新しい「つながり」。
          </p>

          <a href="/login" className={styles.ctaButton}>
            Neqpolaをはじめる
            <span>→</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <a href="/" className={styles.footerLogo}>
            <span className={styles.logoMark}>N</span>
            <strong>Neqpola</strong>
          </a>

          <p>
            © {new Date().getFullYear()} Neqpola. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
