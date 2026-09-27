import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

const loginForm = document.getElementById("loginForm") as HTMLFormElement;
const loginError = document.getElementById("loginError") as HTMLParagraphElement;

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.hidden = true;

  const email = (document.getElementById("email") as HTMLInputElement).value;
  const password = (document.getElementById("password") as HTMLInputElement).value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "./profile.html";
  } catch (error) {
    const errorCode = (error as { code?: string }).code;

    if (errorCode === "auth/user-not-found") {
      window.location.href = "./resgister.html";
      return;
    }

    loginError.textContent =
      errorCode === "auth/wrong-password" || errorCode === "auth/invalid-credential"
        ? "Email or password is incorrect. If you do not have an account, create one below."
        : "Unable to log in right now. Please try again.";
    loginError.hidden = false;
  }
});