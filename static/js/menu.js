const apelidoInput = document.getElementById("apelido");
const erro = document.getElementById("erro");

const btnPersonagem = document.getElementById("btnPersonagem");
const personagemSelecionadoImg = document.getElementById("personagemSelecionado");

const modalPersonagem = document.getElementById("modalPersonagem");
const listaPersonagens = document.getElementById("listaPersonagens");
const fecharModal = document.getElementById("fecharModal");

const btnCriarSala = document.getElementById("btnCriarSala");
const btnEntrarSala = document.getElementById("btnEntrarSala");

const modalCodigoSala = document.getElementById("modalCodigoSala");
const inputCodigoSala = document.getElementById("inputCodigoSala");
const erroCodigoSala = document.getElementById("erroCodigoSala");
const btnConfirmarEntrada = document.getElementById("btnConfirmarEntrada");
const btnFecharCodigo = document.getElementById("btnFecharCodigo");

let personagemSelecionado = null;

const personagens = [
  "img/img-jogador/personagem-1.png",
  "img/img-jogador/personagem-2.png",
  "img/img-jogador/personagem-3.png",
  "img/img-jogador/personagem-4.png",
  "img/img-jogador/personagem-5.png",
  "img/img-jogador/personagem-6.png"
];

function carregarPersonagens() {
  listaPersonagens.innerHTML = "";

  personagens.forEach((personagem) => {
    const div = document.createElement("div");
    div.classList.add("personagem-opcao");

    const img = document.createElement("img");
    img.src = personagem;
    img.alt = "Personagem";

    div.appendChild(img);

    div.addEventListener("click", () => {
      personagemSelecionado = personagem;
      personagemSelecionadoImg.src = personagem;
      personagemSelecionadoImg.style.display = "block";

      document.querySelectorAll(".personagem-opcao").forEach(item => {
        item.classList.remove("selecionado");
      });

      div.classList.add("selecionado");
    });

    listaPersonagens.appendChild(div);
  });
}

function sortearPersonagem() {
  const numero = Math.floor(Math.random() * personagens.length);
  return personagens[numero];
}

function validarJogador() {
  const apelido = apelidoInput.value.trim();

  if (apelido === "") {
    erro.textContent = "Digite um apelido para jogar.";
    return null;
  }

  if (!personagemSelecionado) {
    personagemSelecionado = sortearPersonagem();
  }

  const jogador = {
    apelido,
    personagem: personagemSelecionado
  };

  localStorage.setItem("jogador", JSON.stringify(jogador));
  erro.textContent = "";

  return jogador;
}

function gerarCodigoSala() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let codigo = "";

  for (let i = 0; i < 4; i++) {
    codigo += letras[Math.floor(Math.random() * letras.length)];
  }

  codigo += "-";
  codigo += Math.floor(Math.random() * 9000 + 1000);

  return codigo;
}

async function criarSala() {
  const jogador = validarJogador();
  if (!jogador) return;

  btnCriarSala.disabled = true;
  btnCriarSala.textContent = "Criando...";

  const codigo = gerarCodigoSala();

  const { data: sala, error: erroSala } = await db
    .from("salas")
    .insert({
      codigo,
      status: "aguardando",
      numero_sorteado: null,
      texto_acao: ""
    })
    .select()
    .single();

  if (erroSala) {
    console.error(erroSala);
    erro.textContent = "Erro ao criar sala.";
    btnCriarSala.disabled = false;
    btnCriarSala.textContent = "Criar sala";
    return;
  }

  const { data: jogadorCriado, error: erroJogador } = await db
    .from("jogadores")
    .insert({
      sala_id: sala.id,
      nome: jogador.apelido,
      imagem: jogador.personagem,
      vidas: 3,
      vivo: true,
      posicao: 1,
      is_admin: true
    })
    .select()
    .single();

  if (erroJogador) {
    console.error(erroJogador);
    erro.textContent = "Sala criada, mas erro ao adicionar jogador.";
    return;
  }

  localStorage.setItem("codigoSala", sala.codigo);
  localStorage.setItem("salaId", sala.id);
  localStorage.setItem("jogadorId", jogadorCriado.id);
  localStorage.setItem("isAdmin", "true");

  window.location.href = `templates/sala.html?codigo=${sala.codigo}`;
}

async function entrarNaSala() {
  const jogador = validarJogador();
  if (!jogador) return;

  const codigo = inputCodigoSala.value.trim().toUpperCase();

  if (codigo === "") {
    erroCodigoSala.textContent = "Digite o código da sala.";
    return;
  }

  btnConfirmarEntrada.disabled = true;
  btnConfirmarEntrada.textContent = "Entrando...";

  const { data: sala, error: erroSala } = await db
    .from("salas")
    .select("*")
    .eq("codigo", codigo)
    .single();

  if (erroSala || !sala) {
    erroCodigoSala.textContent = "Sala não encontrada.";
    btnConfirmarEntrada.disabled = false;
    btnConfirmarEntrada.textContent = "Entrar";
    return;
  }

  const { data: jogadoresExistentes, error: erroLista } = await db
    .from("jogadores")
    .select("*")
    .eq("sala_id", sala.id);

  if (erroLista) {
    console.error(erroLista);
    erroCodigoSala.textContent = "Erro ao buscar jogadores.";
    return;
  }

  const posicao = jogadoresExistentes.length + 1;

  const { data: jogadorCriado, error: erroJogador } = await db
    .from("jogadores")
    .insert({
      sala_id: sala.id,
      nome: jogador.apelido,
      imagem: jogador.personagem,
      vidas: 3,
      vivo: true,
      posicao,
      is_admin: false
    })
    .select()
    .single();

  if (erroJogador) {
    console.error(erroJogador);
    erroCodigoSala.textContent = "Erro ao entrar na sala.";
    return;
  }

  localStorage.setItem("codigoSala", sala.codigo);
  localStorage.setItem("salaId", sala.id);
  localStorage.setItem("jogadorId", jogadorCriado.id);
  localStorage.setItem("isAdmin", "false");

  window.location.href = `templates/sala.html?codigo=${sala.codigo}`;
}

btnPersonagem.addEventListener("click", () => {
  modalPersonagem.classList.remove("escondido");
});

fecharModal.addEventListener("click", () => {
  modalPersonagem.classList.add("escondido");
});

btnCriarSala.addEventListener("click", criarSala);

btnEntrarSala.addEventListener("click", () => {
  const jogador = validarJogador();
  if (!jogador) return;

  inputCodigoSala.value = "";
  erroCodigoSala.textContent = "";
  modalCodigoSala.classList.remove("escondido");
});

btnConfirmarEntrada.addEventListener("click", entrarNaSala);

btnFecharCodigo.addEventListener("click", () => {
  modalCodigoSala.classList.add("escondido");
});

carregarPersonagens();