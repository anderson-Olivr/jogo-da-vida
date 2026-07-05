const listaJogadores = document.getElementById("listaJogadores");
const numeroSorteado = document.getElementById("numeroSorteado");
const btnSortearNumero = document.getElementById("btnSortearNumero");
const codigoSalaTexto = document.getElementById("codigoSala");
const statusSalaTexto = document.getElementById("statusSala");
const btnIniciarPartida = document.getElementById("btnIniciarPartida");
const textoAcao = document.getElementById("textoAcao");

let salaAtual = null;
let jogadores = [];

const params = new URLSearchParams(window.location.search);
const codigoUrl = params.get("codigo");

const codigoSala = codigoUrl || localStorage.getItem("codigoSala");
const salaIdLocal = localStorage.getItem("salaId");
const jogadorIdLocal = localStorage.getItem("jogadorId");
const isAdmin = localStorage.getItem("isAdmin") === "true";

async function carregarSala() {
  if (!codigoSala) {
    alert("Código da sala não encontrado.");
    window.location.href = "../index.html";
    return;
  }

  const { data, error } = await db
    .from("salas")
    .select("*")
    .eq("codigo", codigoSala)
    .single();

  if (error || !data) {
    console.error(error);
    alert("Sala não encontrada.");
    window.location.href = "../index.html";
    return;
  }

  salaAtual = data;

  localStorage.setItem("codigoSala", data.codigo);
  localStorage.setItem("salaId", data.id);

  renderizarSala();
  await carregarJogadores();
  ouvirMudancasTempoReal();
}

async function carregarJogadores() {
  const { data, error } = await db
    .from("jogadores")
    .select("*")
    .eq("sala_id", salaAtual.id)
    .order("posicao", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  jogadores = data;
  renderizarJogadores();
}

function renderizarSala() {
  codigoSalaTexto.textContent = salaAtual.codigo;
  statusSalaTexto.textContent = salaAtual.status;

  numeroSorteado.textContent =
    salaAtual.numero_sorteado === null ? "?" : salaAtual.numero_sorteado;

  textoAcao.textContent =
    salaAtual.texto_acao || "Aguardando jogadores...";

  if (isAdmin && salaAtual.status === "aguardando") {
    btnIniciarPartida.classList.remove("escondido");
  } else {
    btnIniciarPartida.classList.add("escondido");
  }

  if (salaAtual.status !== "jogando") {
    btnSortearNumero.disabled = true;
    btnSortearNumero.textContent = "Aguardando início";
  } else {
    btnSortearNumero.disabled = false;
    btnSortearNumero.textContent = "Sortear número";
  }
}

function caminhoImagem(imagem) {
  if (!imagem) return "";

  if (imagem.startsWith("../")) {
    return imagem;
  }

  return "../" + imagem;
}

function pegarNomeJogadorPorId(id) {
  const jogador = jogadores.find(j => j.id === id);
  return jogador ? jogador.nome : "???";
}

function renderizarJogadores() {
  listaJogadores.innerHTML = "";

  jogadores.forEach(jogador => {
    const card = document.createElement("div");
    card.classList.add("card-jogador");

    if (!jogador.vivo) {
      card.classList.add("morto");
    }

    const img = document.createElement("img");
    img.src = caminhoImagem(jogador.imagem);
    img.alt = jogador.nome;
    img.classList.add("img-jogador");

    const info = document.createElement("div");
    info.classList.add("info-jogador");

    const nome = document.createElement("span");
    nome.classList.add("nome-jogador");
    nome.textContent = jogador.nome;

    info.appendChild(nome);

    if (jogador.amaldicoado) {
      const maldicao = document.createElement("span");
      maldicao.textContent = "😈";
      maldicao.title = "Amaldiçoado";
      info.appendChild(maldicao);
    }

    if (jogador.is_admin) {
      const admin = document.createElement("span");
      admin.textContent = "👑";
      admin.title = "Administrador da sala";
      info.appendChild(admin);
    }

    const vidas = document.createElement("div");
    vidas.classList.add("vidas-jogador");
    vidas.textContent = `❤️ ${jogador.vidas}`;

    const almaGemea = document.createElement("div");
    almaGemea.classList.add("alma-gemea");

    if (jogador.alma_gemea_id) {
      const nomeAlma = pegarNomeJogadorPorId(jogador.alma_gemea_id);
      almaGemea.textContent = `☯ Alma gêmea: ${nomeAlma}`;
    } else {
      almaGemea.textContent = "Sem alma gêmea";
    }

    const status = document.createElement("div");
    status.classList.add("status-jogador");
    status.textContent = jogador.vivo ? "🟢" : "💀";

    card.appendChild(img);
    card.appendChild(info);
    card.appendChild(vidas);
    card.appendChild(almaGemea);
    card.appendChild(status);

    listaJogadores.appendChild(card);
  });
}

function gerarTextoAcao(numero, nomeJogador) {
  if (numero === 0) return `${nomeJogador} tirou 0: ganhou +1 vida.`;
  if (numero === 1) return `${nomeJogador} tirou 1: perdeu 1 vida.`;
  if (numero === 2) return `${nomeJogador} tirou 2: clique no jogador de quem deseja roubar uma vida.`;
  if (numero === 3) return `${nomeJogador} tirou 3: escolha alguém para trocar de posição.`;
  if (numero === 4) return `${nomeJogador} tirou 4: clique em alguém para matar.`;
  if (numero === 5) return `${nomeJogador} tirou 5: maldição ativada! Jogadores aleatórios perderão vida.`;
  if (numero === 6) return `${nomeJogador} tirou 6: escolha alguém para amaldiçoar.`;
  if (numero === 7) return `${nomeJogador} tirou 7: escolha alguém morto para reviver.`;
  if (numero === 8) return `${nomeJogador} tirou 8: doe uma vida obrigatoriamente para alguém.`;
  if (numero === 9) return `${nomeJogador} tirou 9: clique no jogador que deseja vincular sua alma.`;

  return "";
}

async function iniciarPartida() {
  if (!isAdmin) {
    alert("Apenas o administrador pode iniciar.");
    return;
  }

  const { error } = await db
    .from("salas")
    .update({
      status: "jogando",
      texto_acao: "A partida começou! Sorteie o primeiro número."
    })
    .eq("id", salaAtual.id);

  if (error) {
    console.error(error);
    alert("Erro ao iniciar partida.");
  }
}

async function sortearNumero() {
  const jogadorAtual = jogadores.find(j => j.id === jogadorIdLocal);

  if (!jogadorAtual) {
    alert("Jogador não encontrado.");
    return;
  }

  const numero = Math.floor(Math.random() * 10);
  const mensagem = gerarTextoAcao(numero, jogadorAtual.nome);

  const { error } = await db
    .from("salas")
    .update({
      numero_sorteado: numero,
      texto_acao: mensagem
    })
    .eq("id", salaAtual.id);

  if (error) {
    console.error(error);
    alert("Erro ao sortear número.");
  }
}

function ouvirMudancasTempoReal() {
  db.channel("sala-" + salaAtual.id)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "salas",
        filter: `id=eq.${salaAtual.id}`
      },
      async (payload) => {
        salaAtual = payload.new;
        renderizarSala();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "jogadores",
        filter: `sala_id=eq.${salaAtual.id}`
      },
      async () => {
        await carregarJogadores();
      }
    )
    .subscribe();
}

btnIniciarPartida.addEventListener("click", iniciarPartida);
btnSortearNumero.addEventListener("click", sortearNumero);

carregarSala();