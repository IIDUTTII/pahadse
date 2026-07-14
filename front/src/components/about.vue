<script setup>
defineOptions({ name: 'AboutView' })
const IMAGES = {
  hero: 'https://firebasestorage.googleapis.com/v0/b/pahadse-13309.firebasestorage.app/o/contact%2Fhero2.jpg?alt=media&token=ff12c12e-3078-411a-bc76-f36b6928eaf1',

  village: 'https://firebasestorage.googleapis.com/v0/b/pahadse-13309.firebasestorage.app/o/contact%2Fvillage-women.jpg?alt=media&token=2b210d97-e255-499f-a4ab-98f6f67da6bc',
  family: 'https://firebasestorage.googleapis.com/v0/b/pahadse-13309.firebasestorage.app/o/contact%2Fvillage.jpg?alt=media&token=87f75b78-6bc9-40b0-965a-09efd60260d4',
  valley: 'https://images.pexels.com/photos/3057904/pexels-photo-3057904.jpeg',
  founder: 'https://firebasestorage.googleapis.com/v0/b/pahadse-13309.firebasestorage.app/o/contact%2Ffounder.jpg?alt=media&token=afb61aba-bbba-4974-a4d2-4416332d01db'
  }
</script>
<template>
  <div class="about-page-wrapper">
    <header class="about-hero"><h1 class="hero-title">Life in the Himalayas</h1><p class="hero-subtitle">Seedha Pahadon Se: Shuddh, Pahari, Asli</p><div class="hero-image"><img :src="IMAGES.hero" alt="Scenic Himalayan Mountains" class="hero-img hero-pos"></div></header>
    <div class="about-container">
      <!-- Section 1 -->
      <section class="story-section alternating-layout"><div class="text-content"><h2>The Mountain Way of Life</h2><p>The Himalayan region is known for its pristine environment, traditional lifestyles, and rich agricultural heritage. For us, the mountains are not just where we live—they are the very essence of who we are.</p><p>Daily life here is dictated by the rhythm of changing seasons, the flow of natural springs, and a profound connection to the land. In our households, ancient methods of preparing food are not just remembered; they are actively practiced. These traditions, passed down through generations, are the soul of every product we bring to your table.</p></div><div class="image-content"><img :src="IMAGES.village" alt="Traditional Himalayan village" class="section-img village-pos"></div></section>

      <!-- Section 2 -->
      <section class="story-section alternating-layout reverse"><div class="image-content"><img :src="IMAGES.family" alt="Local Himachali family preparing traditional food" class="section-img family-pos"></div><div class="text-content"><h2>Bridging Communities to You</h2><p><strong>PahadS</strong> is more than a storefront; it is a bridge connecting you directly to the authentic mountain families of Himachal Pradesh. We don't own large farms — instead, we work with and support multiple small-scale producers across Seraj Valley.</p><p>We collect pure Bilona ghee, traditional oils, raw spices, and forest honey from local families who have perfected their craft over generations. Our role is to bring their honest, traditional products to customers who appreciate authenticity.</p><ul class="mission-list"><li><strong>Support Local Families:</strong> We source from 25+ households across the valley, not just one farm.</li><li><strong>Fair Value:</strong> By eliminating middlemen, fair prices reach the actual producers.</li><li><strong>Preserve Heritage:</strong> Every purchase helps sustain traditional knowledge and skills.</li><li><strong>Authentic Products:</strong> What you receive is exactly what the mountain families prepared.</li></ul><p>We are simply the messenger. The real heroes are the mountain families who wake up before sunrise, tend to their livestock, harvest wild forest produce, and prepare food the way their ancestors did.</p></div></section>

      <!-- 👇 NEW: FOUNDER SECTION (Section 2.5) -->
      <section class="founder-story-section alternating-layout"><div class="text-content"><h2>Meet Our Founder</h2><p><strong>Bhawani Dutt</strong> was born and raised in the heart of Himachal Pradesh, surrounded by the very mountains and communities that PahadS now serves.</p><p>After spending years in the corporate world, he realized that the traditional knowledge of his homeland was slowly fading away. The younger generation was moving to cities, and the ancient practices of making pure Bilona ghee, cold-pressed oils, and forest honey were being replaced by mass-produced alternatives.</p><p>That's when he decided to return to his roots. PahadS was born not as a business, but as a mission — to bridge the gap between authentic mountain producers and conscious consumers.</p><p><em>"I don't own farms or produce everything myself. What I do have is deep respect for the mountain families I grew up around. PahadS is my effort to bring their honest work to people who will appreciate it."</em></p></div><div class="image-content"><img :src="IMAGES.founder" alt="Founder Bhawani Dutt - PahadS" class="section-img founder-pos"></div></section>
      <div class="section-divider"></div>

      <!-- Section 3 -->
      <section class="promise-section"><h2 class="text-center">Our Promise to You</h2><p class="text-center subtitle">We do not aim to be the biggest brand. We aim to be the brand you trust.</p><div class="promise-grid"><div class="promise-card"><span class="promise-icon">🌿</span><h4>Carefully Selected</h4><p>Only the purest, most authentic provisions make it from our hills to your home.</p></div><div class="promise-card"><span class="promise-icon">⚖️</span><h4>Honest Sourcing</h4><p>Transparent information, fair trade with farmers, and deep respect for traditional practices.</p></div><div class="promise-card"><span class="promise-icon">🛡️</span><h4>Food Safety Compliant</h4><p>High standards of hygiene and quality without losing the raw authenticity of the product.</p><code class="fssai-code">FSSAI: XXXXXXXXXXXXXX</code></div><div class="promise-card"><span class="promise-icon">🏔️</span><h4>Community First</h4><p>Every purchase supports multiple mountain families, not just one producer.</p></div></div></section>
      <div class="section-divider"></div>

      <!-- Section 4 -->
      <section class="community-section"><div class="location-card"><h3>Our Home</h3><p class="location-text"><strong>Seraj Valley</strong><br>Mandi District<br>Himachal Pradesh, India</p><p>From this small valley, we coordinate with local families who produce traditional goods using methods passed down for generations. We don't own farms — we partner with families who do.</p><div class="small-img-container"><img :src="IMAGES.valley" alt="Seraj Valley landscape" class="small-img valley-pos"></div></div><div class="social-card"><h3>Follow Our Journey</h3><p>Join our growing community. We regularly share stories of the families we work with, behind-the-scenes harvest moments, and glimpses of authentic Himachali life.</p><div class="social-links"><a href="#" class="social-btn">📷 Instagram: @PahadS</a><a href="#" class="social-btn">📘 Facebook: @PahadS</a><a href="#" class="social-btn">▶️ YouTube: @PahadS</a></div></div></section>

      <!-- Section 5 -->
      <section class="founder-section"><blockquote class="founder-quote"><span class="quote-mark">“</span>I don't own farms or produce everything myself. What I do have is deep respect for the mountain families I grew up around. PahadS is my effort to bring their honest work to people who will appreciate it. Every order means one more family in these hills gets fair value for their traditional skills.<span class="quote-mark right">”</span></blockquote><div class="founder-meta"><strong>— Bhawani Dutt</strong><span>Founder, PahadS</span></div></section>

      <!-- Section 6 -->
      <section class="thankyou-section"><h2>Thank You</h2><p>Thank you for visiting PahadS.</p><p>Your support helps preserve traditional knowledge, supports multiple families across Himachal Pradesh, and encourages us to continue bridging the gap between authentic mountain producers and conscious customers like you.</p><p>We look forward to serving you.</p><div class="signature"><p>With gratitude,</p><p><strong>Team PahadS</strong></p></div></section>
    </div>
  </div>
</template>
<style scoped>
.about-page-wrapper{background-color:#FAF6F0;min-height:100vh;padding:calc(60px + 40px) 4% 80px;box-sizing:border-box;font-family:'Jost',system-ui,sans-serif;color:#0f172a}
.about-container{max-width:1140px;margin:0 auto}
.about-hero{text-align:center;margin-bottom:60px}
.hero-title{font-family:'Cinzel',serif;font-size:3rem;font-weight:800;color:#0f172a;margin:0 0 10px}
.hero-subtitle{font-size:1.1rem;color:#16a34a;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 30px}
.hero-image{width:100%;height:450px;border-radius:20px;overflow:hidden;box-shadow:0 20px 30px -10px rgba(0,0,0,0.15);border:2px solid #0f172a}
.hero-img{width:100%;height:100%;object-fit:cover}
.story-section{margin-bottom:60px}
.alternating-layout{display:grid;grid-template-columns:1fr 1fr;gap:50px;align-items:center}
.alternating-layout.reverse .text-content{order:2}
.alternating-layout.reverse .image-content{order:1}
.text-content{margin-left:0;padding-left:0}
.text-content h2{font-family:'Cinzel',serif;font-size:2rem;font-weight:800;margin:0 0 20px 0;padding-left:0;color:#0f172a}
.text-content p{font-family:Georgia,Cambria,"Times New Roman",serif;font-size:1.05rem;line-height:1.7;color:#334155;margin:0 0 16px 0;padding-left:0;text-align:left}
.mission-list{list-style:none;margin:0 0 20px 0;padding-left:0}
.mission-list li{font-size:1rem;color:#334155;margin-bottom:12px;padding-left:22px;position:relative;line-height:1.5;text-align:left}
.mission-list li::before{content:'✓';position:absolute;left:0;color:#16a34a;font-weight:900}
.image-content{width:100%;overflow:hidden;border-radius:16px}
.section-img{width:100%;object-fit:cover;border-radius:16px;border:2px solid #0f172a;box-shadow:8px 8px 0px rgba(0,0,0,0.05);transition:transform 0.3s ease}
.section-img:hover{transform:scale(1.02)}
.small-img-container{margin-top:20px;border-radius:12px;overflow:hidden;border:2px solid #0f172a}
.small-img{width:100%;height:180px;object-fit:cover}
.section-divider{height:2px;background-color:#cbd5e1;width:100px;margin:60px auto}
.text-center{text-align:center}
.promise-section h2{font-family:'Cinzel',serif;color:#092b5a;font-size:2.2rem;font-weight:800;margin:0 0 8px}
.subtitle{font-size:1.1rem;color:#092b5a;font-weight:600;margin-bottom:40px}
.promise-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px}
.promise-card{background-color:#ffffff;border:2px solid #cbd5e1;border-radius:12px;padding:30px 24px;text-align:center;transition:transform 0.2s,border-color 0.2s}
.promise-card:hover{transform:translateY(-5px);border-color:#16a34a}
.promise-icon{font-size:2.5rem;display:block;margin-bottom:16px}
.promise-card h4{font-size:1.15rem;font-weight:800;margin:0 0 10px;color:#0f172a}
.promise-card p{font-size:0.95rem;color:#475569;line-height:1.5;margin:0;text-align:center}
.fssai-code{display:inline-block;margin-top:14px;background-color:#f8fafc;border:1px solid #cbd5e1;padding:4px 10px;border-radius:6px;font-size:0.8rem;font-weight:700;color:#0f172a}
.community-section{display:grid;grid-template-columns:1fr 1fr;gap:30px}
.location-card,.social-card{background-color:#ffffff;border:2px solid #0f172a;border-radius:12px;padding:40px}
.location-card h3,.social-card h3{font-family:'Cinzel',serif;font-size:1.6rem;font-weight:800;margin:0 0 16px}
.location-text{font-size:1.2rem;line-height:1.6;color:#16a34a;margin-bottom:16px}
.location-card p,.social-card p{font-size:1.05rem;color:#334155;line-height:1.6;margin-bottom:24px;text-align:left}
.social-links{display:flex;flex-direction:column;gap:12px}
.social-btn{display:block;text-align:center;background-color:#f8fafc;border:2px solid #cbd5e1;color:#0f172a;padding:14px;border-radius:8px;font-weight:700;text-decoration:none;transition:all 0.2s}
.social-btn:hover{background-color:#0f172a;color:#ffffff;border-color:#0f172a}
.founder-section{margin-top:60px;background-color:#0f172a;color:#ffffff;padding:60px 40px;border-radius:16px;text-align:center;position:relative}
.founder-quote{font-size:1.4rem;line-height:1.6;font-style:italic;font-weight:400;max-width:800px;margin:0 auto 30px;position:relative;text-align:center}
.quote-mark{font-family:serif;font-size:4rem;color:#16a34a;position:absolute;top:-20px;left:-30px;opacity:0.4}
.quote-mark.right{top:auto;bottom:-40px;left:auto;right:-20px}
.founder-meta strong{display:block;font-size:1.2rem;font-weight:800;margin-bottom:4px;color:#16a34a}
.founder-meta span{font-size:0.95rem;color:#94a3b8;text-transform:uppercase;letter-spacing:1px}
.thankyou-section{text-align:center;margin-top:60px;padding-top:40px}
.thankyou-section h2{font-family:'Cinzel',serif;font-size:1.8rem;font-weight:800;color:#0f172a;margin-bottom:20px}
.thankyou-section p{font-size:1rem;line-height:1.7;color:#475569;margin-bottom:15px;text-align:left}
.signature{margin-top:30px}
.signature p{margin:5px 0;color:#475569;text-align:center}
.signature strong{color:#0f172a}

/* ===== YOUR ORIGINAL IMAGE SIZES (KEPT AS YOU HAD) ===== */
.hero-pos{object-position:center 60%}

.village-pos{object-fit:cover;transform:scale(1.19);transform-origin:55% 18%}

.family-pos{width:92%;aspect-ratio:9/16;object-fit:cover;object-position:center 50%;margin:0 auto;display:block}

.valley-pos{aspect-ratio:3/4;object-position:center 60%}

/* ===== FIXED FOUNDER IMAGE ===== */
.founder-pos{width:80%;aspect-ratio:1/1;object-fit:cover;margin:0 auto;display:block}

/* ===== MOBILE MEDIA - ONLY CHANGES SIZES, NOT YOUR RATIOS ===== */
@media(max-width:900px){
  .alternating-layout,.community-section{grid-template-columns:1fr;gap:30px}
  .alternating-layout.reverse .text-content{order:1}
  .alternating-layout.reverse .image-content{order:2}
  .hero-title{font-size:2.2rem}
  .hero-image{height:250px}
  .founder-quote{font-size:1.15rem}
  .quote-mark{display:none}
  
  /* Mobile adjustments - keeping your ratios */
  .family-pos{aspect-ratio:4/3;width:100%}
  .valley-pos{aspect-ratio:4/3;width:100%}
  .founder-pos{width:90%;aspect-ratio:1/1}
}

@media(max-width:600px){
  .hero-title{font-size:1.8rem}
  .hero-image{height:200px}
  .location-card,.social-card{padding:25px}
  .founder-section{padding:35px 20px}
  .promise-card{padding:20px 15px}
  
  /* Mobile small adjustments */
  .family-pos{aspect-ratio:3/4;width:100%}
  .valley-pos{aspect-ratio:1/1;width:100%}
  .founder-pos{width:100%;aspect-ratio:1/1}
}
</style>