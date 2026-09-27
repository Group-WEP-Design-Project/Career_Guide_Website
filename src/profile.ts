import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  verifyBeforeUpdateEmail,
  type User,
} from "firebase/auth";
import { get, ref, remove, update } from "firebase/database";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { auth, database, storage } from "./firebase";

type CvFile = {
  fileName: string;
  storagePath: string;
  downloadUrl: string;
};

type SavedInternship = {
  title?: string;
  company?: string;
};

type Application = {
  title?: string;
  company?: string;
  appliedAt?: string;
  status?: string;
};

type UserProfile = {
  fullName?: string;
  university?: string;
  major?: string;
  phone?: string;
  location?: string;
  about?: string;
  skills?: string[];
  cv?: CvFile;
  savedInternships?: Record<string, SavedInternship>;
  applications?: Record<string, Application>;
  notificationsEnabled?: boolean;
};

const profileInitials = document.getElementById("profileInitials") as HTMLDivElement;
const profileName = document.getElementById("profileName") as HTMLHeadingElement;
const profileUniversity = document.getElementById("profileUniversity") as HTMLParagraphElement;
const profileMajor = document.getElementById("profileMajor") as HTMLParagraphElement;
const profileAbout = document.getElementById("profileAbout") as HTMLParagraphElement;
const profileFullName = document.getElementById("profileFullName") as HTMLElement;
const profileEmail = document.getElementById("profileEmail") as HTMLElement;
const profileSchool = document.getElementById("profileSchool") as HTMLElement;
const profileEducationMajor = document.getElementById("profileEducationMajor") as HTMLElement;
const profilePhone = document.getElementById("profilePhone") as HTMLElement;
const profileLocation = document.getElementById("profileLocation") as HTMLElement;
const profileLoginLink = document.getElementById("profileLoginLink") as HTMLAnchorElement;
const profileEditor = document.getElementById("profileEditor") as HTMLDialogElement;
const profileEditorForm = document.getElementById("profileEditorForm") as HTMLFormElement;
const profileSaveMessage = document.getElementById("profileSaveMessage") as HTMLParagraphElement;
const saveProfileButton = document.getElementById("saveProfileButton") as HTMLButtonElement;
const editFullName = document.getElementById("editFullName") as HTMLInputElement;
const editEmail = document.getElementById("editEmail") as HTMLInputElement;
const editUniversity = document.getElementById("editUniversity") as HTMLInputElement;
const editMajor = document.getElementById("editMajor") as HTMLInputElement;
const editPhone = document.getElementById("editPhone") as HTMLInputElement;
const editLocation = document.getElementById("editLocation") as HTMLInputElement;
const editAbout = document.getElementById("editAbout") as HTMLTextAreaElement;
const editSkills = document.getElementById("editSkills") as HTMLInputElement;
const cancelProfileEdit = document.getElementById("cancelProfileEdit") as HTMLButtonElement;
const profileSkillList = document.getElementById("profileSkillList") as HTMLUListElement;
const profileNoSkills = document.getElementById("profileNoSkills") as HTMLParagraphElement;
const profileSavedList = document.getElementById("profileSavedList") as HTMLUListElement;
const profileSavedEmpty = document.getElementById("profileSavedEmpty") as HTMLParagraphElement;
const profileApplicationsList = document.getElementById("profileApplicationsList") as HTMLTableSectionElement;
const profileCvInput = document.getElementById("profileCvInput") as HTMLInputElement;
const profileCvName = document.getElementById("profileCvName") as HTMLSpanElement;
const cvMessage = document.getElementById("cvMessage") as HTMLParagraphElement;
const downloadCvButton = document.getElementById("downloadCvButton") as HTMLButtonElement;
const notificationSettingsButton = document.getElementById("notificationSettingsButton") as HTMLButtonElement;
let currentProfile: UserProfile = {};

document.getElementById("editProfileButton")?.addEventListener("click", openProfileEditor);
document.getElementById("editProfileSettingsButton")?.addEventListener("click", openProfileEditor);
document.getElementById("addSkillButton")?.addEventListener("click", () => {
  openProfileEditor();
  editSkills.focus();
});
cancelProfileEdit.addEventListener("click", () => profileEditor.close());

profileEditorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showProfileMessage("", false);

  const user = auth.currentUser;
  if (!user) {
    window.location.replace("./login.html");
    return;
  }

  const fullName = editFullName.value.trim();
  const newEmail = editEmail.value.trim();
  const skills = [...new Set(editSkills.value.split(",").map((skill) => skill.trim()).filter(Boolean))];
  const updatedProfile: Partial<UserProfile> = {
    fullName,
    university: editUniversity.value.trim(),
    major: editMajor.value.trim(),
    phone: editPhone.value.trim(),
    location: editLocation.value.trim(),
    about: editAbout.value.trim(),
    skills,
  };

  saveProfileButton.disabled = true;
  saveProfileButton.textContent = "Saving...";

  try {
    const emailChanged = Boolean(user.email && newEmail.toLowerCase() !== user.email.toLowerCase());
    if (emailChanged) await verifyBeforeUpdateEmail(user, newEmail);

    await update(ref(database, `users/${user.uid}`), updatedProfile);
    await updateProfile(user, { displayName: fullName });
    currentProfile = { ...currentProfile, ...updatedProfile };
    renderProfile(user, currentProfile);

    if (emailChanged) {
      profileSaveMessage.classList.remove("text-red-600");
      profileSaveMessage.classList.add("text-green-700");
      showProfileMessage("Profile saved. Check your email to confirm the address change.", false);
    } else {
      profileEditor.close();
    }
  } catch (error) {
    console.error("Unable to save profile details:", error);
    profileSaveMessage.classList.remove("text-green-700");
    profileSaveMessage.classList.add("text-red-600");
    showProfileMessage(getProfileErrorMessage(error), true);
  } finally {
    saveProfileButton.disabled = false;
    saveProfileButton.textContent = "Save changes";
  }
});

profileSkillList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const removeButton = target.closest<HTMLButtonElement>("[data-remove-skill]");
  const skillToRemove = removeButton?.dataset.removeSkill;
  const user = auth.currentUser;
  if (!skillToRemove || !user) return;

  const skills = (currentProfile.skills ?? []).filter((skill) => skill !== skillToRemove);
  try {
    await update(ref(database, `users/${user.uid}`), { skills });
    currentProfile.skills = skills;
    renderSkills(skills);
  } catch (error) {
    console.error("Unable to remove skill:", error);
    alert("Unable to remove this skill. Please try again.");
  }
});

profileSavedList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const removeButton = target.closest<HTMLButtonElement>("[data-remove-saved]");
  const savedId = removeButton?.dataset.removeSaved;
  const user = auth.currentUser;
  if (!savedId || !user) return;

  try {
    await remove(ref(database, `users/${user.uid}/savedInternships/${savedId}`));
    if (currentProfile.savedInternships) delete currentProfile.savedInternships[savedId];
    renderSavedInternships(currentProfile.savedInternships ?? {});
  } catch (error) {
    console.error("Unable to remove saved internship:", error);
    alert("Unable to remove this saved internship. Please try again.");
  }
});

document.getElementById("uploadCvButton")?.addEventListener("click", () => profileCvInput.click());
document.getElementById("replaceCvButton")?.addEventListener("click", () => profileCvInput.click());
profileCvInput.addEventListener("change", uploadCv);

downloadCvButton.addEventListener("click", () => {
  const cv = currentProfile.cv;
  if (!cv?.downloadUrl) return;

  const link = document.createElement("a");
  link.href = cv.downloadUrl;
  link.target = "_blank";
  link.rel = "noopener";
  link.download = cv.fileName;
  link.click();
});

document.getElementById("changePasswordButton")?.addEventListener("click", async () => {
  const email = auth.currentUser?.email;
  if (!email) {
    alert("This account does not have an email address for password recovery.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert(`A password reset link was sent to ${email}.`);
  } catch (error) {
    console.error("Unable to send password reset email:", error);
    alert("Unable to send a password reset email. Please try again.");
  }
});

notificationSettingsButton.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const notificationsEnabled = currentProfile.notificationsEnabled === false;
  try {
    await update(ref(database, `users/${user.uid}`), { notificationsEnabled });
    currentProfile.notificationsEnabled = notificationsEnabled;
    renderNotificationSetting(notificationsEnabled);
  } catch (error) {
    console.error("Unable to save notification preference:", error);
    alert("Unable to save notification settings. Please try again.");
  }
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("./login.html");
    return;
  }

  void loadProfile(user);
});

document.getElementById("logoutButton")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.replace("./login.html");
  } catch (error) {
    console.error("Unable to log out:", error);
    alert("Unable to log out right now. Please try again.");
  }
});

async function loadProfile(user: User) {
  currentProfile = {};

  try {
    const snapshot = await get(ref(database, `users/${user.uid}`));
    currentProfile = snapshot.val() as UserProfile | null ?? {};
  } catch (error) {
    console.error("Unable to load profile details:", error);
  }

  renderProfile(user, currentProfile);
  profileLoginLink.classList.add("hidden");
  document.body.hidden = false;
}

function openProfileEditor() {
  const user = auth.currentUser;
  if (!user) {
    window.location.replace("./login.html");
    return;
  }

  editFullName.value = currentProfile.fullName ?? user.displayName ?? "";
  editEmail.value = user.email ?? "";
  editUniversity.value = currentProfile.university ?? "";
  editMajor.value = currentProfile.major ?? "";
  editPhone.value = currentProfile.phone ?? "";
  editLocation.value = currentProfile.location ?? "";
  editAbout.value = currentProfile.about ?? "";
  editSkills.value = (currentProfile.skills ?? []).join(", ");
  profileSaveMessage.classList.remove("text-green-700");
  profileSaveMessage.classList.add("text-red-600");
  showProfileMessage("", false);
  profileEditor.showModal();
}

async function uploadCv() {
  const file = profileCvInput.files?.[0];
  const user = auth.currentUser;
  if (!file || !user) return;

  if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
    showCvMessage("Choose a PDF file.", true);
    profileCvInput.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showCvMessage("The PDF must be 5 MB or smaller.", true);
    profileCvInput.value = "";
    return;
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `users/${user.uid}/cv/${Date.now()}-${safeFileName}`;
  let uploadedReference: ReturnType<typeof storageRef> | undefined;
  showCvMessage("Uploading CV...", false);

  try {
    const uploaded = await uploadBytes(storageRef(storage, path), file, { contentType: "application/pdf" });
    uploadedReference = uploaded.ref;
    const cv: CvFile = {
      fileName: file.name,
      storagePath: path,
      downloadUrl: await getDownloadURL(uploaded.ref),
    };
    await update(ref(database, `users/${user.uid}`), { cv });
    const previousPath = currentProfile.cv?.storagePath;
    currentProfile.cv = cv;
    renderCv(cv);
    showCvMessage("CV uploaded successfully.", false);

    if (previousPath && previousPath !== path) {
      await deleteObject(storageRef(storage, previousPath)).catch((error: unknown) => {
        console.warn("Unable to remove replaced CV:", error);
      });
    }
  } catch (error) {
    if (uploadedReference) await deleteObject(uploadedReference).catch(() => undefined);
    console.error("Unable to upload CV:", error);
    showCvMessage("Unable to upload the CV. Check Firebase Storage access and try again.", true);
  } finally {
    profileCvInput.value = "";
  }
}

function renderProfile(user: User, userProfile: UserProfile) {
  const fullName = userProfile.fullName || user.displayName || user.email?.split("@")[0] || "User";
  const university = userProfile.university || "Not provided";
  const major = userProfile.major || "Not provided";
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  const initials = nameParts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");

  profileInitials.textContent = initials || "U";
  profileName.textContent = fullName;
  profileUniversity.textContent = userProfile.university || "";
  profileMajor.textContent = userProfile.major || "";
  profileFullName.textContent = fullName;
  profileEmail.textContent = user.email || "Not provided";
  profileSchool.textContent = university;
  profileEducationMajor.textContent = major;
  profilePhone.textContent = userProfile.phone || "Not provided";
  profileLocation.textContent = userProfile.location || "Not provided";
  profileAbout.textContent = userProfile.about ||
    (userProfile.university && userProfile.major
      ? `${fullName} studies ${userProfile.major} at ${userProfile.university}.`
      : "Add a short introduction to tell people about yourself.");

  renderSkills(userProfile.skills ?? []);
  renderSavedInternships(userProfile.savedInternships ?? {});
  renderApplications(userProfile.applications ?? {});
  renderCv(userProfile.cv);
  renderNotificationSetting(userProfile.notificationsEnabled !== false);
}

function renderSkills(skills: string[]) {
  profileNoSkills.hidden = skills.length > 0;
  profileSkillList.replaceChildren();

  for (const skill of skills) {
    const item = document.createElement("li");
    item.className = "inline-flex items-center gap-2 rounded-full border border-green-600/10 bg-green-600/10 px-3 py-2 text-xs font-semibold text-green-700";
    const label = document.createElement("span");
    label.textContent = skill;
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.dataset.removeSkill = skill;
    removeButton.setAttribute("aria-label", `Remove ${skill}`);
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-xmark";
    icon.setAttribute("aria-hidden", "true");
    removeButton.append(icon);
    item.append(label, removeButton);
    profileSkillList.append(item);
  }
}

function renderSavedInternships(savedInternships: Record<string, SavedInternship>) {
  const items = Object.entries(savedInternships);
  profileSavedEmpty.hidden = items.length > 0;
  profileSavedList.hidden = items.length === 0;
  profileSavedList.replaceChildren();

  for (const [id, internship] of items) {
    const item = document.createElement("li");
    item.className = "flex items-center justify-between gap-3 border-b border-slate-200 py-2.5";
    const details = document.createElement("span");
    details.textContent = [internship.title || "Internship", internship.company].filter(Boolean).join(" · ");
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.dataset.removeSaved = id;
    removeButton.className = "rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50";
    removeButton.textContent = "Remove";
    item.append(details, removeButton);
    profileSavedList.append(item);
  }
}

function renderApplications(applications: Record<string, Application>) {
  const entries = Object.values(applications);
  profileApplicationsList.replaceChildren();

  if (entries.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "py-5 text-center text-slate-600";
    cell.textContent = "No applications yet.";
    row.append(cell);
    profileApplicationsList.append(row);
    return;
  }

  for (const application of entries) {
    const row = document.createElement("tr");
    for (const value of [application.title || "Internship", application.company || "Not provided", application.appliedAt || "Not provided", application.status || "Applied"]) {
      const cell = document.createElement("td");
      cell.className = "px-4 py-3";
      cell.textContent = value;
      row.append(cell);
    }
    profileApplicationsList.append(row);
  }
}

function renderCv(cv?: CvFile) {
  profileCvName.textContent = cv?.fileName || "No CV uploaded";
  downloadCvButton.disabled = !cv?.downloadUrl;
}

function renderNotificationSetting(enabled: boolean) {
  notificationSettingsButton.setAttribute("aria-pressed", String(enabled));
  notificationSettingsButton.textContent = `Notifications: ${enabled ? "On" : "Off"}`;
}

function showProfileMessage(message: string, isError: boolean) {
  profileSaveMessage.textContent = message;
  profileSaveMessage.hidden = !message;
  profileSaveMessage.classList.toggle("text-red-600", isError);
  profileSaveMessage.classList.toggle("text-green-700", !isError);
}

function showCvMessage(message: string, isError: boolean) {
  cvMessage.textContent = message;
  cvMessage.hidden = !message;
  cvMessage.classList.toggle("text-red-600", isError);
  cvMessage.classList.toggle("text-slate-600", !isError);
}

function getProfileErrorMessage(error: unknown) {
  const errorCode = (error as { code?: string }).code;
  if (errorCode === "auth/email-already-in-use") return "That email address is already connected to another account.";
  if (errorCode === "auth/invalid-email") return "Enter a valid email address.";
  if (errorCode === "auth/requires-recent-login") return "Sign in again before changing your email address.";
  return "Unable to save your changes. Please try again.";
}