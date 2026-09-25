(function () {
  var plannerRoot = document.getElementById("weddingPlanner");
  if (!plannerRoot) return;

  var steps = [
    {
      key: "date",
      label: "Krok 1 z 10",
      title: "Kiedy odbędzie się wesele?",
      copy: "Jeśli nie znasz jeszcze dokładnej daty, zaznacz to poniżej. Nie blokujemy Cię na tym etapie.",
      type: "date"
    },
    {
      key: "city",
      label: "Krok 2 z 10",
      title: "Gdzie odbędzie się wesele?",
      copy: "Wybierz najbliższą lokalizację i dopisz salę albo miejscowość, jeśli już ją znasz.",
      type: "single",
      field: "city",
      options: [
        { value: "Gdańsk", label: "Gdańsk" },
        { value: "Gdynia", label: "Gdynia" },
        { value: "Sopot", label: "Sopot" },
        { value: "Trójmiasto", label: "Trójmiasto" },
        { value: "Pomorskie", label: "Pomorskie" },
        { value: "Inne", label: "Inne" }
      ],
      extraField: {
        name: "venueName",
        label: "Nazwa sali / miejscowość",
        placeholder: "Np. sala, hotel albo miejscowość"
      }
    },
    {
      key: "guests",
      label: "Krok 3 z 10",
      title: "Ilu gości planujesz zaprosić?",
      copy: "To jedna z najważniejszych rzeczy przy doborze pakietu i liczby barmanów.",
      type: "single",
      field: "guestCountRange",
      options: [
        { value: "do 30 osób", label: "Do 30 osób" },
        { value: "30–50 osób", label: "30-50 osób" },
        { value: "50–80 osób", label: "50-80 osób" },
        { value: "80–120 osób", label: "80-120 osób" },
        { value: "120+ osób", label: "120+ osób" }
      ]
    },
    {
      key: "format",
      label: "Krok 4 z 10",
      title: "Jak wyobrażasz sobie bar na weselu?",
      copy: "To pomoże odróżnić prostszy setup od bardziej rozbudowanej obsługi przez cały wieczór.",
      type: "single",
      field: "barFormat",
      options: [
        { value: "Klasyczny drink bar", label: "Klasyczny drink bar" },
        { value: "Premium cocktail bar", label: "Premium cocktail bar" },
        { value: "Open bar przez całą noc", label: "Open bar przez całą noc" },
        { value: "Nie wiem — chcę rekomendację", label: "Nie wiem - chcę rekomendację" }
      ]
    },
    {
      key: "style",
      label: "Krok 5 z 10",
      title: "Jaki klimat będzie miało wesele?",
      copy: "Styl wydarzenia wpływa na charakter baru, tempo serwisu i dobór menu.",
      type: "single",
      field: "weddingStyle",
      options: [
        { value: "eleganckie / klasyczne", label: "Eleganckie / klasyczne" },
        { value: "boho", label: "Boho" },
        { value: "nowoczesne", label: "Nowoczesne" },
        { value: "garden party", label: "Garden party" },
        { value: "glamour", label: "Glamour" },
        { value: "luźna impreza bez spiny", label: "Luźna impreza bez spiny" }
      ]
    },
    {
      key: "drinks",
      label: "Krok 6 z 10",
      title: "Jakie drinki najlepiej pasują do Was i gości?",
      copy: "Możesz zaznaczyć kilka kierunków. To pomoże zbudować sensowne menu zamiast przypadkowej karty.",
      type: "multi",
      field: "drinkPreferences",
      options: [
        { value: "lekkie i owocowe", label: "Lekkie i owocowe" },
        { value: "kwaśne / cytrusowe", label: "Kwaśne / cytrusowe" },
        { value: "klasyczne koktajle", label: "Klasyczne koktajle" },
        { value: "mocniejsze drinki", label: "Mocniejsze drinki" },
        { value: "prosecco / spritz", label: "Prosecco / spritz" },
        { value: "mocktaile bezalkoholowe", label: "Mocktaile bezalkoholowe" },
        { value: "nie wiem, chcę gotowe menu", label: "Nie wiem, chcę gotowe menu" }
      ]
    },
    {
      key: "alcohol",
      label: "Krok 7 z 10",
      title: "Jak chcecie rozwiązać alkohol?",
      copy: "BAROWO nie sprzedaje alkoholu. Możemy za to przygotować rekomendowaną listę produktów pod menu i liczbę gości.",
      type: "single",
      field: "alcoholPreference",
      options: [
        { value: "Chcemy, żeby BAROWO pomogło z listą produktów", label: "BAROWO ma pomóc z listą produktów" },
        { value: "Mamy własny alkohol / sala zapewnia alkohol", label: "Mamy własny alkohol / sala zapewnia alkohol" },
        { value: "Jeszcze nie wiemy", label: "Jeszcze nie wiemy" },
        { value: "Chcemy pełną rekomendację", label: "Chcemy pełną rekomendację" }
      ]
    },
    {
      key: "expectation",
      label: "Krok 8 z 10",
      title: "Czego szukasz?",
      copy: "To jest moment, w którym ustalamy, czy ważniejsza jest prostota, balans, czy pełny premium efekt dla gości.",
      type: "single",
      field: "expectationLevel",
      options: [
        { value: "Najprostsza sensowna opcja", label: "Najprostsza sensowna opcja" },
        { value: "Dobry balans ceny i efektu", label: "Dobry balans ceny i efektu" },
        { value: "Premium efekt dla gości", label: "Premium efekt dla gości" },
        { value: "Nie wiem, chcę porównać opcje", label: "Nie wiem, chcę porównać opcje" }
      ]
    },
    {
      key: "fontanna",
      label: "Krok 9 z 10",
      title: "Czy chcesz dodać słodką atrakcję dla gości?",
      copy: "Fontanna czekoladowa może działać jako dodatek do baru albo osobna strefa przy weselu.",
      type: "single",
      field: "interestedInChocolateFountain",
      options: [
        { value: "true", label: "Tak, fontanna czekoladowa" },
        { value: "maybe", label: "Może, chcę zobaczyć opcję" },
        { value: "false", label: "Nie, interesuje mnie tylko bar" },
        { value: "not_sure", label: "Nie wiem, chcę rekomendację" }
      ]
    },
    {
      key: "contact",
      label: "Krok 10 z 10",
      title: "Twój wynik planera",
      copy: "Zobacz rekomendację i zostaw kontakt, jeśli chcesz dostać konkretną propozycję pod datę i salę.",
      type: "contact"
    }
  ];

  var state = {
    weddingDate: "",
    dateUnknown: false,
    city: "",
    venueName: "",
    guestCountRange: "",
    barFormat: "",
    weddingStyle: "",
    drinkPreferences: [],
    alcoholPreference: "",
    expectationLevel: "",
    interestedInChocolateFountain: "",
    name: "",
    phone: "",
    email: "",
    message: "",
    privacyConsent: false
  };

  var endpoint = plannerRoot.dataset.endpoint || "";
  var currentStepIndex = 0;
  var els = {
    progressLabel: document.getElementById("plannerProgressLabel"),
    progressBar: document.getElementById("plannerProgressFill"),
    stepLabel: document.getElementById("plannerStepLabel"),
    title: document.getElementById("plannerQuestionTitle"),
    copy: document.getElementById("plannerQuestionCopy"),
    body: document.getElementById("plannerStepBody"),
    back: document.getElementById("plannerBack"),
    next: document.getElementById("plannerNext"),
    status: document.getElementById("plannerStatus")
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function splitTitleHtml(value) {
    var words = String(value || "").trim().split(/\s+/).filter(Boolean);
    if (words.length < 3) return escapeHtml(value);
    var splitAt = Math.max(1, Math.min(words.length - 1, Math.ceil(words.length / 2)));
    return escapeHtml(words.slice(0, splitAt).join(" ")) +
      "<br><span class=\"red\">" +
      escapeHtml(words.slice(splitAt).join(" ")) +
      "</span>";
  }

  function setStatus(type, message) {
    if (!els.status) return;
    els.status.className = "planner-status";
    if (type) els.status.classList.add("is-" + type);
    els.status.textContent = message || "";
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeFontannaInterest(value) {
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "not_sure") return "not_sure";
    if (value === "maybe") return true;
    return false;
  }

  function deriveChocolateMode(value) {
    if (value === "true") return "addon_to_bar";
    if (value === "not_sure" || value === "maybe") return "not_sure";
    return "";
  }

  function buildDrinkRecommendation(preferences) {
    var picks = asArray(preferences);
    var drinks = [];
    var title = "klasyczne i lekkie koktajle";

    if (picks.indexOf("prosecco / spritz") !== -1 || picks.indexOf("lekkie i owocowe") !== -1) {
      title = "lekkie, owocowe i świeże koktajle";
      drinks.push("Aperol Spritz", "Hugo", "Mojito", "Pornstar Martini");
    }

    if (picks.indexOf("klasyczne koktajle") !== -1) {
      title = "klasyczne koktajle z mocnym trzonem";
      drinks.push("Whisky Sour", "Cuba Libre", "Mojito");
    }

    if (picks.indexOf("kwaśne / cytrusowe") !== -1) {
      title = "świeże i cytrusowe koktajle";
      drinks.push("Whisky Sour", "Tom Collins", "Margarita");
    }

    if (picks.indexOf("mocniejsze drinki") !== -1) {
      title = "klasyczne i mocniejsze pozycje";
      drinks.push("Old Fashioned", "Whisky Sour", "Cuba Libre");
    }

    if (picks.indexOf("nie wiem, chcę gotowe menu") !== -1) {
      title = "sprawdzone menu 6-8 drinków";
      drinks.push("Aperol Spritz", "Mojito", "Whisky Sour", "Hugo", "Pornstar Martini", "Cuba Libre");
    }

    if (picks.indexOf("mocktaile bezalkoholowe") !== -1) {
      drinks.push("1-2 mocktaile");
    } else if (drinks.indexOf("1-2 mocktaile") === -1) {
      drinks.push("1-2 mocktaile");
    }

    if (!drinks.length) {
      drinks = ["Aperol Spritz", "Mojito", "Whisky Sour", "Hugo", "Pornstar Martini", "1-2 mocktaile"];
    }

    var uniqueDrinks = [];
    drinks.forEach(function (drink) {
      if (uniqueDrinks.indexOf(drink) === -1) uniqueDrinks.push(drink);
    });

    return {
      title: title,
      drinks: uniqueDrinks.slice(0, 6)
    };
  }

  function computeRecommendation() {
    var packageScore = 1;
    var bartenders = "2";

    switch (state.guestCountRange) {
      case "do 30 osób":
        packageScore = 0;
        bartenders = "1";
        break;
      case "30–50 osób":
        packageScore = 0;
        bartenders = "1";
        break;
      case "50–80 osób":
        packageScore = 1;
        bartenders = "2";
        break;
      case "80–120 osób":
        packageScore = 1;
        bartenders = "2";
        break;
      case "120+ osób":
        packageScore = 1;
        bartenders = "2-3";
        break;
      default:
        packageScore = 1;
        bartenders = "2";
    }

    if (state.expectationLevel === "Najprostsza sensowna opcja") packageScore -= 1;
    if (state.expectationLevel === "Dobry balans ceny i efektu") packageScore += 0;
    if (state.expectationLevel === "Premium efekt dla gości") packageScore += 1;
    if (state.barFormat === "Premium cocktail bar") packageScore += 1;
    if (state.barFormat === "Open bar przez całą noc") packageScore += 1;
    if (state.barFormat === "Klasyczny drink bar") packageScore -= 0.25;
    if (state.interestedInChocolateFountain === "true") packageScore += 0.5;
    if (state.interestedInChocolateFountain === "maybe" || state.interestedInChocolateFountain === "not_sure") packageScore += 0.25;

    packageScore = Math.max(0, Math.min(2, packageScore));

    var recommendedPackage = "Standard";
    if (packageScore <= 0.4) recommendedPackage = "Simple";
    if (packageScore >= 1.6) recommendedPackage = "Premium";

    if (state.guestCountRange === "120+ osób" && recommendedPackage === "Premium") {
      bartenders = "3";
    }

    if ((state.guestCountRange === "30–50 osób" || state.guestCountRange === "do 30 osób") && recommendedPackage === "Premium") {
      bartenders = "2";
    }

    var menu = buildDrinkRecommendation(state.drinkPreferences);
    var reasonBullets = [];

    if (state.guestCountRange === "80–120 osób" || state.guestCountRange === "120+ osób") {
      reasonBullets.push("przy tej liczbie gości warto zaplanować " + bartenders + " barmanów");
      reasonBullets.push("bar będzie działał sprawniej i bez długich kolejek");
    } else {
      reasonBullets.push("zakres baru można dopasować bez przewymiarowania pakietu");
    }

    reasonBullets.push("menu 6-8 drinków będzie czytelne i wygodne dla gości");

    if (state.drinkPreferences.indexOf("mocktaile bezalkoholowe") !== -1 || state.alcoholPreference === "Chcemy pełną rekomendację") {
      reasonBullets.push("warto dodać 1-2 mocktaile dla gości niepijących");
    }

    if (state.weddingStyle) {
      reasonBullets.push("format pasuje do wesela w stylu: " + state.weddingStyle);
    }

    var typeText = "Najlepiej pasuje pełny mobilny bar, bo przy weselu bar nie powinien być tylko atrakcją na chwilę, ale realnym punktem obsługi gości przez wiele godzin.";
    var chocolateInterest = normalizeFontannaInterest(state.interestedInChocolateFountain);

    return {
      recommendedPackage: recommendedPackage,
      recommendedBartenders: bartenders,
      recommendedMenuStyle: menu.title,
      recommendedDrinks: menu.drinks,
      reasonBullets: reasonBullets,
      typeText: typeText,
      showChocolateSection: chocolateInterest === true || chocolateInterest === "not_sure",
      chocolateInterest: chocolateInterest
    };
  }

  function buildLeadNote(recommendation) {
    var prefs = asArray(state.drinkPreferences).join(", ");
    return [
      "Planner weselny",
      (state.city || "brak miasta"),
      (state.guestCountRange || "brak liczby gości"),
      "pakiet " + recommendation.recommendedPackage,
      recommendation.recommendedBartenders + " barmanów",
      recommendation.recommendedMenuStyle,
      "fontanna: " + (
        recommendation.chocolateInterest === true
          ? "tak"
          : recommendation.chocolateInterest === "not_sure"
            ? "nie wiem"
            : "nie"
      ),
      prefs ? "preferencje: " + prefs : ""
    ].filter(Boolean).join(" · ");
  }

  function buildCustomerSummaryEmailData(recommendation) {
    return {
      subject: "Twój wynik Planera Baru Weselnego BAROWO",
      body: [
        "Cześć " + (state.name || "") + ",",
        "",
        "Dzięki za wypełnienie Planera Baru Weselnego BAROWO.",
        "",
        "Na podstawie odpowiedzi najlepiej pasuje:",
        "- Pakiet: " + recommendation.recommendedPackage,
        "- Liczba barmanów: " + recommendation.recommendedBartenders,
        "- Styl menu: " + recommendation.recommendedMenuStyle,
        "- Fontanna czekoladowa: " + (
          recommendation.chocolateInterest === true
            ? "tak"
            : recommendation.chocolateInterest === "not_sure"
              ? "do rozważenia"
              : "nie"
        ),
        "",
        "Przygotujemy konkretną propozycję pod datę, miejsce i liczbę gości.",
        "",
        "BAROWO"
      ].join("\n")
    };
  }

  function renderCards(options, fieldName, multi) {
    var wrapper = document.createElement("div");
    wrapper.className = "planner-options-grid " + (options.length >= 6 ? "three" : "two");

    options.forEach(function (option) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "planner-option";
      button.dataset.value = option.value;
      button.setAttribute("aria-pressed", "false");
      button.innerHTML =
        '<div class="planner-option-title">' + escapeHtml(option.label) + "</div>" +
        (option.note ? '<div class="planner-option-note">' + escapeHtml(option.note) + "</div>" : "");

      var selected = multi
        ? asArray(state[fieldName]).indexOf(option.value) !== -1
        : state[fieldName] === option.value;
      if (selected) {
        button.classList.add("is-selected");
        button.setAttribute("aria-pressed", "true");
      }

      button.addEventListener("click", function () {
        if (multi) {
          var current = asArray(state[fieldName]).slice();
          var index = current.indexOf(option.value);
          if (index === -1) {
            current.push(option.value);
            button.classList.add("is-selected");
            button.setAttribute("aria-pressed", "true");
          } else {
            current.splice(index, 1);
            button.classList.remove("is-selected");
            button.setAttribute("aria-pressed", "false");
          }
          state[fieldName] = current;
        } else {
          state[fieldName] = option.value;
          wrapper.querySelectorAll(".planner-option").forEach(function (item) {
            item.classList.toggle("is-selected", item.dataset.value === option.value);
            item.setAttribute("aria-pressed", item.dataset.value === option.value ? "true" : "false");
          });
        }
        setStatus("", "");
      });

      wrapper.appendChild(button);
    });

    return wrapper;
  }

  function renderDateStep() {
    var wrapper = document.createElement("div");
    wrapper.className = "planner-fields";

    var field = document.createElement("div");
    field.className = "planner-field";
    field.innerHTML =
      '<label for="plannerWeddingDate">Data wesela</label>' +
      '<input type="text" id="plannerWeddingDate" name="weddingDate" inputmode="numeric" pattern="\\d{2}\\.\\d{2}\\.\\d{4}" placeholder="dd.mm.yyyy" value="' + escapeHtml(state.weddingDate) + '"' + (state.dateUnknown ? " disabled" : "") + ">";
    wrapper.appendChild(field);

    var checkbox = document.createElement("label");
    checkbox.className = "planner-checkbox";
    checkbox.innerHTML =
      '<input type="checkbox" id="plannerDateUnknown"' + (state.dateUnknown ? " checked" : "") + ">" +
      "<span>Nie znam jeszcze dokładnej daty</span>";
    wrapper.appendChild(checkbox);

    var dateInput = field.querySelector("input");
    var unknownInput = checkbox.querySelector("input");

    dateInput.addEventListener("input", function () {
      state.weddingDate = dateInput.value;
      setStatus("", "");
    });

    unknownInput.addEventListener("change", function () {
      state.dateUnknown = unknownInput.checked;
      if (unknownInput.checked) {
        state.weddingDate = "";
        dateInput.value = "";
      }
      dateInput.disabled = unknownInput.checked;
      setStatus("", "");
    });

    return wrapper;
  }

  function renderSingleStep(step) {
    var wrapper = document.createElement("div");
    wrapper.className = "planner-fields";
    wrapper.appendChild(renderCards(step.options, step.field, false));

    if (step.extraField) {
      var extra = document.createElement("div");
      extra.className = "planner-field";
      extra.innerHTML =
        '<label for="' + escapeHtml(step.extraField.name) + '">' + escapeHtml(step.extraField.label) + "</label>" +
        '<input type="text" id="' + escapeHtml(step.extraField.name) + '" name="' + escapeHtml(step.extraField.name) + '" placeholder="' + escapeHtml(step.extraField.placeholder || "") + '" value="' + escapeHtml(state[step.extraField.name] || "") + '">';
      extra.querySelector("input").addEventListener("input", function (event) {
        state[step.extraField.name] = event.target.value;
      });
      wrapper.appendChild(extra);
    }

    return wrapper;
  }

  function renderMultiStep(step) {
    var wrapper = document.createElement("div");
    wrapper.className = "planner-fields";
    wrapper.appendChild(renderCards(step.options, step.field, true));
    return wrapper;
  }

  function renderResultSection(recommendation) {
    var chocolateHtml = "";

    if (recommendation.showChocolateSection) {
      chocolateHtml =
        '<article class="planner-result-card planner-fontanna-block">' +
          '<div class="planner-result-kicker">Dodatkowa rekomendacja</div>' +
          '<h3>Dodatkowa rekomendacja: fontanna czekoladowa</h3>' +
          '<p>Przy Twojej liczbie gości fontanna czekoladowa może dobrze uzupełnić drink bar - szczególnie jeśli chcesz stworzyć dodatkową słodką strefę, do której goście będą wracać w trakcie wesela.</p>' +
          '<ul class="planner-result-list">' +
            '<li>dobra atrakcja dla dzieci i dorosłych</li>' +
            '<li>uzupełnia drink bar</li>' +
            '<li>tworzy dodatkową strefę na sali</li>' +
            '<li>dobrze wygląda na zdjęciach i stories</li>' +
            '<li>może być dodatkiem do baru albo osobną usługą</li>' +
          "</ul>" +
          '<div class="planner-inline-links"><a href="/oferta/fontanna-czekoladowa/">Dodaj fontannę do wyceny</a></div>' +
        "</article>";
    }

    var reasonItems = recommendation.reasonBullets.map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("");

    var drinkItems = recommendation.recommendedDrinks.map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("");

    return (
      '<div class="planner-result-block">' +
        '<article class="planner-result-card planner-result-summary">' +
          '<div class="planner-result-kicker">Najlepiej pasuje</div>' +
          '<div class="planner-result-main">' + escapeHtml(recommendation.recommendedPackage).toUpperCase() + "</div>" +
          '<p class="planner-result-intro">To jest kierunek, który najlepiej pasuje do Twojej liczby gości, oczekiwanego efektu i wybranego stylu obsługi.</p>' +
          '<ul class="planner-result-list">' + reasonItems + "</ul>" +
        "</article>" +
        '<div class="planner-result-grid">' +
          '<article class="planner-result-card">' +
            "<h3>Rekomendowana liczba<br><span class=\"red\">barmanów</span></h3>" +
            "<p>Rekomendujemy: <strong>" + escapeHtml(recommendation.recommendedBartenders) + " barmanów</strong></p>" +
            "<p>Przy tej liczbie gości bar działa sprawniej, a kolejki są krótsze.</p>" +
          "</article>" +
          '<article class="planner-result-card">' +
            "<h3>Styl<br><span class=\"red\">menu</span></h3>" +
            "<p>Najlepiej pasuje: <strong>" + escapeHtml(recommendation.recommendedMenuStyle) + "</strong></p>" +
            '<ul class="planner-drink-list">' + drinkItems + "</ul>" +
          "</article>" +
        "</div>" +
        '<article class="planner-result-card planner-outlook-card">' +
          "<h3>Typ<br><span class=\"red\">obsługi</span></h3>" +
          "<p>" + escapeHtml(recommendation.typeText) + "</p>" +
          '<div class="planner-service-tip">' +
            '<div class="label">Orientacyjnie</div>' +
            "<h3>Pełna obsługa mobilnego baru BAROWO zwykle zaczyna się od około 3300 zl.</h3>" +
            "<p>To nie jest cena za sam pokaz barmański. Chodzi o kompletną obsługę baru: stanowisko, barmanów, szkło, sprzęt, menu i serwis gości przez wiele godzin.</p>" +
            '<div class="planner-inline-links"><a href="/cennik/">Zobacz cennik BAROWO</a></div>' +
          "</div>" +
        "</article>" +
        chocolateHtml +
      "</div>"
    );
  }

  function renderContactStep() {
    var recommendation = computeRecommendation();
    var wrapper = document.createElement("div");
    wrapper.className = "planner-fields";

    var result = document.createElement("div");
    result.innerHTML = renderResultSection(recommendation);
    wrapper.appendChild(result);

    var contact = document.createElement("div");
    contact.className = "planner-result-card planner-contact-card";
    contact.innerHTML =
      '<div class="planner-result-kicker">Kontakt po wycenę</div>' +
      "<h3>Zostaw kontakt<br><span class=\"red\">do konkretnej propozycji</span></h3>" +
      '<p class="planner-contact-note">Jeśli chcesz dostać szybką odpowiedź pod datę, miejsce i liczbę gości, zostaw telefon albo email. To wystarczy, żebyśmy wrócili z sensowną propozycją.</p>' +
      '<div class="planner-contact-grid">' +
      '<div class="planner-field">' +
        '<label for="plannerName">Imię</label>' +
        '<input type="text" id="plannerName" name="name" value="' + escapeHtml(state.name) + '" placeholder="Jak mamy się do Ciebie odezwać?">' +
      "</div>" +
      '<div class="planner-field">' +
        '<label for="plannerPhone">Telefon</label>' +
        '<input type="tel" id="plannerPhone" name="phone" value="' + escapeHtml(state.phone) + '" placeholder="+48 123 456 789">' +
      "</div>" +
      '<div class="planner-field">' +
        '<label for="plannerEmail">Email</label>' +
        '<input type="email" id="plannerEmail" name="email" value="' + escapeHtml(state.email) + '" placeholder="twoj@email.pl">' +
      "</div>" +
      '<div class="planner-field full">' +
        '<label for="plannerMessage">Wiadomość opcjonalna</label>' +
        '<textarea id="plannerMessage" name="message" placeholder="Dopisz salę, godzinę startu, pytania albo dodatkowe oczekiwania.">' + escapeHtml(state.message) + "</textarea>" +
      "</div>" +
      '<div class="planner-field full">' +
        '<label class="planner-checkbox" for="plannerPrivacyConsent">' +
          '<input type="checkbox" id="plannerPrivacyConsent"' + (state.privacyConsent ? " checked" : "") + ">" +
          '<span>Wyrażam zgodę na kontakt i przetwarzanie danych zgodnie z <a href="/polityka-prywatnosci/">Polityką prywatności</a>.</span>' +
        "</label>" +
      "</div>" +
      "</div>";
    wrapper.appendChild(contact);

    contact.querySelector("#plannerName").addEventListener("input", function (event) {
      state.name = event.target.value;
    });
    contact.querySelector("#plannerPhone").addEventListener("input", function (event) {
      state.phone = event.target.value;
    });
    contact.querySelector("#plannerEmail").addEventListener("input", function (event) {
      state.email = event.target.value;
    });
    contact.querySelector("#plannerMessage").addEventListener("input", function (event) {
      state.message = event.target.value;
    });
    contact.querySelector("#plannerPrivacyConsent").addEventListener("change", function (event) {
      state.privacyConsent = event.target.checked;
    });

    return wrapper;
  }

  function validateStep(index) {
    var step = steps[index];
    if (!step) return true;

    if (step.type === "date") {
      if (!state.dateUnknown && !state.weddingDate) {
        setStatus("error", "Podaj datę wesela albo zaznacz, że jeszcze jej nie znasz.");
        return false;
      }
      return true;
    }

    if (step.type === "single") {
      if (!state[step.field]) {
        setStatus("error", "Wybierz jedną z opcji, żeby przejść dalej.");
        return false;
      }
      return true;
    }

    if (step.type === "multi") {
      if (!asArray(state[step.field]).length) {
        setStatus("error", "Zaznacz przynajmniej jedną odpowiedź.");
        return false;
      }
      return true;
    }

    if (step.type === "contact") {
      if (!state.name.trim()) {
        setStatus("error", "Podaj imię, żebyśmy mogli przygotować odpowiedź.");
        return false;
      }
      if (!state.phone.trim() && !state.email.trim()) {
        setStatus("error", "Podaj telefon albo email.");
        return false;
      }
      if (!state.privacyConsent) {
        setStatus("error", "Zaznacz zgodę na kontakt, żeby wysłać wynik planera.");
        return false;
      }
      return true;
    }

    return true;
  }

  function renderCurrentStep() {
    var step = steps[currentStepIndex];
    var progress = ((currentStepIndex + 1) / steps.length) * 100;

    els.progressLabel.textContent = step.label;
    els.stepLabel.textContent = step.label;
    els.title.innerHTML = splitTitleHtml(step.title);
    els.copy.textContent = step.copy;
    els.progressBar.style.width = progress + "%";
    els.body.innerHTML = "";

    if (step.type === "date") els.body.appendChild(renderDateStep());
    if (step.type === "single") els.body.appendChild(renderSingleStep(step));
    if (step.type === "multi") els.body.appendChild(renderMultiStep(step));
    if (step.type === "contact") els.body.appendChild(renderContactStep());

    els.back.disabled = currentStepIndex === 0;
    els.back.classList.toggle("planner-hidden", currentStepIndex === 0);
    els.next.textContent = currentStepIndex === steps.length - 1 ? "Sprawdź dostępność terminu" : "Dalej";
    setStatus("", "");
    plannerRoot.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function collectMetaFields() {
    var params = new URLSearchParams(window.location.search);
    return {
      page_url: window.location.href,
      referrer: document.referrer || "",
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      utm_content: params.get("utm_content") || "",
      utm_term: params.get("utm_term") || ""
    };
  }

  async function submitPlanner() {
    if (!validateStep(currentStepIndex)) return;

    if (!endpoint) {
      setStatus("error", "Brakuje endpointu formularza. Sprawdź konfigurację strony.");
      return;
    }

    var recommendation = computeRecommendation();
    var leadNote = buildLeadNote(recommendation);
    var emailData = buildCustomerSummaryEmailData(recommendation);
    var serviceType = recommendation.chocolateInterest === true
      ? "Mobilny bar + fontanna czekoladowa"
      : recommendation.chocolateInterest === "not_sure"
        ? "Mobilny bar + możliwa fontanna czekoladowa"
        : "Mobilny bar";
    var chocolateMode = deriveChocolateMode(state.interestedInChocolateFountain);
    var payload = Object.assign(collectMetaFields(), {
      source: "Wedding Bar Planner",
      event_type: "Wesele",
      eventType: "Wesele",
      weddingDate: state.dateUnknown ? "Nie znam jeszcze dokładnej daty" : state.weddingDate,
      event_date: state.dateUnknown ? "" : state.weddingDate,
      city: state.city,
      venueName: state.venueName,
      guestCountRange: state.guestCountRange,
      guests: state.guestCountRange,
      barFormat: state.barFormat,
      weddingStyle: state.weddingStyle,
      drinkPreferences: asArray(state.drinkPreferences).join(", "),
      alcoholPreference: state.alcoholPreference,
      expectationLevel: state.expectationLevel,
      interestedInChocolateFountain: recommendation.chocolateInterest,
      chocolateFountainInterest: recommendation.chocolateInterest,
      chocolateFountainMode: chocolateMode,
      recommendedPackage: recommendation.recommendedPackage,
      package: recommendation.recommendedPackage,
      recommendedBartenders: recommendation.recommendedBartenders,
      recommendedMenuStyle: recommendation.recommendedMenuStyle,
      leadNote: leadNote,
      plannerEmailSummary: JSON.stringify(emailData),
      name: state.name.trim(),
      phone: state.phone.trim(),
      email: state.email.trim(),
      message: state.message.trim(),
      serviceType: serviceType,
      privacy_consent: state.privacyConsent ? "yes" : "",
      return_url: window.location.origin + "/planer-baru-weselnego/"
    });

    els.next.disabled = true;
    els.back.disabled = true;
    els.next.textContent = "Wysyłamy...";
    setStatus("", "");

    try {
      var submitUrl = new URL(endpoint);
      submitUrl.searchParams.set("format", "json");

      var body = new URLSearchParams();
      Object.keys(payload).forEach(function (key) {
        var value = payload[key];
        if (value === null || value === undefined) return;
        body.append(key, String(value));
      });

      var response = await fetch(submitUrl.toString(), {
        method: "POST",
        headers: {
          Accept: "application/json"
        },
        body: body
      });

      var responsePayload = await response.json().catch(function () { return null; });
      if (!response.ok || !responsePayload || responsePayload.ok !== true) {
        throw new Error((responsePayload && responsePayload.error) || "planner_submit_failed");
      }

      setStatus("success", "Dziękujemy. Wynik planera został wysłany. Zespół BAROWO wróci do Ciebie możliwie szybko z konkretną propozycją.");
    } catch (error) {
      setStatus("error", "Nie udało się wysłać wyniku planera. Zostaw zwykłe zapytanie przez formularz na stronie głównej albo zadzwoń do BAROWO.");
    } finally {
      els.next.disabled = false;
      els.back.disabled = currentStepIndex === 0;
      els.next.textContent = "Sprawdź dostępność terminu";
    }
  }

  els.back.addEventListener("click", function () {
    if (currentStepIndex === 0) return;
    currentStepIndex -= 1;
    renderCurrentStep();
  });

  els.next.addEventListener("click", function () {
    if (!validateStep(currentStepIndex)) return;
    if (currentStepIndex === steps.length - 1) {
      submitPlanner();
      return;
    }
    currentStepIndex += 1;
    renderCurrentStep();
  });

  renderCurrentStep();
})();
