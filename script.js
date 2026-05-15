async function salvar() {
  const nome = document.querySelector('input[placeholder="Nome do funcionário"]').value;
  const login = document.querySelector('input[placeholder="ex: joao.silva"]').value;
  const perfil = document.querySelector('select').value;
  const turno = document.querySelectorAll('select')[1].value;

  if (!nome) {
    alert('Digite o nome!');
    return;
  }

  try {

    const res = await fetch('https://feedback-sistema.onrender.com/usuarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nome,
        login,
        perfil,
        turno
      })
    });

    const data = await res.json();

    console.log(data);

    alert('Usuário salvo com sucesso!');

    carregar();

  } catch (erro) {

    console.error(erro);

    alert('Erro ao salvar usuário');

  }
}