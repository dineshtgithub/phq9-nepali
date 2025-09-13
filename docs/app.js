let lang = "en"; // "en" or "ne"
const state = { data: null };

const el = (sel) => document.querySelector(sel);

async function loadData() {
  const res = await fetch("./data/phq9_nepali.json?v=2");
  state.data = await res.json();
}

function t(key) {
  // helper for interpretation labels map
  return state.data.interpretation[lang][key];
}

function renderIntro() {
  const intro = state.data.introduction[lang];
  el("#intro").textContent = intro;
  el("#title").textContent = lang === "en"
    ? "PHQ-9 Nepali Depression Self-Test"
    : "PHQ-9 नेपाली डिप्रेसन स्व-परीक्षण";
  el("#langToggle").textContent = lang === "en" ? "नेपालीमा स्विच गर्नुहोस्" : "Switch to English";
}

function renderForm() {
  const form = el("#form");
  form.innerHTML = "";
  state.data.items.forEach((item, idx) => {
    const wrapper = document.createElement("div");
    wrapper.className = "question";
    wrapper.innerHTML = `
      <p><strong>${idx + 1}.</strong> ${item[lang]}</p>
      <div class="options">
        ${state.data.response_options.map(opt => `
          <label class="option">
            <input type="radio" name="${item.id}" value="${opt.value}" />
            <span>${opt[lang]}</span>
          </label>
        `).join("")}
      </div>
      <div class="note">${lang==="en" ? "Score:" : "स्कोर:"} 0–3</div>
    `;
    form.appendChild(wrapper);
  });
}

function interpret(total) {
  const bands = state.data.scoring.cutoffs;
  for (const c of bands) {
    const [lo, hi] = c.range.split("-").map(Number);
    if (total >= lo && total <= hi) {
      return {
        labelEn: c.label_en.toLowerCase(),
        labelNe: c.label_ne,
        label: lang === "en" ? c.label_en : c.label_ne
      };
    }
  }
  return null;
}

function calculate() {
  const items = state.data.items;
  let total = 0;
  let missing = 0;
  let safety = false;

  for (const item of items) {
    const selected = [...document.getElementsByName(item.id)]
      .find(r => r.checked);
    if (!selected) { missing++; continue; }
    const val = parseInt(selected.value, 10);
    total += val;
    if (item.is_safety_item && val > 0) safety = true;
  }

  const out = el("#result");
  if (missing > 0) {
    out.className = "result alert";
    out.textContent = lang==="en"
      ? `Please answer all questions (${missing} missing).`
      : `कृपया सबै प्रश्नहरूको उत्तर दिनुहोस् (बाकी ${missing}).`;
    return;
  }

  const sev = interpret(total);
  const isModerateOrWorse = total >= 10;
  let summary = `${lang==="en" ? "Total Score" : "कुल स्कोर"}: ${total}\n${lang==="en" ? "Severity" : "गम्भीरता"}: ${sev.label}`;

  // interpretation text
  const messages = {
    minimal: t("minimal"),
    mild: t("mild"),
    moderate: t("moderate"),
    moderately_severe: t("moderately_severe"),
    severe: t("severe")
  };

  let key;
  switch (sev.labelEn) {
    case "minimal": key = "minimal"; break;
    case "mild": key = "mild"; break;
    case "moderate": key = "moderate"; break;
    case "moderately severe": key = "moderately_severe"; break;
    case "severe": key = "severe"; break;
  }

  let advice = messages[key];

  // Special handling: item 9 > 0 OR severity >= moderate
  if (safety) {
    advice += lang==="en"
      ? `\n\n⚠️ Safety note: You reported thoughts of self-harm. Please seek urgent help now (nearest emergency care, crisis line, or a trusted health worker).`
      : `\n\n⚠️ सावधानी: तपाईंले आत्म-हत्या वा आफैंलाई क्षति पुर्‍याउने विचार आएको बताएका छँदै हुनुहुन्छ। कृपया तत्काल सहायता लिनुहोस् (नजिकको आपतकालीन सेवा, संकट हेल्पलाइन, वा विश्वासिलाे स्वास्थ्यकर्मी)।`;
  } else if (isModerateOrWorse) {
    advice += lang==="en"
      ? `\n\nℹ️ Guidance: Scores in the moderate or severe range suggest you should contact a health worker or mental health service for evaluation and support.`
      : `\n\nℹ️ मार्गदर्शन: मध्यम वा गम्भीर दायरा भएका स्कोरले स्वास्थ्यकर्मी वा मनोस्वास्थ्य सेवामा सम्पर्क गर्न सुझाव दिन्छ।`;
  }

  out.className = safety ? "result alert" : (isModerateOrWorse ? "result alert" : "result success");
  out.textContent = `${summary}\n\n${advice}`;
}

async function main() {
  await loadData();
  renderIntro();
  renderForm();

  el("#langToggle").addEventListener("click", () => {
    lang = lang === "en" ? "ne" : "en";
    renderIntro();
    renderForm();
    el("#result").textContent = "";
    el("#result").className = "result";
  });

  el("#submitBtn").addEventListener("click", calculate);
  el("#resetBtn").addEventListener("click", () => {
    document.getElementById("form").reset();
    el("#result").textContent = "";
    el("#result").className = "result";
  });
}

main();

