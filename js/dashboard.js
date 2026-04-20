auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const uid = user.uid;

    // ==============================
    // MOSTRAR NOME DO USUÁRIO
    // ==============================
    db.collection("users")
        .doc(uid)
        .get()
        .then((doc) => {
            if (doc.exists && doc.data().nome) {
                document.getElementById("userName").innerText =
                    doc.data().nome.toUpperCase();
            }
        });

    // ==============================
    // CARREGAR REGISTROS PARA GRÁFICOS
    // ==============================
    db.collection("users")
        .doc(uid)
        .collection("registros")
        .orderBy("createdAt")
        .get()
        .then((snapshot) => {
            const datas = [];
            const pesos = [];
            const glicemias = [];
            const aguas = [];
            const sonos = [];

            snapshot.forEach((doc) => {
                const d = doc.data();
                datas.push(doc.id);
                pesos.push(d.pesoAtual);
                glicemias.push(d.glicemia);
                aguas.push(d.agua);
                sonos.push(d.sono);
            });

            if (datas.length > 0) {
                criarGrafico("graficoPeso", "PESO (KG)", datas, pesos);
                criarGrafico("graficoGlicemia", "GLICEMIA (MG/DL)", datas, glicemias);
                criarGrafico("graficoAgua", "ÁGUA (L)", datas, aguas);
                criarGrafico("graficoSono", "SONO (H)", datas, sonos);
            }
        });


    // ==============================
    // CONTROLE ATIVIDADE FÍSICA (FORA DO SUBMIT)
    // ==============================
    const atividadeTipo = document.getElementById("atividadeTipo");
    const atividadeIntensidade = document.getElementById("atividadeIntensidade");

    atividadeIntensidade.disabled = true;

    atividadeTipo.addEventListener("change", () => {
        if (atividadeTipo.value === "") {
            atividadeIntensidade.value = "";
            atividadeIntensidade.disabled = true;
        } else {
            atividadeIntensidade.disabled = false;
        }
    });

    // ==============================
    // SUBMIT DO REGISTRO DIÁRIO
    // ==============================
    const form = document.getElementById("registroDiarioForm");

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const hoje = new Date().toISOString().split("T")[0];

        const dadosRegistro = {
            pesoAtual: Number(document.getElementById("pesoAtual").value || 0),
            glicemia: Number(document.getElementById("glicemia").value || 0),
            pressao: {
                sistolica: Number(document.getElementById("pressaoSis").value || 0),
                diastolica: Number(document.getElementById("pressaoDia").value || 0),
            },
            agua: Number(document.getElementById("agua").value || 0),
            sono: Number(document.getElementById("sono").value || 0),
            atividade: {
                tipo: atividadeTipo.value,
                tempo: Number(document.getElementById("atividadeTempo").value || 0),
                intensidade: atividadeIntensidade.value,
            },
            medicacao: {
                nome: document.getElementById("medicacaoNome").value,
                tomada: document.getElementById("medicacaoTomada").checked,
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        db.collection("users")
            .doc(uid)
            .collection("registros")
            .doc(hoje)
            .set(dadosRegistro)
            .then(() => {
                renderAlertas(dadosRegistro);
                alert("REGISTRO SALVO COM SUCESSO ✅");
                form.reset();
                atividadeIntensidade.disabled = true;
            })
            .catch((error) => {
                alert("ERRO AO SALVAR: " + error.message);
            });
    });
});

// ==============================
// LOGOUT
// ==============================
document.getElementById("logoutBtn").addEventListener("click", () => {
    auth.signOut().then(() => {
        window.location.href = "login.html";
    });
});


// ==============================
// GRÁFICOS
// ==============================
function renderAlertas(dados) {
    const alertasDiv = document.getElementById("alertas");
    alertasDiv.innerHTML = "";

    let temAlerta = false;

    // GLICEMIA
    if (dados.glicemia > 99) {
        temAlerta = true;
        alertasDiv.innerHTML += `
      <div class="alert alert-danger">
        🔴 GLICEMIA ELEVADA (${dados.glicemia} mg/dL)
      </div>
    `;
    }

    // PRESSÃO
    if (dados.pressao.sistolica >= 140 || dados.pressao.diastolica >= 90) {
        temAlerta = true;
        alertasDiv.innerHTML += `
      <div class="alert alert-danger">
        🔴 PRESSÃO ALTA (${dados.pressao.sistolica}/${dados.pressao.diastolica})
      </div>
    `;
    }

    // ÁGUA
    if (dados.agua < 2) {
        temAlerta = true;
        alertasDiv.innerHTML += `
      <div class="alert alert-warning">
        ⚠️ INGESTÃO DE ÁGUA ABAIXO DO IDEAL (${dados.agua} L)
      </div>
    `;
    }

    // SONO
    if (dados.sono < 6) {
        temAlerta = true;
        alertasDiv.innerHTML += `
      <div class="alert alert-warning">
        ⚠️ SONO INSUFICIENTE (${dados.sono} h)
      </div>
    `;
    }

    // SEM ALERTAS
    if (!temAlerta) {
        alertasDiv.innerHTML = `
      <div class="alert alert-success text-center">
        ✅ NENHUM ALERTA HOJE
      </div>
    `;
    }
}

function criarGrafico(canvasId, label, labels, data) {
    const ctx = document.getElementById(canvasId).getContext("2d");

    new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: label,
                    data: data,
                    fill: false,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}

// ==============================
// GERAR PDF RESUMIDO
// ==============================
if (btnPdfResumo) {
    btnPdfResumo.addEventListener("click", async () => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();

        const user = auth.currentUser;
        if (!user) {
            alert("Usuário não autenticado");
            return;
        }

        const uid = user.uid;

        const userDoc = await db.collection("users").doc(uid).get();
        const nome = userDoc.exists ? userDoc.data().nome : "PACIENTE";

        // Cabeçalho
        pdf.setFontSize(16);
        pdf.text("RELATÓRIO RESUMIDO - PORTAL DMG", 20, 20);

        pdf.setFontSize(12);
        pdf.text(`PACIENTE: ${nome.toUpperCase()}`, 20, 35);
        pdf.text(`DATA: ${new Date().toLocaleDateString()}`, 20, 45);

        pdf.line(20, 50, 190, 50);

        let y = 60;

        // ==============================
        // ALERTAS
        // ==============================
        y += 10;

        pdf.setFontSize(14);
        pdf.text("ALERTAS IDENTIFICADOS NO PERÍODO", 20, y);

        y += 10;

        const snapshot = await db
            .collection("users")
            .doc(uid)
            .collection("registros")
            .orderBy("createdAt")
            .get();

        let encontrouAlerta = false;

        snapshot.forEach((doc) => {
            const d = doc.data();

            // converter data
            const partes = doc.id.split("-");
            const dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;

            let escreveuData = false;

            const escreverData = () => {
                if (!escreveuData) {
                    pdf.setFontSize(11);
                    pdf.text(dataFormatada, 20, y);
                    y += 7;
                    escreveuData = true;
                }
            };

            if (d.glicemia > 99) {
                escreverData();
                pdf.text(`• Glicemia acima do recomendado: ${d.glicemia} mg/dL`, 25, y);
                y += 6;
                encontrouAlerta = true;
            }

            if (d.agua < 2) {
                escreverData();
                pdf.text(`• Ingestão de água abaixo do ideal: ${d.agua} L`, 25, y);
                y += 6;
                encontrouAlerta = true;
            }

            if (d.sono < 6) {
                escreverData();
                pdf.text(`• Sono insuficiente: ${d.sono} h`, 25, y);
                y += 6;
                encontrouAlerta = true;
            }

            if (d.pressao?.sistolica >= 140 || d.pressao?.diastolica >= 90) {
                escreverData();
                pdf.text(
                    `• Pressão arterial elevada: ${d.pressao?.sistolica}/${d.pressao?.diastolica}`,
                    25,
                    y
                );
                y += 6;
                encontrouAlerta = true;
            }


            if (escreveuData) y += 4;

            if (y > 260) {
                pdf.addPage();
                y = 20;
            }
        });


        if (!encontrouAlerta) {
            pdf.text("NENHUM ALERTA REGISTRADO.", 20, y);
            y += 10;
        }

        pdf.setFontSize(14);
        pdf.text("GRÁFICOS DE ACOMPANHAMENTO", 20, y);

        y += 10;

        // ======================
        // PESO
        // ======================
        const peso = document.getElementById("graficoPeso");
        if (peso) {
            const img = peso.toDataURL("image/png", 1.0);
            pdf.addImage(img, "PNG", 15, y, 180, 60);
            y += 70;
        }

        // Nova página se necessário
        if (y > 240) {
            pdf.addPage();
            y = 20;
        }

        // ======================
        // GLICEMIA
        // ======================
        const glicemia = document.getElementById("graficoGlicemia");
        if (glicemia) {
            const img = glicemia.toDataURL("image/png", 1.0);
            pdf.addImage(img, "PNG", 15, y, 180, 60);
            y += 70;
        }

        if (y > 240) {
            pdf.addPage();
            y = 20;
        }

        // ======================
        // ÁGUA
        // ======================
        const agua = document.getElementById("graficoAgua");
        if (agua) {
            const img = agua.toDataURL("image/png", 1.0);
            pdf.addImage(img, "PNG", 15, y, 180, 60);
            y += 70;
        }

        if (y > 240) {
            pdf.addPage();
            y = 20;
        }

        // ======================
        // SONO
        // ======================
        const sono = document.getElementById("graficoSono");
        if (sono) {
            const img = sono.toDataURL("image/png", 1.0);
            pdf.addImage(img, "PNG", 15, y, 180, 60);
        }

        // ==============================
        // TABELA DE REGISTROS
        // ==============================

        pdf.addPage();
        let yTabela = 20;

        pdf.setFontSize(14);
        pdf.text("HISTÓRICO DE REGISTROS", 20, yTabela);

        yTabela += 10;

        pdf.setFontSize(8);

        // Cabeçalho da tabela
        pdf.text("DATA", 10, yTabela);
        pdf.text("PESO", 30, yTabela);
        pdf.text("GLIC.", 45, yTabela);
        pdf.text("PAS", 60, yTabela);
        pdf.text("PAD", 72, yTabela);
        pdf.text("ÁGUA", 85, yTabela);
        pdf.text("SONO", 100, yTabela);
        pdf.text("ATIV.", 115, yTabela);
        pdf.text("TEMPO", 140, yTabela);
        pdf.text("MED.", 160, yTabela);

        yTabela += 5;
        pdf.line(10, yTabela, 200, yTabela);

        yTabela += 8;

        // Buscar novamente os registros
        const tabelaSnap = await db
            .collection("users")
            .doc(uid)
            .collection("registros")
            .orderBy("createdAt")
            .get();

        tabelaSnap.forEach((doc) => {
            const d = doc.data();

            pdf.text(doc.id, 10, yTabela);
            pdf.text(String(d.pesoAtual || ""), 30, yTabela);
            pdf.text(String(d.glicemia || ""), 45, yTabela);
            pdf.text(String(d.pressao?.sistolica || ""), 60, yTabela);
            pdf.text(String(d.pressao?.diastolica || ""), 72, yTabela);
            pdf.text(String(d.agua || ""), 85, yTabela);
            pdf.text(String(d.sono || ""), 100, yTabela);
            pdf.text(String(d.atividade?.tipo || ""), 115, yTabela);
            pdf.text(String(d.atividade?.tempo || ""), 140, yTabela);
            pdf.text(d.medicacao?.tomada ? "SIM" : "NÃO", 160, yTabela);

            yTabela += 7;

            // quebra de página automática
            if (yTabela > 270) {
                pdf.addPage();
                yTabela = 20;
            }
        });


        pdf.save(`relatorio_resumido_${nome}.pdf`);
    });
}
