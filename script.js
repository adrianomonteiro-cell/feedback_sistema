async function salvar() {
  const nome = document.getElementById('nome').value;

  await fetch('http://localhost:3000/usuarios', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ nome })
  });

  document.getElementById('nome').value = '';
  carregar();
}

async function carregar() {
  const res = await fetch('http://localhost:3000/usuarios');
  const dados = await res.json();

  const lista = document.getElementById('lista-funcionarios');
  lista.innerHTML = '';

  dados.forEach(user => {
    const div = document.createElement('div');
    div.textContent = user.nome;
    lista.appendChild(div);
  });
}

// executa automaticamente ao abrir a página
carregar();