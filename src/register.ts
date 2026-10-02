import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, database } from "./firebase";

const registerForm = document.getElementById(
  "registerForm"
) as HTMLFormElement;

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fullName = (
    document.getElementById("fullName") as HTMLInputElement
  ).value;

  const email = (
    document.getElementById("email") as HTMLInputElement
  ).value;

  const password = (
    document.getElementById("password") as HTMLInputElement
  ).value;

  const confirmPassword = (
    document.getElementById("confirmPassword") as HTMLInputElement
  ).value;

  const university = (
    document.getElementById("university") as HTMLInputElement
  ).value;

  const major = (
    document.getElementById("major") as HTMLInputElement
  ).value;

  // ពិនិត្យ Password
  if (password !== confirmPassword) {
    alert("Password មិនដូចគ្នាទេ!");
    return;
  }

  try {

    // បង្កើត Account ក្នុង Firebase Authentication
    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = userCredential.user;

    // រក្សាទុកព័ត៌មាន User ក្នុង Realtime Database
    await set(ref(database, "users/" + user.uid), {
      fullName: fullName,
      email: email,
      university: university,
      major: major,
      createdAt: new Date().toISOString()
    });

    alert("create account success! Please login to continue.");

    // ទៅ Login Page
    window.location.href = "login.html";

  } catch (error: any) {

    console.error(error);

    if (error.code === "auth/email-already-in-use") {
      alert("Email has account already!");
    } else if (error.code === "auth/invalid-email") {
      alert("put you email correctly!");
    } else if (error.code === "auth/weak-password") {
      alert("Password have 6 letter or more!");
    } else {
      alert("create account failed! Please try again later.");
    }

  }
});