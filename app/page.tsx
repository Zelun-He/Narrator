import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Mic } from "lucide-react";
import { BookCover } from "@/components/studio-elements";
import { NarrationSample } from "@/components/narration-sample";
import "./landing.css";

export const metadata: Metadata = {
  title: "Narrator — Your book, read aloud beautifully",
  description:
    "A little more life for your words. Turn your manuscript into audio with Narrator, a free, open-source audiobook studio for indie authors.",
};

const steps = [
  {
    title: "Upload your book",
    copy: "Bring your manuscript. We’ll organize it into chapters, ready for you to review.",
  },
  {
    title: "Find its voice",
    copy: "Listen to our English narrator, check your first page, and make yourself at home.",
  },
  {
    title: "Make time to listen",
    copy: "Follow each chapter as it’s narrated. Play and download the audio when it’s ready.",
  },
];

export default function HomePage() {
  return (
    <div className="story-site">
      <a href="#story-main" className="story-skip">
        Skip to content
      </a>
      <header className="story-nav story-wrap">
        <Link href="/" className="story-logo" aria-label="Narrator home">
          <span aria-hidden="true" />
          Narrator
        </Link>
        <nav aria-label="Main navigation">
          <a href="#how">How it works</a>
          <a href="#voices">Voices</a>
          <a href="#pricing">Pricing</a>
          <Link href="/library" className="library-nav">
            Your library
          </Link>
          <Link
            href="/upload"
            className="story-button story-button-forest nav-start"
          >
            Start free <ArrowRight size={15} />
          </Link>
        </nav>
      </header>

      <main id="story-main" tabIndex={-1}>
        <section className="story-hero story-wrap" aria-labelledby="hero-title">
          <div className="story-hero-copy">
            <p className="handwritten">for indie authors ✦</p>
            <h1 id="hero-title">
              Your book,
              <br />
              read aloud <span className="marker">beautifully.</span>
            </h1>
            <p className="story-lede">
              You’ve written a world. Give it a voice. Turn your manuscript into
              an audiobook, with a little help from Narrator.
            </p>
            <div className="story-actions">
              <Link href="/upload" className="story-button story-button-coral">
                Turn my book into audio <ArrowRight size={18} />
              </Link>
              <NarrationSample compact />
            </div>
            <p className="hero-formats story-label">
              FREE TO CREATE · .TXT · .DOCX · .PDF
            </p>
            <p className="hero-footnote">
              No subscription. No royalty split. Just your story.
            </p>
          </div>
          <div className="story-hero-art">
            <div className="story-arch">
              <Image
                src="/images/narrator-library-header.webp"
                alt=""
                aria-hidden="true"
                fill
                sizes="(min-width: 1100px) 520px, (min-width: 768px) 44vw, 90vw"
                preload
                className="arch-photo"
              />
              <div
                className="arch-books"
                role="img"
                aria-label="Illustrative book covers"
              >
                <div className="arch-book-back">
                  <BookCover
                    title="A world of your own"
                    author="An unwritten adventure"
                    color="#825f32"
                    decorative
                  />
                </div>
                <div className="arch-book-front">
                  <BookCover
                    title="Your next chapter"
                    author="A story by you"
                    color="#34554b"
                    decorative
                  />
                </div>
              </div>
              <p className="arch-caption story-label">
                EVERY STORY HAS A SOUND.
              </p>
            </div>
            <span className="story-sticker hero-sticker">
              a voice for your words
            </span>
            <div className="floating-sample">
              <NarrationSample />
            </div>
          </div>
        </section>

        <div className="story-values story-wrap" aria-label="Made for authors">
          <span>
            <Check size={16} /> Free & open source
          </span>
          <span>
            <Check size={16} /> Your story stays yours
          </span>
          <span>
            <Check size={16} /> A chapter at a time
          </span>
        </div>

        <section id="how" className="story-how" aria-labelledby="how-title">
          <div className="story-wrap">
            <div className="how-heading">
              <p className="handwritten">three little steps</p>
              <h2 id="how-title">
                From the page
                <br />
                to someone’s headphones.
              </h2>
              <p>Put the kettle on. Let’s give your book a new beginning.</p>
            </div>
            <div className="how-grid">
              {steps.map((step, i) => (
                <article className="how-card" key={step.title}>
                  <span className="step-number">{i + 1}</span>
                  <span className="story-label">
                    {["THE MANUSCRIPT", "THE NARRATOR", "THE AUDIOBOOK"][i]}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              ))}
            </div>
            <p className="how-note">
              A small studio, still growing.{" "}
              <Link href="/guide">
                See what’s supported today <ArrowRight size={14} />
              </Link>
            </p>
          </div>
        </section>

        <section
          id="voices"
          className="story-voices story-wrap"
          aria-labelledby="voices-title"
        >
          <div className="story-section-heading">
            <div>
              <p className="handwritten">meet the cast</p>
              <h2 id="voices-title">Every voice has a story.</h2>
            </div>
            <Link href="/voices" className="story-text-link">
              Visit the voice studio <ArrowRight size={17} />
            </Link>
          </div>
          <p className="section-intro">
            One narrator to begin with. A whole cast to dream about.
          </p>
          <div className="cast-grid">
            <article className="cast-card cast-peach">
              <span className="cast-initial" aria-hidden="true">
                L
              </span>
              <span className="story-label cast-tag">AVAILABLE · ENGLISH</span>
              <h3>Lessac</h3>
              <p>Clear, natural, and ready for your next chapter.</p>
              <Link href="/voices" className="cast-action">
                Meet your narrator <ArrowRight size={16} />
              </Link>
            </article>
            <article className="cast-card cast-mint">
              <span className="cast-initial" aria-hidden="true">
                H
              </span>
              <span className="story-label cast-tag">ROMANCE · CONCEPT</span>
              <h3>Hazel</h3>
              <p>Warm and a little conspiratorial.</p>
              <span className="cast-future story-label">
                A FUTURE CAST MEMBER
              </span>
            </article>
            <article className="cast-card cast-yellow">
              <span className="cast-initial" aria-hidden="true">
                B
              </span>
              <span className="story-label cast-tag">FANTASY · CONCEPT</span>
              <h3>Bartholomew</h3>
              <p>Velvety, with dragons in it.</p>
              <span className="cast-future story-label">
                A FUTURE CAST MEMBER
              </span>
            </article>
            <article className="cast-card cast-you">
              <span className="cast-initial" aria-hidden="true">
                <Mic size={26} />
              </span>
              <span className="story-label cast-tag">SOMEDAY · YOUR VOICE</span>
              <h3>You</h3>
              <p>Imagine telling your story in your own voice.</p>
              <span className="cast-future story-label">
                VOICE CLONING IS PLANNED
              </span>
            </article>
          </div>
          <p className="cast-note">
            Hazel, Bartholomew, and voice cloning are concepts, not selectable
            voices yet.
          </p>
        </section>

        <section
          id="pricing"
          className="story-pricing story-wrap"
          aria-labelledby="pricing-title"
        >
          <p className="handwritten">more story, less fine print</p>
          <h2 id="pricing-title">
            Author-sized pricing.
            <br />
            That means free.
          </h2>
          <p className="pricing-intro">
            A passion project for people with stories to tell.
          </p>
          <div className="pricing-grid">
            <article className="price-card">
              <span className="story-label">YOUR FIRST STORY</span>
              <h3>A new beginning</h3>
              <p className="price">
                $0<span> / book</span>
              </p>
              <p>
                Bring a manuscript, meet your narrator, and start making
                something worth listening to.
              </p>
              <ul>
                <li>
                  <Check size={17} /> One English narrator
                </li>
                <li>
                  <Check size={17} /> Review before you create
                </li>
                <li>
                  <Check size={17} /> Chapter audio in WAV format
                </li>
              </ul>
              <Link
                href="/upload"
                className="story-button story-button-outline"
              >
                Narrate my book <ArrowRight size={17} />
              </Link>
            </article>
            <article className="price-card price-card-green">
              <span className="story-sticker price-sticker">
                made for your stories
              </span>
              <span className="story-label">YOUR NEXT CHAPTER</span>
              <h3>Keep the stories coming</h3>
              <p className="price">
                Still $0<span> / book</span>
              </p>
              <p>
                A bookshelf of possibilities. Return to your studio whenever
                your next story is ready.
              </p>
              <ul>
                <li>
                  <Check size={17} /> No monthly subscription
                </li>
                <li>
                  <Check size={17} /> No credit card needed
                </li>
                <li>
                  <Check size={17} /> No royalty split
                </li>
              </ul>
              <Link href="/library" className="story-button story-button-coral">
                Open my studio <ArrowRight size={17} />
              </Link>
            </article>
          </div>
          <p className="pricing-note">
            Free software, powered by the project’s narration engine.{" "}
            <Link href="/guide">Read the getting-started guide.</Link>
          </p>
        </section>

        <section
          className="story-final story-wrap"
          aria-labelledby="final-title"
        >
          <div>
            <p className="handwritten">a new way to fall into a book</p>
            <h2 id="final-title">
              Your readers are
              <br />
              waiting to <em>listen.</em>
            </h2>
            <p>Let’s give your words a life beyond the page.</p>
          </div>
          <Link href="/upload" className="story-button story-button-forest">
            Bring my book to life <ArrowRight size={19} />
          </Link>
          <span className="story-sticker final-sticker">
            THE NEXT CHAPTER IS YOURS
          </span>
        </section>
      </main>
      <footer className="story-footer story-wrap">
        <Link href="/" className="story-logo">
          <span aria-hidden="true" />
          Narrator
        </Link>
        <p>Words deserve to be heard.</p>
        <nav aria-label="Footer navigation">
          <Link href="/guide">Help</Link>
          <a
            href="https://github.com/Zelun-He/Narrator"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <Link href="/library">Your library</Link>
        </nav>
        <span className="story-label">© 2026 NARRATOR</span>
      </footer>
    </div>
  );
}
