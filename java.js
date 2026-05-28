var buton = document.getElementById('menu_img');
var meniu = document.getElementById('menu');
var close = document.getElementById('close');
var hidden_menu_li = document.getElementById('hidden_menu_li');

buton.addEventListener("click", function() {
  if (meniu.style.display === 'none') {
    meniu.style.display = 'grid';
  }
});

close.addEventListener("click", function() {
  if(meniu.style.display === 'grid'){
    meniu.style.display = 'none';
  }
});

hidden_menu_li.addEventListener("click", function() {
  if(meniu.style.display === 'grid'){
    meniu.style.display = 'none';
  }
});

document.addEventListener('DOMContentLoaded', (event) => {
  const form = document.querySelector('form');
  form.addEventListener('submit', (event) => {
    const firstNameInput = document.querySelector('input[name="name"]');
    const hiddenSubject = document.querySelector('input[name="subject"]');
    hiddenSubject.value = `${firstNameInput.value} a trimis un email.`;
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const partnerItems = document.querySelectorAll(".partners-list ul li");

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15
  });

  partnerItems.forEach(function (item, index) {
    item.style.transitionDelay = (index % 10) * 0.04 + "s";
    observer.observe(item);
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const partnerItems = document.querySelectorAll(".partners-list ul li");
  const sectionTitles = document.querySelectorAll(".partners-section h2");
  const sectionLines = document.querySelectorAll(".partners-section hr");

  const itemObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        itemObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15
  });

  partnerItems.forEach(function (item, index) {
    item.style.transitionDelay = (index % 10) * 0.04 + "s";
    itemObserver.observe(item);
  });

  const titleObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");

        const line = entry.target.nextElementSibling;
        if (line && line.tagName.toLowerCase() === "hr") {
          setTimeout(function () {
            line.classList.add("show");
          }, 220);
        }

        titleObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.3
  });

  sectionTitles.forEach(function (title) {
    titleObserver.observe(title);
  });

  sectionLines.forEach(function (line) {
    if (!line.previousElementSibling || line.previousElementSibling.tagName.toLowerCase() !== "h2") {
      itemObserver.observe(line);
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const partnerItems = document.querySelectorAll(".partners-card ul li");
  const sectionTitles = document.querySelectorAll(".partners-card h2");
  const cards = document.querySelectorAll(".partners-card");

  const cardObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("show-card");
        cardObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15
  });

  cards.forEach(function (card, index) {
    card.style.transitionDelay = index * 0.08 + "s";
    cardObserver.observe(card);
  });

  const itemObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        itemObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15
  });

  partnerItems.forEach(function (item, index) {
    item.style.transitionDelay = (index % 10) * 0.04 + "s";
    itemObserver.observe(item);
  });

  const titleObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");

        const line = entry.target.nextElementSibling;
        if (line && line.tagName.toLowerCase() === "hr") {
          setTimeout(function () {
            line.classList.add("show");
          }, 220);
        }

        titleObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.3
  });

  sectionTitles.forEach(function (title) {
    titleObserver.observe(title);
  });
});