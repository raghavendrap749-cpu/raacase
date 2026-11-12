function AboutPage() {
  return (
    <section className="about-page section-page">
      <div className="section-heading centered">
        <span className="section-label">About Raacase</span>
        <h1>Designed for better phone days.</h1>
      </div>

      <div className="about-story">
        <div className="story-copy">
          <h2>Back covers that feel personal.</h2>
          <p>Raacase started with a simple belief: your phone should feel protected, personal, and ready for every part of the day. We design and curate back covers that make daily phone use more stylish.</p>
          <p>Our collection focuses on soft-touch finishes, printed colors, and slim everyday protection.</p>
          <div className="about-values">
            <div>
              <span className="value-number">01</span>
              <span className="value-title">Reliable Quality</span>
            </div>
            <div>
              <span className="value-number">02</span>
              <span className="value-title">Smart Design</span>
            </div>
            <div>
              <span className="value-number">03</span>
              <span className="value-title">Fast Support</span>
            </div>
          </div>
        </div>
        <div className="story-image">
          <div className="about-card">
            <span className="about-card-icon">✦</span>
            <div className="about-card-content">
              <span className="year-label">Since 2026</span>
              <span className="year-copy">Accessory Studio</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutPage
