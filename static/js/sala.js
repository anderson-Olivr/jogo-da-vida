const listaJogadores = document.getElementById("listaJogadores");
const listaMortos = document.getElementById("listaMortos");
const numeroSorteado = document.getElementById("numeroSorteado");
const descricaoNumero = document.getElementById("descricaoNumero");
const btnSortearNumero = document.getElementById("btnSortearNumero");
const codigoSalaTexto = document.getElementById("codigoSala");
const statusSalaTexto = document.getElementById("statusSala");
const jogadorDaVezTexto = document.getElementById("jogadorDaVez");
const btnIniciarPartida = document.getElementById("btnIniciarPartida");
const textoAcao = document.getElementById("textoAcao");

let salaAtual = null;
let jogadores = [];
let canalRealtime = null;

const params = new URLSearchParams(window.location.search);
const codigoUrl = params.get("codigo");

const codigoSala = codigoUrl || localStorage.getItem("codigoSala");
const jogadorIdLocal = localStorage.getItem("jogadorId");

let isAdmin = false;
let jogadorLocal = null;

const descricoes = {
  0: "Vida extra: ganha +1 vida. Se tiver alma gêmea, ela também ganha.",
  1: "Ferimento: perde 1 vida. Se tiver alma gêmea, ela também perde.",
  2: "Roubo: escolha alguém para roubar 1 vida.",
  3: "Troca de ordem: escolha alguém para trocar posição, vidas e maldição.",
  4: "Morte: escolha alguém para matar.",
  5: "Maldição: de 1 a 4 jogadores aleatórios perdem 1 vida.",
  6: "Amaldiçoar: escolha alguém para receber uma maldição de 3 turnos.",
  7: "Reviver: escolha alguém do cemitério para reviver.",
  8: "Doação: escolha alguém para receber 1 vida sua.",
  9: "Alma gêmea: escolha alguém sem alma gêmea para criar vínculo."
};

function vivos() {
  return jogadores.filter(j => j.vivo).sort((a, b) => a.posicao - b.posicao);
}

function mortos() {
  return jogadores.filter(j => !j.vivo);
}

function jogadorDaVez() {
  return jogadores.find(j => j.vivo && j.posicao === salaAtual.turno_posicao);
}

function souJogadorDaVez() {
  const jogador = jogadores.find(j => j.id === jogadorIdLocal);
  return jogador && jogador.vivo && jogador.posicao === salaAtual.turno_posicao;
}

function caminhoImagem(imagem) {
  if (!imagem) return "";
  return imagem.startsWith("../") ? imagem : "../" + imagem;
}

function nomeAlmaGemea(id) {
  const alma = jogadores.find(j => j.id === id);
  return alma ? alma.nome : "???";
}

async function carregarSala() {
  const { data, error } = await db
    .from("salas")
    .select("*")
    .eq("codigo", codigoSala)
    .single();

  if (error || !data) {
    alert("Sala não encontrada.");
    window.location.href = "../index.html";
    return;
  }

  salaAtual = data;

  localStorage.setItem("salaId", data.id);
  localStorage.setItem("codigoSala", data.codigo);

  await carregarJogadores();
  renderizarTudo();
  ouvirTempoReal();
}

async function carregarSalaSemRealtime() {
  const { data, error } = await db
    .from("salas")
    .select("*")
    .eq("codigo", codigoSala)
    .single();

  if (error) {
    console.error("Erro ao recarregar sala:", error);
    return;
  }

  salaAtual = data;
  await carregarJogadores();
  renderizarTudo();
}

async function carregarJogadores() {
  const { data, error } = await db
    .from("jogadores")
    .select("*")
    .eq("sala_id", salaAtual.id)
    .order("posicao", { ascending: true });

  if (error) {
    console.error("Erro ao carregar jogadores:", error);
    return;
  }

  jogadores = data || [];

  jogadorLocal = jogadores.find(j => j.id === jogadorIdLocal);

  if (jogadorLocal) {
    isAdmin = jogadorLocal.is_admin === true;
    localStorage.setItem("isAdmin", isAdmin ? "true" : "false");
  }
}

function renderizarTudo() {
  renderizarSala();
  renderizarJogadores();
  renderizarMortos();
}

function renderizarSala() {
  const daVez = jogadorDaVez();

  codigoSalaTexto.textContent = salaAtual.codigo;
  statusSalaTexto.textContent = salaAtual.status;
  jogadorDaVezTexto.textContent = daVez ? daVez.nome : "---";

  numeroSorteado.textContent =
    salaAtual.numero_sorteado === null ? "?" : salaAtual.numero_sorteado;

  descricaoNumero.textContent = salaAtual.descricao_numero || "";

  if (salaAtual.status === "jogando") {
    textoAcao.textContent = daVez
      ? `Turno de ${daVez.nome}.`
      : "Aguardando jogador da vez...";
  } else {
    textoAcao.textContent = salaAtual.texto_acao || "Aguardando jogadores...";
  }

  if (isAdmin && salaAtual.status !== "jogando") {
    btnIniciarPartida.classList.remove("escondido");
  } else {
    btnIniciarPartida.classList.add("escondido");
  }

  btnSortearNumero.disabled =
    salaAtual.status !== "jogando" ||
    !souJogadorDaVez() ||
    salaAtual.acao_pendente !== null;

  if (salaAtual.status !== "jogando") {
    btnSortearNumero.textContent = "Aguardando início";
  } else if (!souJogadorDaVez()) {
    btnSortearNumero.textContent = "Aguarde sua vez";
  } else if (salaAtual.acao_pendente) {
    btnSortearNumero.textContent = "Escolha um jogador";
  } else {
    btnSortearNumero.textContent = "Sortear número";
  }
}

function renderizarJogadores() {
  listaJogadores.innerHTML = "";

  vivos().forEach(jogador => {
    const card = document.createElement("div");
    card.classList.add("card-jogador");

    if (jogador.posicao === salaAtual.turno_posicao) {
      card.classList.add("jogador-turno");
    }

    const img = document.createElement("img");
    img.src = caminhoImagem(jogador.imagem);
    img.classList.add("img-jogador");

    const nome = document.createElement("div");
    nome.classList.add("info-jogador");
    nome.innerHTML = `<strong>${jogador.posicao}º - ${jogador.nome}</strong>`;

    if (jogador.is_admin) nome.innerHTML += " 👑";

    if (jogador.amaldicoado) {
      const contadorVisual = Math.max(jogador.maldicao_turnos - 1, 1);
      nome.innerHTML += ` ☠${contadorVisual}`;
    }

    const vidas = document.createElement("div");
    vidas.classList.add("vidas-jogador");
    vidas.textContent = "❤️ " + jogador.vidas;

    const alma = document.createElement("div");
    alma.classList.add("alma-gemea");
    alma.textContent = jogador.alma_gemea_id
      ? `☯ ${nomeAlmaGemea(jogador.alma_gemea_id)}`
      : "Sem alma gêmea";

    card.appendChild(img);
    card.appendChild(nome);
    card.appendChild(vidas);
    card.appendChild(alma);

    card.addEventListener("click", () => escolherJogador(jogador));

    listaJogadores.appendChild(card);
  });
}

function renderizarMortos() {
  listaMortos.innerHTML = "";

  if (mortos().length === 0) {
    listaMortos.innerHTML = `<p style="text-align:center; opacity:0.7;">Nenhum morto</p>`;
    return;
  }

  mortos().forEach(jogador => {
    const div = document.createElement("div");
    div.classList.add("morto-card");

    div.innerHTML = `
      <img src="${caminhoImagem(jogador.imagem)}">
      <span>${jogador.nome}</span>
    `;

    div.addEventListener("click", () => escolherJogador(jogador));

    listaMortos.appendChild(div);
  });
}

function existeAlvoValido(numero, jogador) {
  const vivosLista = vivos();
  const mortosLista = mortos();

  if (numero === 2) {
    return vivosLista.some(j => j.id !== jogador.id && j.vidas > 0);
  }

  if ([3, 4, 6, 8].includes(numero)) {
    return vivosLista.some(j => j.id !== jogador.id);
  }

  if (numero === 7) {
    return mortosLista.length > 0;
  }

  if (numero === 9) {
    if (jogador.alma_gemea_id) return false;

    return vivosLista.some(j =>
      j.id !== jogador.id &&
      !j.alma_gemea_id
    );
  }

  return true;
}

function sortearNumeroValido(jogador) {
  let tentativas = 0;

  while (tentativas < 50) {
    const numero = Math.floor(Math.random() * 10);

    if (existeAlvoValido(numero, jogador)) {
      return numero;
    }

    tentativas++;
  }

  return 1;
}

async function iniciarPartida() {
  if (!isAdmin) {
    alert("Apenas o administrador pode iniciar a partida.");
    return;
  }

  if (!jogadores || jogadores.length < 2) {
    alert("Precisa de pelo menos 2 jogadores para iniciar.");
    return;
  }

  const embaralhados = [...jogadores].sort(() => Math.random() - 0.5);

  for (let i = 0; i < embaralhados.length; i++) {
    const { error } = await db
      .from("jogadores")
      .update({
        posicao: i + 1,
        vidas: 3,
        vivo: true,
        amaldicoado: false,
        maldicao_turnos: 0,
        alma_gemea_id: null,
        morto_em: null
      })
      .eq("id", embaralhados[i].id);

    if (error) {
      console.error("Erro ao atualizar jogador:", error);
      alert("Erro ao atualizar jogador: " + error.message);
      return;
    }
  }

  const { data, error } = await db
    .from("salas")
    .update({
      status: "jogando",
      turno_posicao: 1,
      rodada: 1,
      numero_sorteado: null,
      acao_pendente: null,
      jogador_acao_id: null,
      descricao_numero: "",
      texto_acao: "Partida iniciada! O jogador da vez deve sortear."
    })
    .eq("id", salaAtual.id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao iniciar sala:", error);
    alert("Erro ao iniciar sala: " + error.message);
    return;
  }

  salaAtual = data;
  await carregarJogadores();
  renderizarTudo();
}

async function sortearNumero() {
  if (!souJogadorDaVez()) return;
  if (salaAtual.acao_pendente) return;

  const jogador = jogadorDaVez();
  const numero = sortearNumeroValido(jogador);

  let acaoPendente = null;
  let texto = `${jogador.nome} tirou ${numero}.`;

  if ([2, 3, 4, 6, 7, 8, 9].includes(numero)) {
    acaoPendente = String(numero);
    texto += " Escolha um jogador para continuar.";
  } else {
    texto += " " + descricoes[numero];
  }

  const { error } = await db
    .from("salas")
    .update({
      numero_sorteado: numero,
      descricao_numero: descricoes[numero],
      texto_acao: texto,
      acao_pendente: acaoPendente,
      jogador_acao_id: jogador.id
    })
    .eq("id", salaAtual.id);

  if (error) {
    console.error("Erro ao sortear número:", error);
    alert("Erro ao sortear número: " + error.message);
    return;
  }

  await carregarSalaSemRealtime();

  if ([0, 1, 5].includes(numero)) {
    await executarAcaoAutomatica(numero, jogador);
  }
}

async function executarAcaoAutomatica(numero, jogador) {
  if (numero === 0) {
    await alterarVida(jogador.id, 1, true);
    await atualizarTexto(`${jogador.nome} ganhou 1 vida.`);
  }

  if (numero === 1) {
    await alterarVida(jogador.id, -1, true);
    await atualizarTexto(`${jogador.nome} perdeu 1 vida.`);
  }

  if (numero === 5) {
    await executarMaldicaoAleatoria(jogador.id);
  }

  await finalizarTurno();
}

async function escolherJogador(alvo) {
  if (!souJogadorDaVez()) return;
  if (!salaAtual.acao_pendente) return;
  if (salaAtual.jogador_acao_id !== jogadorIdLocal) return;

  const jogador = jogadorDaVez();
  const acao = Number(salaAtual.acao_pendente);

  if (acao !== 7 && !alvo.vivo) return;
  if (acao === 7 && alvo.vivo) return;
  if (alvo.id === jogador.id) return;

  if (acao === 9 && (jogador.alma_gemea_id || alvo.alma_gemea_id)) {
    await atualizarTexto("Não é possível criar alma gêmea: um dos jogadores já possui vínculo.");
    return;
  }

  if (acao === 2) await roubarVida(jogador, alvo);
  if (acao === 3) await trocarPosicao(jogador, alvo);
  if (acao === 4) await matarJogador(alvo.id, jogador.id);
  if (acao === 6) await amaldicoarJogador(alvo);
  if (acao === 7) await reviverJogador(alvo);
  if (acao === 8) await doarVida(jogador, alvo);
  if (acao === 9) await criarAlmaGemea(jogador, alvo);

  await finalizarTurno();
}

async function alterarVida(jogadorId, quantidade, afetaAlmaGemea) {
  await carregarJogadores();

  const jogador = jogadores.find(j => j.id === jogadorId);
  if (!jogador || !jogador.vivo) return;

  const novaVida = jogador.vidas + quantidade;

  if (novaVida <= 0) {
    await matarJogador(jogador.id, null);
  } else {
    const { error } = await db
      .from("jogadores")
      .update({ vidas: novaVida })
      .eq("id", jogador.id);

    if (error) console.error("Erro ao alterar vida:", error);
  }

  if (afetaAlmaGemea && jogador.alma_gemea_id) {
    await carregarJogadores();

    const alma = jogadores.find(j => j.id === jogador.alma_gemea_id);

    if (alma && alma.vivo) {
      const novaVidaAlma = alma.vidas + quantidade;

      if (novaVidaAlma <= 0) {
        await matarJogador(alma.id, null);
      } else {
        const { error } = await db
          .from("jogadores")
          .update({ vidas: novaVidaAlma })
          .eq("id", alma.id);

        if (error) console.error("Erro ao alterar vida da alma gêmea:", error);
      }
    }
  }
}

async function roubarVida(jogador, alvo) {
  if (alvo.vidas <= 0) return;

  await alterarVida(alvo.id, -1, false);
  await alterarVida(jogador.id, 1, true);

  await atualizarTexto(`${jogador.nome} roubou 1 vida de ${alvo.nome}.`);
}

async function doarVida(jogador, alvo) {
  if (jogador.vidas <= 1) {
    await matarJogador(jogador.id, null);
  } else {
    await alterarVida(jogador.id, -1, false);
  }

  await alterarVida(alvo.id, 1, false);

  await atualizarTexto(`${jogador.nome} doou 1 vida para ${alvo.nome}.`);
}

async function trocarPosicao(jogador, alvo) {
  const posA = jogador.posicao;
  const posB = alvo.posicao;

  const vidasA = jogador.vidas;
  const vidasB = alvo.vidas;

  const maldA = jogador.amaldicoado;
  const turnosA = jogador.maldicao_turnos;

  const maldB = alvo.amaldicoado;
  const turnosB = alvo.maldicao_turnos;

  const { error: erroA } = await db
    .from("jogadores")
    .update({
      posicao: posB,
      vidas: vidasB,
      amaldicoado: maldB,
      maldicao_turnos: turnosB
    })
    .eq("id", jogador.id);

  if (erroA) {
    console.error("Erro ao trocar jogador A:", erroA);
    return;
  }

  const { error: erroB } = await db
    .from("jogadores")
    .update({
      posicao: posA,
      vidas: vidasA,
      amaldicoado: maldA,
      maldicao_turnos: turnosA
    })
    .eq("id", alvo.id);

  if (erroB) {
    console.error("Erro ao trocar jogador B:", erroB);
    return;
  }

  await atualizarTexto(`${jogador.nome} trocou de posição com ${alvo.nome}.`);
}

async function matarJogador(jogadorId, assassinoId) {
  await carregarJogadores();

  const jogador = jogadores.find(j => j.id === jogadorId);
  if (!jogador || !jogador.vivo) return;

  const almaId = jogador.alma_gemea_id;

  const { error } = await db
    .from("jogadores")
    .update({
      vivo: false,
      vidas: 0,
      morto_em: new Date().toISOString(),
      amaldicoado: false,
      maldicao_turnos: 0,
      alma_gemea_id: null
    })
    .eq("id", jogador.id);

  if (error) {
    console.error("Erro ao matar jogador:", error);
    return;
  }

  if (almaId) {
    await carregarJogadores();

    const alma = jogadores.find(j => j.id === almaId);

    if (alma && alma.vivo) {
      if (assassinoId === alma.id) {
        await db
          .from("jogadores")
          .update({ alma_gemea_id: null })
          .eq("id", alma.id);

        await atualizarTexto(`${alma.nome} matou sua própria alma gêmea. O vínculo foi desfeito.`);
      } else {
        await db
          .from("jogadores")
          .update({
            vivo: false,
            vidas: 0,
            morto_em: new Date().toISOString(),
            amaldicoado: false,
            maldicao_turnos: 0,
            alma_gemea_id: null
          })
          .eq("id", alma.id);

        await atualizarTexto(`${jogador.nome} morreu e levou sua alma gêmea ${alma.nome} junto.`);
      }
    }
  }

  await limparAlmasGemeasInvalidas();
  await reorganizarPosicoes();
}

async function limparAlmasGemeasInvalidas() {
  await carregarJogadores();

  for (const jogador of jogadores) {
    if (!jogador.alma_gemea_id) continue;

    const alma = jogadores.find(j => j.id === jogador.alma_gemea_id);

    if (!alma || !alma.vivo) {
      await db
        .from("jogadores")
        .update({ alma_gemea_id: null })
        .eq("id", jogador.id);
    }
  }
}

async function reorganizarPosicoes() {
  await carregarJogadores();

  const vivosOrdenados = vivos();

  for (let i = 0; i < vivosOrdenados.length; i++) {
    const { error } = await db
      .from("jogadores")
      .update({ posicao: i + 1 })
      .eq("id", vivosOrdenados[i].id);

    if (error) console.error("Erro ao reorganizar posição:", error);
  }
}

async function executarMaldicaoAleatoria(jogadorIdProtegido) {
  await carregarJogadores();

  const alvosPossiveis = vivos().filter(j => j.id !== jogadorIdProtegido);

  if (alvosPossiveis.length === 0) {
    await atualizarTexto("Maldição não atingiu ninguém.");
    return;
  }

  const quantidade = Math.min(
    Math.floor(Math.random() * 4) + 1,
    alvosPossiveis.length
  );

  const sorteados = alvosPossiveis
    .sort(() => Math.random() - 0.5)
    .slice(0, quantidade);

  for (const alvo of sorteados) {
    await alterarVida(alvo.id, -1, true);
  }

  const nomes = sorteados.map(j => j.nome).join(", ");
  await atualizarTexto(`Maldição atingiu ${quantidade} jogador(es): ${nomes}.`);
}

async function amaldicoarJogador(alvo) {
  const { error } = await db
    .from("jogadores")
    .update({
      amaldicoado: true,
      maldicao_turnos: 4
    })
    .eq("id", alvo.id);

  if (error) {
    console.error("Erro ao amaldiçoar jogador:", error);
    return;
  }

  await atualizarTexto(`${alvo.nome} foi amaldiçoado por 3 turnos.`);
}

async function reviverJogador(alvo) {
  const ultimaPosicao = vivos().length + 1;

  const { error } = await db
    .from("jogadores")
    .update({
      vivo: true,
      vidas: 1,
      posicao: ultimaPosicao,
      morto_em: null,
      amaldicoado: false,
      maldicao_turnos: 0,
      alma_gemea_id: null
    })
    .eq("id", alvo.id);

  if (error) {
    console.error("Erro ao reviver jogador:", error);
    return;
  }

  await atualizarTexto(`${alvo.nome} foi revivido com 1 vida.`);
}

async function criarAlmaGemea(jogador, alvo) {
  if (jogador.alma_gemea_id || alvo.alma_gemea_id) {
    await atualizarTexto("Um dos jogadores já possui alma gêmea.");
    return;
  }

  const { error: erroA } = await db
    .from("jogadores")
    .update({ alma_gemea_id: alvo.id })
    .eq("id", jogador.id);

  if (erroA) {
    console.error("Erro ao criar alma gêmea A:", erroA);
    return;
  }

  const { error: erroB } = await db
    .from("jogadores")
    .update({ alma_gemea_id: jogador.id })
    .eq("id", alvo.id);

  if (erroB) {
    console.error("Erro ao criar alma gêmea B:", erroB);
    return;
  }

  await atualizarTexto(`${jogador.nome} e ${alvo.nome} agora são almas gêmeas.`);
}

async function reduzirMaldicoes() {
  await carregarJogadores();

  const lista = vivos().filter(j => j.amaldicoado);

  for (const j of lista) {
    const novoValor = j.maldicao_turnos - 1;

    if (novoValor <= 0) {
      await matarJogador(j.id, null);
    } else {
      const { error } = await db
        .from("jogadores")
        .update({ maldicao_turnos: novoValor })
        .eq("id", j.id);

      if (error) console.error("Erro ao reduzir maldição:", error);
    }
  }
}

async function finalizarTurno() {
  await reduzirMaldicoes();
  await carregarJogadores();

  const vivosAgora = vivos();

  if (vivosAgora.length <= 1) {
    const vencedor = vivosAgora[0];

    await db
      .from("salas")
      .update({
        status: "encerrado",
        acao_pendente: null,
        jogador_acao_id: null,
        descricao_numero: "",
        texto_acao: vencedor ? `🏆 ${vencedor.nome} venceu!` : "Todos morreram!"
      })
      .eq("id", salaAtual.id);

    return;
  }

  let proximaPosicao = salaAtual.turno_posicao + 1;

  if (proximaPosicao > vivosAgora.length) {
    proximaPosicao = 1;
  }

  const proximoJogador = vivosAgora.find(j => j.posicao === proximaPosicao);

  await db
    .from("salas")
    .update({
      turno_posicao: proximaPosicao,
      acao_pendente: null,
      jogador_acao_id: null,
      numero_sorteado: null,
      descricao_numero: "",
      texto_acao: proximoJogador
        ? `Turno de ${proximoJogador.nome}.`
        : "Próximo turno."
    })
    .eq("id", salaAtual.id);
}

async function atualizarTexto(texto) {
  const { error } = await db
    .from("salas")
    .update({ texto_acao: texto })
    .eq("id", salaAtual.id);

  if (error) {
    console.error("Erro ao atualizar texto:", error);
  }
}

function ouvirTempoReal() {
  if (canalRealtime) {
    db.removeChannel(canalRealtime);
  }

  canalRealtime = db.channel("sala-" + salaAtual.id)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "salas",
      filter: `id=eq.${salaAtual.id}`
    }, async () => {
      await carregarSalaSemRealtime();
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "jogadores",
      filter: `sala_id=eq.${salaAtual.id}`
    }, async () => {
      await carregarSalaSemRealtime();
    })
    .subscribe((status) => {
      console.log("Realtime status:", status);
    });
}

btnIniciarPartida.addEventListener("click", iniciarPartida);
btnSortearNumero.addEventListener("click", sortearNumero);

carregarSala();