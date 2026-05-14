async function salvar() {
  const nome = document.querySelector('input[placeholder="Nome do funcionário"]').value;
  const login = document.querySelector('input[placeholder="ex: joao.silva"]').value;
  const perfil = document.querySelector('select').value;
  const turno = document.querySelectorAll('select')[1].value;

  if (!nome) {
    alert('Digite o nome!');
    return;
  }

  await fetch('https://feedback-sistema.onrender.com/usuarios', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ nome, login, perfil, turno })
  });

  carregar();
}

async function carregar() {
  const res = await fetch('https://feedback-sistema.onrender.com/usuarios');
  const dados = await res.json();

  const lista = document.getElementById('lista-funcionarios');
  lista.innerHTML = '';

  dados.forEach(user => {
    const linha = `
      <div style="display:grid; grid-template-columns: 2fr 1fr 1fr 1fr; padding:8px; border-bottom:1px solid #ddd;">
        <div>${user.nome || '-'}</div>
        <div>${user.login || '-'}</div>
        <div>${user.perfil || '-'}</div>
        <div>${user.turno || '-'}</div>
      </div>
    `;
    lista.innerHTML += linha;
  });
}

// roda ao abrir
carregar();