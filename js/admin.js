const tabela = document.getElementById("tabelaPacientes");

const ADMIN_EMAIL = "seuemail@admin.com";

auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  if (user.email !== ADMIN_EMAIL) {
    alert("ACESSO PERMITIDO APENAS PARA ADMINISTRADOR");
    window.location.href = "dashboard.html";
    return;
  }

  // Se passou daqui → é admin
  carregarPacientes();
});


function carregarPacientes() {
  db.collection("users")
    .get()
    .then((snapshot) => {
      const lista = document.getElementById("listaPacientes");
      lista.innerHTML = "";

      snapshot.forEach((doc) => {
        const dados = doc.data();

        lista.innerHTML += `
          <div class="card mb-2 p-2">
            <strong>${dados.nome || "SEM NOME"}</strong><br>
            ${dados.email}
          </div>
        `;
      });
    })
    .catch((error) => {
      console.error(error);
      alert(error.message);
    });
}

