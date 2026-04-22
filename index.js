try {
      console.log('🔄 Chargement Supabase pour index.html...');
      
      const config = await import('./supabase-config.js');
      
      const { createClient } = window.supabase || supabase;
      const supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      
      window.supabase = supabaseClient;
      window.supabaseClient = {
        supabase: supabaseClient,
        async fetchVehicles() {
          const { data, error } = await supabaseClient.from('vehicles').select('*').order('created_at', { ascending: false });
          return { data: data || [], error };
        }
      };
      
      console.log('✅ Supabase prêt pour index.html');
      window.dispatchEvent(new Event('supabaseReady'));
      
      // ====== SCROLL EFFECTS ======
      const scrollIndicator = document.getElementById('scroll-indicator');
      let ticking = false;

      function updateScrollEffects() {
        const scrolled = window.scrollY;
        const height = document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.min(scrolled / height, 1);
        
        // Update CSS variable
        document.documentElement.style.setProperty('--scroll-progress', progress);
        
        // Update progress bar
        if (scrollIndicator) {
          scrollIndicator.style.width = `${progress * 100}%`;
        }
        
        ticking = false;
      }

      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(updateScrollEffects);
          ticking = true;
        }
      });

      // Initial call
      updateScrollEffects();
      
      // ====== AVIS CLIENTS ======
      let selectedRating = 0;
      const stars = document.querySelectorAll('.star');
      const ratingValue = document.getElementById('rating-value');
      const reviewForm = document.getElementById('review-form');
      const reviewsList = document.getElementById('reviews-list');

      stars.forEach(star => {
        star.addEventListener('click', function() {
          selectedRating = parseInt(this.dataset.rating);
          ratingValue.value = selectedRating;
          updateStars(selectedRating);
        });
        star.addEventListener('mouseenter', function() {
          updateStars(parseInt(this.dataset.rating));
        });
      });

      document.getElementById('star-rating').addEventListener('mouseleave', function() {
        updateStars(selectedRating);
      });

      function updateStars(rating) {
        stars.forEach((star, index) => {
          if (index < rating) { 
            star.textContent = '★'; 
            star.style.color = '#f59e0b';
            star.style.textShadow = '0 0 10px rgba(245, 158, 11, 0.5)';
          }
          else { 
            star.textContent = '☆'; 
            star.style.color = '#6b7280';
            star.style.textShadow = 'none';
          }
        });
      }

      async function loadReviews() {
        try {
          const { data, error } = await supabaseClient.from('reviews').select('*').order('created_at', { ascending: false });
          if (error) { console.error('❌ Erreur avis:', error); return; }
          displayReviews(data || []);
        } catch (e) { console.error('❌', e); }
      }

      function displayReviews(reviews) {
        if (reviews.length === 0) {
          reviewsList.innerHTML = '<div style="text-align:center;padding:60px;color:var(--muted);font-size:16px;">Aucun avis pour le moment. Soyez le premier !</div>';
          return;
        }
        reviewsList.innerHTML = reviews.map(review => {
          const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
          const date = new Date(review.created_at).toLocaleDateString('fr-FR');
          return `
            <div class="review-card">
              <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px;">
                <div>
                  <div style="font-size:24px;color:#f59e0b;margin-bottom:8px;filter:drop-shadow(0 0 10px rgba(245,158,11,0.3));">${stars}</div>
                  <div style="font-weight:700;color:var(--text);font-size:18px;">${escapeHtml(review.client_name)}</div>
                </div>
                <div style="color:var(--muted);font-size:13px;">${date}</div>
              </div>
              <p style="color:var(--muted);line-height:1.7;margin:0;font-size:15px;">${escapeHtml(review.comment)}</p>
            </div>
          `;
        }).join('');
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      reviewForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (selectedRating === 0) { alert('⭐ Veuillez sélectionner une note'); return; }
        const name = document.getElementById('review-name').value.trim();
        const comment = document.getElementById('review-comment').value.trim();
        const clientData = localStorage.getItem('clientData');
        if (!clientData) {
          localStorage.setItem('pendingReview', JSON.stringify({ name, comment, rating: selectedRating }));
          openLoginModal();
          return;
        }
        try {
          const { error } = await supabaseClient.from('reviews').insert([{ id: Date.now(), client_name: name, comment, rating: selectedRating }]);
          if (error) { alert('❌ Erreur publication'); return; }
          alert('✅ Avis publié !');
          reviewForm.reset(); selectedRating = 0; updateStars(0);
          await loadReviews();
        } catch (e) { alert('❌ ' + e.message); }
      });

      loadReviews();

      // ====== FORMULAIRE CONTACT ======
      const contactForm = document.getElementById('contact-form');
      if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
          e.preventDefault();
          const btn = document.getElementById('contact-submit-btn');
          btn.disabled = true;
          btn.textContent = '⏳ Envoi en cours...';
          const name    = document.getElementById('contact-name').value.trim();
          const email   = document.getElementById('contact-email').value.trim();
          const phone   = document.getElementById('contact-phone').value.trim();
          const subject = document.getElementById('contact-subject').value;
          const message = document.getElementById('contact-message').value.trim();
          try {
            const { error } = await supabaseClient.from('contact_messages').insert([{
              id: Date.now(), name, email, phone: phone || null,
              subject, message, read: false
            }]);
            if (error) { alert('❌ Erreur envoi : ' + error.message); return; }
            contactForm.style.display = 'none';
            document.getElementById('contact-success').style.display = 'block';
          } catch(e) {
            alert('❌ Erreur : ' + e.message);
          } finally {
            btn.disabled = false;
            btn.textContent = '✉️ Envoyer le message';
          }
        });
      }

      // ====== CONNEXION CLIENT ======
      const loginModalEl = document.getElementById('client-login-modal');
      const clientLoginForm = document.getElementById('client-login-form');
      const clientSignupForm = document.getElementById('client-signup-form');

      function updateAccountButton() {
        const raw = localStorage.getItem('clientData');
        const btn = document.getElementById('account-btn');
        let logoutBtn = document.getElementById('logout-btn');
        if (!btn) return;
        if (raw) {
          const client = JSON.parse(raw);
          const prenom = client.name ? client.name.split(' ')[0] : 'Mon compte';
          btn.textContent = '👤 ' + prenom;
          if (!logoutBtn) {
            logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.textContent = 'Déconnexion';
            logoutBtn.className = 'btn';
            logoutBtn.style.cssText = 'background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);color:#fca5a5;font-size:13px;padding:8px 16px;';
            logoutBtn.addEventListener('click', function() {
              localStorage.removeItem('clientData');
              window.dispatchEvent(new CustomEvent('clientLogout'));
              updateAccountButton();
            });
            btn.parentNode.insertBefore(logoutBtn, btn.nextSibling);
          }
          logoutBtn.style.display = 'inline-flex';
        } else {
          btn.textContent = 'mon compte';
          if (logoutBtn) logoutBtn.style.display = 'none';
        }
      }
      updateAccountButton();

      window.openLoginModal = function() {
        loginModalEl.classList.remove('hidden');
        switchClientTab('login');
      }

      window.closeLoginModal = function() {
        loginModalEl.classList.add('hidden');
      }

      window.switchClientTab = function(tab) {
        const tabLogin = document.getElementById('tab-login');
        const tabSignup = document.getElementById('tab-signup');
        const lf = document.getElementById('client-login-form');
        const sf = document.getElementById('client-signup-form');
        if (tab === 'login') {
          tabLogin.classList.add('primary');
          tabSignup.classList.remove('primary');
          lf.style.display = 'flex'; sf.style.display = 'none';
        } else {
          tabSignup.classList.add('primary');
          tabLogin.classList.remove('primary');
          sf.style.display = 'flex'; lf.style.display = 'none';
        }
      }

      loginModalEl.addEventListener('click', function(e) {
        if (e.target === loginModalEl) closeLoginModal();
      });

      clientLoginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('login-client-email').value.trim();
        const password = document.getElementById('login-client-password').value;
        try {
          const { data, error } = await supabaseClient.from('clients').select('*').eq('email', email).eq('password', password).single();
          if (error || !data) { alert('❌ Email ou mot de passe incorrect'); return; }

          const clientData = { id: data.id, email: data.email, name: data.name, connectedAt: new Date().toISOString() };
          localStorage.setItem('clientData', JSON.stringify(clientData));
          window.dispatchEvent(new CustomEvent('clientLogin', { detail: clientData }));
          updateAccountButton();
          closeLoginModal();

          const pendingReview = localStorage.getItem('pendingReview');
          if (pendingReview) {
            const review = JSON.parse(pendingReview);
            document.getElementById('review-name').value = review.name;
            document.getElementById('review-comment').value = review.comment;
            selectedRating = review.rating;
            ratingValue.value = review.rating;
            updateStars(review.rating);
            localStorage.removeItem('pendingReview');
            setTimeout(async () => {
              try {
                const { error } = await supabaseClient.from('reviews').insert([{ id: Date.now(), client_name: review.name, comment: review.comment, rating: review.rating }]);
                if (!error) { alert('✅ Avis publié !'); reviewForm.reset(); selectedRating=0; updateStars(0); await loadReviews(); }
              } catch(e) { console.error(e); }
            }, 500);
          }
        } catch (e) { alert('❌ Erreur: ' + e.message); }
      });

      clientSignupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('signup-client-name').value.trim();
        const email = document.getElementById('signup-client-email').value.trim();
        const password = document.getElementById('signup-client-password').value;
        const confirm = document.getElementById('signup-client-password-confirm').value;
        if (password !== confirm) { alert('❌ Mots de passe différents'); return; }
        if (password.length < 6) { alert('❌ Minimum 6 caractères'); return; }
        try {
          const { data: existing } = await supabaseClient.from('clients').select('email').eq('email', email).single();
          if (existing) { alert('❌ Email déjà utilisé'); switchClientTab('login'); return; }
          const { error } = await supabaseClient.from('clients').insert([{ id: Date.now(), name, email, password }]);
          if (error) { alert('❌ Erreur création compte'); return; }
          alert('✅ Compte créé ! Connectez-vous.');
          switchClientTab('login');
          document.getElementById('login-client-email').value = email;
        } catch (e) { alert('❌ Erreur: ' + e.message); }
      });

    } catch (error) {
      console.error('❌ Erreur chargement Supabase:', error);
    }