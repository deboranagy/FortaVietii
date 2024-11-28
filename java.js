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


