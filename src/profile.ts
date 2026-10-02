import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut,
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
  storagePath?: string;
  downloadUrl: string;
};

type ProfilePhoto = {
  fileName: string;
  storagePath?: string;
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
  email?: string;
  university?: string;
  major?: string;
  phone?: string;
  location?: string;
  about?: string;
  skills?: string[];
  profilePhoto?: ProfilePhoto;
  cv?: CvFile;
  savedInternships?: Record<string, SavedInternship>;
  applications?: Record<string, Application>;
  notificationsEnabled?: boolean;
};

const profileInitials = document.getElementById("profileInitials") as HTMLSpanElement;
const profilePhotoImage = document.getElementById("profilePhotoImage") as HTMLImageElement;
const profilePhotoTrigger = document.getElementById("profilePhotoTrigger") as HTMLButtonElement;
const profilePhotoButton = document.getElementById("profilePhotoButton") as HTMLButtonElement;
const profilePhotoInput = document.getElementById("profilePhotoInput") as HTMLInputElement;
const profilePhotoMessage = document.getElementById("profilePhotoMessage") as HTMLParagraphElement;
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
const profileApplicationStatus = document.getElementById("profileApplicationStatus") as HTMLParagraphElement;
const profileCvInput = document.getElementById("profileCvInput") as HTMLInputElement;
const profileCvName = document.getElementById("profileCvName") as HTMLSpanElement;
const cvMessage = document.getElementById("cvMessage") as HTMLParagraphElement;
const viewCvButton = document.getElementById("viewCvButton") as HTMLButtonElement;
const downloadCvButton = document.getElementById("downloadCvButton") as HTMLButtonElement;
const notificationSettingsButton = document.getElementById("notificationSettingsButton") as HTMLButtonElement;
const localProfileKey = "careerGuideProfile";
const lastProfileUserKey = "careerGuideLastProfileUser";
let currentProfile: UserProfile = {};

document.getElementById("editProfileButton")?.addEventListener("click", openProfileEditor);
document.getElementById("editProfileSettingsButton")?.addEventListener("click", openProfileEditor);
document.getElementById("addSkillButton")?.addEventListener("click", () => {
  openProfileEditor();
  editSkills.focus();
});
cancelProfileEdit.addEventListener("click", () => profileEditor.close());
profilePhotoButton.addEventListener("click", () => profilePhotoInput.click());
profilePhotoTrigger.addEventListener("click", () => profilePhotoInput.click());
profilePhotoInput.addEventListener("change", uploadProfilePhoto);

profileEditorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showProfileMessage("", false);

  const user = auth.currentUser;
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
    updatedProfile.email = newEmail;
    saveLocalProfile({ ...currentProfile, ...updatedProfile }, user);
    currentProfile = { ...currentProfile, ...updatedProfile };
    renderProfile(user, currentProfile);
    profileEditor.close();
  } catch (error) {
    console.error("Unable to save profile details in this browser:", error);
    profileSaveMessage.classList.remove("text-green-700");
    profileSaveMessage.classList.add("text-red-600");
    showProfileMessage("Unable to save profile details in this browser. Check available storage space and try again.", true);
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
    currentProfile.savedInternships ??= {};
    delete currentProfile.savedInternships[savedId];
    saveLocalProfile(currentProfile, user);
    renderSavedInternships(currentProfile.savedInternships ?? {});
  } catch (error) {
    console.error("Unable to remove saved internship:", error);
    alert("Unable to remove this saved internship. Please try again.");
  }
});

document.getElementById("uploadCvButton")?.addEventListener("click", () => profileCvInput.click());
document.getElementById("replaceCvButton")?.addEventListener("click", () => profileCvInput.click());
profileCvInput.addEventListener("change", uploadCv);

viewCvButton.addEventListener("click", () => {
  const cv = currentProfile.cv;
  if (!cv?.downloadUrl) return;

  const newWindow = window.open(cv.downloadUrl, "_blank", "noopener,noreferrer");
  if (!newWindow) {
    alert("Your browser blocked the CV preview. Please allow pop-ups and try again.");
  }
});

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

async function readFileAsDataUrl(file: File): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unable to read CV file."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read CV file."));
    reader.readAsDataURL(file);
  });
}

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
  void loadProfile(user);
});

document.getElementById("logoutButton")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Unable to log out:", error);
    alert("Unable to log out right now. Please try again.");
  }
});

async function loadProfile(user: User | null) {
  if (user) localStorage.setItem(lastProfileUserKey, user.uid);
  currentProfile = loadLocalProfile(user?.uid);

  if (user) {
    try {
      const snapshot = await get(ref(database, `users/${user.uid}`));
      const accountProfile = snapshot.val() as UserProfile | null ?? {};
      currentProfile = {
        ...accountProfile,
        ...currentProfile,
        savedInternships: accountProfile.savedInternships ?? {},
      };
      saveLocalProfile(currentProfile, user);
    } catch (error) {
      console.error("Unable to load account records:", error);
    }
  }

  renderProfile(user, currentProfile);
  document.body.hidden = false;
}

function openProfileEditor() {
  const user = auth.currentUser;
  editFullName.value = currentProfile.fullName ?? user?.displayName ?? "";
  editEmail.value = currentProfile.email ?? user?.email ?? "";
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
  if (!file) return;

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

  const fileDataUrl = await readFileAsDataUrl(file);
  const localCv: CvFile = {
    fileName: file.name,
    downloadUrl: fileDataUrl,
  };

  currentProfile.cv = localCv;
  saveLocalProfile(currentProfile, user);
  renderCv(localCv);
  showCvMessage("CV saved in this browser. Uploading to your account...", false);
  profileCvInput.value = "";

  if (!user) {
    showCvMessage("CV saved on this device. Sign in to sync it to your account.", false);
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
    saveLocalProfile(currentProfile, user);
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
    currentProfile.cv = localCv;
    saveLocalProfile(currentProfile, user);
    renderCv(localCv);
    showCvMessage("Unable to upload the CV to your account, but it is saved on this device.", true);
  }
}

async function uploadProfilePhoto() {
  const file = profilePhotoInput.files?.[0];
  if (!file) return;

  const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!supportedTypes.includes(file.type)) {
    showProfilePhotoMessage("Choose a JPG, PNG, or WebP image.", true);
    profilePhotoInput.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showProfilePhotoMessage("The image must be 5 MB or smaller.", true);
    profilePhotoInput.value = "";
    return;
  }

  profilePhotoButton.disabled = true;
  profilePhotoButton.textContent = "Uploading...";
  showProfilePhotoMessage("Uploading profile photo...", false);

  try {
    const profilePhoto: ProfilePhoto = {
      fileName: file.name,
      downloadUrl: await createLocalPhotoDataUrl(file),
    };
    currentProfile.profilePhoto = profilePhoto;
    saveLocalProfile(currentProfile, auth.currentUser);
    renderProfile(auth.currentUser, currentProfile);
    showProfilePhotoMessage("Profile photo saved in this browser.", false);
  } catch (error) {
    console.error("Unable to save profile photo in this browser:", error);
    showProfilePhotoMessage("Unable to save the photo in this browser. Try a smaller image or clear some browser storage.", true);
  } finally {
    profilePhotoButton.disabled = false;
    profilePhotoButton.textContent = currentProfile.profilePhoto ? "Change photo" : "Add photo";
    profilePhotoInput.value = "";
  }
}

async function createLocalPhotoDataUrl(file: File) {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();

  const compressedImage = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Image compression failed")), "image/jpeg", 0.82);
  });
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image reading failed"));
    reader.onerror = () => reject(reader.error ?? new Error("Image reading failed"));
    reader.readAsDataURL(compressedImage);
  });
}

function loadLocalProfile(userId?: string): UserProfile {
  const profileId = userId || localStorage.getItem(lastProfileUserKey) || "guest";
  try {
    return JSON.parse(localStorage.getItem(`${localProfileKey}:${profileId}`) || "{}") as UserProfile;
  } catch {
    return {};
  }
}

function saveLocalProfile(profile: UserProfile, user: User | null) {
  const profileId = user?.uid || localStorage.getItem(lastProfileUserKey) || "guest";
  localStorage.setItem(`${localProfileKey}:${profileId}`, JSON.stringify(profile));
}

function renderProfile(user: User | null, userProfile: UserProfile) {
  const fullName = userProfile.fullName || user?.displayName || user?.email?.split("@")[0] || "User";
  const university = userProfile.university || "Not provided";
  const major = userProfile.major || "Not provided";
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  const initials = nameParts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");

  profileInitials.textContent = initials || "U";
  profilePhotoImage.hidden = !userProfile.profilePhoto?.downloadUrl;
  if (userProfile.profilePhoto?.downloadUrl) profilePhotoImage.src = userProfile.profilePhoto.downloadUrl;
  profilePhotoTrigger.setAttribute("aria-label", userProfile.profilePhoto ? "Change profile photo" : "Add profile photo");
  profilePhotoButton.textContent = userProfile.profilePhoto ? "Change photo" : "Add photo";
  profileName.textContent = fullName;
  profileUniversity.textContent = userProfile.university || "";
  profileMajor.textContent = userProfile.major || "";
  profileFullName.textContent = fullName;
  profileEmail.textContent = userProfile.email || user?.email || "Not provided";
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
    const details = document.createElement("a");
    details.href = "./internship.html";
    details.className = "text-teal-700 hover:text-green-700 hover:underline";
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
    profileApplicationStatus.textContent = "No application updates yet.";
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "py-5 text-center text-slate-600";
    cell.textContent = "No applications yet.";
    row.append(cell);
    profileApplicationsList.append(row);
    return;
  }

  const statusCounts = new Map<string, number>();
  for (const application of entries) {
    const status = application.status || "Applied";
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }
  const statusSummary = Array.from(statusCounts, ([status, count]) => `${status}: ${count}`).join(", ");
  profileApplicationStatus.textContent = `${entries.length} application${entries.length === 1 ? "" : "s"} tracked. ${statusSummary}.`;

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
  viewCvButton.disabled = !cv?.downloadUrl;
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


function showProfilePhotoMessage(message: string, isError: boolean) {
  profilePhotoMessage.textContent = message;
  profilePhotoMessage.hidden = !message;
  profilePhotoMessage.classList.toggle("text-red-600", isError);
  profilePhotoMessage.classList.toggle("text-slate-600", !isError);
}