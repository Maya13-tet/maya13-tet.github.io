/* Общий скрипт стилей «Лайт» и «Продающий»: шапка, палитры для галереи, мессенджеры, запись и калькулятор. Без библиотек. */
(() => {
  const body = document.body;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // шапка: тень после прокрутки
  const bar = document.querySelector("[data-s-bar]");
  const onScroll = () => bar && bar.classList.toggle("is-scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // палитры для галереи: ?p=Б или postMessage({ palette: "Б" }) из окна галереи
  const pals = body.dataset.sPalettes ? JSON.parse(body.dataset.sPalettes) : null;
  const applyPalette = (k) => {
    if (!pals || !pals[k]) return;
    for (const [v, hex] of Object.entries(pals[k].vars)) document.documentElement.style.setProperty("--c-" + v, hex);
  };
  if (pals) {
    const q = new URLSearchParams(location.search).get("p"); if (q) applyPalette(q);
    addEventListener("message", (e) => { if (e.data && e.data.palette) applyPalette(e.data.palette); });
  }

  // появление секций (только «Продающий»)
  const rev = document.querySelectorAll(".s-reveal");
  if (rev.length && "IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    rev.forEach((el) => io.observe(el));
  } else rev.forEach((el) => el.classList.add("is-in"));

  // ---- сообщение в мессенджер
  const brandEl = document.querySelector(".s-bar__brand");
  const brand = (brandEl && brandEl.textContent.trim()) || (document.title.split("·")[0].trim()) || "сайта";
  let message = "Здравствуйте! Пишу с сайта «" + brand.trim() + "».";
  const bubble = document.querySelector("[data-s-bubble]");
  const setMessage = (t) => { message = t; if (bubble) bubble.textContent = t; };
  const isSlot = (s) => !s || /\{\{/.test(s);
  const digits = (s) => String(s).replace(/\D/g, "");
  document.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-s-msg]"); if (!a) return;
    e.preventDefault();
    const kind = a.dataset.sMsg;
    if (kind === "whatsapp") {
      const n = body.dataset.wa; const url = (isSlot(n) ? "https://wa.me/" : "https://wa.me/" + digits(n)) + "?text=" + encodeURIComponent(message);
      window.open(url, "_blank", "noopener"); return;
    }
    // Telegram: t.me не принимает готовый текст для личного чата –
    // открываем окно «поделиться» с уже вписанным сообщением и дублируем его в буфер
    if (kind === "telegram") {
      const tg = body.dataset.tg; const user = isSlot(tg) ? "" : String(tg).replace(/^@|https?:\/\/t\.me\//g, "");
      try { await navigator.clipboard.writeText(message); } catch (_) {}
      const note = a.closest("form, .s-contacts")?.parentElement?.querySelector("[data-s-copied]") || document.querySelector("[data-s-copied]");
      if (note) { note.textContent = "Сообщение уже вписано - выберите чат Детейлинг Автоэстет и нажмите отправить."; note.hidden = false; setTimeout(() => (note.hidden = true), 5000); }
      if (user) window.open("https://t.me/share/url?url=&text=" + encodeURIComponent(message), "_blank", "noopener");
      else window.open("https://t.me/", "_blank", "noopener");
      return;
    }
    // MAX не принимает готовый текст по ссылке: копируем его и открываем чат
    try { await navigator.clipboard.writeText(message); } catch (_) {}
    const note = a.closest("form, .s-contacts")?.parentElement?.querySelector("[data-s-copied]") || document.querySelector("[data-s-copied]");
    if (note) { note.textContent = "Текст скопирован - вставьте его в чат."; note.hidden = false; setTimeout(() => (note.hidden = true), 5000); }
    const mx = body.dataset.max;
    window.open(isSlot(mx) ? "https://max.ru/" : "https://max.ru/" + String(mx).replace(/^@|https?:\/\/max\.ru\//g, ""), "_blank", "noopener");
  });

  // неразрывные пробелы: сумма не рвётся переносом
  const rub = (n) => Math.round(n).toLocaleString("ru-RU").replace(/[   ]/g, " ") + " ₽";

  // ---- онлайн-запись (без даты и времени: мастер договаривается об осмотре лично)
  const booking = document.querySelector("[data-s-booking]");
  if (booking) {
    const update = () => {
      const s = booking.querySelector("input[name=svc]:checked");
      const price = s && s.dataset.price ? " (" + (s.dataset.from ? "от " : "") + rub(+s.dataset.price) + ")" : "";
      setMessage(booking.dataset.message.replace("{услуга}", s ? s.dataset.name + price : ""));
    };
    booking.addEventListener("change", update);
    update();
  }

  // ---- калькулятор
  const calc = document.querySelector("[data-s-calc]");
  if (calc) {
    const per = JSON.parse(calc.dataset.per || "{}"); // { "canvas": "area" } – цена варианта умножается на значение поля area
    const totalEl = calc.querySelector("[data-s-total]");
    let shown = 0;
    const animateTo = (v) => {
      if (reduce) { totalEl.textContent = rub(v); shown = v; return; }
      const from = shown, t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / 280); totalEl.textContent = rub(from + (v - from) * k); if (k < 1) requestAnimationFrame(step); else shown = v; };
      requestAnimationFrame(step);
    };
    const val = (id) => { const el = calc.querySelector(`input[type=range][name="${id}"]`); return el ? +el.value : 1; };
    const update = () => {
      let total = +calc.dataset.base || 0; const picks = [];
      // поля в порядке, как они стоят в форме: так и сообщение читается по-человечески
      calc.querySelectorAll("input").forEach((el) => {
        if (el.type === "range") {
          calc.querySelector(`[data-s-out="${el.name}"]`).textContent = el.value;
          total += (+el.dataset.price || 0) * +el.value;
          picks.push(el.dataset.say ? el.dataset.say.replace("{v}", el.value) : el.dataset.label.toLowerCase() + " " + el.value + (el.dataset.unit ? " " + el.dataset.unit : ""));
        } else if (el.type === "radio" && el.checked) {
          total += (+el.dataset.price || 0) * (per[el.name] ? val(per[el.name]) : 1);
          picks.push(el.dataset.label.toLowerCase());
        } else if (el.type === "checkbox" && el.checked) {
          total += (+el.dataset.price || 0) * (per[el.name] ? val(per[el.name]) : 1);
          picks.push(el.dataset.label.toLowerCase());
        }
      });
      const min = +calc.dataset.min || 0; let minNote = "";
      if (min && total < min) { total = min; minNote = " (" + calc.dataset.minNote + ")"; }
      animateTo(total);
      setMessage(calc.dataset.message.replace("{выбор}", picks.join(", ")).replace("{итого}", rub(total) + minNote));
    };
    calc.addEventListener("input", update); calc.addEventListener("change", update); update();
  }

  // ---- сравнение «до/после»: ползунок двигает разделитель
  document.querySelectorAll(".s-compare").forEach((box) => {
    const range = box.querySelector(".s-compare__range");
    if (!range) return;
    const set = () => box.style.setProperty("--pos", range.value + "%");
    range.addEventListener("input", set);
    set();
  });
})();
