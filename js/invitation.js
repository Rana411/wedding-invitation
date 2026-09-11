/* ============================================================
   INVITATION — كل الوظايف المشتركة
   بيتقرأ الإعدادات من window.INVITE_CONFIG
   ============================================================ */
(function(){
  'use strict';

  const CONFIG = window.INVITE_CONFIG || {};
  const WEDDING_DATE = new Date(CONFIG.weddingDate || '2026-12-10T19:00:00');
  const WEDDING_END = new Date(CONFIG.weddingEnd || '2026-12-10T23:00:00');
  const PREFIX = CONFIG.storagePrefix || 'invite-';
  const VENUE_NAME = CONFIG.venueName || 'Kempinski Nile Hotel, Cairo';
  const VENUE_LAT = CONFIG.venueLat || 30.0444;
  const VENUE_LNG = CONFIG.venueLng || 31.2357;

  /* ===== التخزين (3 مستويات) ===== */
  const mem = {};
  const store = {
    get(key, fallback = null){
      try{ const v = localStorage.getItem(key); if(v !== null) return v; }catch(e){}
      try{ const v = sessionStorage.getItem(key); if(v !== null) return v; }catch(e){}
      return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : fallback;
    },
    set(key, value){
      try{ localStorage.setItem(key, value); }catch(e){}
      try{ sessionStorage.setItem(key, value); }catch(e){}
      mem[key] = value;
      return true;
    }
  };

  /* ===== Toast ===== */
  let toastTimer = null;
  function showToast(msg, ms = 2500){
    const t = document.getElementById('toast');
    if(!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> t.classList.remove('show'), ms);
  }

  /* ===== فتح الدعوة ===== */
  window.openInvitation = function(){
    const cover = document.getElementById('coverScreen');
    const main = document.getElementById('mainWrap');
    const music = document.getElementById('musicBtn');
    if(!cover || !main) return;

    cover.classList.add('hidden');
    setTimeout(()=>{
      cover.style.display = 'none';
      main.classList.add('visible');
      if(music) music.style.display = 'flex';
      window.scrollTo({ top: 0, behavior: 'instant' });
      showToast('أهلاً بكم في فرحنا 🤍', 3000);
    }, 600);
  };

  /* ===== العدّاد التنازلي ===== */
  function updateCountdown(){
    let diff = WEDDING_DATE - new Date();
    if(diff < 0) diff = 0;
    const el = id => document.getElementById(id);
    if(el('cdDays'))  el('cdDays').textContent  = Math.floor(diff / 86400000);
    if(el('cdHours')) el('cdHours').textContent = Math.floor(diff / 3600000) % 24;
    if(el('cdMin'))   el('cdMin').textContent   = Math.floor(diff / 60000) % 60;
    if(el('cdSec'))   el('cdSec').textContent   = Math.floor(diff / 1000) % 60;
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* ===== رفع الصور ===== */
  let currentSlot = null;
  const fileInput = document.getElementById('fileInput');

  window.triggerUpload = function(slot){
    currentSlot = slot;
    if(fileInput) fileInput.click();
  };

  if(fileInput){
    fileInput.addEventListener('change', function(e){
      const file = e.target.files[0];
      if(!file || !currentSlot) return;

      if(!file.type.startsWith('image/')){
        showToast('من فضلك اختاري صورة');
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = function(ev){
        const img = new Image();
        img.onload = function(){
          const maxW = 900;
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement('canvas');
          canvas.width  = Math.max(1, Math.floor(img.width  * scale));
          canvas.height = Math.max(1, Math.floor(img.height * scale));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

          applyPhoto(currentSlot, dataUrl);
          store.set(PREFIX + 'photo-' + currentSlot, dataUrl);
          showToast('تم تحديث الصورة 🤍');
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });
  }

  function applyPhoto(slot, dataUrl){
    const imgEl = document.querySelector('img[data-role="' + slot + '-img"]');
    if(imgEl) imgEl.src = dataUrl;
  }

  (function loadPhotos(){
    ['bride','groom','gallery-0','gallery-1','gallery-2','gallery-3','gallery-4','gallery-5'].forEach(slot=>{
      const saved = store.get(PREFIX + 'photo-' + slot);
      if(saved) applyPhoto(slot, saved);
    });
  })();

  /* ===== Lightbox ===== */
  window.openLightbox = function(src){
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    if(!lb || !img) return;
    img.src = src;
    lb.classList.add('open');
  };
  window.closeLightbox = function(){
    const lb = document.getElementById('lightbox');
    if(lb) lb.classList.remove('open');
  };
  document.addEventListener('keydown', e=>{ if(e.key === 'Escape') window.closeLightbox(); });

  /* ===== الأمنيات ===== */
  const WISHES_KEY = PREFIX + 'wishes';

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function formatTime(ts){
    const diff = Math.floor((new Date() - new Date(ts)) / 1000);
    if(diff < 60) return 'الآن';
    if(diff < 3600) return 'منذ ' + Math.floor(diff/60) + ' دقيقة';
    if(diff < 86400) return 'منذ ' + Math.floor(diff/3600) + ' ساعة';
    if(diff < 604800) return 'منذ ' + Math.floor(diff/86400) + ' يوم';
    return new Date(ts).toLocaleDateString('ar-EG');
  }

  function getWishes(){
    try{ return JSON.parse(store.get(WISHES_KEY, '[]')) || []; }catch(e){ return []; }
  }
  function saveWishes(list){
    return store.set(WISHES_KEY, JSON.stringify(list.slice(-50)));
  }

  function renderWishes(list){
    const el = document.getElementById('wishesList');
    const counter = document.getElementById('wishCounter');
    if(!el) return;

    if(!list || list.length === 0){
      el.innerHTML = '<div class="wishes-empty">كونوا أول من يترك تهنئة للعروسين 🤍</div>';
      if(counter) counter.textContent = '';
      return;
    }

    el.innerHTML = list.slice().reverse().map(w=>`
      <div class="wish-item">
        <button class="wish-del" title="حذف" onclick="deleteWish(${w.ts})">×</button>
        <b>${escapeHtml(w.name)}</b>
        <p>${escapeHtml(w.message)}</p>
        <span class="wish-time">${formatTime(w.ts)}</span>
      </div>
    `).join('');

    if(counter){
      counter.textContent = list.length === 1
        ? 'تهنئة واحدة · شكرًا لمحبتكم 🤍'
        : list.length + ' تهنئة · شكرًا لمحبتكم 🤍';
    }
  }

  window.submitWish = function(){
    const nameEl = document.getElementById('wishName');
    const msgEl = document.getElementById('wishMsg');
    const btn = document.getElementById('wishBtn');
    const formMsg = document.getElementById('wishFormMsg');
    if(!nameEl || !msgEl || !btn) return;

    const name = nameEl.value.trim();
    const message = msgEl.value.trim();

    if(!name || !message){
      if(formMsg) formMsg.textContent = 'من فضلك اكتبي اسمك ورسالتك';
      return;
    }

    btn.disabled = true;
    if(formMsg) formMsg.textContent = 'جارٍ الإرسال...';

    setTimeout(()=>{
      try{
        const list = getWishes();
        list.push({ name, message, ts: Date.now() });
        saveWishes(list);
        renderWishes(list);
        nameEl.value = '';
        msgEl.value = '';
        if(formMsg) formMsg.textContent = 'شكرًا لك — تم إرسال تهنئتك 🤍';
        showToast('تم إرسال تهنئتك 🤍');
        setTimeout(()=>{ if(formMsg) formMsg.textContent = ''; }, 4000);
      }catch(err){
        if(formMsg) formMsg.textContent = 'تعذّر الحفظ. حاولي مرة أخرى';
      }
      btn.disabled = false;
    }, 300);
  };

  window.deleteWish = function(ts){
    if(!confirm('حذف هذه التهنئة؟')) return;
    const list = getWishes().filter(w => w.ts !== ts);
    saveWishes(list);
    renderWishes(list);
    showToast('تم الحذف');
  };

  renderWishes(getWishes());

  /* ===== موسيقى خلفية ===== */
  const audio = document.getElementById('bgMusic');
  let musicPlaying = false;

  window.toggleMusic = function(){
    if(!audio) return;
    const btn = document.getElementById('musicBtn');
    if(musicPlaying){
      audio.pause();
      musicPlaying = false;
      if(btn) btn.textContent = '🔇';
    } else {
      audio.volume = 0.3;
      audio.play().then(()=>{
        musicPlaying = true;
        if(btn) btn.textContent = '🔊';
      }).catch(()=>{
        showToast('المتصفح منع التشغيل التلقائي');
      });
    }
  };

  /* ===== WhatsApp ===== */
  window.shareWhatsApp = function(){
    const url = window.location.href;
    const text = 'يتشرفان بدعوتكم لحضور حفل زفافهما — سارة & أحمد 🤍';
    window.open('https://wa.me/?text=' + encodeURIComponent(text + '\n' + url), '_blank');
  };

  /* ===== نسخ اللينك ===== */
  window.copyLink = function(){
    const url = window.location.href;
    if(navigator.clipboard){
      navigator.clipboard.writeText(url).then(()=>{
        showToast('تم نسخ اللينك ✅');
      }).catch(()=>{
        showToast('تعذّر النسخ');
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try{ document.execCommand('copy'); showToast('تم نسخ اللينك ✅'); }
      catch(e){ showToast('تعذّر النسخ'); }
      document.body.removeChild(ta);
    }
  };

  /* ===== أضف للتقويم ===== */
  window.addToCalendar = function(){
    const title = 'حفل زفاف سارة & أحمد';
    const details = 'يتشرفان بدعوتكم لحضور حفل زفافهما 🤍';
    const fmt = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + '&text=' + encodeURIComponent(title)
      + '&dates=' + fmt(WEDDING_DATE) + '/' + fmt(WEDDING_END)
      + '&details=' + encodeURIComponent(details)
      + '&location=' + encodeURIComponent(VENUE_NAME);
    window.open(url, '_blank');
  };

  /* ===== فتح الموقع على الخريطة ===== */
  window.openMap = function(){
    window.open('https://www.google.com/maps/search/?api=1&query=' + VENUE_LAT + ',' + VENUE_LNG, '_blank');
  };

  /* ===== API عام ===== */
  window.Invitation = { config: CONFIG, showToast, store };
})();