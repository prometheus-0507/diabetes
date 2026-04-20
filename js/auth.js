// ==========================
// CONFIG FIREBASE
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyAd4GFdeju1BwQHvDoBkWt0TpMoOB5KuXg",
  authDomain: "diabetesgestacional-32c0b.firebaseapp.com",
  projectId: "diabetesgestacional-32c0b",
  storageBucket: "diabetesgestacional-32c0b.firebasestorage.app",
  messagingSenderId: "96050476412",
  appId: "1:96050476412:web:d8185a676760ca23d020f9"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();


// ==========================
// LOGIN
// ==========================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    auth
      .signInWithEmailAndPassword(loginEmail.value, loginPassword.value)
      .then((cred) => {
        const uid = cred.user.uid;

        db.collection("users").doc(uid).get().then((doc) => {
          if (doc.exists && doc.data().setupCompleto) {
            window.location.href = "dashboard.html";
          } else {
            window.location.href = "registro.html";
          }
        });
      })
      .catch(() => alert("Email ou senha inválidos"));
  });
}


// ==========================
// CADASTRO
// ==========================
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (registerPassword.value !== registerConfirmPassword.value) {
      passwordError.classList.remove("d-none");
      return;
    }

    auth
      .createUserWithEmailAndPassword(
        registerEmail.value,
        registerPassword.value
      )
      .then((cred) => {
        return db.collection("users").doc(cred.user.uid).set({
          nome: registerName.value,
          email: registerEmail.value,
          setupCompleto: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
      .then(() => {
        window.location.href = "registro.html";
      })
      .catch((err) => alert(err.message));
  });
}


// ==========================
// REGISTRO / ANAMNESE
// ==========================
const registroForm = document.getElementById("registroForm");

if (registroForm) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    registroForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const alturaCm = Number(document.getElementById("altura").value);
      const pesoPre = Number(document.getElementById("pesoPre").value);
      const alturaM = alturaCm / 100;

      const imc = Number((pesoPre / (alturaM * alturaM)).toFixed(2));

      const dados = {
        nascimento: nascimento.value,
        celular: celular.value,
        alturaCm,
        pesoPreGestacional: pesoPre,
        imcPreGestacional: imc,
        semanaGestacional: Number(semanaGestacional.value),
        primeiraGestacao: primeiraGestacao.checked,
        diabetesAnterior: diabetesAnterior.checked,
        hipertensao: hipertensao.checked,
        usoMedicacao: medicacao.checked,
        observacoesSaude: document.getElementById("observacoesSaude").value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      db.collection("users")
        .doc(user.uid)
        .collection("profile")
        .doc("anamnese")
        .set(dados)
        .then(() => {
          return db.collection("users").doc(user.uid).update({
            setupCompleto: true
          });
        })
        .then(() => {
          window.location.href = "dashboard.html";
        })
        .catch((err) => alert(err.message));
    });
  });
}
