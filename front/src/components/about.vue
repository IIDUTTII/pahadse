<script setup>
defineOptions({
  name: 'AboutView'
})
</script>

<template>
  <div class="about-page-wrapper">
    
    <!-- 🏔️ Hero Section -->
    <header class="about-hero">
      <h1 class="hero-title">Life in the Himalayas</h1>
      <p class="hero-subtitle">Seedha Pahadon Se: Shuddh, Pahari, Asli</p>
      <div class="hero-image">
        <img 
          src="https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg" 
          alt="Scenic Himalayan Mountains - The majestic peaks of Himachal Pradesh"
          class="hero-img"
        >
      </div>
    </header>

    <div class="about-container">
      
      <!-- 🌿 Section 1: The Mountain Way -->
      <section class="story-section alternating-layout">
        <div class="text-content">
          <h2>The Mountain Way of Life</h2>
          <p>The Himalayan region is known for its pristine environment, traditional lifestyles, and rich agricultural heritage. For us, the mountains are not just where we live—they are the very essence of who we are.</p>
          <p>Daily life here is dictated by the rhythm of changing seasons, the flow of natural springs, and a profound connection to the land. In our households, ancient methods of preparing food are not just remembered; they are actively practiced. These traditions, passed down through generations, are the soul of every product we bring to your table.</p>
        </div>
        <div class="image-content">
          <img 
            src="https://images.pexels.com/photos/257360/pexels-photo-257360.jpeg" 
            alt="Traditional Himalayan village with wooden houses and terraced fields"
            class="section-img"
          >
        </div>
      </section>

      <!-- 🤝 Section 2: Mission & Revival -->
      <section class="story-section alternating-layout reverse">
        <div class="image-content">
          <img 
            src="https://images.pexels.com/photos/4100016/pexels-photo-4100016.jpeg" 
            alt="Local Himachali family preparing traditional food - Community producers"
            class="section-img"
          >
        </div>
        <div class="text-content">
          <h2>Bridging Communities to You</h2>
          <p><strong>PahadSe</strong> is more than a storefront; it is a bridge connecting you directly to the authentic mountain families of Himachal Pradesh. We don't own large farms — instead, we work with and support multiple small-scale producers across Seraj Valley.</p>
          <p>We collect pure Bilona ghee, traditional oils, raw spices, and forest honey from local families who have perfected their craft over generations. Our role is to bring their honest, traditional products to customers who appreciate authenticity.</p>
          <ul class="mission-list">
            <li><strong>Support Local Families:</strong> We source from 25+ households across the valley, not just one farm.</li>
            <li><strong>Fair Value:</strong> By eliminating middlemen, fair prices reach the actual producers.</li>
            <li><strong>Preserve Heritage:</strong> Every purchase helps sustain traditional knowledge and skills.</li>
            <li><strong>Authentic Products:</strong> What you receive is exactly what the mountain families prepared.</li>
          </ul>
          <p>We are simply the messenger. The real heroes are the mountain families who wake up before sunrise, tend to their livestock, harvest wild forest produce, and prepare food the way their ancestors did.</p>
        </div>
      </section>

      <div class="section-divider"></div>

      <!-- ⭐ Section 3: Our Promise -->
      <section class="promise-section">
        <h2 class="text-center">Our Promise to You</h2>
        <p class="text-center subtitle">We do not aim to be the biggest brand. We aim to be the brand you trust.</p>
        
        <div class="promise-grid">
          <div class="promise-card">
            <span class="promise-icon">🌿</span>
            <h4>Carefully Selected</h4>
            <p>Only the purest, most authentic provisions make it from our hills to your home.</p>
          </div>
          <div class="promise-card">
            <span class="promise-icon">⚖️</span>
            <h4>Honest Sourcing</h4>
            <p>Transparent information, fair trade with farmers, and deep respect for traditional practices.</p>
          </div>
          <div class="promise-card">
            <span class="promise-icon">🛡️</span>
            <h4>Food Safety Compliant</h4>
            <p>High standards of hygiene and quality without losing the raw authenticity of the product.</p>
            <code class="fssai-code">FSSAI: XXXXXXXXXXXXXX</code>
          </div>
          <div class="promise-card">
            <span class="promise-icon">🏔️</span>
            <h4>Community First</h4>
            <p>Every purchase supports multiple mountain families, not just one producer.</p>
          </div>
        </div>
      </section>

      <div class="section-divider"></div>

      <!-- 📍 Section 4: Our Home & Community -->
      <section class="community-section">
        <div class="location-card">
          <h3>Our Home</h3>
          <p class="location-text">
            <strong>Seraj Valley</strong><br>
            Mandi District<br>
            Himachal Pradesh, India
          </p>
          <p>From this small valley, we coordinate with local families who produce traditional goods using methods passed down for generations. We don't own farms — we partner with families who do.</p>
          <div class="small-img-container">
            <img 
              src="https://images.pexels.com/photos/3057904/pexels-photo-3057904.jpeg" 
              alt="Seraj Valley landscape - Beautiful mountain views of Himachal"
              class="small-img"
            >
          </div>
        </div>

        <div class="social-card">
          <h3>Follow Our Journey</h3>
          <p>Join our growing community. We regularly share stories of the families we work with, behind-the-scenes harvest moments, and glimpses of authentic Himachali life.</p>
          <div class="social-links">
            <a href="#" class="social-btn">📷 Instagram: @PahadSe</a>
            <a href="#" class="social-btn">📘 Facebook: @PahadSe</a>
            <a href="#" class="social-btn">▶️ YouTube: @PahadSe</a>
          </div>
        </div>
      </section>

      <!-- 🖋️ Section 5: Founder's Note -->
      <section class="founder-section">
        <blockquote class="founder-quote">
          <span class="quote-mark">“</span>
          I don't own farms or produce everything myself. What I do have is deep respect for the mountain families I grew up around. PahadSe is my effort to bring their honest work to people who will appreciate it. Every order means one more family in these hills gets fair value for their traditional skills.
          <span class="quote-mark right">”</span>
        </blockquote>
        <div class="founder-meta">
          <strong>— Bhawani Dutt</strong>
          <span>Founder, PahadSe</span>
        </div>
      </section>

      <!-- 🙏 Section 6: Thank You -->
      <section class="thankyou-section">
        <h2>Thank You</h2>
        <p>Thank you for visiting PahadSe.</p>
        <p>Your support helps preserve traditional knowledge, supports multiple families across Himachal Pradesh, and encourages us to continue bridging the gap between authentic mountain producers and conscious customers like you.</p>
        <p>We look forward to serving you.</p>
        <div class="signature">
          <p>With gratitude,</p>
          <p><strong>Team PahadSe</strong></p>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
.about-page-wrapper {
  background-color: #FAF6F0;
  min-height: 100vh;
  padding: calc(60px + 40px) 4% 80px;
  box-sizing: border-box;
  font-family: 'Jost', system-ui, sans-serif;
  color: #0f172a;
}

.about-container {
  max-width: 1140px;
  margin: 0 auto;
}

/* 🏔️ Hero Section */
.about-hero {
  text-align: center;
  margin-bottom: 60px;
}

.hero-title {
  font-family: 'Cinzel', serif;
  font-size: 3rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 10px;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: #16a34a;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 30px;
}

.hero-image {
  width: 100%;
  height: 450px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.15);
  border: 2px solid #0f172a;
}

.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 🌿 Story Sections */
.story-section {
  margin-bottom: 60px;
}

.alternating-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 50px;
  align-items: center;
}

.alternating-layout.reverse .text-content {
  order: 2;
}

.alternating-layout.reverse .image-content {
  order: 1;
}

.text-content {
  margin-left: 0;
  padding-left: 0;
}

.text-content h2 {
  font-family: 'Cinzel', serif;
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 20px 0;
  padding-left: 0;
  color: #0f172a;
}

/* CHANGED: Paragraphs now left-aligned like legal documents */
.text-content p {
  font-family: Georgia, Cambria, "Times New Roman", serif;
  font-size: 1.05rem;
  line-height: 1.7;
  color: #334155;
  margin: 0 0 16px 0;
  padding-left: 0;
  text-align: left;
}

.mission-list {
  list-style: none;
  margin: 0 0 20px 0;
  padding-left: 0;
}

.mission-list li {
  font-size: 1rem;
  color: #334155;
  margin-bottom: 12px;
  padding-left: 22px;
  position: relative;
  line-height: 1.5;
  text-align: left;
}

.mission-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #16a34a;
  font-weight: 900;
}

/* Image Styles */
.image-content {
  width: 100%;
}

.section-img {
  width: 100%;
  height: 380px;
  object-fit: cover;
  border-radius: 16px;
  border: 2px solid #0f172a;
  box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease;
}

.section-img:hover {
  transform: scale(1.02);
}

.small-img-container {
  margin-top: 20px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #0f172a;
}

.small-img {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.section-divider {
  height: 2px;
  background-color: #cbd5e1;
  width: 100px;
  margin: 60px auto;
}

/* ⭐ Promises Grid */
.text-center { 
  text-align: center; 
}

.promise-section h2 {
  font-family: 'Cinzel', serif;
  color: rgb(9, 43, 90);
  font-size: 2.2rem;
  font-weight: 800;
  margin: 0 0 8px;
}

.subtitle {
  font-size: 1.1rem;
  color: rgb(9, 43, 90);
  font-weight: 600;
  margin-bottom: 40px;
}

.promise-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.promise-card {
  background-color: #ffffff;
  border: 2px solid #cbd5e1;
  border-radius: 12px;
  padding: 30px 24px;
  text-align: center;
  transition: transform 0.2s, border-color 0.2s;
}

.promise-card:hover {
  transform: translateY(-5px);
  border-color: #16a34a;
}

.promise-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 16px;
}

.promise-card h4 {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0 0 10px;
  color: #0f172a;
}

.promise-card p {
  font-size: 0.95rem;
  color: #475569;
  line-height: 1.5;
  margin: 0;
  text-align: center;
}

.fssai-code {
  display: inline-block;
  margin-top: 14px;
  background-color: #f8fafc;
  border: 1px solid #cbd5e1;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #0f172a;
}

/* 📍 Community & Location */
.community-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.location-card, .social-card {
  background-color: #ffffff;
  border: 2px solid #0f172a;
  border-radius: 12px;
  padding: 40px;
}

.location-card h3, .social-card h3 {
  font-family: 'Cinzel', serif;
  font-size: 1.6rem;
  font-weight: 800;
  margin: 0 0 16px;
}

.location-text {
  font-size: 1.2rem;
  line-height: 1.6;
  color: #16a34a;
  margin-bottom: 16px;
}

/* CHANGED: Location and social card paragraphs left-aligned */
.location-card p, .social-card p {
  font-size: 1.05rem;
  color: #334155;
  line-height: 1.6;
  margin-bottom: 24px;
  text-align: left;
}

.social-links {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.social-btn {
  display: block;
  text-align: center;
  background-color: #f8fafc;
  border: 2px solid #cbd5e1;
  color: #0f172a;
  padding: 14px;
  border-radius: 8px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.2s;
}

.social-btn:hover {
  background-color: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

/* 🖋️ Founder Note */
.founder-section {
  margin-top: 60px;
  background-color: #0f172a;
  color: #ffffff;
  padding: 60px 40px;
  border-radius: 16px;
  text-align: center;
  position: relative;
}

.founder-quote {
  font-size: 1.4rem;
  line-height: 1.6;
  font-style: italic;
  font-weight: 400;
  max-width: 800px;
  margin: 0 auto 30px;
  position: relative;
  text-align: center;
}

.quote-mark {
  font-family: serif;
  font-size: 4rem;
  color: #16a34a;
  position: absolute;
  top: -20px;
  left: -30px;
  opacity: 0.4;
}

.quote-mark.right {
  top: auto;
  bottom: -40px;
  left: auto;
  right: -20px;
}

.founder-meta strong {
  display: block;
  font-size: 1.2rem;
  font-weight: 800;
  margin-bottom: 4px;
  color: #16a34a;
}

.founder-meta span {
  font-size: 0.95rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Thank You Section */
.thankyou-section {
  text-align: center;
  margin-top: 60px;
  padding-top: 40px;
}

.thankyou-section h2 {
  font-family: 'Cinzel', serif;
  font-size: 1.8rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 20px;
}

/* CHANGED: Thank you paragraphs left-aligned */
.thankyou-section p {
  font-size: 1rem;
  line-height: 1.7;
  color: #475569;
  margin-bottom: 15px;
  text-align: left;
}

.signature {
  margin-top: 30px;
}

.signature p {
  margin: 5px 0;
  color: #475569;
  text-align: center;
}

.signature strong {
  color: #0f172a;
}

/* Responsiveness */
@media (max-width: 900px) {
  .alternating-layout, .community-section {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .alternating-layout.reverse .text-content { 
    order: 1; 
  }
  
  .alternating-layout.reverse .image-content { 
    order: 2; 
  }
  
  .hero-title { 
    font-size: 2.2rem; 
  }
  
  .hero-image {
    height: 250px;
  }
  
  .founder-quote { 
    font-size: 1.15rem; 
  }
  
  .quote-mark { 
    display: none; 
  }
  
  .section-img {
    height: 280px;
  }
}

@media (max-width: 600px) {
  .hero-title {
    font-size: 1.8rem;
  }
  
  .hero-image {
    height: 200px;
  }
  
  .section-img {
    height: 220px;
  }
  
  .location-card, .social-card {
    padding: 25px;
  }
  
  .founder-section {
    padding: 35px 20px;
  }
  
  .promise-card {
    padding: 20px 15px;
  }
}
</style>