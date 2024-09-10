(() => {
  // список призов
  const prizes = [
    {
      text: "ЛЮБОЙ цвет за 10 минут",
      dropChance: 0.235,
    },
    {
      text: "50 000₽",
      dropChance: 0,
    },
    {
      text: "Укрепление гелем СРАЗУ 4 ногтей",
      dropChance: 0.235,
    },
    {
      text: "Лампа Neonail ",
      dropChance: 0,
    },
    {
      text: "Наращивание БЕЗ форм",
      dropChance: 0.235,
    },
    {
      text: "Бокс с лучшими материалами",
      dropChance: 0.01,
    },
    {
      text: "Урок по ПРИВЛЕЧЕНИЮ клиентов",
      dropChance: 0.235,
    },
    {
      text: "CУПЕР ПРИЗ",
      dropChance: 0.05,
    },
  ];

  // ---------- DOM элементы ----------
  const wheelSpinnerElem = document.querySelector(".wheel__spinner");
  const wheelSpinButtonElem = document.querySelector(".wheel__button_spin");
  const wheelNoSpinButtonElem = document.querySelector(
    ".wheel__button_no-spin"
  );
  const wheelPrizeButtonElem = document.querySelector(".wheel__button_prize");
  const availableSpinsElem = document.querySelector(".available-spins");
  const dealSpinsElem = document.querySelector(".deal-spins");
  const popupElem = document.querySelector(".popup");
  const popupCloseElem = document.querySelector(".popup__close");
  const popupBgElem = document.querySelector(".popup__bg");

  // ---------- TG WEB APP ----------
  const tg = window.Telegram?.WebApp;

  if (tg) {
    tg.expand();
  }

  // ---------- Получение переменных пользователя ----------
  // let availableSpins = +availableSpinsElem.textContent || 0;
  // let dealSpins = +dealSpinsElem.textContent || 0;
  const urlParams = new URLSearchParams(window.location.search);
  let availableSpins = +urlParams.get("a") || 0;
  let dealSpins = +urlParams.get("d") || 0;
  let clientId = +urlParams.get("c") || 0;

  // ---------- Базовая настройка DOM элементов ----------
  // Выключаем ненужные кнопки
  wheelPrizeButtonElem.classList.add("hide");
  wheelNoSpinButtonElem.classList.add("hide");

  availableSpinsElem.textContent = availableSpins;
  dealSpinsElem.textContent = dealSpins;

  // Если нет вращений
  if (availableSpins <= 0) {
    wheelSpinButtonElem.classList.add("hide");
    wheelPrizeButtonElem.classList.add("hide");
    wheelNoSpinButtonElem.classList.remove("hide");

    availableSpinsElem.textContent = "0";
  }

  // ---------- Переменные колеса ----------
  // угловой размер сектора
  const prizeSlice = 360 / prizes.length;
  const sliceOffset = 180 / prizeSlice;

  // Переменная с индексом выпавшего приза
  let prizeIndex;
  // переменная для анимации
  let wheelTickerAnim;
  // угол вращения
  let rotation = 0;
  // текущий сектор
  let currentSlice = 0;
  // флаг состояния вращения
  let isSpinning = false;

  // ---------- Сервисные функции ----------
  function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(this, args);
      }, timeout);
    };
  }

  let audioCache = {};

  function doSound(audioPath, time, loop, volume) {
    let audio = audioCache[audioPath];
    if (!audio) {
      audio = new Audio();
      audio.preload = "auto";
      audio.src = audioPath;
      audio.loop = loop;
      audio.volume = volume;
      audioCache[audioPath] = audio;
    }

    if (audio.paused) {
      audio.play();
    } else {
      audio.currentTime = time;
    }
  }

  const doClickSound = () => {
    doSound(
      "https://fs01.getcourse.ru/fileservice/file/download/a/176948/sc/65/h/8913d21d6ae251b423d89ada59677669.mp3",
      0.033,
      false,
      0.2
    );
  };

  function getElemRotationAngle(elem) {
    const wheelSpinnerStyles = window.getComputedStyle(elem);

    const values = wheelSpinnerStyles.transform
      .split("(")[1]
      .split(")")[0]
      .split(",");
    const a = values[0];
    const b = values[1];
    let rad = Math.atan2(b, a);

    if (rad < 0) rad += 2 * Math.PI;

    const angle = Math.round(rad * (180 / Math.PI));

    return angle;
  }

  // Шанс дропа
  function lerp(min, max, value) {
    return (1 - value) * min + value * max;
  }

  function dropPrize(items) {
    const total = items.reduce(
      (accumulator, item) => accumulator + item.dropChance,
      0
    );
    const chance = lerp(0, total, Math.random());

    let current = 0;
    for (let i = 0; i < items.length; i++) {
      item = items[i];

      if (
        current <= chance &&
        chance < current + item.dropChance
      ) {
        return i;
      }

      current += item.dropChance;
    }

    return current;
  }

  // ---------- Геткурс функции ----------
  function showPrizePopup(index) {
    document.querySelector(".popup__text").textContent = prizes[index].text;
    popupElem.classList.remove("hide");
    popupElem.classList.add("fade-in");
  }

  function setSpinsCount() {
    availableSpins -= 1;
    dealSpins += 1;

    availableSpinsElem.textContent = availableSpins;
    dealSpinsElem.textContent = dealSpins;

    if (availableSpins <= 0) {
      wheelSpinButtonElem.classList.add("hide");
      wheelNoSpinButtonElem.classList.remove("hide");
    }
  }

  // ---------- Функции анимации ----------
  // определяем количество оборотов, которое сделает наше колесо
  const spinertia = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  function runwheelTickerAnimation() {
    // взял код анимации отсюда: https://css-tricks.com/get-value-of-css-rotation-through-javascript/
    const angle = getElemRotationAngle(wheelSpinnerElem);
    const slice = Math.floor((angle + prizeSlice / 2) / prizeSlice);

    // если появился новый сектор
    if (currentSlice !== slice) {
      doClickSound();

      // после того, как язычок прошёл сектор - делаем его текущим
      currentSlice = slice;
    }

    // запускаем анимацию
    wheelTickerAnim = requestAnimationFrame(runwheelTickerAnimation);
  }

  // ---------- Функции обработчиков событий ----------
  function onSpinButtonClick() {
    if (isSpinning) {
      return;
    }

    isSpinning = true;

    const angle = getElemRotationAngle(wheelSpinnerElem);
    wheelSpinnerElem.classList.remove("anim");
    wheelSpinnerElem.style.setProperty("--rotate", angle);

    setTimeout(() => {
      document.body.classList.add("is-spinning");
      document.body.classList.add("hide-controls");

      // задаём начальное вращение колеса
      prizeIndex = dropPrize(prizes);

      rotation =
        Math.floor(prizeIndex * -prizeSlice + spinertia(10, 15) * 360) -
        sliceOffset -
        Math.random() * (prizeSlice - sliceOffset * 2);

      // через CSS говорим секторам, как им повернуться
      wheelSpinnerElem.style.setProperty("--rotate", rotation);

      // запускаем анимацию вращения
      runwheelTickerAnimation();

      // Засчитываем результат
      setSpinsCount();
    }, 0);
  }

  function onWheelAnimationEnd() {
    if (!isSpinning) {
      return;
    }

    // останавливаем отрисовку вращения
    cancelAnimationFrame(runwheelTickerAnimation);

    // получаем текущее значение поворота колеса
    rotation %= 360;

    // убираем класс, который отвечает за вращение
    document.body.classList.remove("is-spinning");
    // отправляем в CSS новое положение поворота колеса
    wheelSpinnerElem.style.setProperty("--rotate", rotation);
    // делаем кнопку снова активной
    isSpinning = false;

    // отправляем подарок в бота
    fetch("https://chatter.salebot.pro/api/9c0729878299ab9db77dcd82e4d19fdd/callback",
      {
        method: "POST",
        body: JSON.stringify({
          message: `${prizeIndex}`,
          client_id: clientId
        })
      }
    )
 

    // Показываем попап
    setTimeout(() => {
      showPrizePopup(prizeIndex);
    }, 200);
  }

  function onClosePopup() {
    popupElem.classList.add("fade-out");
    popupElem.classList.remove("fade-in");

    setTimeout(() => {
      popupElem.classList.add("hide");
      popupElem.classList.remove("fade-out");

      document.querySelectorAll(".popup__prize").forEach((el) => {
        el.classList.add("hide");
      });
      document.body.classList.remove("hide-controls");
    }, 300);
  }

  function onNoSpinButtonClick() {
    // document.querySelector(".no-spins-button button")?.click();
  }
  // ---------- Обработчики событий ----------
  // Начало анимации
  wheelSpinButtonElem.addEventListener("click", onSpinButtonClick);

  // Конец вращения
  wheelSpinnerElem.addEventListener("transitionend", onWheelAnimationEnd);

  // Закрытие попапа
  popupCloseElem.addEventListener("click", onClosePopup);
  popupBgElem.addEventListener("click", onClosePopup);
  wheelNoSpinButtonElem.addEventListener("click", onNoSpinButtonClick);
})();
