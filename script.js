const btnHamburguer = document.getElementById('btnHamburguer');
const navMenu = document.getElementById('navMenu');

btnHamburguer.addEventListener('click', () => {
    navMenu.classList.toggle('ativo');
    btnHamburguer.classList.toggle('aberto');
});