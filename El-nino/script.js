const btnHamburguer = document.getElementById('btnHamburguer');
const navMenu = document.getElementById('navMenu');
const linksMenu = document.querySelectorAll('.btn-menu');

// Função para fechar o menu e resetar o ícone do botão
function fecharMenu() {
    navMenu.classList.remove('ativo');
    btnHamburguer.classList.remove('aberto');
}

// Abre e fecha ao clicar no botão hambúrguer
btnHamburguer.addEventListener('click', (evento) => {
    evento.stopPropagation(); 
    navMenu.classList.toggle('ativo');
    btnHamburguer.classList.toggle('aberto');
});

// Fecha o menu ao clicar em qualquer link de seção
linksMenu.forEach(link => {
    link.addEventListener('click', fecharMenu);
});

// Fecha o menu ao clicar fora dele
document.addEventListener('click', (evento) => {
    const clicouDentroDoMenu = navMenu.contains(evento.target);
    const clicouNoBotao = btnHamburguer.contains(evento.target);

    if (navMenu.classList.contains('ativo') && !clicouDentroDoMenu && !clicouNoBotao) {
        fecharMenu();
    }
});
